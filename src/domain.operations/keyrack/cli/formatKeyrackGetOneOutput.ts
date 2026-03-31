import type { KeyrackGrantAttempt } from '@src/domain.objects/keyrack/KeyrackGrantAttempt';

import { formatKeyrackKeyBranch } from './emitKeyrackKeyBranch';

/**
 * .what = format keyrack get output for a single key
 * .why = reusable by both CLI (stdout) and SDK (error messages)
 */
export const formatKeyrackGetOneOutput = (input: {
  attempt: KeyrackGrantAttempt;
}): string => {
  const { attempt } = input;
  const lines: string[] = [];

  lines.push('');
  lines.push('🔐 keyrack');

  if (attempt.status === 'granted') {
    lines.push(
      ...formatKeyrackKeyBranch({
        entry: { type: 'granted', grant: attempt.grant },
        isLast: true,
      }),
    );
  } else if (attempt.status === 'blocked') {
    lines.push(
      ...formatKeyrackKeyBranch({
        entry: {
          type: 'blocked',
          slug: attempt.slug,
          reasons: attempt.reasons,
        },
        isLast: true,
      }),
    );
  } else if (attempt.status === 'locked') {
    lines.push(
      ...formatKeyrackKeyBranch({
        entry: {
          type: 'locked',
          slug: attempt.slug,
          tip: attempt.fix ?? null,
        },
        isLast: true,
      }),
    );
  } else {
    lines.push(
      ...formatKeyrackKeyBranch({
        entry: {
          type: 'absent',
          slug: attempt.slug,
          tip: attempt.fix ?? null,
        },
        isLast: true,
      }),
    );
  }

  lines.push('');
  return lines.join('\n');
};

/**
 * .what = format keyrack get output for multiple keys (repo scope)
 * .why = reusable by both CLI (stdout) and SDK (error messages)
 */
export const formatKeyrackGetAllOutput = (input: {
  attempts: KeyrackGrantAttempt[];
}): string => {
  const { attempts } = input;
  const lines: string[] = [];

  lines.push('');
  lines.push('🔐 keyrack');

  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i]!;
    const isLast = i === attempts.length - 1;

    if (attempt.status === 'granted') {
      lines.push(
        ...formatKeyrackKeyBranch({
          entry: { type: 'granted', grant: attempt.grant },
          isLast,
        }),
      );
    } else if (attempt.status === 'blocked') {
      lines.push(
        ...formatKeyrackKeyBranch({
          entry: {
            type: 'blocked',
            slug: attempt.slug,
            reasons: attempt.reasons,
          },
          isLast,
        }),
      );
    } else if (attempt.status === 'locked') {
      lines.push(
        ...formatKeyrackKeyBranch({
          entry: {
            type: 'locked',
            slug: attempt.slug,
            tip: attempt.fix ?? null,
          },
          isLast,
        }),
      );
    } else {
      lines.push(
        ...formatKeyrackKeyBranch({
          entry: {
            type: 'absent',
            slug: attempt.slug,
            tip: attempt.fix ?? null,
          },
          isLast,
        }),
      );
    }
  }

  lines.push('');
  return lines.join('\n');
};
