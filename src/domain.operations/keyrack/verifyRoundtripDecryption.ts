import type { ContextKeyrack } from '@src/domain.operations/keyrack/genContextKeyrack';
import { getOneIdentityThatDecrypts } from '@src/domain.operations/keyrack/getOneIdentityThatDecrypts';
import { asAgeIdentityOrNull } from '@src/infra/ssh/asAgeIdentityOrNull';

/**
 * .what = verify roundtrip decryption of encrypted content
 * .why = ensures credential can be decrypted by at least one available identity
 *
 * .note = tries the manifest identity first, then prescribed + discovered
 * .note = returns true if any identity successfully decrypts to expected plaintext
 * .note = the pool comes ONLY from the shared context identity resolution — there
 *         is no bespoke re-discovery fallback, which would bypass the Variant A
 *         agent recovery (the only way to reach K) and thus never help
 */
export const verifyRoundtripDecryption = async (
  input: {
    expected: { ciphertext: string; plaintext: string };
    owner: string | null;
  },
  context?: ContextKeyrack,
): Promise<{ verified: boolean }> => {
  // the manifest identity decrypts credentials too — os.secure encrypts each
  // credential to the SAME recipients as the host manifest. for a Variant A
  // (passphrased-ed25519) manifest it is the ONLY identity that can, since K is
  // recovered via the ephemeral agent, never converted in-process from the ssh
  // key. getOne is cached on the context (already resolved when the manifest was
  // read this invocation), so this reuses K without a second passphrase prompt
  const manifestIdentity =
    (await context?.identity?.getOne?.({ for: 'manifest' })) ?? null;

  // prescribed key paths convert via the shared transformer — it allowlists ONLY
  // the expected "not in-process-convertible" BadRequestError and rethrows genuine
  // faults, so no I/O error or bug is masked as "not this key" (rule.forbid.failhide)
  const prescribedIdentities = (context?.identity?.getAll.prescribed ?? [])
    .map((keyPath) => asAgeIdentityOrNull({ keyPath }))
    .filter((id): id is string => id !== null);

  // discovered identities come from the context pool only; when absent there are
  // simply none to add (the sole production caller always supplies a full context)
  const discoveredIdentities = context?.identity?.getAll.discovered
    ? await context.identity.getAll.discovered()
    : [];

  const identityPool = [
    ...(manifestIdentity ? [manifestIdentity] : []),
    ...prescribedIdentities,
    ...discoveredIdentities,
  ];

  // try the pool via the ONE shared trial-decrypt loop (its allowlist swallows only
  // the expected wrong-identity miss and fails loud on any genuine fault). a
  // ciphertext has exactly one plaintext, so the first identity that decrypts gives
  // the definitive plaintext — verified iff it matches what we wrote
  const found = await getOneIdentityThatDecrypts({
    ciphertext: input.expected.ciphertext,
    pool: identityPool,
    owner: input.owner,
  });
  return { verified: found?.plaintext === input.expected.plaintext };
};
