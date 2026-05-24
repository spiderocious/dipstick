import { BRANCH_STATUS } from '@dipstick/core';
import type { AppPillTone } from '@dipstick/ui';

export const ROLLUP_COPY = {
  overline: 'Morning roll-up',
  title: 'Yesterday, across every branch.',
  backToBranches: 'Branches',
  litres: 'Litres sold',
  gross: 'Gross',
  variance: 'Net variance',
  branchesHeading: 'Per branch',
  todoHeading: 'Things to do this morning',
  todoEmpty: 'Nothing flagged. A clean morning.',
} as const;

// Branch status (clean | short | reorder) → pill tone + label. Keyed off the domain POJO.
export const STATUS_TONE: Record<string, AppPillTone> = {
  [BRANCH_STATUS.CLEAN]: 'ok',
  [BRANCH_STATUS.SHORT]: 'short',
  [BRANCH_STATUS.REORDER]: 'watch',
};

export const STATUS_LABEL: Record<string, string> = {
  [BRANCH_STATUS.CLEAN]: 'Posted clean',
  [BRANCH_STATUS.SHORT]: 'Short',
  [BRANCH_STATUS.REORDER]: 'Reorder',
};
