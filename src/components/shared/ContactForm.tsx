import * as React from 'react';
import { Send, AlertCircle, Loader2, ChevronDown, Maximize2, Minimize2 } from 'lucide-react';
import { Turnstile } from '@marsidev/react-turnstile';
import { cn } from '@lib/utils';

export interface ContactFormProps {
  defaultInquiryType?: string;
  onSuccess?: () => void;
  successContent?: React.ReactNode;
}

const inquiryTypes = [
  { value: 'Sponsorship', label: 'Sponsorship' },
  { value: 'Resource Donation', label: 'Resource Donation' },
  { value: 'Volunteering', label: 'Volunteering' },
  { value: 'General', label: 'General Inquiry' },
];

const inquiryHelpers: Record<string, { placeholder: string; proTip: string }> = {
  Sponsorship: {
    placeholder:
      'Tell us about your company, sponsorship goals, preferred tier, and any branding or marketing benefits you would like...',
    proTip:
      'Include budget range, partnership duration, and any specific events or initiatives you want to support.',
  },
  'Resource Donation': {
    placeholder:
      'Describe the resources you would like to donate — compute credits, software licenses, datasets, hardware...',
    proTip:
      'Mention estimated value, transfer terms, and how NukeHub can acknowledge your contribution.',
  },
  Volunteering: {
    placeholder:
      'Tell us about your background, skills, availability, and what you would love to contribute to...',
    proTip:
      'Share relevant experience, weekly time commitment, and the teams or projects that excite you most.',
  },
  General: {
    placeholder: 'How can we help you? Share as much detail as you can...',
    proTip:
      'The more context you provide — goals, timeline, and stakeholders — the faster we can respond with a useful answer.',
  },
};

function CustomSelect({
  value,
  onChange,
  error,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder: string;
}) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const selected = inquiryTypes.find((t) => t.value === value);

  React.useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'w-full rounded-xl border bg-background/60 px-4 py-3 text-sm text-foreground',
          'flex items-center justify-between transition-all',
          'hover:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20',
          error ? 'border-red-500' : 'border-border/60',
          open && 'border-primary/40 ring-1 ring-primary/10'
        )}
      >
        <span className={selected ? 'text-foreground' : 'text-muted-foreground'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={cn(
            'text-muted-foreground transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-border/60 bg-popover/95 backdrop-blur-xl shadow-xl">
          {inquiryTypes.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => {
                onChange(type.value);
                setOpen(false);
              }}
              className={cn(
                'w-full px-4 py-2.5 text-left text-sm transition-colors',
                value === type.value
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              {type.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ContactForm({ defaultInquiryType = '', onSuccess, successContent }: ContactFormProps) {
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    organization: '',
    inquiryType: defaultInquiryType,
    message: '',
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [status, setStatus] = React.useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [messageExpanded, setMessageExpanded] = React.useState(false);
  const [turnstileToken, setTurnstileToken] = React.useState('');

  React.useEffect(() => {
    setFormData((prev) => ({ ...prev, inquiryType: defaultInquiryType }));
    setMessageExpanded(false);
  }, [defaultInquiryType]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setErrors({});

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, turnstileToken }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus('success');
        onSuccess?.();
      } else if (data.errors) {
        setErrors(data.errors);
        setStatus('idle');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    if (successContent) {
      return <>{successContent}</>;
    }
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={32}
            height={32}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-emerald-500"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h3 className="mt-5 text-lg font-semibold text-foreground">Message Sent!</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-xs">
          Thank you for reaching out. We will get back to you soon.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="block text-sm font-medium text-foreground mb-2 pl-4">
            Name *
          </label>
          <input
            id="contact-name"
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className={cn(
              'w-full rounded-xl border bg-background/60 px-4 py-3.5 text-sm text-foreground',
              'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20',
              'transition-colors hover:bg-background',
              errors.name ? 'border-red-500' : 'border-border/60'
            )}
            placeholder="Your name"
          />
          {errors.name && <p className="mt-1.5 text-xs text-red-500">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="contact-email" className="block text-sm font-medium text-foreground mb-2 pl-4">
            Email *
          </label>
          <input
            id="contact-email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className={cn(
              'w-full rounded-xl border bg-background/60 px-4 py-3.5 text-sm text-foreground',
              'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20',
              'transition-colors hover:bg-background',
              errors.email ? 'border-red-500' : 'border-border/60'
            )}
            placeholder="you@example.com"
          />
          {errors.email && <p className="mt-1.5 text-xs text-red-500">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="contact-org" className="block text-sm font-medium text-foreground mb-2 pl-4">
            Organization
          </label>
          <input
            id="contact-org"
            type="text"
            value={formData.organization}
            onChange={(e) => handleChange('organization', e.target.value)}
            className="w-full rounded-xl border border-border/60 bg-background/60 px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors hover:bg-background"
            placeholder="Company or institution (optional)"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2 pl-4">
            Inquiry Type *
          </label>
          <CustomSelect
            value={formData.inquiryType}
            onChange={(value) => handleChange('inquiryType', value)}
            error={errors.inquiryType}
            placeholder="Select inquiry type"
          />
          {errors.inquiryType && <p className="mt-1.5 text-xs text-red-500">{errors.inquiryType}</p>}
        </div>
      </div>

      <div
        className={cn(
          'rounded-2xl border p-5 transition-all duration-300',
          'bg-muted/30 dark:bg-gradient-to-b dark:from-white/[0.04] dark:to-transparent',
          messageExpanded
            ? 'border-primary/30 bg-primary/[0.04] shadow-xl shadow-primary/8'
            : 'border-transparent hover:border-border/40 dark:hover:border-white/5'
        )}
      >
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label htmlFor="contact-message" className="text-sm font-semibold text-foreground pl-4">
            Message *
          </label>
          <span className="tabular-nums text-xs text-muted-foreground">
            {formData.message.length}
            <span className="text-muted-foreground/60"> / 2000</span>
          </span>
        </div>

        <div className="relative group">
          <textarea
            id="contact-message"
            value={formData.message}
            onChange={(e) => handleChange('message', e.target.value)}
            maxLength={2000}
            rows={messageExpanded ? 14 : 6}
            className={cn(
              'w-full rounded-xl border bg-background/70 px-4 py-3.5 text-sm text-foreground',
              'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25',
              'transition-[height] duration-300 ease-out resize-none',
              errors.message ? 'border-red-500' : 'border-border/60',
              'pr-11'
            )}
            placeholder={
              inquiryHelpers[formData.inquiryType]?.placeholder ??
              inquiryHelpers.General.placeholder
            }
          />
          <button
            type="button"
            onClick={() => setMessageExpanded((v) => !v)}
            className={cn(
              'absolute right-3 bottom-3 inline-flex h-8 w-8 items-center justify-center rounded-lg',
              'border border-border/60 bg-muted/50 text-muted-foreground',
              'transition-all hover:bg-muted hover:text-foreground hover:scale-105',
              'backdrop-blur-sm',
              'dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10',
              messageExpanded ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'
            )}
            aria-label={messageExpanded ? 'Collapse message box' : 'Expand message box'}
          >
            {messageExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>

        <div
          className={cn(
            'grid transition-[grid-template-rows] duration-300 ease-out',
            messageExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          )}
        >
          <div className="overflow-hidden">
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-primary/10 bg-primary/5 px-3.5 py-2.5">
              <span className="mt-0.5 text-xs font-semibold text-primary uppercase tracking-wide">
                Pro tip
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {inquiryHelpers[formData.inquiryType]?.proTip ?? inquiryHelpers.General.proTip}
              </p>
            </div>
          </div>
        </div>

        {errors.message && <p className="mt-2 text-xs text-red-500">{errors.message}</p>}
      </div>

      <div className="flex flex-col items-center gap-2">
        <Turnstile
          siteKey={import.meta.env.PUBLIC_TURNSTILE_SITE_KEY}
          onSuccess={setTurnstileToken}
          onError={() => setTurnstileToken('')}
          onExpire={() => setTurnstileToken('')}
          options={{
            theme: 'dark',
            size: 'flexible',
          }}
        />
        {errors.turnstile && (
          <p className="text-xs text-red-500">{errors.turnstile}</p>
        )}
      </div>

      {status === 'error' && (
        <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-500">
          <AlertCircle size={16} />
          Something went wrong. Please try again.
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="w-full inline-flex items-center justify-center gap-2.5 rounded-xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-xl shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5"
      >
        {status === 'submitting' ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Send size={18} />
            Send Message
          </>
        )}
      </button>
    </form>
  );
}
