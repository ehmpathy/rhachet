import { getAllNamesWithinEditDistance } from '@src/utils/getAllNamesWithinEditDistance';

/**
 * .what = the hint and the roads for `rhx clone <operand>` where the operand names no clone verb
 * .why = `rhx clone claude --roles mechanic` is the inline form typed on the wrong verb; the
 *        vision refuses it and names `rhx enroll` for a one-off and `actors.yml` for a named
 *        actor (vision inventory row 40). a typo of a verb (`lst`) gets its nearest verb too
 *
 * .note = the roads ride as a list, so the refusal renders one road per line, never one long line
 * .note = the threshold is the shared one in `getAllNamesWithinEditDistance`: max(1, floor(len/3))
 */
export const asCloneVerbAbsentHint = (input: {
  operand: string;
  verbs: string[];
}): { hint: string; roads: string[] } => {
  // name the nearest verb, where one is close enough to be a typo
  const nearest = getAllNamesWithinEditDistance({
    names: input.verbs,
    nameTyped: input.operand,
  })[0];

  // a clone address (`@:peer1`) wants a verb before it, so lead with that form
  const isCloneAddress = input.operand.startsWith('@:');
  const hint = isCloneAddress
    ? `to reach ${input.operand}, name a verb first: rhx clone get ${input.operand}`
    : nearest
      ? `did you mean 'rhx clone ${nearest}'?`
      : 'name a clone verb, a declared actor, or compose a one-off via enroll';

  // name every road: the verbs, the actor form, the inline form
  const roads = [
    `reach a clone: rhx clone ${input.verbs.join(' | ')}`,
    'spawn from a declared actor: rhx clone @<slug> (declared in .agent/actors.yml)',
    'compose a one-off: rhx enroll <brain> --roles <roles>',
  ];
  return { hint, roads };
};
