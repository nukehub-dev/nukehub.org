import * as React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle } from "lucide-react";
import { cn } from "@lib/utils";
import { useFocusTrap } from "@lib/useFocusTrap";
import { ContactForm } from "./ContactForm";

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultInquiryType?: string;
}

export function ContactModal({
  isOpen,
  onClose,
  defaultInquiryType = "",
}: ContactModalProps) {
  const [mounted, setMounted] = React.useState(false);
  const modalRef = useFocusTrap<HTMLDivElement>(isOpen);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  React.useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm dark:bg-black/70 dark:backdrop-blur-md"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            ref={modalRef}
            className={cn(
              "relative w-full overflow-hidden rounded-2xl border shadow-2xl",
              "bg-background/95 backdrop-blur-2xl border-border/60",
              "dark:bg-black/50 dark:border-white/10 dark:shadow-black/40",
              "max-w-[56rem] max-h-[92vh] flex flex-col",
            )}
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 12 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top glow */}
            <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-3/4 -translate-x-1/2 rounded-full bg-primary/20 blur-[80px] opacity-60" />

            {/* Header */}
            <div className="relative flex items-start justify-between border-b border-border/60 dark:border-white/5 px-6 pt-7 pb-5 sm:px-10">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  Get in Touch
                </h2>
                <p className="mt-1.5 text-sm sm:text-base text-muted-foreground">
                  We will get back to you within 24 hours.
                </p>
              </div>
              <button
                onClick={onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-muted/50 text-muted-foreground backdrop-blur-sm hover:bg-muted hover:text-foreground transition-colors dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="relative overflow-y-auto px-6 pb-10 pt-6 sm:px-10">
              <ContactForm
                defaultInquiryType={defaultInquiryType}
                onSuccess={() => {
                  // Auto-close after delay
                  setTimeout(() => onClose(), 2000);
                }}
                successContent={
                  <div className="flex flex-col items-center py-10 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                      <CheckCircle size={32} className="text-emerald-500" />
                    </div>
                    <h3 className="mt-5 text-lg font-semibold text-foreground">
                      Message Sent!
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground max-w-xs">
                      Thank you for reaching out. We will get back to you soon.
                    </p>
                    <button
                      onClick={onClose}
                      className="mt-7 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:brightness-110 transition-all"
                    >
                      Close
                    </button>
                  </div>
                }
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
