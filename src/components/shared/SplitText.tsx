'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, type ElementType } from 'react';

interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  staggerDelay?: number;
  as?: ElementType;
  once?: boolean;
}

export function SplitText({
  text,
  className = '',
  delay = 0,
  staggerDelay = 0.03,
  as: Tag = 'span',
  once = true,
}: SplitTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once, margin: '-60px' });

  const words = text.split(' ');

  return (
    <Tag ref={ref as any} className={`inline-block ${className}`} aria-label={text}>
      {words.map((word, wordIndex) => (
        <span key={wordIndex} className="inline-block overflow-hidden mr-[0.25em] pb-[0.1em]">
          <motion.span
            className="inline-block"
            initial={{ y: '110%', rotateX: 35, opacity: 0 }}
            animate={
              isInView
                ? { y: 0, rotateX: 0, opacity: 1 }
                : { y: '110%', rotateX: 35, opacity: 0 }
            }
            transition={{
              duration: 0.55,
              ease: [0.215, 0.61, 0.355, 1],
              delay: delay + wordIndex * staggerDelay * 2.5,
            }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

interface SplitTextCharsProps {
  text: string;
  className?: string;
  delay?: number;
  staggerDelay?: number;
  as?: ElementType;
}

export function SplitTextChars({
  text,
  className = '',
  delay = 0,
  staggerDelay = 0.025,
  as: Tag = 'span',
}: SplitTextCharsProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  const characters = text.split('');

  return (
    <Tag ref={ref as any} className={`inline-block ${className}`} aria-label={text}>
      {characters.map((char, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.1em]" style={{ width: char === ' ' ? '0.3em' : undefined }}>
          <motion.span
            className="inline-block"
            initial={{ y: '100%', opacity: 0 }}
            animate={isInView ? { y: 0, opacity: 1 } : { y: '100%', opacity: 0 }}
            transition={{
              duration: 0.45,
              ease: [0.215, 0.61, 0.355, 1],
              delay: delay + i * staggerDelay,
            }}
          >
            {char === ' ' ? '\u00A0' : char}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}
