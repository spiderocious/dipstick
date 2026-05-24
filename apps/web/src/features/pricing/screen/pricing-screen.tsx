import { P, PRODUCT, formatNaira, formatRelative, type Product } from '@dipstick/core';
import { usePrices } from '@dipstick/api';
import { AppButton, AppProductMark, AppSheet, SheetHead } from '@dipstick/ui';
import { useParams } from 'react-router-dom';

import { IconPrice } from '@icons';

import { useAuth } from '@shared/auth';
import { PageBody, PageHead, QueryState } from '@shared/screen';

import { PRICING_COPY } from '../pricing.copy.ts';
import { openSetPrice } from './parts/set-price-form.tsx';

export function PricingScreen() {
  const { branchId = '' } = useParams<{ branchId: string }>();
  const { can } = useAuth();
  const query = usePrices(branchId);
  const canSet = can(P.CAN_SET_PRICE);

  return (
    <PageBody>
      <PageHead
        overline={PRICING_COPY.overline}
        title={PRICING_COPY.title}
        actions={
          canSet ? (
            <AppButton leadingIcon={<IconPrice size={15} />} onClick={() => openSetPrice(branchId, PRODUCT.PMS)}>
              {PRICING_COPY.setPrice}
            </AppButton>
          ) : undefined
        }
      />
      <QueryState isLoading={query.isLoading} isError={query.isError} data={query.data}>
        {(items) => (
          <div className="grid grid-cols-3 gap-4">
            {items.map((row) => (
              <AppSheet key={row.product} pad="md">
                <SheetHead title={<AppProductMark product={row.product as Product} />} />
                {row.price !== null ? (
                  <>
                    <div className="font-mono text-[28px] font-medium tabular-nums leading-none text-ink">
                      {formatNaira(row.price.price_per_litre_kobo)}
                      <span className="ml-1 font-sans text-[12px] text-ink-tertiary">/L</span>
                    </div>
                    <div className="mt-2 font-mono text-[11px] text-ink-tertiary">
                      {PRICING_COPY.effectiveAt} {formatRelative(row.price.effective_at)}
                    </div>
                  </>
                ) : (
                  <p className="font-serif text-[14px] italic text-ink-tertiary">{PRICING_COPY.noPrice}</p>
                )}
                {canSet && (
                  <AppButton variant="quiet" size="sm" className="mt-3" onClick={() => openSetPrice(branchId, row.product)}>
                    {PRICING_COPY.setPrice}
                  </AppButton>
                )}
              </AppSheet>
            ))}
          </div>
        )}
      </QueryState>
    </PageBody>
  );
}
