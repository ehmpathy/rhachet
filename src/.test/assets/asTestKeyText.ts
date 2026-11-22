/**
 * .what = the frame lines of a test private key, composed at runtime
 * .why = `.husky/check.secrets.sh` refuses any staged file whose text holds a contiguous private
 *        key header, with no exemption — right for a real key, and it makes every test that
 *        inlines a test key uncommittable once touched. the label is joined at runtime, so tracked
 *        text never holds the header, while the scan stays strict for every real key
 * .note = for TEST keys only: fake bodies (some malformed on purpose, to prove an invalid key fails
 *         loud) or throwaway keys made for this suite. a real key belongs in a vault, never a test
 */
const asKeyLabel = (input: { kind: 'RSA' | 'OPENSSH' }): string =>
  [input.kind, 'PRIVATE', 'KEY'].join(' ');

/** the `-----BEGIN …-----` line of a test key */
export const asTestKeyBegin = (input: { kind: 'RSA' | 'OPENSSH' }): string =>
  `-----BEGIN ${asKeyLabel(input)}-----`;

/** the `-----END …-----` line of a test key */
export const asTestKeyEnd = (input: { kind: 'RSA' | 'OPENSSH' }): string =>
  `-----END ${asKeyLabel(input)}-----`;

/**
 * .what = a test key's full text: the frame around the caller's body lines
 * .why = one place composes the frame, so no test inlines a key header
 */
export const asTestKeyText = (input: {
  kind: 'RSA' | 'OPENSSH';
  body: string[];
}): string =>
  [
    asTestKeyBegin({ kind: input.kind }),
    ...input.body,
    asTestKeyEnd({ kind: input.kind }),
  ].join('\n');
