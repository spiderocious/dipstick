// Auth feature copy. Toast MARKS are logic strings (const, referenced — never inlined). The
// visible label strings are human copy grouped per screen for one-place editing.

export const AUTH_TOAST = {
  registeredMark: '✓ ACCOUNT CREATED',
  verifiedMark: '✓ VERIFIED',
  resentMark: '✓ CODE SENT',
  signedInMark: '✓ SIGNED IN',
} as const;

// Channel-neutral label for the address being verified (email or phone).
export const CHANNEL_LABEL = { email: 'email', phone: 'phone number' } as const;

export const LOGIN_COPY = {
  overline: 'Sign in',
  title: 'Welcome back.',
  subtitle: 'The day-book is waiting.',
  emailLabel: 'Email',
  passwordLabel: 'Password',
  submit: 'Sign in',
  toRegister: 'New here? Create an owner account',
} as const;

export const REGISTER_COPY = {
  overline: 'Create account',
  title: 'Open your logbook.',
  subtitle: 'You’re the owner. Add managers and attendants once you’re in.',
  nameLabel: 'Your name',
  businessLabel: 'Business name',
  emailLabel: 'Email',
  phoneLabel: 'Phone number (optional)',
  passwordLabel: 'Password',
  passwordHelp: 'At least 8 characters.',
  submit: 'Create account',
  toLogin: 'Already have an account? Sign in',
} as const;

export const VERIFY_COPY = {
  overline: 'Verify account',
  title: 'Enter the code.',
  subtitlePrefix: 'We sent a 6-digit code to ',
  codeLabel: 'Verification code',
  submit: 'Verify & continue',
  resend: 'Resend code',
  devNotePrefix: 'Dev code: ',
} as const;
