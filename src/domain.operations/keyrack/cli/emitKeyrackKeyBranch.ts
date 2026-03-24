import type { KeyrackKeyGrant } from '@src/domain.objects/keyrack/KeyrackKeyGrant';

/**
 * .what = emit a keyrack key status as a tree branch to stdout
 * .why = consistent output format across get, unlock, and fill commands
 */
export const emitKeyrackKeyBranch = (input: {
  entry: KeyrackKeyBranchEntry;
  isLast: boolean;
}): void => {
  const prefix = input.isLast ? '   └─' : '   ├─';
  const indent = input.isLast ? '      ' : '   │  ';
  const entry = input.entry;

  if (entry.type === 'granted') {
    console.log(`${prefix} ${entry.grant.slug}`);
    console.log(`${indent}├─ vault: ${entry.grant.source.vault}`);
    console.log(`${indent}├─ mech: ${entry.grant.source.mech}`);
    console.log(`${indent}└─ status: granted 🔑`);
    return;
  }

  if (entry.type === 'blocked') {
    console.log(`${prefix} ${entry.slug}`);
    console.log(`${indent}├─ status: blocked 🚫`);
    for (let j = 0; j < entry.reasons.length; j++) {
      const reason = entry.reasons[j]!;
      const isLastReason = j === entry.reasons.length - 1;
      console.log(`${indent}│  ${isLastReason ? '└' : '├'}─ ${reason}`);
    }
    console.log(`${indent}└─ \x1b[2mtip: --allow-dangerous if you must\x1b[0m`);
    return;
  }

  if (entry.type === 'locked') {
    console.log(`${prefix} ${entry.slug}`);
    console.log(`${indent}${entry.tip ? '├' : '└'}─ status: locked 🔒`);
    if (entry.tip) {
      console.log(`${indent}└─ \x1b[2mtip: ${entry.tip}\x1b[0m`);
    }
    return;
  }

  if (entry.type === 'absent') {
    console.log(`${prefix} ${entry.slug}`);
    console.log(`${indent}${entry.tip ? '├' : '└'}─ status: absent 🫧`);
    if (entry.tip) {
      console.log(`${indent}└─ \x1b[2mtip: ${entry.tip}\x1b[0m`);
    }
    return;
  }

  if (entry.type === 'unlocked') {
    const expiresIn = entry.grant.expiresAt
      ? Math.round(
          (new Date(entry.grant.expiresAt).getTime() - Date.now()) / 1000 / 60,
        )
      : null;
    console.log(`${prefix} ${entry.grant.slug}`);
    console.log(`${indent}├─ env: ${entry.grant.env}`);
    console.log(`${indent}├─ org: ${entry.grant.org}`);
    console.log(`${indent}├─ vault: ${entry.grant.source.vault}`);
    console.log(
      `${indent}└─ expires in: ${expiresIn !== null ? `${expiresIn}m` : 'never'}`,
    );
    return;
  }

  // exhaustive check
  const _exhaustive: never = entry;
  throw new Error(`unexpected entry type: ${JSON.stringify(_exhaustive)}`);
};

export type KeyrackKeyBranchEntry =
  | { type: 'granted'; grant: KeyrackKeyGrant }
  | { type: 'blocked'; slug: string; reasons: string[] }
  | { type: 'locked'; slug: string; tip: string | null }
  | { type: 'absent'; slug: string; tip: string | null }
  | { type: 'unlocked'; grant: KeyrackKeyGrant };
