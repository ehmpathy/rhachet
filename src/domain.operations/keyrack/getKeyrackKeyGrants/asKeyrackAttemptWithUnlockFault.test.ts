import { ConstraintError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import type { KeyrackGrantAttempt } from '@src/domain.objects/keyrack/KeyrackGrantAttempt';
import type { KeyrackKeyOmission } from '@src/domain.objects/keyrack/KeyrackKeyOmission';

import { asKeyrackAttemptWithUnlockFault } from './asKeyrackAttemptWithUnlockFault';

const SLUG = '@all.all.EHMPATH_BEAVER_GITHUB_TOKEN';

const attemptLocked: KeyrackGrantAttempt = {
  status: 'locked',
  slug: SLUG,
  message: 'key is locked',
  fix: 'rhx keyrack unlock --env all --key EHMPATH_BEAVER_GITHUB_TOKEN --org @all',
};

const omissionErrored: KeyrackKeyOmission = {
  slug: SLUG,
  reason: 'errored',
  cause: new ConstraintError('failed to mint github app token', {
    hint: 're-set the key with a valid github app private key',
  }),
};

describe('asKeyrackAttemptWithUnlockFault', () => {
  given('[case1] a locked attempt whose unlock caught a fault', () => {
    when('[t0] cast', () => {
      const attempt = asKeyrackAttemptWithUnlockFault({
        attempt: attemptLocked,
        omissions: [omissionErrored],
        orgDefault: null,
        owner: 'mechanic',
      });

      then('the status stays locked', () => {
        expect(attempt.status).toEqual('locked');
      });

      then('the tip names the fault, not the stock unlock', () => {
        expect(attempt.status === 'locked' && attempt.fix).toContain(
          'failed to mint github app token',
        );
        expect(attempt.status === 'locked' && attempt.fix).toContain(
          're-set the key',
        );
      });
    });
  });

  given('[case2] a locked attempt with no fault at its address', () => {
    when('[t0] the only omission is on another slug', () => {
      const attempt = asKeyrackAttemptWithUnlockFault({
        attempt: attemptLocked,
        omissions: [{ ...omissionErrored, slug: '@all.all.OTHER' }],
        orgDefault: null,
        owner: 'mechanic',
      });

      then('the attempt is unchanged', () => {
        expect(attempt).toEqual(attemptLocked);
      });
    });

    when('[t1] the omission at its address is absent, not errored', () => {
      const attempt = asKeyrackAttemptWithUnlockFault({
        attempt: attemptLocked,
        omissions: [{ slug: SLUG, reason: 'absent' }],
        orgDefault: null,
        owner: 'mechanic',
      });

      then('the attempt is unchanged', () => {
        expect(attempt).toEqual(attemptLocked);
      });
    });
  });

  given('[case3] an attempt that is not locked', () => {
    when('[t0] an absent attempt meets an errored omission', () => {
      const attemptAbsent: KeyrackGrantAttempt = {
        status: 'absent',
        slug: SLUG,
        message: 'not set',
      };
      const attempt = asKeyrackAttemptWithUnlockFault({
        attempt: attemptAbsent,
        omissions: [omissionErrored],
        orgDefault: null,
        owner: 'mechanic',
      });

      then('the attempt is unchanged', () => {
        expect(attempt).toEqual(attemptAbsent);
      });
    });
  });
});
