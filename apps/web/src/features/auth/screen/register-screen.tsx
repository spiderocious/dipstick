import { ROUTES } from '@dipstick/core';
import { useRegister } from '@dipstick/api';
import { AppButton, AppInput, FieldRow } from '@dipstick/ui';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useApiError } from '@shared/errors';
import { DrawerService } from '@shared/drawer';

import { AUTH_TOAST, REGISTER_COPY } from '../auth.copy.ts';
import { setPendingVerification } from '../utils/pending-verification.ts';
import { AuthShell } from './parts/auth-shell.tsx';

const FIELD = {
  name: 'name',
  business_name: 'business_name',
  email: 'email',
  phone: 'phone',
  password: 'password',
} as const;

export function RegisterScreen() {
  const navigate = useNavigate();
  const register = useRegister();
  const { fieldError, handleError, clearError } = useApiError();

  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    const trimmedPhone = phone.trim();
    register.mutate(
      {
        name,
        business_name: businessName,
        email,
        // Phone is optional — only send it when the user typed one (else it fails min-length).
        ...(trimmedPhone.length > 0 ? { phone: trimmedPhone } : {}),
        password,
      },
      {
        onSuccess: (data) => {
          DrawerService.toast(REGISTER_COPY.title, { mark: AUTH_TOAST.registeredMark });
          // Policy `none`: tokens already issued, nothing to verify → straight in.
          if (!data.verification_required && data.tokens !== null) {
            navigate(ROUTES.BRANCHES, { replace: true });
            return;
          }
          // Otherwise queue the pending channels (email/phone) for the verify screen.
          setPendingVerification({
            channels: data.pending.map((p) => ({
              channel: p.channel,
              target: p.target,
              ...(p.dev_otp !== undefined ? { devOtp: p.dev_otp } : {}),
            })),
          });
          navigate(ROUTES.VERIFY);
        },
        onError: handleError,
      },
    );
  }

  return (
    <AuthShell
      overline={REGISTER_COPY.overline}
      title={REGISTER_COPY.title}
      subtitle={REGISTER_COPY.subtitle}
      footer={
        <Link to={ROUTES.LOGIN} className="font-sans text-[13px] text-emerald hover:underline">
          {REGISTER_COPY.toLogin}
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <FieldRow label={REGISTER_COPY.nameLabel} htmlFor={FIELD.name} error={fieldError(FIELD.name)}>
          <AppInput
            id={FIELD.name}
            autoComplete="name"
            value={name}
            invalid={fieldError(FIELD.name) !== undefined}
            onChange={(e) => setName(e.target.value)}
          />
        </FieldRow>

        <FieldRow label={REGISTER_COPY.businessLabel} htmlFor={FIELD.business_name} error={fieldError(FIELD.business_name)}>
          <AppInput
            id={FIELD.business_name}
            value={businessName}
            invalid={fieldError(FIELD.business_name) !== undefined}
            onChange={(e) => setBusinessName(e.target.value)}
          />
        </FieldRow>

        <FieldRow label={REGISTER_COPY.emailLabel} htmlFor={FIELD.email} error={fieldError(FIELD.email)}>
          <AppInput
            id={FIELD.email}
            type="email"
            autoComplete="email"
            value={email}
            invalid={fieldError(FIELD.email) !== undefined}
            onChange={(e) => setEmail(e.target.value)}
          />
        </FieldRow>

        <FieldRow label={REGISTER_COPY.phoneLabel} htmlFor={FIELD.phone} error={fieldError(FIELD.phone)}>
          <AppInput
            id={FIELD.phone}
            type="tel"
            autoComplete="tel"
            value={phone}
            invalid={fieldError(FIELD.phone) !== undefined}
            onChange={(e) => setPhone(e.target.value)}
          />
        </FieldRow>

        <FieldRow
          label={REGISTER_COPY.passwordLabel}
          htmlFor={FIELD.password}
          help={REGISTER_COPY.passwordHelp}
          error={fieldError(FIELD.password)}
        >
          <AppInput
            id={FIELD.password}
            type="password"
            autoComplete="new-password"
            value={password}
            invalid={fieldError(FIELD.password) !== undefined}
            onChange={(e) => setPassword(e.target.value)}
          />
        </FieldRow>

        <AppButton type="submit" loading={register.isPending} className="mt-1 w-full">
          {REGISTER_COPY.submit}
        </AppButton>
      </form>
    </AuthShell>
  );
}
