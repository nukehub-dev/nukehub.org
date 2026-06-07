import type { APIRoute } from 'astro';
import nodemailer from 'nodemailer';

export const prerender = false;

// Rate limiting store (IP -> { count, resetTime })
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 5; // 5 requests per hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }

  record.count++;
  return true;
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(ip);
    }
  }
}, 10 * 60 * 1000); // Clean up every 10 minutes

const transporter = nodemailer.createTransport({
  host: import.meta.env.SMTP_HOST,
  port: Number(import.meta.env.SMTP_PORT) || 587,
  secure: import.meta.env.SMTP_SECURE === 'true',
  auth: {
    user: import.meta.env.SMTP_USER,
    pass: import.meta.env.SMTP_PASS,
  },
});

interface ContactFormData {
  name: string;
  email: string;
  organization?: string;
  inquiryType: string;
  message: string;
  turnstileToken: string;
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sanitizeInput(input: string): string {
  return input
    .trim()
    // Remove null bytes
    .replace(/\x00/g, '')
    // Remove control characters except newlines and tabs
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

// Prevent email header injection by removing newlines and carriage returns
function sanitizeHeader(input: string): string {
  return input.replace(/[\r\n]/g, '');
}

// Properly escape HTML entities
function escapeHtml(input: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  return input.replace(/[&<>"'\/]/g, (char) => htmlEntities[char] || char);
}

async function verifyTurnstile(token: string): Promise<boolean> {
  const secretKey = import.meta.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    console.error('Turnstile secret key not configured');
    return false;
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: secretKey,
        response: token,
      }),
    });

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return false;
  }
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    // Rate limiting
    const ip = clientAddress || 'unknown';
    if (!checkRateLimit(ip)) {
      return new Response(
        JSON.stringify({ success: false, message: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json() as ContactFormData;

    // Validation
    const name = sanitizeInput(body.name || '');
    const email = sanitizeInput(body.email || '');
    const organization = sanitizeInput(body.organization || '');
    const inquiryType = sanitizeInput(body.inquiryType || '');
    const message = sanitizeInput(body.message || '');
    const turnstileToken = body.turnstileToken || '';

    const errors: Record<string, string> = {};

    if (!name || name.length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    if (!email || !validateEmail(email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!inquiryType) {
      errors.inquiryType = 'Please select an inquiry type';
    }

    if (!message || message.length < 10) {
      errors.message = 'Message must be at least 10 characters';
    }

    if (message.length > 2000) {
      errors.message = 'Message must be less than 2000 characters';
    }

    // Verify Turnstile token (always required)
    if (!turnstileToken) {
      errors.turnstile = 'Please complete the CAPTCHA verification';
    } else {
      const isValidTurnstile = await verifyTurnstile(turnstileToken);
      if (!isValidTurnstile) {
        errors.turnstile = 'CAPTCHA verification failed. Please try again.';
      }
    }

    if (Object.keys(errors).length > 0) {
      return new Response(
        JSON.stringify({ success: false, errors }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Send email via SMTP
    const toEmail = import.meta.env.CONTACT_TO_EMAIL;

    if (!toEmail) {
      return new Response(
        JSON.stringify({ success: false, message: 'Contact recipient not configured.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize headers to prevent injection
    const safeName = sanitizeHeader(name);
    const safeEmail = sanitizeHeader(email);

    try {
      await transporter.sendMail({
        from: `NukeHub <${import.meta.env.SMTP_USER}>`,
        to: toEmail,
        subject: `[${escapeHtml(inquiryType)}] Message from ${escapeHtml(safeName)}`,
        replyTo: safeEmail,
        html: `
          <h2 style="font-family: sans-serif;">New Contact Form Submission</h2>
          <p style="font-family: sans-serif;"><strong style="font-family: sans-serif;">Name:</strong> ${escapeHtml(safeName)}</p>
          <p style="font-family: sans-serif;"><strong style="font-family: sans-serif;">Email:</strong> ${escapeHtml(safeEmail)}</p>
          <p style="font-family: sans-serif;"><strong style="font-family: sans-serif;">Organization:</strong> ${escapeHtml(organization || 'N/A')}</p>
          <p style="font-family: sans-serif;"><strong style="font-family: sans-serif;">Inquiry Type:</strong> ${escapeHtml(inquiryType)}</p>
          <p style="font-family: sans-serif;"><strong style="font-family: sans-serif;">Message:</strong></p>
          <p style="font-family: sans-serif; white-space: pre-wrap;">${escapeHtml(message)}</p>
        `,
      });
    } catch (sendError) {
      console.error('SMTP error:', sendError);
      return new Response(
        JSON.stringify({ success: false, message: 'Failed to send email. Please try again.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Thank you for reaching out! We will get back to you soon.'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Contact form error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Something went wrong. Please try again later.'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
