// Request payloads — exact snake_case bodies the backend expects (docs/api-docs.md).

// The verification channel for OTP flows.
export type OtpChannel = 'email' | 'phone';

export interface RegisterPayload {
  name: string;
  business_name: string;
  email: string;
  phone?: string; // optional — validated only when present
  password: string;
}

export interface VerifyOtpPayload {
  channel: OtpChannel;
  target: string; // the email or phone being verified
  code: string;
}

export interface ResendOtpPayload {
  channel: OtpChannel;
  target: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface UpdateOrgPayload {
  name?: string;
  wordmark?: string | null;
}

export interface RolePayload {
  name?: string;
  permissions?: string[];
}

export interface TankInput {
  product: string;
  capacity_litres: number;
  reorder_threshold_litres: number;
}

export interface PumpInput {
  product: string;
  label: string;
}

export interface CreateBranchPayload {
  name: string;
  city: string;
  state: string;
  tanks?: TankInput[];
  pumps?: PumpInput[];
}

export interface UpdateBranchPayload {
  name?: string;
  city?: string;
  state?: string;
  settings?: Partial<{
    require_closing_dip: boolean;
    variance_flag_kobo: number;
    manager_may_set_price: boolean;
    delivery_tolerance_litres: number;
  }>;
}

export interface UpdatePumpPayload {
  label?: string;
  state?: string;
  fault_note?: string | null;
}

export interface AddStaffPayload {
  name: string;
  email: string;
  phone: string;
  role_id: string;
  default_pump_id?: string | null;
  password: string;
}

export interface UpdateStaffPayload {
  role_id?: string;
  default_pump_id?: string | null;
  is_active?: boolean;
}

// Assign an existing person to another branch (role from that branch).
export interface AssignBranchPayload {
  role_id: string;
}

// Edit the staff member's account (the user record).
export interface EditAccountPayload {
  name?: string;
  email?: string;
  phone?: string | null;
}

export interface RosterPayload {
  week_start: string;
  assignments: Record<string, string[]>;
}

export interface DipPayload {
  tank_id: string;
  kind: string;
  litres: number;
  business_date: string;
}

export interface OpenShiftPayload {
  pump_id: string;
  attendant_id: string;
  window: string;
  business_date: string;
  opening_meter: number;
  price_per_litre_kobo?: number;
  price_override_reason?: string;
}

export interface CloseShiftPayload {
  closing_meter: number;
  cash_declared_kobo: number;
}

export interface VoidShiftPayload {
  reason: string;
  confirm: string;
}

export interface RecordDeliveryPayload {
  tank_id: string;
  product: string;
  waybill_number: string;
  supplier: string;
  driver_name: string;
  truck_plate: string;
  witness?: string;
  waybill_litres: number;
  cost_per_litre_kobo: number;
}

export interface StepDeliveryPayload {
  stage?: string;
  dip_before_litres?: number;
  dip_after_litres?: number;
  witness?: string;
}

export interface SignDeliveryPayload {
  witness: string;
}

export interface PricePreviewPayload {
  product: string;
  price_per_litre_kobo: number;
}

export interface SetPricePayload {
  product: string;
  price_per_litre_kobo: number;
  effective_at: string;
  reason: string;
}

export interface RecordExpensePayload {
  business_date: string;
  category: string;
  description: string;
  amount_kobo: number;
  witness?: string;
}

export interface AddNotePayload {
  body: string;
  mentions?: string[];
}
