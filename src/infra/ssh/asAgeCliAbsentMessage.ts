import { AGE_CLI_ABSENT_MARKER } from './ageCliAbsentMarker';

/**
 * .what = the pure human-read body of the "ssh key is passphrase-protected and the
 *         `age` cli is absent" fail-fast — the message string ALONE, no error-class
 *         prefix, no serialized metadata
 * .why = the same body is needed at two surfaces: the thrown BadRequestError (in
 *        sshPrikeyToAgeIdentity) AND the re-wrap hint asAgeIdentityResult hands to
 *        genContextKeyrack. reuse of the thrown error's `.message` baked
 *        `BadRequestError: ` + the metadata JSON in, so the outer ConstraintError
 *        re-wrap doubled the class and the context block. a pure body lets each
 *        surface wrap it once (rule.forbid.snapshot-visual-blemishes)
 *
 * .note = interpolates AGE_CLI_ABSENT_MARKER so isAgeCliAbsentError stays in lockstep
 */
export const asAgeCliAbsentMessage = (input: { cipher: string }): string =>
  `🔐 your ssh key is passphrase-protected (cipher: ${input.cipher}).
   ├─ why: keyrack shells to the \`age\` cli to decrypt with it; age prompts
   │       for the passphrase on each invocation (age does not use ssh-agent)
   ├─ fix: ${AGE_CLI_ABSENT_MARKER}, then retry with \`rhx keyrack init\` —
   │       ├─ brew install age  # macos
   │       └─ apt install age   # ubuntu/debian
   └─ note: passphrase-less keys (-N "") do not need age installed`;
