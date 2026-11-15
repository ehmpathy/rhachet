import type { KeyrackGrantMechanism } from '@src/domain.objects/keyrack';

/**
 * .what = the lines that open the `🔐 keyrack set <slug> via <mech>` tree for an os.secure set;
 *         empty when no tree opens
 * .why = the set orchestrator prints these, and closes the tree with the roundtrip result only
 *        when it opened one, so the tree never ends on an open branch
 *
 * .note = a piped source opens the tree for any mech, with its piped leaf; the guided setup
 *         opens it only for github-app, whose setup prints the rows that continue it
 */
export const asOsSecureSetTreeHead = (input: {
  slug: string;
  mech: KeyrackGrantMechanism;
  isSourcePiped: boolean;
}): string[] => {
  const header = `🔐 keyrack set ${input.slug} via ${input.mech}`;

  // a piped source: the header and its piped leaf
  if (input.isSourcePiped)
    return [
      header,
      '   │',
      '   ├─ source piped from stdin',
      '   │  └─ shape ok ✓',
    ];

  // the github-app guided setup: the header its setup continues
  if (input.mech === 'EPHEMERAL_VIA_GITHUB_APP') return [header];

  // any other guided setup draws no tree
  return [];
};
