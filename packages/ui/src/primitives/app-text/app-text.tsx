import { type HTMLAttributes, type ElementType, type ReactNode } from 'react';

import { cn } from '../../utils/cn.js';

export type AppTextVariant =
  | 'display-1'
  | 'display-2'
  | 'heading-1'
  | 'heading-2'
  | 'heading-3'
  | 'body'
  | 'body-sm'
  | 'caption';

export interface AppTextProps extends HTMLAttributes<HTMLElement> {
  variant?: AppTextVariant;
  as?: ElementType;
  children?: ReactNode;
}

const VARIANT_CLASSES: Record<AppTextVariant, string> = {
  'display-1': 'font-serif text-5xl font-semibold leading-tight tracking-tight',
  'display-2': 'font-serif text-4xl font-semibold leading-tight tracking-tight',
  'heading-1': 'font-serif text-3xl font-semibold leading-snug',
  'heading-2': 'font-serif text-2xl font-semibold leading-snug',
  'heading-3': 'text-xl font-semibold leading-snug',
  body: 'text-base leading-relaxed',
  'body-sm': 'text-sm leading-relaxed',
  caption: 'text-xs uppercase tracking-wide text-ink-tertiary',
};

const DEFAULT_ELEMENT: Record<AppTextVariant, ElementType> = {
  'display-1': 'h1',
  'display-2': 'h1',
  'heading-1': 'h2',
  'heading-2': 'h3',
  'heading-3': 'h4',
  body: 'p',
  'body-sm': 'p',
  caption: 'span',
};

export function AppText({ variant = 'body', as, className, children, ...rest }: AppTextProps) {
  const Component = as ?? DEFAULT_ELEMENT[variant];
  return (
    <Component className={cn(VARIANT_CLASSES[variant], className)} {...rest}>
      {children}
    </Component>
  );
}
