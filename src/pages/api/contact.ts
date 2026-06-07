import type { APIRoute } from 'astro';
import nodemailer from 'nodemailer';

export const prerender = false;

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
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sanitizeInput(input: string): string {
  return input.trim().replace(/[\u003c\u003e]/g, '');
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json() as ContactFormData;

    // Validation
    const name = sanitizeInput(body.name || '');
    const email = sanitizeInput(body.email || '');
    const organization = sanitizeInput(body.organization || '');
    const inquiryType = sanitizeInput(body.inquiryType || '');
    const message = sanitizeInput(body.message || '');

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

    try {
      await transporter.sendMail({
        from: `NukeHub <${import.meta.env.SMTP_USER}>`,
        to: toEmail,
        subject: `[${inquiryType}] Message from ${name}`,
        replyTo: email,
        html: `
          <h2 style="font-family: sans-serif;">New Contact Form Submission</h2>
          <p style="font-family: sans-serif;"><strong style="font-family: sans-serif;">Name:</strong> ${name}</p>
          <p style="font-family: sans-serif;"><strong style="font-family: sans-serif;">Email:</strong> ${email}</p>
          <p style="font-family: sans-serif;"><strong style="font-family: sans-serif;">Organization:</strong> ${organization || 'N/A'}</p>
          <p style="font-family: sans-serif;"><strong style="font-family: sans-serif;">Inquiry Type:</strong> ${inquiryType}</p>
          <p style="font-family: sans-serif;"><strong style="font-family: sans-serif;">Message:</strong></p>
          <p style="font-family: sans-serif;">${message.replace(/\n/g, '<br>')}</p>
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
