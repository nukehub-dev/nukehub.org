import * as React from "react";
import { Send, AlertCircle, CheckCircle2, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Turnstile } from "@marsidev/react-turnstile";
import { cn } from "@lib/utils";
import { Input } from "@components/ui/Input";
import { Textarea } from "@components/ui/Textarea";
import { Select } from "@components/ui/Select";
import { Button } from "@components/ui/Button";
import { Label } from "@components/ui/Label";

export interface ContactFormProps {
  defaultInquiryType?: string;
  defaultAdditionalValues?: Record<string, string>;
  tierOptions?: { value: string; label: string }[];
  onSuccess?: () => void;
  onReset?: () => void;
  successContent?: React.ReactNode;
}

const EMPTY_ADDITIONAL_VALUES: Record<string, string> = {};

const inquiryTypes = [
  { value: "Sponsorship", label: "Sponsorship" },
  { value: "One-time Donation", label: "One-time Donation" },
  { value: "Resource Donation", label: "Resource Donation" },
  { value: "Volunteering", label: "Volunteering" },
  { value: "General", label: "General Inquiry" },
];

interface AdditionalField {
  name: string;
  label: string;
  type: "text" | "email" | "url" | "select";
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
}

function getAdditionalFields(
  tierOptions: { value: string; label: string }[] = [],
): Record<string, AdditionalField[]> {
  const sponsorshipTierOptions =
    tierOptions.length > 0
      ? [{ value: "", label: "Select a tier" }, ...tierOptions]
      : [
          { value: "", label: "Select a tier" },
          { value: "Bronze", label: "Bronze" },
          { value: "Silver", label: "Silver" },
          { value: "Gold", label: "Gold" },
          { value: "Platinum", label: "Platinum" },
          { value: "Custom", label: "Custom / Tailored" },
        ];

  return {
    "One-time Donation": [
      {
        name: "amount",
        label: "Donation Amount *",
        type: "text",
        placeholder: "e.g., $250",
        required: true,
      },
      {
        name: "recognition",
        label: "Recognition Preference",
        type: "select",
        options: [
          { value: "", label: "Select recognition preference" },
          { value: "anonymous", label: "Anonymous" },
          { value: "acknowledgment", label: "Name on acknowledgment page" },
          { value: "newsletter", label: "Newsletter mention" },
          { value: "social", label: "Social media shout-out" },
        ],
      },
      {
        name: "paymentMethod",
        label: "Preferred Payment Method",
        type: "select",
        options: [
          { value: "", label: "Select payment method" },
          { value: "card", label: "Credit / Debit card" },
          { value: "bank", label: "Bank transfer" },
          { value: "paypal", label: "PayPal" },
          { value: "crypto", label: "Cryptocurrency" },
          { value: "other", label: "Other" },
        ],
      },
    ],
    Sponsorship: [
      {
        name: "preferredTier",
        label: "Preferred Tier",
        type: "select",
        options: sponsorshipTierOptions,
      },
      {
        name: "budgetRange",
        label: "Budget Range",
        type: "select",
        options: [
          { value: "", label: "Select budget range" },
          { value: "under-1k", label: "Under $1,000" },
          { value: "1k-5k", label: "$1,000 – $5,000" },
          { value: "5k-10k", label: "$5,000 – $10,000" },
          { value: "10k+", label: "$10,000+" },
          { value: "custom", label: "Custom / Discuss" },
        ],
      },
      {
        name: "website",
        label: "Company / Organization Website",
        type: "url",
        placeholder: "https://example.com",
      },
    ],
    "Resource Donation": [
      {
        name: "resourceType",
        label: "Resource Type *",
        type: "select",
        required: true,
        options: [
          { value: "", label: "Select resource type" },
          { value: "compute", label: "Compute credits / cloud resources" },
          { value: "software", label: "Software licenses" },
          { value: "hardware", label: "Hardware / infrastructure" },
          { value: "data", label: "Datasets / benchmarks" },
          { value: "services", label: "Professional services" },
          { value: "other", label: "Other" },
        ],
      },
      {
        name: "estimatedValue",
        label: "Estimated Value",
        type: "text",
        placeholder: "e.g., $5,000",
      },
    ],
    Volunteering: [
      {
        name: "skills",
        label: "Skills / Background",
        type: "text",
        placeholder: "e.g., React, nuclear engineering, technical writing",
      },
      {
        name: "availability",
        label: "Availability",
        type: "select",
        options: [
          { value: "", label: "Select availability" },
          { value: "few-hours", label: "A few hours per month" },
          { value: "part-time", label: "Part-time commitment" },
          { value: "full-time", label: "Full-time commitment" },
          { value: "project", label: "Project-based" },
          { value: "event", label: "Event-based" },
        ],
      },
    ],
  };
}

const inquiryHelpers: Record<string, { placeholder: string; proTip: string }> =
  {
    Sponsorship: {
      placeholder:
        "Tell us about your sponsorship goals, branding preferences, partnership duration, and any specific events or initiatives you want to support...",
      proTip:
        "Include your target audience, desired visibility, and how you would like to measure success.",
    },
    "One-time Donation": {
      placeholder:
        "Anything else we should know? Special instructions, dedication, or questions about your donation...",
      proTip:
        "If you need a tax receipt or invoice, mention it here and we will follow up with the details.",
    },
    "Resource Donation": {
      placeholder:
        "Describe the resources in more detail — quantity, specifications, transfer terms, and how NukeHub can acknowledge your contribution...",
      proTip:
        "Mention ownership terms, support period, and any compliance or security requirements.",
    },
    Volunteering: {
      placeholder:
        "Tell us about the teams or projects that excite you most and what you would love to contribute...",
      proTip:
        "Share links to your portfolio, GitHub, or LinkedIn to help us find the best fit.",
    },
    General: {
      placeholder: "How can we help you? Share as much detail as you can...",
      proTip:
        "The more context you provide — goals, timeline, and stakeholders — the faster we can respond with a useful answer.",
    },
  };

export function ContactForm({
  defaultInquiryType = "",
  defaultAdditionalValues = EMPTY_ADDITIONAL_VALUES,
  tierOptions = [],
  onSuccess,
  onReset,
  successContent,
}: ContactFormProps) {
  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    organization: "",
    inquiryType: defaultInquiryType,
    message: "",
  });
  const [additionalFieldValues, setAdditionalFieldValues] = React.useState<
    Record<string, string>
  >(defaultAdditionalValues);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [status, setStatus] = React.useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [turnstileToken, setTurnstileToken] = React.useState("");

  // Adjust form state during render when the default props change (e.g. the
  // modal reopens with a different inquiry type).
  const [prevDefaults, setPrevDefaults] = React.useState({
    defaultInquiryType,
    defaultAdditionalValues,
  });
  if (
    prevDefaults.defaultInquiryType !== defaultInquiryType ||
    prevDefaults.defaultAdditionalValues !== defaultAdditionalValues
  ) {
    setPrevDefaults({ defaultInquiryType, defaultAdditionalValues });
    setFormData((prev) => ({ ...prev, inquiryType: defaultInquiryType }));
    setAdditionalFieldValues(defaultAdditionalValues);
  }

  const currentAdditionalFields =
    getAdditionalFields(tierOptions)[formData.inquiryType] || [];

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

  const handleInquiryTypeChange = (value: string) => {
    handleChange("inquiryType", value);
    setAdditionalFieldValues({});
  };

  const handleAdditionalFieldChange = (field: string, value: string) => {
    setAdditionalFieldValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = "Please enter a valid email address";
    }

    if (formData.inquiryType === "") {
      newErrors.inquiryType = "Please select an inquiry type";
    }

    if (formData.message.trim().length < 10) {
      newErrors.message = "Message must be at least 10 characters";
    }

    if (formData.message.trim().length > 2000) {
      newErrors.message = "Message must be less than 2000 characters";
    }

    currentAdditionalFields.forEach((field) => {
      if (
        field.required &&
        (!additionalFieldValues[field.name] ||
          additionalFieldValues[field.name].trim() === "")
      ) {
        newErrors[field.name] = `${field.label.replace(" *", "")} is required`;
      }
    });

    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setStatus("idle");
      return;
    }
    setErrors({});

    try {
      const apiBase = import.meta.env.PUBLIC_API_URL || "/api";
      const apiUrl = `${apiBase.replace(/\/$/, "")}/contact`;
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          additionalFields: additionalFieldValues,
          turnstileToken,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus("success");
        onSuccess?.();
      } else if (data.errors) {
        setErrors(data.errors);
        setStatus("idle");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      organization: "",
      inquiryType: defaultInquiryType,
      message: "",
    });
    setAdditionalFieldValues(defaultAdditionalValues);
    setTurnstileToken("");
    onReset?.();
  };

  if (status === "success") {
    if (successContent) {
      return <>{successContent}</>;
    }
    return (
      <AnimatePresence mode="wait">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          {/* Animated success ring */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              delay: 0.2,
              type: "spring",
              stiffness: 200,
              damping: 15,
            }}
            className="relative"
          >
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20">
              <motion.div
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.4 }}
              >
                <CheckCircle2
                  className="h-10 w-10 text-emerald-500"
                  strokeWidth={1.5}
                />
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="mt-8 space-y-3"
          >
            <h3 className="text-2xl font-semibold text-foreground">
              Message Sent!
            </h3>
            <p className="text-muted-foreground max-w-sm mx-auto leading-relaxed">
              Thank you for reaching out. We have received your message and will
              get back to you within 24 hours.
            </p>
          </motion.div>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            onClick={() => {
              setStatus("idle");
              resetForm();
            }}
            className="mt-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            Send another message
          </motion.button>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <Label htmlFor="contact-name" required>
            Name
          </Label>
          <Input
            id="contact-name"
            type="text"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            error={!!errors.name}
            placeholder="Your name"
            className="h-auto rounded-xl px-4 py-3.5"
          />
          {errors.name && (
            <p className="mt-1.5 text-xs text-destructive">{errors.name}</p>
          )}
        </div>

        <div>
          <Label htmlFor="contact-email" required>
            Email
          </Label>
          <Input
            id="contact-email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
            error={!!errors.email}
            placeholder="you@example.com"
            className="h-auto rounded-xl px-4 py-3.5"
          />
          {errors.email && (
            <p className="mt-1.5 text-xs text-destructive">{errors.email}</p>
          )}
        </div>

        <div>
          <Label htmlFor="contact-org">Organization</Label>
          <Input
            id="contact-org"
            type="text"
            value={formData.organization}
            onChange={(e) => handleChange("organization", e.target.value)}
            placeholder="Company or institution (optional)"
            className="h-auto rounded-xl px-4 py-3.5"
          />
        </div>

        <div>
          <Label htmlFor="contact-inquiry-type" required>
            Inquiry Type
          </Label>
          <Select
            id="contact-inquiry-type"
            value={formData.inquiryType}
            onChange={handleInquiryTypeChange}
            error={!!errors.inquiryType}
            placeholder="Select inquiry type"
            options={inquiryTypes}
            triggerClassName="h-auto rounded-xl px-4 py-3"
          />
          {errors.inquiryType && (
            <p className="mt-1.5 text-xs text-destructive">
              {errors.inquiryType}
            </p>
          )}
        </div>
      </div>

      {/* Dynamic fields based on inquiry type */}
      <AnimatePresence mode="wait">
        {currentAdditionalFields.length > 0 && (
          <motion.div
            key={formData.inquiryType}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 gap-6 rounded-2xl border border-border/40 bg-muted/20 p-5 sm:grid-cols-2 dark:bg-white/[0.02]"
          >
            {currentAdditionalFields.map((field) => (
              <div key={field.name}>
                <Label htmlFor={`contact-${field.name}`}>{field.label}</Label>
                {field.type === "select" && field.options ? (
                  <Select
                    value={additionalFieldValues[field.name] || ""}
                    onChange={(value) =>
                      handleAdditionalFieldChange(field.name, value)
                    }
                    error={!!errors[field.name]}
                    placeholder={
                      field.placeholder || `Select ${field.label.toLowerCase()}`
                    }
                    options={field.options}
                    triggerClassName="h-auto rounded-xl px-4 py-3"
                  />
                ) : (
                  <Input
                    id={`contact-${field.name}`}
                    type={field.type}
                    value={additionalFieldValues[field.name] || ""}
                    onChange={(e) =>
                      handleAdditionalFieldChange(field.name, e.target.value)
                    }
                    error={!!errors[field.name]}
                    placeholder={field.placeholder || ""}
                    className="h-auto rounded-xl px-4 py-3.5"
                  />
                )}
                {errors[field.name] && (
                  <p className="mt-1.5 text-xs text-destructive">
                    {errors[field.name]}
                  </p>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={cn(
          "rounded-2xl border p-5 transition-all duration-300",
          "bg-muted/30 dark:bg-gradient-to-b dark:from-white/[0.04] dark:to-transparent",
          "border-transparent hover:border-border/40 dark:hover:border-white/5",
        )}
      >
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Label htmlFor="contact-message" required>
            Message
          </Label>
          <span className="tabular-nums text-xs text-muted-foreground">
            {formData.message.length}
            <span className="text-muted-foreground/60"> / 2000</span>
          </span>
        </div>

        <Textarea
          id="contact-message"
          value={formData.message}
          onChange={(e) => handleChange("message", e.target.value)}
          maxLength={2000}
          error={!!errors.message}
          className="rounded-xl px-4 py-3.5"
          placeholder={
            inquiryHelpers[formData.inquiryType]?.placeholder ??
            inquiryHelpers.General.placeholder
          }
        />

        <div className="mt-4 flex items-start gap-2 rounded-xl border border-primary/10 bg-primary/5 px-3.5 py-2.5">
          <span className="mt-0.5 text-xs font-semibold text-primary uppercase tracking-wide">
            Pro tip
          </span>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {inquiryHelpers[formData.inquiryType]?.proTip ??
              inquiryHelpers.General.proTip}
          </p>
        </div>

        {errors.message && (
          <p className="mt-2 text-xs text-destructive">{errors.message}</p>
        )}
      </div>

      <div className="flex flex-col items-center gap-2">
        <Turnstile
          siteKey={import.meta.env.PUBLIC_TURNSTILE_SITE_KEY}
          onSuccess={setTurnstileToken}
          onError={() => setTurnstileToken("")}
          onExpire={() => setTurnstileToken("")}
          options={{
            theme: "dark",
            size: "invisible",
            appearance: "interaction-only",
          }}
        />
        <p className="text-center text-[11px] leading-snug text-muted-foreground/60">
          Protected by Cloudflare Turnstile.{" "}
          <a
            href="https://www.cloudflare.com/privacypolicy/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-muted-foreground"
          >
            Privacy
          </a>
          {" · "}
          <a
            href="https://www.cloudflare.com/website-terms/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-muted-foreground"
          >
            Terms
          </a>
        </p>
        {errors.turnstile && (
          <p className="text-xs text-red-500">{errors.turnstile}</p>
        )}
      </div>

      {status === "error" && (
        <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-500">
          <AlertCircle size={16} />
          Something went wrong. Please try again.
        </div>
      )}

      <Button
        type="submit"
        loading={status === "submitting"}
        className="h-auto w-full rounded-xl px-6 py-4 text-base shadow-xl shadow-primary/20 hover:shadow-primary/30"
      >
        <Send size={18} />
        Send Message
      </Button>
    </form>
  );
}
