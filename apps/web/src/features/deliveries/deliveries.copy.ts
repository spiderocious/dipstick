import { DELIVERY_STAGE } from '@dipstick/core';

export const DELIVERIES_COPY = {
  overline: 'Deliveries',
  title: 'Tanker offloads.',
  record: 'Record offload',
  emptyTitle: 'No deliveries recorded.',
  emptyBody: 'Record an inbound tanker to start the guided offload.',
  recordedMark: '✓ OFFLOAD STARTED',
} as const;

export const DELIVERY_STAGE_LABEL: Record<string, string> = {
  [DELIVERY_STAGE.ARRIVED]: 'Tanker arrived',
  [DELIVERY_STAGE.DIP_BEFORE]: 'Dip before',
  [DELIVERY_STAGE.OFFLOADED]: 'Offload',
  [DELIVERY_STAGE.SIGNED]: 'Dip after & sign',
} as const;

export const DELIVERY_DETAIL_COPY = {
  overline: 'Tanker offload',
  waybillHeading: 'Waybill',
  supplier: 'Supplier',
  driver: 'Driver',
  plate: 'Truck plate',
  witness: 'Witness',
  waybillLitres: 'Waybill litres',
  costPerLitre: 'Cost / litre',
  dipBefore: 'Dip before (L)',
  dipAfter: 'Dip after (L)',
  variance: 'Variance',
  saveStep: 'Save step',
  sign: 'Sign offload',
  witnessLabel: 'Witness present',
  steppedMark: '✓ STEP SAVED',
  signedMark: '✓ OFFLOAD SIGNED',
} as const;

export const RECORD_DELIVERY_COPY = {
  overline: 'New delivery',
  title: 'Record an inbound tanker',
  product: 'Product',
  tank: 'Tank',
  waybillNumber: 'Waybill number',
  supplier: 'Supplier',
  driver: 'Driver name',
  plate: 'Truck plate',
  witness: 'Witness (optional)',
  waybillLitres: 'Waybill litres',
  costPerLitre: 'Cost per litre (₦)',
  submit: 'Start offload',
} as const;
