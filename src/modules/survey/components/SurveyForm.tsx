import * as React from "react";
import {
  AlertCircle,
  CheckCircle2,
  Send,
  ChevronLeft,
  ChevronRight,
  Star,
  Check,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { cn } from "@lib/utils";
import { Button } from "@components/ui/Button";
import { Card } from "@components/ui/Card";
import { Input } from "@components/ui/Input";
import { Textarea } from "@components/ui/Textarea";
import { Select } from "@components/ui/Select";
import { Checkbox } from "@components/ui/Checkbox";
import { RadioGroup } from "@components/ui/RadioGroup";
import { CharacterCount } from "@components/ui/CharacterCount";
import type {
  Survey,
  SurveyPage,
  SurveyQuestion,
  SurveyResponse,
} from "../types";

interface SurveyFormProps {
  survey: Survey;
}

interface FormErrors {
  [key: string]: string | undefined;
  turnstile?: string;
  submit?: string;
}

function normalizeOption(
  option: NonNullable<SurveyQuestion["options"]>[number],
) {
  return typeof option === "string" ? { label: option, value: option } : option;
}

interface SurveyDraft {
  surveyTitle?: unknown;
  values?: unknown;
  currentPage?: unknown;
}

interface DraftSnapshot {
  draft: SurveyDraft | null;
  writable: boolean;
}

// Draft snapshots are frozen on first read so the persist effect (which
// rewrites storage on mount) cannot clobber the draft being restored.
const draftSnapshots = new Map<string, DraftSnapshot>();

function getDraftSnapshot(storageKey: string): DraftSnapshot {
  const cached = draftSnapshots.get(storageKey);
  if (cached) return cached;
  let draft: SurveyDraft | null = null;
  let writable = false;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        draft = parsed as SurveyDraft;
      }
    }
    // Probe writability without touching the stored draft
    localStorage.setItem("nukehub-storage-probe", "1");
    localStorage.removeItem("nukehub-storage-probe");
    writable = true;
  } catch {
    // Ignore corrupt or unavailable storage
  }
  const snapshot: DraftSnapshot = { draft, writable };
  draftSnapshots.set(storageKey, snapshot);
  return snapshot;
}

function subscribeToDraft() {
  // Drafts are written by this tab only; nothing external to subscribe to.
  return () => {};
}

const SERVER_DRAFT_SNAPSHOT: DraftSnapshot = { draft: null, writable: false };

function getServerDraftSnapshot(): DraftSnapshot {
  return SERVER_DRAFT_SNAPSHOT;
}

export function SurveyForm({ survey }: SurveyFormProps) {
  const pages = React.useMemo<SurveyPage[]>(() => {
    if (survey.pages && survey.pages.length > 0) return survey.pages;
    return [{ title: survey.title, questions: survey.questions ?? [] }];
  }, [survey]);

  const questionOffsets = React.useMemo(() => {
    const offsets: number[] = [];
    let count = 0;
    for (const page of pages) {
      offsets.push(count);
      count += page.questions.length;
    }
    return offsets;
  }, [pages]);
  const totalQuestions =
    questionOffsets[pages.length - 1] +
    pages[pages.length - 1].questions.length;

  const [values, setValues] = React.useState<SurveyResponse>({});
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [turnstileToken, setTurnstileToken] = React.useState("");
  const turnstileRef = React.useRef<TurnstileInstance>(null);
  const [currentPage, setCurrentPage] = React.useState(0);
  const [status, setStatus] = React.useState<"idle" | "submitting" | "success">(
    "idle",
  );

  const storageKey = React.useMemo(
    () => `nukehub-survey-${survey.slug || survey.title}`,
    [survey.slug, survey.title],
  );

  // Restore the saved draft after hydration: the server snapshot keeps the
  // prerendered HTML consistent, then the draft applies during render.
  const { draft, writable } = React.useSyncExternalStore(
    subscribeToDraft,
    () => getDraftSnapshot(storageKey),
    getServerDraftSnapshot,
  );
  const [restoredDraftKey, setRestoredDraftKey] = React.useState<string | null>(
    null,
  );
  if (
    draft &&
    restoredDraftKey !== storageKey &&
    draft.surveyTitle === survey.title
  ) {
    setRestoredDraftKey(storageKey);
    if (draft.values && typeof draft.values === "object") {
      setValues(draft.values as SurveyResponse);
    }
    if (
      typeof draft.currentPage === "number" &&
      draft.currentPage >= 0 &&
      draft.currentPage < pages.length
    ) {
      setCurrentPage(draft.currentPage);
    }
  }

  // Persist draft as the user answers / navigates
  React.useEffect(() => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          surveyTitle: survey.title,
          values,
          currentPage,
          savedAt: new Date().toISOString(),
        }),
      );
    } catch {
      // Ignore storage errors (e.g. quota exceeded, private mode)
    }
  }, [storageKey, survey.title, values, currentPage]);

  // Clear draft after successful submission
  React.useEffect(() => {
    if (status !== "success") return;
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Ignore
    }
  }, [status, storageKey]);

  const isMultiPage = pages.length > 1;
  const progress = Math.round(((currentPage + 1) / pages.length) * 100);

  const hasDraft = React.useMemo(() => {
    return Object.values(values).some((v) => {
      if (Array.isArray(v)) return v.length > 0;
      return v !== undefined && v !== "";
    });
  }, [values]);

  const clearDraft = () => {
    setValues({});
    setCurrentPage(0);
    setErrors({});
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Ignore storage errors
    }
  };

  const setValue = (id: string, value: string | string[]) => {
    setValues((prev) => ({ ...prev, [id]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const validateQuestions = (questions: SurveyQuestion[]): FormErrors => {
    const nextErrors: FormErrors = {};

    for (const question of questions) {
      const value = values[question.id];
      const isEmpty =
        value === undefined ||
        value === "" ||
        (Array.isArray(value) && value.length === 0);

      if (question.required && isEmpty) {
        nextErrors[question.id] = "This question is required";
      }

      if (question.type === "email" && value && typeof value === "string") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          nextErrors[question.id] = "Please enter a valid email address";
        }
      }

      if (question.type === "url" && value && typeof value === "string") {
        try {
          new URL(value);
        } catch {
          nextErrors[question.id] = "Please enter a valid URL";
        }
      }

      if (question.type === "number" && value && typeof value === "string") {
        const num = Number(value);
        if (Number.isNaN(num)) {
          nextErrors[question.id] = "Please enter a valid number";
        } else {
          if (question.min !== undefined && num < question.min) {
            nextErrors[question.id] = `Must be at least ${question.min}`;
          }
          if (question.max !== undefined && num > question.max) {
            nextErrors[question.id] = `Must be at most ${question.max}`;
          }
        }
      }

      if (
        question.maxLength !== undefined &&
        typeof value === "string" &&
        value.length > question.maxLength
      ) {
        nextErrors[question.id] =
          `Must be at most ${question.maxLength} characters`;
      }

      if (
        question.type === "checkbox" &&
        question.maxSelections !== undefined &&
        Array.isArray(value) &&
        value.length > question.maxSelections
      ) {
        nextErrors[question.id] =
          `Please select at most ${question.maxSelections} options`;
      }
    }

    return nextErrors;
  };

  const validatePage = (pageIndex: number): boolean => {
    const pageErrors = validateQuestions(pages[pageIndex].questions);
    setErrors((prev) => ({ ...prev, ...pageErrors }));
    return Object.keys(pageErrors).length === 0;
  };

  const validateAll = (): boolean => {
    const allErrors: FormErrors = {};
    for (const page of pages) {
      Object.assign(allErrors, validateQuestions(page.questions));
    }

    if (!turnstileToken) {
      allErrors.turnstile = "Please complete the CAPTCHA verification";
    }

    setErrors(allErrors);
    return Object.keys(allErrors).length === 0;
  };

  const handleNext = () => {
    if (!validatePage(currentPage)) return;
    if (currentPage < pages.length - 1) {
      setCurrentPage((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevious = () => {
    if (currentPage > 0) {
      setCurrentPage((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateAll()) return;

    setStatus("submitting");
    setErrors({});

    try {
      const apiBase = import.meta.env.PUBLIC_API_URL || "/api";
      const apiUrl = `${apiBase.replace(/\/$/, "")}/survey`;
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surveySlug: survey.slug || survey.title,
          surveyTitle: survey.title,
          responses: values,
          turnstileToken,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrors({
          submit: data.message || "Something went wrong. Please try again.",
        });
        setStatus("idle");
        turnstileRef.current?.reset();
        return;
      }

      setStatus("success");
    } catch {
      setErrors({
        submit: "Network error. Please check your connection and try again.",
      });
      setStatus("idle");
      turnstileRef.current?.reset();
    }
  };

  if (status === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card
          variant="bubble"
          className="flex flex-col items-center justify-center px-6 py-12 text-center"
        >
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-7 w-7 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">Thank you!</h3>
          <p className="mt-2 max-w-md text-muted-foreground">
            {survey.successMessage || "Your response has been recorded."}
          </p>
          <a
            href="/surveys"
            className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <ChevronLeft size={16} />
            Back to surveys
          </a>
        </Card>
      </motion.div>
    );
  }

  const page = pages[currentPage];
  const isFirstPage = currentPage === 0;
  const isLastPage = currentPage === pages.length - 1;

  return (
    <form onSubmit={handleSubmit} className="space-y-8" noValidate>
      <AnimatePresence>
        {errors.submit && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errors.submit}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {isMultiPage && (
        <div className="sticky top-0 z-20 -mx-4 space-y-2 bg-background/80 px-4 py-3 backdrop-blur-sm sm:static sm:mx-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Page {currentPage + 1} of {pages.length}
            </span>
            <span className="font-medium text-primary">{progress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="flex justify-center gap-2" role="tablist">
            {pages.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => {
                  if (index < currentPage || validatePage(currentPage)) {
                    setCurrentPage(index);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                className={cn(
                  "h-2 w-2 rounded-full transition-all",
                  index === currentPage
                    ? "w-6 bg-primary"
                    : index < currentPage
                      ? "bg-primary/50"
                      : "bg-muted-foreground/25",
                )}
                aria-label={`Go to page ${index + 1}`}
                aria-current={index === currentPage ? "step" : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {hasDraft && writable && (
        <div className="flex items-center justify-end gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Check className="h-3 w-3 text-primary" />
            Draft saved
          </span>
          <button
            type="button"
            onClick={clearDraft}
            className="inline-flex items-center gap-1 text-destructive transition-colors hover:text-destructive/80"
            aria-label="Clear all draft answers"
          >
            <X className="h-3 w-3" />
            Clear all
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={currentPage}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {(page.title !== survey.title || page.description || page.image) && (
            <div className="space-y-3">
              {page.title !== survey.title && (
                <h2 className="text-xl font-semibold text-foreground">
                  {page.title}
                </h2>
              )}
              {page.description && (
                <p className="text-sm text-muted-foreground">
                  {page.description}
                </p>
              )}
              {page.image && (
                <div className="overflow-hidden rounded-xl border border-border">
                  <img
                    src={page.image}
                    alt=""
                    className="w-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}
            </div>
          )}

          <div className="space-y-5">
            {page.questions.map((question, index) => (
              <motion.div
                key={question.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  variant="bubble"
                  className={cn(
                    "relative z-10 p-5 transition-colors focus-within:ring-2 focus-within:ring-primary/20",
                    errors[question.id] && "ring-2 ring-destructive/30",
                  )}
                >
                  <QuestionField
                    question={question}
                    questionNumber={questionOffsets[currentPage] + index + 1}
                    totalQuestions={totalQuestions}
                    value={values[question.id]}
                    onChange={(value) => setValue(question.id, value)}
                    error={errors[question.id]}
                  />
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="space-y-4">
        {isLastPage && (
          <>
            <Turnstile
              ref={turnstileRef}
              siteKey={import.meta.env.PUBLIC_TURNSTILE_SITE_KEY || ""}
              onSuccess={setTurnstileToken}
              onError={() =>
                setErrors((prev) => ({
                  ...prev,
                  turnstile: "CAPTCHA failed to load",
                }))
              }
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
              <p className="text-center text-sm text-destructive">
                {errors.turnstile}
              </p>
            )}
          </>
        )}

        <div className="flex gap-3">
          {isMultiPage && !isFirstPage && (
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={status === "submitting"}
              className="flex-1"
              size="lg"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
          )}

          {isLastPage ? (
            <Button
              type="submit"
              disabled={status === "submitting"}
              loading={status === "submitting"}
              className="flex-1"
              size="lg"
            >
              {status !== "submitting" && (
                <Send className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              )}
              {survey.submitLabel || "Submit"}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleNext}
              disabled={status === "submitting"}
              className="flex-1"
              size="lg"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}

interface QuestionFieldProps {
  question: SurveyQuestion;
  questionNumber: number;
  totalQuestions: number;
  value: string | string[] | undefined;
  onChange: (value: string | string[]) => void;
  error?: string;
}

function QuestionField({
  question,
  questionNumber,
  totalQuestions,
  value,
  onChange,
  error,
}: QuestionFieldProps) {
  const options = React.useMemo(
    () => question.options?.map(normalizeOption) ?? [],
    [question.options],
  );

  const showCharCount =
    question.maxLength !== undefined &&
    ["text", "email", "url", "textarea"].includes(question.type);
  const charCount = showCharCount ? ((value as string) || "").length : 0;

  return (
    <fieldset className="space-y-3">
      <legend className="text-base font-semibold text-foreground">
        <span className="mr-2 inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-primary/10 px-1.5 text-xs font-bold text-primary">
          Q{questionNumber}
        </span>
        {question.label}
        {question.required && <span className="ml-1 text-destructive">*</span>}
      </legend>

      {question.description && (
        <p className="text-sm text-muted-foreground">{question.description}</p>
      )}

      {(question.image || question.video) && (
        <MediaBlock image={question.image} video={question.video} />
      )}

      {question.type === "text" && (
        <div className="space-y-1">
          <Input
            type="text"
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder}
            maxLength={question.maxLength}
            error={!!error}
          />
          {showCharCount && (
            <CharacterCount
              current={charCount}
              max={question.maxLength}
              className="flex justify-end pr-2"
            />
          )}
        </div>
      )}

      {question.type === "email" && (
        <div className="space-y-1">
          <Input
            type="email"
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder}
            maxLength={question.maxLength}
            error={!!error}
          />
          {showCharCount && (
            <CharacterCount
              current={charCount}
              max={question.maxLength}
              className="flex justify-end pr-2"
            />
          )}
        </div>
      )}

      {question.type === "url" && (
        <div className="space-y-1">
          <Input
            type="url"
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder}
            maxLength={question.maxLength}
            error={!!error}
          />
          {showCharCount && (
            <CharacterCount
              current={charCount}
              max={question.maxLength}
              className="flex justify-end pr-2"
            />
          )}
        </div>
      )}

      {question.type === "number" && (
        <Input
          type="number"
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder}
          min={question.min}
          max={question.max}
          error={!!error}
        />
      )}

      {question.type === "textarea" && (
        <div className="space-y-1">
          <Textarea
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder}
            maxLength={question.maxLength}
            rows={4}
            error={!!error}
          />
          {showCharCount && (
            <CharacterCount
              current={charCount}
              max={question.maxLength}
              className="flex justify-end pr-2"
            />
          )}
        </div>
      )}

      {question.type === "select" && (
        <Select
          value={(value as string) || ""}
          onChange={onChange}
          options={options}
          placeholder={question.placeholder || "Select an option"}
          error={!!error}
        />
      )}

      {question.type === "radio" && (
        <RadioGroup
          name={question.id}
          value={(value as string) || ""}
          onChange={onChange}
          options={options}
        />
      )}

      {question.type === "checkbox" && (
        <div className="space-y-2">
          {options.map((option) => {
            const current = (value as string[]) || [];
            const selected = current.includes(option.value);
            const atMax =
              question.maxSelections !== undefined &&
              current.length >= question.maxSelections;
            const disabled = !selected && atMax;

            return (
              <Checkbox
                key={option.value}
                checked={selected}
                disabled={disabled}
                onCheckedChange={(checked) => {
                  if (checked) {
                    if (
                      question.maxSelections !== undefined &&
                      current.length >= question.maxSelections
                    ) {
                      return;
                    }
                    onChange([...current, option.value]);
                  } else {
                    onChange(current.filter((v) => v !== option.value));
                  }
                }}
              >
                {option.label}
              </Checkbox>
            );
          })}
          {question.maxSelections !== undefined && (
            <p className="flex justify-end pr-2 text-xs text-muted-foreground">
              {((value as string[]) || []).length} / {question.maxSelections}{" "}
              selected
            </p>
          )}
        </div>
      )}

      {question.type === "rating" && (
        <RatingField
          value={value as string | undefined}
          onChange={onChange}
          min={question.min ?? 1}
          max={question.max ?? 5}
          minLabel={question.minLabel}
          maxLabel={question.maxLabel}
        />
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="sr-only" aria-live="polite">
        Question {questionNumber} of {totalQuestions}
      </div>
    </fieldset>
  );
}

function RatingField({
  value,
  onChange,
  min,
  max,
  minLabel,
  maxLabel,
}: {
  value: string | undefined;
  onChange: (value: string) => void;
  min: number;
  max: number;
  minLabel?: string;
  maxLabel?: string;
}) {
  const selected = value ? Number(value) : undefined;
  const items = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1">
        {items.map((num) => {
          const filled = selected !== undefined && selected >= num;
          return (
            <button
              key={num}
              type="button"
              onClick={() => onChange(String(num))}
              aria-pressed={filled}
              className={cn(
                "relative flex h-10 w-10 items-center justify-center rounded-lg transition-all",
                filled
                  ? "text-primary hover:text-primary/80"
                  : "text-muted-foreground/40 hover:text-primary/60",
              )}
            >
              <Star
                className={cn(
                  "h-6 w-6 transition-all",
                  filled ? "fill-current" : "",
                )}
              />
              <span className="sr-only">{num}</span>
            </button>
          );
        })}
      </div>
      {(minLabel || maxLabel) && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{minLabel || `${min}`}</span>
          <span>{maxLabel || `${max}`}</span>
        </div>
      )}
    </div>
  );
}

function MediaBlock({ image, video }: { image?: string; video?: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      {video ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video src={video} controls className="w-full" />
      ) : image ? (
        <img
          src={image}
          alt=""
          className="w-full object-cover"
          loading="lazy"
        />
      ) : null}
    </div>
  );
}
