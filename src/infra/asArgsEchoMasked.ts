import { asArgsFlagValuesMasked } from './asArgsFlagValuesMasked';

/**
 * .what = the credential-carry flags of each command, by the command's first argv word
 * .why = a flag name has one sense per command: keyrack's `--source` may carry a credential
 *        typed by mistake, while a skill's `--source` (e.g. a path) is plain data a reproduction
 *        needs. so a mask applies only under the command that declares the flag
 */
const FLAGS_CREDENTIAL_CARRY_BY_COMMAND: Record<string, string[]> = {
  keyrack: ['--source'],
};

/**
 * .what = values never masked: sentinels a reproduction needs, which carry no credential
 */
const VALUES_KEPT = ['@stdin'];

/**
 * .what = cli argv, safe to echo: the value of each credential-carry flag of its command masked
 * .why = every surface that echoes argv (a refusal's `ran:` line, the `[args]` line) must mask
 *        the same flags; one registry here, so a new echo path or a new flag cannot drift apart
 */
export const asArgsEchoMasked = (input: { args: string[] }): string[] => {
  const command = input.args[0] ?? null;
  const flags =
    command === null ? [] : (FLAGS_CREDENTIAL_CARRY_BY_COMMAND[command] ?? []);
  return asArgsFlagValuesMasked({
    args: input.args,
    flags,
    valuesKept: VALUES_KEPT,
  });
};
