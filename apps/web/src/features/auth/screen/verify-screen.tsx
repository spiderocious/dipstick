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
  setPendingVerification,
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

  // Nothing in the verification queue → nothing to verify; send the user to register.
  if (pending === null) return <Navigate to={ROUTES.REGISTER} replace />;

  // Verify the head of the queue (policy `both` may have two channels; worked in order).
  const current = pending.channels[0];
  if (current === undefined) return <Navigate to={ROUTES.REGISTER} replace />;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (current === undefined) return;
    clearError();
    verify.mutate(
      { channel: current.channel, target: current.target, code },
      {
        onSuccess: (data) => {
          DrawerService.toast(VERIFY_COPY.title, { mark: AUTH_TOAST.verifiedMark });
          // Done (tokens issued / queue empty) → into the app.
          if (!data.verification_required || data.tokens !== null || data.pending.length === 0) {
            clearPendingVerification();
            navigate(ROUTES.BRANCHES, { replace: true });
            return;
          }
          // More channels remain (policy `both`): advance the queue, clear the field.
          const next: PendingVerification = {
            channels: data.pending.map((p) => ({
              channel: p.channel,
              target: p.target,
              ...(p.dev_otp !== undefined ? { devOtp: p.dev_otp } : {}),
            })),
          };
          setPendingVerification(next);
          setPending(next);
          setCode('');
        },
        onError: handleError,
      },
    );
  }

  function handleResend() {
    if (current === undefined || pending === null) return;
    const queue = pending.channels;
    resend.mutate(
      { channel: current.channel, target: current.target },
      {
        onSuccess: (data) => {
          if (data.dev_otp !== undefined) {
            const devOtp = data.dev_otp;
            const updated: PendingVerification = {
              channels: queue.map((c, i) => (i === 0 ? { ...c, devOtp } : c)),
            };
            setPendingVerification(updated);
            setPending(updated);
          }
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
      subtitle={`${VERIFY_COPY.subtitlePrefix}${current.target}.`}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <FieldRow
          label={VERIFY_COPY.codeLabel}
          htmlFor={FIELD.code}
          error={fieldError(FIELD.code)}
          help={current.devOtp !== undefined ? `${VERIFY_COPY.devNotePrefix}${current.devOtp}` : undefined}
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
