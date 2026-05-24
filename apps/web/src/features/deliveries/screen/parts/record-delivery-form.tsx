import { PRODUCT, PRODUCTS, parseNairaToKobo } from '@dipstick/core';
import { useBranch, useRecordDelivery, type RecordDeliveryPayload } from '@dipstick/api';
import { AppButton, AppInput, AppSelect, FieldRow } from '@dipstick/ui';
import { useState, type FormEvent } from 'react';

import { DrawerService } from '@shared/drawer';
import { useApiError } from '@shared/errors';

import { DELIVERIES_COPY, RECORD_DELIVERY_COPY } from '../../deliveries.copy.ts';

const FIELD = {
  product: 'product',
  tank_id: 'tank_id',
  waybill_number: 'waybill_number',
  supplier: 'supplier',
  driver_name: 'driver_name',
  truck_plate: 'truck_plate',
  witness: 'witness',
  waybill_litres: 'waybill_litres',
  cost_per_litre_kobo: 'cost_per_litre_kobo',
} as const;

function RecordDeliveryForm({ branchId, close }: { readonly branchId: string; readonly close: () => void }) {
  const branch = useBranch(branchId);
  const record = useRecordDelivery(branchId);
  const { fieldError, handleError, clearError } = useApiError();

  const tanks = branch.data?.tanks ?? [];
  const [product, setProduct] = useState<string>(PRODUCT.PMS);
  const [tankId, setTankId] = useState('');
  const [waybill, setWaybill] = useState('');
  const [supplier, setSupplier] = useState('');
  const [driver, setDriver] = useState('');
  const [plate, setPlate] = useState('');
  const [witness, setWitness] = useState('');
  const [litres, setLitres] = useState('');
  const [cost, setCost] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    const payload: RecordDeliveryPayload = {
      tank_id: tankId,
      product,
      waybill_number: waybill,
      supplier,
      driver_name: driver,
      truck_plate: plate,
      waybill_litres: Number(litres),
      cost_per_litre_kobo: parseNairaToKobo(cost),
      ...(witness !== '' ? { witness } : {}),
    };
    record.mutate(payload, {
      onSuccess: () => {
        DrawerService.toast(waybill, { mark: DELIVERIES_COPY.recordedMark });
        close();
      },
      onError: handleError,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FieldRow label={RECORD_DELIVERY_COPY.product} htmlFor={FIELD.product} error={fieldError(FIELD.product)}>
          <AppSelect id={FIELD.product} value={product} onChange={(e) => setProduct(e.target.value)}>
            {PRODUCTS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </AppSelect>
        </FieldRow>
        <FieldRow label={RECORD_DELIVERY_COPY.tank} htmlFor={FIELD.tank_id} error={fieldError(FIELD.tank_id)}>
          <AppSelect id={FIELD.tank_id} value={tankId} onChange={(e) => setTankId(e.target.value)}>
            <option value="">—</option>
            {tanks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.product} · {t.id}
              </option>
            ))}
          </AppSelect>
        </FieldRow>
      </div>

      <FieldRow label={RECORD_DELIVERY_COPY.waybillNumber} htmlFor={FIELD.waybill_number} error={fieldError(FIELD.waybill_number)}>
        <AppInput id={FIELD.waybill_number} value={waybill} onChange={(e) => setWaybill(e.target.value)} />
      </FieldRow>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FieldRow label={RECORD_DELIVERY_COPY.supplier} htmlFor={FIELD.supplier} error={fieldError(FIELD.supplier)}>
          <AppInput id={FIELD.supplier} value={supplier} onChange={(e) => setSupplier(e.target.value)} />
        </FieldRow>
        <FieldRow label={RECORD_DELIVERY_COPY.driver} htmlFor={FIELD.driver_name} error={fieldError(FIELD.driver_name)}>
          <AppInput id={FIELD.driver_name} value={driver} onChange={(e) => setDriver(e.target.value)} />
        </FieldRow>
        <FieldRow label={RECORD_DELIVERY_COPY.plate} htmlFor={FIELD.truck_plate} error={fieldError(FIELD.truck_plate)}>
          <AppInput id={FIELD.truck_plate} value={plate} onChange={(e) => setPlate(e.target.value)} />
        </FieldRow>
        <FieldRow label={RECORD_DELIVERY_COPY.witness} htmlFor={FIELD.witness} error={fieldError(FIELD.witness)}>
          <AppInput id={FIELD.witness} value={witness} onChange={(e) => setWitness(e.target.value)} />
        </FieldRow>
        <FieldRow label={RECORD_DELIVERY_COPY.waybillLitres} htmlFor={FIELD.waybill_litres} error={fieldError(FIELD.waybill_litres)}>
          <AppInput id={FIELD.waybill_litres} numeric inputMode="decimal" value={litres} onChange={(e) => setLitres(e.target.value)} trailingAffix="L" />
        </FieldRow>
        <FieldRow label={RECORD_DELIVERY_COPY.costPerLitre} htmlFor={FIELD.cost_per_litre_kobo} error={fieldError(FIELD.cost_per_litre_kobo)}>
          <AppInput id={FIELD.cost_per_litre_kobo} numeric inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} leadingAffix="₦" />
        </FieldRow>
      </div>

      <div className="mt-1 flex justify-end gap-2">
        <AppButton type="button" variant="quiet" onClick={close}>
          Cancel
        </AppButton>
        <AppButton type="submit" loading={record.isPending}>
          {RECORD_DELIVERY_COPY.submit}
        </AppButton>
      </div>
    </form>
  );
}

export function openRecordDelivery(branchId: string): void {
  DrawerService.launch((close) => <RecordDeliveryForm branchId={branchId} close={close} />, {
    eyebrow: RECORD_DELIVERY_COPY.overline,
    title: RECORD_DELIVERY_COPY.title,
    maxWidth: 560,
  });
}
