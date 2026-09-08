import type { KeyrackHostManifest } from '@src/domain.objects/keyrack';

import { asSortedHostSlugs } from '../asSortedHostSlugs';
import { asKeyrackKeyReachLeaves } from './asKeyrackKeyReachLeaves';

export const asKeyrackListTreestruct = (input: {
  hosts: KeyrackHostManifest['hosts'];
  /**
   * .what = the narrow that produced `hosts`, plus how many keys the host held BEFORE it
   * .why = an empty rack has two wholly different causes, and a human must be told which.
   *        with only the filtered set in hand this operation could not tell them apart, so it
   *        said "no keys configured on host" for both — which on a host that DOES hold keys is
   *        a silent wrong answer at exit 0. a typo'd `--org @al` read as "you have no keys", so
   *        a human would go to `keyrack init` to chase a rack that was there all along
   *        (`rule.forbid.failhide`, `rule.require.errors-name-the-fix`)
   * .note = OPTIONAL, so an unnarrowed caller renders exactly as before
   */
  narrow?: {
    org: string | null;
    env: string | null;
    countBefore: number;
  };
}): string[] => {
  const lines: string[] = [];
  const slugs = asSortedHostSlugs({ hosts: input.hosts });

  lines.push('');
  lines.push('🔐 keyrack list');

  if (slugs.length === 0) {
    // ⚠️ the two causes, told apart. a narrow was spelled AND the host held keys ⇒ the narrow
    //    ate them, so name it. otherwise the rack is genuinely empty
    // .note = exit stays 0 deliberately. `--org someorg` for an org with no keys on this box is
    //         a LEGITIMATE ask whose honest answer is an empty list — so this must read as an
    //         empty result, never a refusal. the repair is the SENTENCE, never the exit code
    const narrowed =
      !!input.narrow && (!!input.narrow.org || !!input.narrow.env);
    if (narrowed && input.narrow!.countBefore > 0) {
      const spelled = [
        input.narrow!.org ? `--org ${input.narrow!.org}` : null,
        input.narrow!.env ? `--env ${input.narrow!.env}` : null,
      ]
        .filter((one): one is string => one !== null)
        .join(' ');
      lines.push('   └─ no keys matched this filter');
      lines.push(`      ├─ filter: ${spelled}`);
      lines.push(
        `      ├─ of: ${input.narrow!.countBefore} keys held on this host`,
      );
      // ⚠️ `fix:`, never `hint:` — `hint` is a DISPUTED synonym of the canonical `fix`
      //    (`term=fix._.choice._.md`). the dispute is open over the EXTANT sites; a NEW
      //    contract takes the canonical word, so the sprawl stops where it stands
      lines.push(
        '      └─ fix: check the filter — `--org @all` for machine-wide keys, `--org @this` for this repo, or drop it to see every key',
      );
    } else {
      lines.push('   └─ (no keys configured on host)');
    }
  } else {
    // .note = this loop already swept the collection, so once the collection keys by
    //         (slug, reach) it renders one branch per reach with no per-command logic.
    //         the render was never the problem — the key shape was (q12)
    slugs.forEach((address, index) => {
      const host = input.hosts[address]!;
      const isLast = index === slugs.length - 1;
      const prefix = isLast ? '   └─' : '   ├─';
      const indent = isLast ? '      ' : '   │  ';
      // head the branch with the true SLUG, never the address — the reach reads as its own
      // leaf below, exactly as it does on `status` and `unlock`
      lines.push(`${prefix} ${host.slug}`);
      lines.push(`${indent}├─ env: ${host.env}`);
      lines.push(`${indent}├─ org: ${host.org}`);
      lines.push(...asKeyrackKeyReachLeaves({ indent, reach: host.reach }));
      lines.push(`${indent}├─ mech: ${host.mech}`);
      lines.push(`${indent}└─ vault: ${host.vault}`);
    });
  }

  return lines;
};
