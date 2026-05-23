// Theme
export * from './theme/index.js';

// Utils
export { cn } from './utils/cn.js';

// Primitives
export { AppButton } from './primitives/app-button/index.js';
export type { AppButtonVariant, AppButtonProps } from './primitives/app-button/index.js';
export { AppText } from './primitives/app-text/index.js';
export type { AppTextVariant, AppTextProps } from './primitives/app-text/index.js';

// Icons are NOT re-exported here. Import them via the dedicated proxy:
//   import { IconHome } from '@icons';
// This keeps the icon source swappable in one file.
