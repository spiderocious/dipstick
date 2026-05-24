import { ROUTES } from '@dipstick/core';
import { useLogin } from '@dipstick/api';
import { AppButton, AppInput, FieldRow } from '@dipstick/ui';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useApiError } from '@shared/errors';
import { DrawerService } from '@shared/drawer';

import { AUTH_TOAST, LOGIN_COPY } from '../auth.copy.ts';
import { AuthShell } from './parts/auth-shell.tsx';

const FIELD = { email: 'email', password: 'password' } as const;

export function LoginScreen() {
  const navigate = useNavigate();
  const login = useLogin();
  const { fieldError, handleError, clearError } = useApiError();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    login.mutate(
      { email, password },
      {
        onSuccess: () => {
          DrawerService.toast(LOGIN_COPY.title, { mark: AUTH_TOAST.signedInMark });
          navigate(ROUTES.DASHBOARD, { replace: true });
        },
        onError: handleError,
      },
    );
  }

  return (
    <AuthShell
      overline={LOGIN_COPY.overline}
      title={LOGIN_COPY.title}
      subtitle={LOGIN_COPY.subtitle}
      footer={
        <Link to={ROUTES.REGISTER} className="font-sans text-[13px] text-emerald hover:underline">
          {LOGIN_COPY.toRegister}
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <FieldRow label={LOGIN_COPY.emailLabel} htmlFor={FIELD.email} error={fieldError(FIELD.email)}>
          <AppInput
            id={FIELD.email}
            type="email"
            autoComplete="email"
            value={email}
            invalid={fieldError(FIELD.email) !== undefined}
            onChange={(e) => setEmail(e.target.value)}
          />
        </FieldRow>

        <FieldRow label={LOGIN_COPY.passwordLabel} htmlFor={FIELD.password} error={fieldError(FIELD.password)}>
          <AppInput
            id={FIELD.password}
            type="password"
            autoComplete="current-password"
            value={password}
            invalid={fieldError(FIELD.password) !== undefined}
            onChange={(e) => setPassword(e.target.value)}
          />
        </FieldRow>

        <AppButton type="submit" loading={login.isPending} className="mt-1 w-full">
          {LOGIN_COPY.submit}
        </AppButton>
      </form>
    </AuthShell>
  );
}
