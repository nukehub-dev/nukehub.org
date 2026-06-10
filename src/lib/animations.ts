import type { Transition, Variants } from "framer-motion";

// ============================================================================
// Easing curves (from NukeIDE / NukeLab design language)
// ============================================================================

export const easing = {
  standard: [0.4, 0, 0.2, 1] as const,
  decelerate: [0, 0, 0.2, 1] as const,
  accelerate: [0.4, 0, 1, 1] as const,
  bounce: [0.68, -0.55, 0.265, 1.55] as const,
};

// ============================================================================
// Transition presets
// ============================================================================

export const transitions = {
  fast: {
    duration: 0.15,
    ease: easing.standard,
  } satisfies Transition,

  normal: {
    duration: 0.3,
    ease: easing.standard,
  } satisfies Transition,

  slow: {
    duration: 0.5,
    ease: easing.standard,
  } satisfies Transition,

  spring: {
    type: "spring",
    stiffness: 300,
    damping: 30,
  } satisfies Transition,

  springSoft: {
    type: "spring",
    stiffness: 200,
    damping: 25,
  } satisfies Transition,

  layout: {
    type: "spring",
    stiffness: 400,
    damping: 35,
  } satisfies Transition,
};

// ============================================================================
// Framer Motion Variants
// ============================================================================

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: transitions.normal,
  },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.normal,
  },
};

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.normal,
  },
};

export const fadeInScale: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: transitions.springSoft,
  },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.normal,
  },
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: transitions.slow,
  },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: transitions.slow,
  },
};

// ============================================================================
// Scroll-triggered animation helpers
// ============================================================================

export const viewportOnce = {
  once: true,
  margin: "-80px",
};

export const viewportAlways = {
  once: false,
  margin: "-40px",
};
