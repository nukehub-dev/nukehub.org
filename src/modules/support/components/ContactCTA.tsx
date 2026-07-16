import { motion } from "framer-motion";
import { fadeInUp, viewportOnce } from "@lib/animations";
import { Mail, ArrowRight, Circle, type LucideIcon } from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  Mail,
  ArrowRight,
};

interface Props {
  title: string;
  description: string;
  icon?: string;
  primaryText: string;
  secondaryText: string;
  secondaryHref: string;
  onContactClick: () => void;
}

export function ContactCTA({
  title,
  description,
  icon = "Mail",
  primaryText,
  secondaryText,
  secondaryHref,
  onContactClick,
}: Props) {
  const Icon = iconMap[icon] || Circle;

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={fadeInUp}
      className="py-20"
    >
      <div className="bubble p-8 sm:p-12 text-center relative overflow-hidden">
        {/* Inner warm glow */}
        <div
          className="absolute left-1/2 top-0 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl opacity-40"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklch, var(--primary) 30%, transparent) 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon size={26} />
          </div>
          <h2 className="mt-6 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            {description}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onContactClick}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {primaryText}
              <ArrowRight size={16} />
            </button>
            <a
              href={secondaryHref}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              {secondaryText}
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
