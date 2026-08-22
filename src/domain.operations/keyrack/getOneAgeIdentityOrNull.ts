import { isExpectedCryptoMiss } from '@src/domain.operations/keyrack/isExpectedCryptoMiss';
import { sshPrikeyToAgeIdentity } from '@src/infra/ssh';

/**
 * .what = derive an age identity from an ssh private key path, or null if THIS key is unreadable
 * .why = identity discovery tries many candidate key paths and skips the ones that do not convert
 *        (absent file, wrong key type, malformed key) — but it must NOT skip a genuinely broken
 *        pure-esm crypto load. sshPrikeyToAgeIdentity now loads @noble/hashes + @scure/base lazily
 *        (ehmpathy/rhachet#468), so a broken crypto install throws a MalfunctionError at call time,
 *        and a passphrase-protected key with no `age` cli throws a ConstraintError ("install age").
 *        both are rhachet-native, actionable errors that must fail LOUD (vision e6,
 *        rule.forbid.failhide) — not degrade to "no identity found". isExpectedCryptoMiss draws that
 *        line ONCE for every caller: rethrow any HelpfulError, swallow only the bare per-key miss.
 * .note = returns null ONLY for a bare generic Error (this key file cannot be converted). every
 *         helpful-errors subclass (MalfunctionError, ConstraintError, and their parents) rethrows.
 * .note = `convert` is an OPTIONAL injected converter (dependency injection); it defaults to the
 *         real `sshPrikeyToAgeIdentity`. the unit test injects a fake converter to exercise the
 *         skip-vs-rethrow logic WITHOUT a `jest.mock` (rule.forbid.unit.remote-boundaries).
 */
export const getOneAgeIdentityOrNull = async (
  input: {
    keyPath: string;
  },
  context?: {
    convert?: (input: { keyPath: string }) => Promise<string>;
  },
): Promise<string | null> => {
  const convert = context?.convert ?? sshPrikeyToAgeIdentity;
  try {
    return await convert({ keyPath: input.keyPath });
  } catch (error) {
    // rethrow any rhachet-native error (broken crypto load, "install age", bad input) — fail loud (e6)
    if (!isExpectedCryptoMiss(error)) throw error;

    // expected: this specific key file is unreadable/invalid — skip it, try the next candidate
    return null;
  }
};
