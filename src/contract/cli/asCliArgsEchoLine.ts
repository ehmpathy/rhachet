import { asArgsEchoMasked } from '@src/infra/asArgsEchoMasked';

/**
 * .what = the `[args]` line that closes a cli refusal a human reads
 * .why = a refusal read from a log or a paste must name how to reproduce it
 *        (`rule.require.refusals-carry-context`). two paths render a cli refusal — the last
 *        handler (`emitCliErrorAndExit`) and the wrapped verbs (`withCliOutputErrors`) — and
 *        this one owner keeps their echo identical
 * .note = the value of each credential-carry flag is masked, since it may be a credential typed
 *         by mistake. `--source` (keyrack set) is the one such flag today; a new one joins the list
 */
export const asCliArgsEchoLine = (input: { args: string[] }): string =>
  `[args] ${asArgsEchoMasked({ args: input.args })}`;
