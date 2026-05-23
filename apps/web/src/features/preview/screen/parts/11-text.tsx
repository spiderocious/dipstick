import { AppText, type AppTextVariant } from '@dipstick/ui';

import { PageHead, RefBlock, RefRow } from './preview-canvas.tsx';

const VARIANTS: readonly { variant: AppTextVariant; sample: string }[] = [
  { variant: 'display-1', sample: 'Ikeja Filling Station' },
  { variant: 'display-2', sample: 'Morning roll-up' },
  { variant: 'heading-1', sample: 'Deliveries this week' },
  { variant: 'heading-2', sample: 'Tank 2 · AGO' },
  { variant: 'heading-3', sample: 'Evening shift' },
  { variant: 'body', sample: 'Record the closing dip per tank at end of day.' },
  { variant: 'body-sm', sample: 'Attach a note explaining any variance.' },
  { variant: 'caption', sample: 'attendant · pump 3' },
];

export function TextPart() {
  return (
    <div>
      <PageHead index="11 / PRIMITIVES" title="Text" subtitle="AppText variants from @dipstick/ui" />

      <RefBlock title="Variants">
        {VARIANTS.map(({ variant, sample }) => (
          <RefRow key={variant} label={variant}>
            <AppText variant={variant}>{sample}</AppText>
          </RefRow>
        ))}
      </RefBlock>
    </div>
  );
}
