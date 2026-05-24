import { ERROR_CODE, ERROR_MESSAGE, ERROR_TOAST_MARK, type ErrorCodeValue } from '@dipstick/core';
import { parseApiError, type ApiError } from '@dipstick/api';
import { useCallback, useState } from 'react';

import { DrawerService } from '@shared/drawer';

// The house rule: every API error surfaces BOTH ways — inline at the offending field AND as a
// toast carrying the summary. This hook owns that contract so no screen forgets one of them.
//
//   const { fieldError, handleError, clearError } = useApiError();
//   mutation.mutate(payload, { onError: handleError });
//   <FieldRow error={fieldError('email')}> … </FieldRow>

interface NormalizedError {
  readonly message: string;
  readonly field: string | null;
}

function isErrorCodeValue(code: number): code is ErrorCodeValue {
  return (Object.values(ERROR_CODE) as number[]).includes(code);
}

// ky throws HTTPError, whose JSON body is the flat ApiError. Pull it out (async), falling back
// to a generic internal error if the body isn't our shape.
async function extractApiError(err: unknown): Promise<ApiError> {
  if (err !== null && typeof err === 'object' && 'response' in err) {
    const response = (err as { response?: { json?: () => Promise<unknown> } }).response;
    if (response?.json) {
      try {
        return parseApiError(await response.json());
      } catch {
        return parseApiError(null);
      }
    }
  }
  return parseApiError(err);
}

function summaryFor(apiError: ApiError): string {
  // Prefer the server's specific message (it is field-aware copy for 1001); fall back to the
  // code's default summary.
  if (apiError.errorMessage.trim() !== '') return apiError.errorMessage;
  const code = isErrorCodeValue(apiError.errorCode) ? apiError.errorCode : ERROR_CODE.INTERNAL;
  return ERROR_MESSAGE[code];
}

export function useApiError() {
  const [error, setError] = useState<NormalizedError | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const handleError = useCallback((err: unknown) => {
    void (async () => {
      const apiError = await extractApiError(err);
      const message = summaryFor(apiError);
      const field = typeof apiError.field === 'string' ? apiError.field : null;
      setError({ message, field });
      // Both channels, always: toast carries the summary.
      DrawerService.toast(message, { tone: 'error', mark: ERROR_TOAST_MARK });
    })();
  }, []);

  // Inline message for a specific field name (snake_case, matching the API `field`).
  const fieldError = useCallback(
    (name: string): string | undefined =>
      error !== null && error.field === name ? error.message : undefined,
    [error],
  );

  // The current summary regardless of field (for a form-level inline banner).
  const formError = error !== null ? error.message : undefined;

  return { error, fieldError, formError, handleError, clearError };
}
