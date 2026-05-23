// Theme
export * from './theme/index.js';

// Utils
export { cn } from './utils/cn.js';

// Primitives
export { AppButton } from './primitives/app-button/index.js';
export type {
  AppButtonVariant,
  AppButtonSize,
  AppButtonProps,
} from './primitives/app-button/index.js';
export { AppText } from './primitives/app-text/index.js';
export type { AppTextVariant, AppTextProps } from './primitives/app-text/index.js';
export { AppInput, AppTextarea, FieldRow } from './primitives/app-field/index.js';
export type {
  AppFieldSize,
  AppInputProps,
  AppTextareaProps,
  FieldRowProps,
} from './primitives/app-field/index.js';
export { AppCheckbox } from './primitives/app-checkbox/index.js';
export type { AppCheckboxProps } from './primitives/app-checkbox/index.js';
export { AppRadio, AppRadioGroup } from './primitives/app-radio/index.js';
export type { AppRadioProps, AppRadioGroupProps } from './primitives/app-radio/index.js';
export { AppSwitch } from './primitives/app-switch/index.js';
export type { AppSwitchProps } from './primitives/app-switch/index.js';
export { AppSegmented } from './primitives/app-segmented/index.js';
export type { AppSegmentedProps, AppSegmentedOption } from './primitives/app-segmented/index.js';
export { AppSelect } from './primitives/app-select/index.js';
export type { AppSelectProps, AppSelectSize } from './primitives/app-select/index.js';

// Data display
export { AppPill } from './data/app-pill/index.js';
export type { AppPillProps, AppPillTone } from './data/app-pill/index.js';
export { AppFlag } from './data/app-flag/index.js';
export type { AppFlagProps, AppFlagTone } from './data/app-flag/index.js';
export { AppAvatar, AppPulse } from './data/app-avatar/index.js';
export type {
  AppAvatarProps,
  AppAvatarSize,
  AppAvatarRole,
  AppPulseProps,
} from './data/app-avatar/index.js';
export { AppProductMark } from './data/app-product-mark/index.js';
export type { AppProductMarkProps } from './data/app-product-mark/index.js';
export { AppSheet, SheetHead } from './data/app-sheet/index.js';
export type { AppSheetProps, AppSheetPad, SheetHeadProps } from './data/app-sheet/index.js';
export { AppFigure } from './data/app-figure/index.js';
export type { AppFigureProps, AppFigureSize, AppFigureTone } from './data/app-figure/index.js';
export {
  AppTable,
  AppThead,
  AppTbody,
  AppTfoot,
  AppTr,
  AppTh,
  AppTd,
} from './data/app-table/index.js';
export type { AppTrProps, AppThProps, AppTdProps, AppTdVariant } from './data/app-table/index.js';
export { AppProgressBar, AppGauge } from './data/app-progress/index.js';
export type {
  AppProgressBarProps,
  AppGaugeProps,
  AppProgressTone,
} from './data/app-progress/index.js';
export { AppSkeleton, AppEmptyState } from './data/app-skeleton/index.js';
export type {
  AppSkeletonProps,
  AppSkeletonSize,
  AppEmptyStateProps,
} from './data/app-skeleton/index.js';
export { AppTooltip } from './data/app-tooltip/index.js';
export type { AppTooltipProps, AppTooltipPlacement } from './data/app-tooltip/index.js';

// Feedback & overlays
export { AppModal, ModalLedger, AppVoidConfirmModal } from './feedback/app-modal/index.js';
export type {
  AppModalProps,
  ModalLedgerProps,
  AppVoidConfirmModalProps,
} from './feedback/app-modal/index.js';
export { AppToast, AppBanner, AppInlineAlert } from './feedback/app-alerts/index.js';
export type {
  AppToastProps,
  AppToastTone,
  AppBannerProps,
  AppBannerTone,
  AppInlineAlertProps,
  AppInlineAlertTone,
} from './feedback/app-alerts/index.js';

// Icons are NOT re-exported here. Import them via the dedicated proxy:
//   import { IconHome } from '@icons';
// This keeps the icon source swappable in one file.
