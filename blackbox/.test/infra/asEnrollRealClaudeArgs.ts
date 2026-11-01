/**
 * .what = the argv a real-claude tier-2 enroll spawns with
 * .why = the reach proof needs a LIVE brain that submits and replies, not a smart one, so the
 *   model is pinned to haiku with no override: it answers fastest and cheapest, which holds the
 *   smoke suite under its per-run budget (rule.require.test-claude-cli-against-haiku).
 *   `--model` is a claude passthrough arg; enroll consumes only its own flags
 */
export const asEnrollRealClaudeArgs = (input: {
  as: string | null;
  roles: string[] | null;
}): string[] => [
  'enroll',
  'claude',
  '--model',
  'haiku',
  ...(input.as ? ['--as', input.as] : []),
  ...(input.roles ? ['--roles', input.roles.join(',')] : []),
  '--output',
  'json',
];
