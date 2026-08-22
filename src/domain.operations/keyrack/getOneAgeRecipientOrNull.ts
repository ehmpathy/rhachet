import { isExpectedCryptoMiss } from '@src/domain.operations/keyrack/isExpectedCryptoMiss';
import { sshPubkeyToAgeRecipient } from '@src/infra/ssh';

/**
 * .what = convert an ssh public key to an age recipient, or null if THIS pubkey is unconvertible
 * .why = recipient match converts many candidate pubkeys and skips the ones that do not convert
 *        (wrong key type, malformed pubkey) — but it must NOT skip a genuinely broken pure-esm crypto
 *        load. sshPubkeyToAgeRecipient now loads @noble/curves + @scure/base lazily
 *        (ehmpathy/rhachet#468), so a broken crypto install throws a MalfunctionError at call time.
 *        that error must fail LOUD (vision e6, rule.forbid.failhide) — not degrade to "no match found".
 *        isExpectedCryptoMiss draws that line ONCE for every caller: rethrow any HelpfulError, swallow
 *        only the bare per-key parse miss.
 * .note = returns null ONLY for a bare generic Error (this pubkey cannot be converted). every
 *         helpful-errors subclass (MalfunctionError, ConstraintError, and their parents) rethrows.
 * .note = `convert` is an OPTIONAL injected converter (dependency injection); it defaults to the
 *         real `sshPubkeyToAgeRecipient`. the unit test injects a fake converter to exercise the
 *         skip-vs-rethrow logic WITHOUT a `jest.mock` (rule.forbid.unit.remote-boundaries).
 */
export const getOneAgeRecipientOrNull = async (
  input: {
    pubkey: string;
  },
  context?: {
    convert?: (input: { pubkey: string }) => Promise<string>;
  },
): Promise<string | null> => {
  const convert = context?.convert ?? sshPubkeyToAgeRecipient;
  try {
    return await convert({ pubkey: input.pubkey });
  } catch (error) {
    // rethrow any rhachet-native error (broken crypto load, bad input) — fail loud (e6)
    if (!isExpectedCryptoMiss(error)) throw error;

    // expected: this specific pubkey is malformed/unsupported — skip it, try the next candidate
    return null;
  }
};
