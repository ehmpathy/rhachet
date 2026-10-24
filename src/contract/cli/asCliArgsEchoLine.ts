/**
 * .what = the `[args]` line that closes a cli refusal a human reads
 * .why = a refusal read from a log or a paste must name how to reproduce it
 *        (`rule.require.refusals-carry-context`). two paths render a cli refusal — the last
 *        handler (`emitCliErrorAndExit`) and the wrapped verbs (`withCliOutputErrors`) — and
 *        this one owner keeps their echo identical
 */
export const asCliArgsEchoLine = (input: { args: string[] }): string =>
  `[args] ${input.args}`;
