import type { KeyrackKeyGrade } from '../../../domain.objects/keyrack';

/**
 * .what = result of grade change detection
 * .why = provides structured info about whether a change degrades security
 */
export interface KeyGradeChangeResult {
  degrades: boolean;
  reason: string | null;
}

/**
 * grade hierarchy for duration (lower index = more secure)
 * transient (most restrictive) > ephemeral > permanent (least restrictive)
 */
const DURATION_RANK: Record<KeyrackKeyGrade['duration'], number> = {
  transient: 0,
  ephemeral: 1,
  permanent: 2,
};

/**
 * .what = detect if a grade change represents security degradation
 * .why = grades should never degrade (encrypted → plaintext = forbidden)
 *
 * .note = upgrade is ok (plaintext → encrypted, permanent → ephemeral)
 * .note = downgrade is degradation (encrypted → plaintext, ephemeral → permanent)
 */
export const detectKeyGradeChange = (input: {
  source: KeyrackKeyGrade;
  target: KeyrackKeyGrade;
}): KeyGradeChangeResult => {
  const { source, target } = input;

  // check protection degradation (encrypted → plaintext is forbidden)
  if (source.protection === 'encrypted' && target.protection === 'plaintext') {
    return {
      degrades: true,
      reason: `protection downgrade: ${source.protection} → ${target.protection}`,
    };
  }

  // check duration degradation (more restrictive → less restrictive is forbidden)
  const sourceRank = DURATION_RANK[source.duration];
  const targetRank = DURATION_RANK[target.duration];
  if (targetRank > sourceRank) {
    return {
      degrades: true,
      reason: `duration downgrade: ${source.duration} → ${target.duration}`,
    };
  }

  // no degradation detected
  return { degrades: false, reason: null };
};
