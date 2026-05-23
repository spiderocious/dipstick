import { AppButton, type AppButtonVariant, type AppButtonSize } from '@dipstick/ui';

import { IconForward } from '@icons';

import { PageHead, RefBlock, RefRow } from './preview-canvas.tsx';

const VARIANTS: readonly AppButtonVariant[] = ['primary', 'secondary', 'quiet', 'ghost', 'danger'];
const SIZES: readonly AppButtonSize[] = ['sm', 'md', 'lg'];

export function ButtonsPart() {
  return (
    <div>
      <PageHead index="10 / PRIMITIVES" title="Buttons" subtitle="AppButton from @dipstick/ui" />

      <p className="mb-6 text-[13px] leading-[1.65]" style={{ color: 'var(--ink-3)', maxWidth: '64ch' }}>
        Five voices, rendered from the real <code>AppButton</code> primitive — not copies. Primary is the
        emerald commitment; secondary the ink-outline acknowledgement; quiet and ghost recede; danger uses
        oxblood and is reserved for the void idiom and irreversible actions.
      </p>

      <RefBlock title="Variants">
        {VARIANTS.map((variant) => (
          <RefRow key={variant} label={variant}>
            <AppButton variant={variant}>
              {variant === 'danger' ? 'Void posted shift' : 'Post shift'}
            </AppButton>
            <AppButton variant={variant} trailingIcon={<IconForward size={15} />}>
              Continue
            </AppButton>
            <AppButton variant={variant} disabled>
              Disabled
            </AppButton>
          </RefRow>
        ))}
      </RefBlock>

      <div className="h-6" />

      <RefBlock title="Sizes">
        {SIZES.map((size) => (
          <RefRow key={size} label={size}>
            <AppButton size={size}>Post shift</AppButton>
            <AppButton size={size} variant="secondary">
              Edit entry
            </AppButton>
          </RefRow>
        ))}
      </RefBlock>

      <div className="h-6" />

      <RefBlock title="States">
        <RefRow label="loading">
          <AppButton loading>Posting</AppButton>
        </RefRow>
        <RefRow label="with icon">
          <AppButton leadingIcon={<IconForward size={15} />}>Open shift</AppButton>
          <AppButton trailingIcon={<IconForward size={15} />}>Next</AppButton>
        </RefRow>
        <RefRow label="full width">
          <div className="w-full">
            <AppButton className="w-full">Post the day-book</AppButton>
          </div>
        </RefRow>
      </RefBlock>
    </div>
  );
}
