import { type ZodError, type ZodType, type ZodTypeDef } from 'zod';

import { ValidationError } from '@lib/errors.js';

// One-field-at-a-time validation.
//
// The product wants the user to fix one input before seeing the next: if email AND phone
// are both invalid, surface "Email is invalid" first; once email is fixed, the next request
// surfaces the phone error. We achieve this by parsing with Zod, then — on failure —
// reducing the ZodError to its SINGLE most-relevant issue and throwing a ValidationError
// that names exactly that field.
//
// "Most relevant" = the issue whose path appears earliest in the object being validated,
// falling back to Zod's own issue order. This makes ordering stable and intuitive: the
// field the user would reach first in the form is reported first.

const fieldPath = (path: (string | number)[]): string =>
  path.length === 0 ? '_root' : path.map((p) => String(p)).join('.');

// Rank issues by the order their top-level key appears in the submitted body. Issues for
// keys not present in the body (e.g. a missing required field) sort after present ones but
// keep Zod's relative order. The result: deterministic, form-order-aligned reporting.
const pickPrimaryIssue = (err: ZodError, input: unknown): { field: string; message: string } => {
  const issues = err.issues;
  const inputKeys =
    input && typeof input === 'object' ? Object.keys(input as Record<string, unknown>) : [];

  const rank = (issue: (typeof issues)[number]): number => {
    const top = issue.path[0];
    if (typeof top !== 'string') return Number.MAX_SAFE_INTEGER;
    const idx = inputKeys.indexOf(top);
    return idx === -1 ? Number.MAX_SAFE_INTEGER - 1 : idx;
  };

  let best = issues[0]!;
  let bestRank = rank(best);
  for (let i = 1; i < issues.length; i += 1) {
    const r = rank(issues[i]!);
    if (r < bestRank) {
      best = issues[i]!;
      bestRank = r;
    }
  }

  return { field: fieldPath(best.path), message: best.message };
};

// Parse `input` with `schema`. On success returns the typed value; on failure throws a
// ValidationError carrying the ONE offending field + its message. The global error
// middleware turns that into the flat { errorCode: 1001, ... } body.
export const validate = <T>(
  schema: ZodType<T, ZodTypeDef, unknown>,
  input: unknown,
): T => {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const { field, message } = pickPrimaryIssue(result.error, input);
  throw new ValidationError(message, field);
};
