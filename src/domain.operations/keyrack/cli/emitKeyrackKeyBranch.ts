import type { KeyrackKeyGrant } from '@src/domain.objects/keyrack/KeyrackKeyGrant';
import type { KeyrackKeyOmission } from '@src/domain.objects/keyrack/KeyrackKeyOmission';
import type { KeyrackKeyReach } from '@src/domain.objects/keyrack/KeyrackKeyReach';
import { asExpiresInMinutes } from '@src/domain.operations/keyrack/asExpiresInMinutes';
import { asKeyrackKeyReachLeaves } from '@src/domain.operations/keyrack/cli/asKeyrackKeyReachLeaves';

/**
 * .what = the status label each omission reason renders as
 * .why = the four omission branches (`absent`, `lost`, `remote`, `errored`) render ONE shape —
 *        slug head, reach leaf, status line, optional tip — and differ ONLY in this label. that
 *        shape was hand-written four times, so a future edit to the leaf's slot in one branch and
 *        not the others would re-open the byte-identical-row ambiguity this behavior exists to
 *        close. one home means one place to get it right
 *
 * .note = ⚠️ this record is ALSO the render's conformance clamp, and that is not incidental.
 *         `Record<KeyrackKeyOmission['reason'], string>` is exhaustive by construction, so a
 *         FIFTH reason added to the domain fails `--what types` HERE until it is given a label.
 *         before this, the tags were a structurally independent copy of the reason union and an
 *         added reason would compile everywhere and silently render as no branch at all
 * .note = the glyphs are a published palette (`rule.require.keyrack-emoji-palette`) and a
 *         snapshot asserts each, so these strings are a contract rather than decoration
 */
export const KEYRACK_OMISSION_STATUS_LABEL: Record<
  KeyrackKeyOmission['reason'],
  string
> = {
  absent: 'absent 🫧',
  lost: 'lost 👻',
  remote: 'remote 🌐',
  errored: 'errored 💥',
};

/**
 * .what = whether a branch entry is one of the four OMISSION variants
 * .why = the four share one render, so the dispatch needs to name them as a set rather than
 *        test four tags in a row
 *
 * .note = it probes the label record, never a hand-listed tag set — so the guard and the render
 *         can never come to disagree about which tags are omissions
 */
const isKeyrackKeyBranchEntryOmitted = (
  entry: KeyrackKeyBranchEntry,
): entry is Extract<
  KeyrackKeyBranchEntry,
  { type: KeyrackKeyOmission['reason'] }
> => entry.type in KEYRACK_OMISSION_STATUS_LABEL;

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
    // the reach leaf sits directly ABOVE `vault:`, the same slot it takes on the `unlocked`
    // branch below — so a human reads one shape whether they ran `get` or `unlock`
    // .why this branch needs it at all = `keyrack get` renders HERE, and it is the command a
    //      consumer actually calls. without this line a caller could pass `--reach`, have it
    //      honored end to end, and see no trace of WHICH reach answered — the one fact the
    //      whole feature exists to make legible (rule.require.status-feedback)
    // .note = `asKeyrackKeyReachLeaves` yields [] for a reachless grant, so a reachless render
    //         is byte-identical to today and no extant snapshot moves (e1)
    lines.push(
      ...asKeyrackKeyReachLeaves({ indent, reach: entry.grant.reach }),
    );
    lines.push(`${indent}├─ vault: ${entry.grant.source.vault}`);
    lines.push(`${indent}├─ mech: ${entry.grant.source.mech}`);
    lines.push(`${indent}└─ status: granted 🔑`);
    return lines;
  }

  if (entry.type === 'blocked') {
    lines.push(`${prefix} ${entry.slug}`);
    lines.push(`${indent}├─ status: blocked 🚫`);
    entry.reasons.forEach((reason, index) => {
      const isLastReason = index === entry.reasons.length - 1;
      lines.push(`${indent}│  ${isLastReason ? '└' : '├'}─ ${reason}`);
    });
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

  // the four omission variants share ONE render and differ only in their status label, so they
  // dispatch together rather than as four hand-repeated branches
  // .note = the reach leaf names WHICH reach this row reports on — one slug can file several
  //         rows in one run, and absent this leaf two of them read byte-identical
  if (isKeyrackKeyBranchEntryOmitted(entry)) {
    lines.push(`${prefix} ${entry.slug}`);
    lines.push(...asKeyrackKeyReachLeaves({ indent, reach: entry.reach }));
    lines.push(
      `${indent}${entry.tip ? '├' : '└'}─ status: ${KEYRACK_OMISSION_STATUS_LABEL[entry.type]}`,
    );
    if (entry.tip) {
      lines.push(`${indent}└─ \x1b[2mtip: ${entry.tip}\x1b[0m`);
    }
    return lines;
  }

  if (entry.type === 'unlocked') {
    const expiresIn = asExpiresInMinutes({
      expiresAt: entry.grant.expiresAt ?? null,
    });
    lines.push(`${prefix} ${entry.grant.slug}`);
    lines.push(`${indent}├─ env: ${entry.grant.env}`);
    lines.push(`${indent}├─ org: ${entry.grant.org}`);
    lines.push(
      ...asKeyrackKeyReachLeaves({ indent, reach: entry.grant.reach }),
    );
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
  // ⚠️ the four FAILURE branches carry an optional `reach` for the same cause the `granted` and
  //    `unlocked` branches do: a reachless bulk unlock now enumerates one target PER REACH the
  //    rack holds, so ONE slug can file several omission rows in a single run. a vault-level
  //    fault hits every reach of a slug at once (an expired sso session, a pruned daemon), and
  //    absent this leaf the human reads two byte-identical rows and cannot tell which account
  //    failed — or that two accounts are even involved rather than a duplicate-render defect
  //    (`rule.forbid.ambiguous-labels`, `rule.require.status-feedback`)
  // .note = OPTIONAL, never nullable, and `asKeyrackKeyReachLeaves` yields [] when it is absent
  //         — so every reachless row stays byte-identical and no extant snapshot moves
  | {
      type: 'absent';
      slug: string;
      tip: string | null;
      reach?: KeyrackKeyReach;
    }
  | { type: 'lost'; slug: string; tip: string | null; reach?: KeyrackKeyReach }
  | {
      type: 'remote';
      slug: string;
      tip: string | null;
      reach?: KeyrackKeyReach;
    }
  | {
      type: 'errored';
      slug: string;
      tip: string | null;
      reach?: KeyrackKeyReach;
    }
  | { type: 'unlocked'; grant: KeyrackKeyGrant };
