/**
 * EASY-LEARN (NOVA) Motion Design System
 * Unified timings, spring physics, and Framer Motion variants.
 */

export const MOTION_CONFIG = {
  duration: {
    fast: 0.2,
    normal: 0.35,
    slow: 0.6,
    cinematic: 0.9,
  },
  ease: {
    smooth: [0.25, 0.1, 0.25, 1],
    outQuint: [0.22, 1, 0.36, 1],
    inOutCubic: [0.65, 0, 0.35, 1],
    springBouncy: { type: 'spring', stiffness: 350, damping: 20 },
    springSmooth: { type: 'spring', stiffness: 220, damping: 28 },
    springSnappy: { type: 'spring', stiffness: 450, damping: 30 },
  }
};

// Word / Character reveal animation variants for hero headline
export const sentenceReveal = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      delay: 0.1,
      staggerChildren: 0.05,
    },
  },
};

export const wordReveal = {
  hidden: { opacity: 0, y: 30, rotateX: -20 },
  visible: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

// Stagger container
export const staggerContainer = (staggerChildren = 0.08, delayChildren = 0) => ({
  hidden: {},
  visible: {
    transition: {
      staggerChildren,
      delayChildren,
    },
  },
});

// Fade in up
export const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

// Scale in
export const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

// Page transition variants
export const pageTransition = {
  initial: { opacity: 0, scale: 0.98, y: 8 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1],
    },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    y: -8,
    transition: {
      duration: 0.25,
      ease: [0.65, 0, 0.35, 1],
    },
  },
};
