import type { KeyrackHostManifest } from '@src/domain.objects/keyrack';

import { asSortedHostSlugs } from '../asSortedHostSlugs';

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
    for (let i = 0; i < slugs.length; i++) {
      const slug = slugs[i]!;
      const host = input.hosts[slug]!;
      const isLast = i === slugs.length - 1;
      const prefix = isLast ? '   └─' : '   ├─';
      const indent = isLast ? '      ' : '   │  ';
      lines.push(`${prefix} ${slug}`);
      lines.push(`${indent}├─ env: ${host.env}`);
      lines.push(`${indent}├─ org: ${host.org}`);
      lines.push(`${indent}├─ mech: ${host.mech}`);
      lines.push(`${indent}└─ vault: ${host.vault}`);
    }
  }

  return lines;
};
