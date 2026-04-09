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
  /** transform function for deliverForGet (default: identity) */
  transform?: (value: string) => string;
  /** expiresAt to return from deliverForGet (default: undefined) */
  expiresAt?: IsoTimeStamp;
  /** source value to return from acquireForSet (default: '__mock_source__') */
  acquiredSource?: string;
}): KeyrackGrantMechanismAdapter => {
  const valid = input?.valid ?? true;
  const invalidReason = input?.invalidReason ?? 'mock validation failed';
  const transform = input?.transform ?? ((v) => v);
  const expiresAt = input?.expiresAt;
  const acquiredSource = input?.acquiredSource ?? '__mock_source__';

  return {
    validate: () =>
      valid ? { valid: true } : { valid: false, reasons: [invalidReason] },
    acquireForSet: async () => ({
      source: acquiredSource,
    }),
    deliverForGet: async ({ source }) => ({
      secret: transform(source),
      expiresAt,
    }),
  };
};
