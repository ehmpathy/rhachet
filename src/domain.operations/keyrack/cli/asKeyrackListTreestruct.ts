import type { KeyrackHostManifest } from '@src/domain.objects/keyrack';

import { asSortedHostSlugs } from '../asSortedHostSlugs';
import { asKeyrackKeyReachLeaves } from './asKeyrackKeyReachLeaves';

export const asKeyrackListTreestruct = (input: {
  hosts: KeyrackHostManifest['hosts'];
}): string[] => {
  const lines: string[] = [];
  const slugs = asSortedHostSlugs({ hosts: input.hosts });

  lines.push('');
  lines.push('🔐 keyrack list');

  if (slugs.length === 0) {
    lines.push('   └─ (no keys configured on host)');
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
