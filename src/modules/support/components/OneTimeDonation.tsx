import { motion } from "framer-motion";
import { fadeInUp, staggerContainer, viewportOnce } from "@lib/animations";
import { Heart, Plus } from "lucide-react";
import type { OneTimeDonationData } from "@modules/support/types";

interface Props {
  data: OneTimeDonationData;
  onContactClick: (
    inquiryType: string,
    additionalValues?: Record<string, string>,
  ) => void;
}

export function OneTimeDonation({ data, onContactClick }: Props) {
  return (
    <section id="one-time-donation" className="py-20 border-t border-border/50">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={staggerContainer}
      >
        <motion.div variants={fadeInUp} className="text-center mb-14">
          <div className="inline-flex items-center justify-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-6">
            <Heart size={14} />
            <span>One-time Support</span>
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {data.title}
          </h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto text-lg">
            {data.description}
          </p>
        </motion.div>

        <motion.div
          variants={fadeInUp}
          className="mx-auto max-w-4xl rounded-3xl border border-border/60 bg-card/50 backdrop-blur-sm p-6 sm:p-10"
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {data.amounts.map((amount) => (
              <motion.button
                key={amount.amount}
                variants={fadeInUp}
                whileHover={{
                  y: -4,
                  transition: { type: "spring", stiffness: 300, damping: 20 },
                }}
                onClick={() =>
                  onContactClick(amount.inquiryType, {
                    amount: amount.amount,
                  })
                }
                className="group flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-background/60 p-5 text-center transition-all duration-200 hover:border-primary/40 hover:bg-primary/[0.04] hover:shadow-lg hover:shadow-primary/10 active:scale-[0.98]"
              >
                <span className="text-2xl font-extrabold tracking-tight text-foreground">
                  {amount.amount}
                </span>
                <span className="mt-1 text-xs font-medium text-muted-foreground">
                  {amount.label}
                </span>
                <span className="mt-4 inline-flex items-center rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  {amount.cta}
                </span>
              </motion.button>
            ))}
          </div>

          <div className="mt-6 flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border/80 bg-muted/20 p-6 sm:flex-row sm:justify-between">
            <div className="text-center sm:text-left">
              <p className="text-sm font-medium text-foreground">
                {data.custom.label}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Every amount makes a difference.
              </p>
            </div>
            <button
              onClick={() => onContactClick(data.custom.inquiryType)}
              className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition-all hover:border-primary/40 hover:bg-primary/[0.04] hover:text-primary active:scale-[0.98]"
            >
              <Plus size={16} />
              {data.custom.cta}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
