import { motion, useScroll, useTransform } from 'framer-motion';

export function ScrollIndicator() {
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 200], [1, 0]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.8, duration: 0.8 }}
      style={{ opacity }}
      className="flex flex-col items-center gap-3"
    >
      <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
        Scroll to explore
      </span>
      <div className="relative h-10 w-[1px] overflow-hidden bg-muted-foreground/20">
        <motion.div
          className="absolute inset-x-0 top-0 h-full bg-primary"
          animate={{ scaleY: [0, 1, 0] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
            times: [0, 0.5, 1],
          }}
          style={{ transformOrigin: 'top' }}
        />
      </div>
    </motion.div>
  );
}
