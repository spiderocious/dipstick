import {
  EXPENSE_CATEGORY,
  PUMP_STATE,
  SHIFT_STATUS,
  SHIFT_WINDOW,
  VARIANCE_STATUS,
  type ExpenseCategory,
} from '@dipstick/core';

// Display labels keyed off the domain literal POJOs. The KEYS are the logic values (never
// inlined); the VALUES are human copy. One place to translate a status/category/window to text.

export const VARIANCE_LABEL: Record<string, string> = {
  [VARIANCE_STATUS.BALANCED]: 'Balanced',
  [VARIANCE_STATUS.SHORT]: 'Short',
  [VARIANCE_STATUS.OVER]: 'Over',
};

export const SHIFT_STATUS_LABEL: Record<string, string> = {
  [SHIFT_STATUS.OPEN]: 'Open',
  [SHIFT_STATUS.CLOSED]: 'Closed',
  [SHIFT_STATUS.POSTED]: 'Posted',
  [SHIFT_STATUS.VOIDED]: 'Voided',
};

export const PUMP_STATE_LABEL: Record<string, string> = {
  [PUMP_STATE.IDLE]: 'Idle',
  [PUMP_STATE.LIVE]: 'Live',
  [PUMP_STATE.OFFLINE]: 'Offline',
};

export const SHIFT_WINDOW_LABEL: Record<string, string> = {
  [SHIFT_WINDOW.MORNING]: 'Morning · 06:00–14:00',
  [SHIFT_WINDOW.EVENING]: 'Evening · 14:00–22:00',
  [SHIFT_WINDOW.OFF]: 'Off',
};

export const SHIFT_WINDOW_SHORT: Record<string, string> = {
  [SHIFT_WINDOW.MORNING]: 'Morning',
  [SHIFT_WINDOW.EVENING]: 'Evening',
  [SHIFT_WINDOW.OFF]: 'Off',
};

export const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  [EXPENSE_CATEGORY.GENERATOR_DIESEL]: 'Generator diesel',
  [EXPENSE_CATEGORY.MAINTENANCE]: 'Maintenance',
  [EXPENSE_CATEGORY.UNION_DUES]: 'Union / NUPENG dues',
  [EXPENSE_CATEGORY.FORECOURT_SUNDRY]: 'Forecourt sundry',
  [EXPENSE_CATEGORY.CASH_ADVANCE]: 'Cash advance',
  [EXPENSE_CATEGORY.OTHER]: 'Other',
};
