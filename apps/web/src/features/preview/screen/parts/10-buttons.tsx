import { AppButton } from '@dipstick/ui';

import { IconForward } from '@icons';

import { PageHead, RefBlock, RefRow } from './preview-canvas.tsx';

export function ButtonsPart() {
  return (
    <div>
      <PageHead index="10 / PRIMITIVES" title="Buttons" subtitle="AppButton from @dipstick/ui" />

      <p className="mb-6 text-[13px] leading-[1.65]" style={{ color: 'var(--ink-3)', maxWidth: '64ch' }}>
        These are the real <code>AppButton</code> primitives rendered from the package — not copies. The
        danger variant uses oxblood and is reserved for the void idiom and irreversible actions.
      </p>

      <RefBlock>
        <RefRow label="primary">
          <AppButton>Post shift</AppButton>
          <AppButton trailingIcon={<IconForward size={16} />}>Continue</AppButton>
          <AppButton loading>Posting</AppButton>
          <AppButton disabled>Disabled</AppButton>
        </RefRow>
        <RefRow label="secondary">
          <AppButton variant="secondary">Save draft</AppButton>
          <AppButton variant="secondary" disabled>
            Disabled
          </AppButton>
        </RefRow>
        <RefRow label="ghost">
          <AppButton variant="ghost">Cancel</AppButton>
        </RefRow>
        <RefRow label="danger · reserved">
          <AppButton variant="danger">Void posted shift</AppButton>
        </RefRow>
      </RefBlock>
    </div>
  );
}
