import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines clsx and tailwind-merge for clean, conflict-free class merging.
 * Usage: cn('base-class', conditional && 'conditional-class', 'override-class')
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
