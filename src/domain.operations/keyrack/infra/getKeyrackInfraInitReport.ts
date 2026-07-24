/**
 * .what = build the human-readable tree report for `keyrack infra init`
 * .why = keeps the cli action a thin narrative; makes the output snapshot-testable
 *
 * .note = each effect maps to a status phrase: fresh work vs already present
 */
export const getKeyrackInfraInitReport = (input: {
  org: string;
  repo: string;
  repoEffect: 'created' | 'found';
  readmeEffect: 'created' | 'found';
  registryEffect: 'created' | 'found';
}): string => {
  // map each effect to its status phrase; the human verb mirrors the machine effect
  // exactly ('created' | 'found') so the treestruct and the --json output never disagree
  const asStatus = (effect: 'created' | 'found'): string =>
    effect === 'created' ? 'created ✨' : 'already found 👌';

  const repoStatus = asStatus(input.repoEffect);
  const readmeStatus = asStatus(input.readmeEffect);
  const registryStatus = asStatus(input.registryEffect);

  // assemble the treestruct rooted on 🔐 — keyrack's signature success glyph, the same
  // root every keyrack success uses (🔐 keyrack list / firewall / set). the fresh-vs-found
  // distinction that a vibe header would carry is already told by each leaf's status phrase
  // (✨ created / 👌 already found), so the root stays the plain keyrack operation header
  return [
    '',
    '🔐 keyrack infra init',
    `   ├─ org: ${input.org}`,
    `   ├─ repo: ${input.repo} (private) ${repoStatus}`,
    `   ├─ readme: readme.md ${readmeStatus}`,
    `   └─ registry: registry/github-apps.json ${registryStatus}`,
    '',
  ].join('\n');
};
