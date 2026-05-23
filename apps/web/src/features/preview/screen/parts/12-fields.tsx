import { AppInput, AppTextarea, FieldRow } from '@dipstick/ui';

import { PageHead, RefBlock, RefRow } from './preview-canvas.tsx';

export function FieldsPart() {
  return (
    <div>
      <PageHead index="12 / PRIMITIVES" title="Fields" subtitle="AppInput · AppTextarea · FieldRow" />

      <p className="mb-6 text-[13px] leading-[1.65]" style={{ color: 'var(--ink-3)', maxWidth: '64ch' }}>
        Every input that holds a number uses <code>numeric</code> — tabular monospace. The affix carries the
        unit (₦, /L, L) in a quieter recessed pane. <code>FieldRow</code> adds the label, help, and error
        scaffold and wires <code>htmlFor</code> to the field id.
      </p>

      <RefBlock title="Sizes">
        <RefRow label="sm">
          <div className="w-[220px]">
            <AppInput fieldSize="sm" placeholder="Search shifts…" />
          </div>
        </RefRow>
        <RefRow label="md (default)">
          <div className="w-[220px]">
            <AppInput placeholder="Attendant full name" />
          </div>
        </RefRow>
        <RefRow label="lg">
          <div className="w-[220px]">
            <AppInput fieldSize="lg" placeholder="What was paid?" />
          </div>
        </RefRow>
      </RefBlock>

      <div className="h-6" />

      <RefBlock title="Numeric & affixes">
        <RefRow label="numeric">
          <div className="w-[200px]">
            <AppInput numeric defaultValue="248,317.42" />
          </div>
        </RefRow>
        <RefRow label="trailing · L">
          <div className="w-[200px]">
            <AppInput numeric defaultValue="1,928.00" trailingAffix="L" />
          </div>
        </RefRow>
        <RefRow label="leading · ₦">
          <div className="w-[200px]">
            <AppInput numeric defaultValue="377,888.00" leadingAffix="₦" />
          </div>
        </RefRow>
        <RefRow label="₦ / L">
          <div className="w-[200px]">
            <AppInput numeric defaultValue="196.00" leadingAffix="₦" trailingAffix="/L" />
          </div>
        </RefRow>
      </RefBlock>

      <div className="h-6" />

      <RefBlock title="States">
        <RefRow label="disabled · carried">
          <div className="w-[200px]">
            <AppInput numeric defaultValue="247,503.42" trailingAffix="L" disabled />
          </div>
        </RefRow>
        <RefRow label="error">
          <div className="w-[260px]">
            <FieldRow
              label="Closing meter"
              error="Closing must be higher than opening (247,503.42)."
            >
              <AppInput numeric invalid defaultValue="247,003.42" trailingAffix="L" />
            </FieldRow>
          </div>
        </RefRow>
        <RefRow label="textarea">
          <div className="w-[320px]">
            <AppTextarea placeholder="Add a manager's note…" />
          </div>
        </RefRow>
      </RefBlock>

      <div className="h-6" />

      <RefBlock title="In a scene — close pump 03">
        <div className="grid w-full gap-5" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <FieldRow
            label="Opening meter"
            badge="from morning"
            help="Carried over from the morning shift sign-off."
            htmlFor="opening"
          >
            <AppInput id="opening" numeric defaultValue="247,503.42" trailingAffix="L" disabled />
          </FieldRow>
          <FieldRow label="Closing meter" help="Read the pump head once. Don't round." htmlFor="closing">
            <AppInput id="closing" numeric defaultValue="248,317.42" trailingAffix="L" />
          </FieldRow>
          <FieldRow label="Pump price tonight" htmlFor="price">
            <AppInput id="price" numeric defaultValue="196.00" leadingAffix="₦" trailingAffix="/L" />
          </FieldRow>
          <FieldRow label="Cash declared by Femi" htmlFor="cash">
            <AppInput id="cash" numeric defaultValue="159,544.00" leadingAffix="₦" />
          </FieldRow>
        </div>
      </RefBlock>
    </div>
  );
}
