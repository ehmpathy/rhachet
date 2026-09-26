import { BadRequestError } from 'helpful-errors';

/**
 * .what = parse openssh private key PEM format to raw bytes
 * .why = shared by cipher extraction and seed extraction — the one place that
 *        turns the PEM armor into the raw openssh-key-v1 byte buffer
 *
 * .note = absent PEM header/footer means this is not an openssh private key — a
 *         caller-condition (BadRequestError), skippable by identity-pool builders
 */
export const asOpensshKeyBytes = (input: { keyContent: string }): Buffer => {
  const lines = input.keyContent.trim().split('\n');
  const headerIdx = lines.findIndex((l) =>
    l.includes('-----BEGIN OPENSSH PRIVATE KEY-----'),
  );
  const footerIdx = lines.findIndex((l) =>
    l.includes('-----END OPENSSH PRIVATE KEY-----'),
  );

  // absent PEM header/footer means this is not an openssh private key — a
  // caller-condition (BadRequestError), skippable by identity-pool builders
  if (headerIdx === -1 || footerIdx === -1)
    throw new BadRequestError('not a valid openssh private key format');

  const b64Content = lines.slice(headerIdx + 1, footerIdx).join('');
  return Buffer.from(b64Content, 'base64');
};
