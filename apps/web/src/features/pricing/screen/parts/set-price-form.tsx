import { PRODUCTS, formatNaira, parseNairaToKobo } from '@dipstick/core';
import { usePricePreview, useSetPrice, type PricePreviewWire } from '@dipstick/api';
import { AppButton, AppInput, AppSelect, FieldRow, ModalLedger } from '@dipstick/ui';
import { useState, type FormEvent } from 'react';

import { DrawerService } from '@shared/drawer';
import { useApiError } from '@shared/errors';
import { formatLitres } from '@shared/format';

import { PRICING_COPY, SET_PRICE_COPY } from '../../pricing.copy.ts';

const FIELD = { product: 'product', price_per_litre_kobo: 'price_per_litre_kobo', effective_at: 'effective_at', reason: 'reason' } as const;

function SetPriceForm({ branchId, initialProduct, close }: { readonly branchId: string; readonly initialProduct: string; readonly close: () => void }) {
  const preview = usePricePreview(branchId);
  const setPrice = useSetPrice(branchId);
  const { fieldError, handleError, clearError } = useApiError();

  const [product, setProduct] = useState(initialProduct);
  const [price, setPrice_] = useState('');
  const [effectiveAt, setEffectiveAt] = useState(new Date().toISOString().slice(0, 16));
  const [reason, setReason] = useState('');
  const [impact, setImpact] = useState<PricePreviewWire | null>(null);

  function handlePreview() {
    clearError();
    preview.mutate(
      { product, price_per_litre_kobo: parseNairaToKobo(price) },
      { onSuccess: setImpact, onError: handleError },
    );
  }

  function handleConfirm(e: FormEvent) {
    e.preventDefault();
    clearError();
    setPrice.mutate(
      {
        product,
        price_per_litre_kobo: parseNairaToKobo(price),
        effective_at: new Date(effectiveAt).toISOString(),
        reason,
      },
      {
        onSuccess: () => {
          DrawerService.toast(`${product} → ${formatNaira(parseNairaToKobo(price))}`, { mark: PRICING_COPY.setMark });
          close();
        },
        onError: handleError,
      },
    );
  }

  return (
    <form onSubmit={handleConfirm} className="flex flex-col gap-4" noValidate>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FieldRow label={SET_PRICE_COPY.product} htmlFor={FIELD.product} error={fieldError(FIELD.product)}>
          <AppSelect id={FIELD.product} value={product} onChange={(e) => setProduct(e.target.value)}>
            {PRODUCTS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </AppSelect>
        </FieldRow>
        <FieldRow label={SET_PRICE_COPY.newPrice} htmlFor={FIELD.price_per_litre_kobo} error={fieldError(FIELD.price_per_litre_kobo)}>
          <AppInput id={FIELD.price_per_litre_kobo} numeric inputMode="decimal" value={price} onChange={(e) => setPrice_(e.target.value)} leadingAffix="₦" />
        </FieldRow>
      </div>

      <FieldRow label={SET_PRICE_COPY.effectiveAt} htmlFor={FIELD.effective_at} error={fieldError(FIELD.effective_at)}>
        <AppInput id={FIELD.effective_at} type="datetime-local" value={effectiveAt} onChange={(e) => setEffectiveAt(e.target.value)} />
      </FieldRow>

      <FieldRow label={SET_PRICE_COPY.reason} htmlFor={FIELD.reason} error={fieldError(FIELD.reason)}>
        <AppInput id={FIELD.reason} value={reason} onChange={(e) => setReason(e.target.value)} />
      </FieldRow>

      <AppButton type="button" variant="secondary" loading={preview.isPending} onClick={handlePreview}>
        {SET_PRICE_COPY.preview}
      </AppButton>

      {impact !== null && (
        <ModalLedger
          rows={[
            { k: SET_PRICE_COPY.deltaPerLitre, v: formatNaira(impact.delta_per_litre_kobo) },
            { k: SET_PRICE_COPY.litresInTank, v: `${formatLitres(impact.litres_in_tank)} L` },
            { k: SET_PRICE_COPY.revaluation, v: formatNaira(impact.revaluation_kobo) },
          ]}
        />
      )}

      <div className="mt-1 flex justify-end gap-2">
        <AppButton type="button" variant="quiet" onClick={close}>
          Cancel
        </AppButton>
        <AppButton type="submit" loading={setPrice.isPending}>
          {SET_PRICE_COPY.confirm}
        </AppButton>
      </div>
    </form>
  );
}

export function openSetPrice(branchId: string, product: string): void {
  DrawerService.launch((close) => <SetPriceForm branchId={branchId} initialProduct={product} close={close} />, {
    eyebrow: SET_PRICE_COPY.overline,
    title: SET_PRICE_COPY.title,
    maxWidth: 520,
  });
}
