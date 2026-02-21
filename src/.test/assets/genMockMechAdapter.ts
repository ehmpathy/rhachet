import type { IsoTimeStamp } from 'iso-time';

import type { KeyrackGrantMechanismAdapter } from '@src/domain.objects/keyrack';

/**
 * .what = generates a mock mechanism adapter for tests
 * .why = enables isolated unit tests without real mechanism logic
 */
export const genMockMechAdapter = (input?: {
  /** always valid if true, always invalid if false (default: true) */
  valid?: boolean;
  /** reason string when invalid */
  invalidReason?: string;
  /** transform function for translate (default: identity) */
  transform?: (value: string) => string;
  /** expiresAt to return from translate (default: undefined) */
  expiresAt?: IsoTimeStamp;
}): KeyrackGrantMechanismAdapter => {
  const valid = input?.valid ?? true;
  const invalidReason = input?.invalidReason ?? 'mock validation failed';
  const transform = input?.transform ?? ((v) => v);
  const expiresAt = input?.expiresAt;

  return {
    validate: () =>
      valid ? { valid: true } : { valid: false, reason: invalidReason },
    translate: async ({ secret }) => ({
      secret: transform(secret),
      expiresAt,
    }),
  };
};
