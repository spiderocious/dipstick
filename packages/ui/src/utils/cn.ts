import clsx, { type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Tiny helper used by every component. `clsx` flattens conditional classes;
// `twMerge` resolves Tailwind conflicts (e.g. last `px-*` wins).
export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));
