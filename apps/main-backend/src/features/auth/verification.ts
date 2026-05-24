import type { OtpChannel, UserDoc } from '@shared/types/documents.js';

import { env } from '../../env.js';

export type VerificationPolicy = 'none' | 'email' | 'phone' | 'both';

// The channels a user must verify under the policy — restricted to the channels they
// actually supplied. You cannot be asked to verify a phone you didn't give: an absent
// channel is treated as satisfied. This makes "phone optional + policy=phone" coherent
// (a phone-less owner under policy `phone` is auto-verified).
export const requiredChannels = (user: Pick<UserDoc, 'email' | 'phone'>): OtpChannel[] => {
  const policy = env.AUTH_VERIFICATION as VerificationPolicy;
  const wanted: OtpChannel[] =
    policy === 'none'
      ? []
      : policy === 'email'
        ? ['email']
        : policy === 'phone'
          ? ['phone']
          : ['email', 'phone'];
  return wanted.filter((ch) => (ch === 'email' ? Boolean(user.email) : Boolean(user.phone)));
};

// Has the user satisfied every required channel? (the workspace-unlock gate)
export const isUserVerified = (user: UserDoc): boolean => {
  const channels = requiredChannels(user);
  return channels.every((ch) =>
    ch === 'email' ? user.emailVerifiedAt !== null : user.phoneVerifiedAt !== null,
  );
};

// The verified-at field for a user's already-verified state on a channel.
export const isChannelVerified = (user: UserDoc, channel: OtpChannel): boolean =>
  channel === 'email' ? user.emailVerifiedAt !== null : user.phoneVerifiedAt !== null;

// The address for a channel on a user (email lowercased, phone as stored).
export const channelTarget = (user: UserDoc, channel: OtpChannel): string | null =>
  channel === 'email' ? user.email : user.phone;
