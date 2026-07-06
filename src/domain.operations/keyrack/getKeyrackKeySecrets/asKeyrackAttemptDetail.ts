import type { KeyrackGrantAttempt } from '@src/domain.objects/keyrack/KeyrackGrantAttempt';

/**
 * .what = distill a non-granted keyrack attempt into a clean detail for a caller
 * .why = the raw KeyrackGrantAttempt carries the internal `slug` (owner.env.KEY format) and,
 *        for absent/locked, a `message` that duplicates the `fix` hint. an error a caller reads
 *        needs only: which key, what status, why (reasons, when blocked), and how to fix it.
 *        keep the internal slug + redundant message out of the error a consumer reads.
 */
export const asKeyrackAttemptDetail = (input: {
  key: string;
  attempt: KeyrackGrantAttempt;
}): { key: string; status: string; reasons?: string[]; fix?: string } => {
  const { key, attempt } = input;

  // blocked carries the constraint reasons — genuinely useful, keep them
  if (attempt.status === 'blocked')
    return {
      key,
      status: attempt.status,
      reasons: attempt.reasons,
      ...(attempt.fix ? { fix: attempt.fix } : {}),
    };

  // granted has no fix/reasons; absent/locked carry only a redundant message we drop
  return {
    key,
    status: attempt.status,
    ...(attempt.status !== 'granted' && attempt.fix
      ? { fix: attempt.fix }
      : {}),
  };
};
