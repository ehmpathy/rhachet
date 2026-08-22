import { getOneLazyEsmModuleLoader } from '@src/infra/importEsmSafe/getOneLazyEsmModuleLoader';

import { getOneScureBase } from './getOneScureBase';

/**
 * .what = lazy, memoized, fail-loud loader for the pure-esm crypto dep @noble/curves
 * .why = a top-level `import { ed25519 } from '@noble/curves/ed25519.js'` compiles (under
 *        module:commonjs) to a `require('@noble/curves/ed25519.js')` in dist, which throws
 *        `Must use import to load ES Module` whenever rhachet's dist is loaded under a CJS
 *        `require()` (jest, or a brain package's compiled CJS). @noble/curves publishes as pure esm
 *        (type: module, no cjs require condition), so the load defers to first crypto use via the
 *        shared esm-safe loader. @scure/base loads via the shared getOneScureBase (one single-flight
 *        cache across both ssh-crypto files). see rule.forbid.eager-esm-imports-in-prod +
 *        ehmpathy/rhachet#468.
 * .note = `typeof import(...)` is a type-only reference (tsc erases it), so it emits no require.
 */
type NobleCurvesEd25519Module = typeof import('@noble/curves/ed25519.js');
const getOneNobleCurvesEd25519 =
  getOneLazyEsmModuleLoader<NobleCurvesEd25519Module>({
    specifier: '@noble/curves/ed25519.js',
    purpose: 'ssh pubkey to age recipient conversion',
  });

/**
 * .what = convert an ssh ed25519 public key to an age recipient
 * .why = enables ssh pubkeys to work with age-encryption npm library
 *
 * .note = age-encryption npm library only supports age1... recipients
 * .note = ed25519 pubkey → x25519 pubkey → bech32 encode → age1...
 * .note = uses ed25519.utils.toMontgomery() for the curve conversion
 * .note = async because the pure-esm crypto deps load lazily (see loaders above)
 */
export const sshPubkeyToAgeRecipient = async (input: {
  pubkey: string;
}): Promise<string> => {
  // parse ssh pubkey format: "ssh-ed25519 BASE64_DATA [comment]"
  const parts = input.pubkey.trim().split(/\s+/);
  if (parts.length < 2)
    throw new Error(
      'invalid ssh pubkey format: expected "type base64 [comment]"',
    );

  const [keyType, b64Data] = parts;
  if (keyType !== 'ssh-ed25519')
    throw new Error(`only ed25519 keys supported (found: ${keyType})`);
  if (!b64Data)
    throw new Error('invalid ssh pubkey format: base64 data absent');

  // decode base64 to get wire format
  const wireBytes = Buffer.from(b64Data, 'base64');

  // parse ssh wire format: length-prefixed strings
  // format: uint32 keytype_len, keytype, uint32 pubkey_len, pubkey
  let offset = 0;

  // key type (string)
  const typeLen = wireBytes.readUInt32BE(offset);
  offset += 4;
  const wireKeyType = wireBytes
    .subarray(offset, offset + typeLen)
    .toString('ascii');
  offset += typeLen;

  if (wireKeyType !== 'ssh-ed25519')
    throw new Error(
      `wire format mismatch: expected ssh-ed25519, got ${wireKeyType}`,
    );

  // public key bytes (ed25519 is 32 bytes)
  const pubkeyLen = wireBytes.readUInt32BE(offset);
  offset += 4;

  if (pubkeyLen !== 32)
    throw new Error(`expected 32-byte ed25519 pubkey, got ${pubkeyLen}`);

  const ed25519Pubkey = wireBytes.subarray(offset, offset + 32);

  // convert ed25519 pubkey to x25519 pubkey (edwards → montgomery form)
  const { ed25519 } = await getOneNobleCurvesEd25519();
  const x25519Pubkey = ed25519.utils.toMontgomery(
    new Uint8Array(ed25519Pubkey),
  );

  // encode as age recipient (bech32 with "age" HRP)
  const { bech32 } = await getOneScureBase();
  const recipient = bech32.encodeFromBytes('age', x25519Pubkey);

  return recipient;
};
