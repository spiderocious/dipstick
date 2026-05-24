import { ROUTES } from '@dipstick/core';
import { useResendOtp, useVerifyOtp } from '@dipstick/api';
import { AppButton, AppInput, FieldRow } from '@dipstick/ui';
import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import { useApiError } from '@shared/errors';
import { DrawerService } from '@shared/drawer';

import { AUTH_TOAST, VERIFY_COPY } from '../auth.copy.ts';
import {
  clearPendingVerification,
  getPendingVerification,
  type PendingVerification,
} from '../utils/pending-verification.ts';
import { AuthShell } from './parts/auth-shell.tsx';

const FIELD = { code: 'code' } as const;

export function VerifyScreen() {
  const navigate = useNavigate();
  const verify = useVerifyOtp();
  const resend = useResendOtp();
  const { fieldError, handleError, clearError } = useApiError();

  const [pending, setPending] = useState<PendingVerification | null>(null);
  const [code, setCode] = useState('');

  useEffect(() => {
    setPending(getPendingVerification());
  }, []);

  // No phone in flight → nothing to verify; send the user to register.
  if (pending === null) return <Navigate to={ROUTES.REGISTER} replace />;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (pending === null) return;
    clearError();
    verify.mutate(
      { phone: pending.phone, code },
      {
        onSuccess: () => {
          clearPendingVerification();
          DrawerService.toast(VERIFY_COPY.title, { mark: AUTH_TOAST.verifiedMark });
          navigate(ROUTES.BRANCHES, { replace: true });
        },
        onError: handleError,
      },
    );
  }

  function handleResend() {
    if (pending === null) return;
    resend.mutate(
      { phone: pending.phone },
      {
        onSuccess: (data) => {
          if (data.dev_otp !== undefined) setPending({ ...pending, devOtp: data.dev_otp });
          DrawerService.toast(VERIFY_COPY.resend, { mark: AUTH_TOAST.resentMark });
        },
        onError: handleError,
      },
    );
  }

  return (
    <AuthShell
      overline={VERIFY_COPY.overline}
      title={VERIFY_COPY.title}
      subtitle={`${VERIFY_COPY.subtitlePrefix}${pending.phone}.`}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <FieldRow
          label={VERIFY_COPY.codeLabel}
          htmlFor={FIELD.code}
          error={fieldError(FIELD.code)}
          help={pending.devOtp !== undefined ? `${VERIFY_COPY.devNotePrefix}${pending.devOtp}` : undefined}
        >
          <AppInput
            id={FIELD.code}
            inputMode="numeric"
            numeric
            maxLength={6}
            autoComplete="one-time-code"
            value={code}
            invalid={fieldError(FIELD.code) !== undefined}
            onChange={(e) => setCode(e.target.value)}
          />
        </FieldRow>

        <AppButton type="submit" loading={verify.isPending} className="mt-1 w-full">
          {VERIFY_COPY.submit}
        </AppButton>
        <AppButton type="button" variant="quiet" loading={resend.isPending} onClick={handleResend}>
          {VERIFY_COPY.resend}
        </AppButton>
      </form>
    </AuthShell>
  );
}
