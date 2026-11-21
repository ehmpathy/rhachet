/**
 * .what = the default peer: one core of sha256 work, about two seconds on an idle core
 * .why = what a claude seat or an editor asks of a core; a fixed workload makes two runs comparable
 */
const PEER_DEFAULT = `"${process.execPath}" -e 'const c=require("node:crypto");let h="x";for(let i=0;i<1500000;i++)h=c.createHash("sha256").update(h).digest("hex");'`;

/**
 * .what = the args of `measure.acceptance.share`, with their defaults
 * .note = the shell half has already refused an unknown flag, an absent value, and a peer-runs
 *   count that is not a positive integer
 */
export const asMeasureArgs = (input: {
  argv: string[];
}): { scope: string[]; widths: string[]; peer: string; peerRuns: number } => {
  const valueOf = (flag: string): string | null =>
    getAllFlagValues({ argv: input.argv, flag })[0] ?? null;
  return {
    scope: getAllFlagValues({ argv: input.argv, flag: '--scope' }),
    widths: (valueOf('--widths') ?? '25%,50%').split(','),
    peer: valueOf('--peer') ?? PEER_DEFAULT,
    peerRuns: Number(valueOf('--peer-runs') ?? '3'),
  };
};

/**
 * .what = every value a repeatable flag carries in an argv
 */
const getAllFlagValues = (input: { argv: string[]; flag: string }): string[] =>
  input.argv.flatMap((arg, index) => (input.argv[index - 1] === input.flag ? [arg] : []));
