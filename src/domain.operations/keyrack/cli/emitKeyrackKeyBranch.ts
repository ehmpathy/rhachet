import type { KeyrackKeyGrant } from '@src/domain.objects/keyrack/KeyrackKeyGrant';

/**
 * .what = format a keyrack key status as a tree branch
 * .why = pure function enables reuse in SDK error messages and CLI output
 */
export const formatKeyrackKeyBranch = (input: {
  entry: KeyrackKeyBranchEntry;
  isLast: boolean;
}): string[] => {
  const prefix = input.isLast ? '   └─' : '   ├─';
  const indent = input.isLast ? '      ' : '   │  ';
  const entry = input.entry;
  const lines: string[] = [];

  if (entry.type === 'granted') {
    lines.push(`${prefix} ${entry.grant.slug}`);
    lines.push(`${indent}├─ vault: ${entry.grant.source.vault}`);
    lines.push(`${indent}├─ mech: ${entry.grant.source.mech}`);
    lines.push(`${indent}└─ status: granted 🔑`);
    return lines;
  }

  if (entry.type === 'blocked') {
    lines.push(`${prefix} ${entry.slug}`);
    lines.push(`${indent}├─ status: blocked 🚫`);
    for (let j = 0; j < entry.reasons.length; j++) {
      const reason = entry.reasons[j]!;
      const isLastReason = j === entry.reasons.length - 1;
      lines.push(`${indent}│  ${isLastReason ? '└' : '├'}─ ${reason}`);
    }
    lines.push(`${indent}└─ \x1b[2mtip: --allow-dangerous if you must\x1b[0m`);
    return lines;
  }

  if (entry.type === 'locked') {
    lines.push(`${prefix} ${entry.slug}`);
    lines.push(`${indent}${entry.tip ? '├' : '└'}─ status: locked 🔒`);
    if (entry.tip) {
      lines.push(`${indent}└─ \x1b[2mtip: ${entry.tip}\x1b[0m`);
    }
    return lines;
  }

  if (entry.type === 'absent') {
    lines.push(`${prefix} ${entry.slug}`);
    lines.push(`${indent}${entry.tip ? '├' : '└'}─ status: absent 🫧`);
    if (entry.tip) {
      lines.push(`${indent}└─ \x1b[2mtip: ${entry.tip}\x1b[0m`);
    }
    return lines;
  }

  if (entry.type === 'lost') {
    lines.push(`${prefix} ${entry.slug}`);
    lines.push(`${indent}${entry.tip ? '├' : '└'}─ status: lost 👻`);
    if (entry.tip) {
      lines.push(`${indent}└─ \x1b[2mtip: ${entry.tip}\x1b[0m`);
    }
    return lines;
  }

  if (entry.type === 'unlocked') {
    const expiresIn = entry.grant.expiresAt
      ? Math.round(
          (new Date(entry.grant.expiresAt).getTime() - Date.now()) / 1000 / 60,
        )
      : null;
    lines.push(`${prefix} ${entry.grant.slug}`);
    lines.push(`${indent}├─ env: ${entry.grant.env}`);
    lines.push(`${indent}├─ org: ${entry.grant.org}`);
    lines.push(`${indent}├─ vault: ${entry.grant.source.vault}`);
    lines.push(
      `${indent}└─ expires in: ${expiresIn !== null ? `${expiresIn}m` : 'never'}`,
    );
    return lines;
  }

  // exhaustive check
  const _exhaustive: never = entry;
  throw new Error(`unexpected entry type: ${JSON.stringify(_exhaustive)}`);
};

/**
 * .what = emit a keyrack key status as a tree branch to stdout
 * .why = consistent output format across get, unlock, and fill commands
 */
export const emitKeyrackKeyBranch = (input: {
  entry: KeyrackKeyBranchEntry;
  isLast: boolean;
}): void => {
  const lines = formatKeyrackKeyBranch(input);
  for (const line of lines) {
    console.log(line);
  }
};

export type KeyrackKeyBranchEntry =
  | { type: 'granted'; grant: KeyrackKeyGrant }
  | { type: 'blocked'; slug: string; reasons: string[] }
  | { type: 'locked'; slug: string; tip: string | null }
  | { type: 'absent'; slug: string; tip: string | null }
  | { type: 'lost'; slug: string; tip: string | null }
  | { type: 'unlocked'; grant: KeyrackKeyGrant };
