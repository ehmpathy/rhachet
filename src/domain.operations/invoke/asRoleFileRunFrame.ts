/**
 * .what = the frame rhx prints before it runs a role's skill or init file
 * .why = `rhachet run` prints it, and the hook dispatcher replays it for each rule it runs in
 *   place of rhx; one builder keeps the two byte-identical
 */
export const asRoleFileRunFrame = (input: {
  dir: 'skills' | 'inits';
  slugRepo: string;
  slugRole: string;
  slug: string;
}): string =>
  input.dir === 'skills'
    ? `🪨 run solid skill repo=${input.slugRepo}/role=${input.slugRole}/skill=${input.slug}`
    : `💪 init role repo=${input.slugRepo}/role=${input.slugRole}/init=${input.slug}`;
