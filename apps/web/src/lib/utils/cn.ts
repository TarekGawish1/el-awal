import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility to merge Tailwind classes with conditional clsx values
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
