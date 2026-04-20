import type { KeyrackGrantMechanism } from '@src/domain.objects/keyrack';

/**
 * .what = detect mech field from value (JSON blob or plain string)
 * .why = enables vaults to translate github app blobs via inferred mech
 */
export const inferKeyrackMechForGet = (input: {
  value: string;
}): KeyrackGrantMechanism => {
  try {
    const parsed = JSON.parse(input.value);
    if (parsed.mech && typeof parsed.mech === 'string') {
      return parsed.mech as KeyrackGrantMechanism;
    }
  } catch {
    // not JSON, passthrough
  }
  return 'PERMANENT_VIA_REPLICA';
};
