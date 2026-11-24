import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { asIsoTimeStamp } from 'iso-time';
import { getError } from 'test-fns';

import { genSampleKeyrackSsoGrant } from '@src/.test/assets/genSampleKeyrackSsoGrant';
import type { KeyrackGrantRenewal } from '@src/domain.objects/keyrack/KeyrackGrantMechanismAdapter';

import { getOneRenewalSettled } from './getOneRenewalSettled';

const grant = genSampleKeyrackSsoGrant({
  expiresAt: asIsoTimeStamp('2026-11-14T01:00:00Z'),
});
const renewal: KeyrackGrantRenewal = {
  status: 'renewed',
  expiresAt: asIsoTimeStamp('2026-11-14T02:00:00Z'),
};

describe('getOneRenewalSettled', () => {
  test('a renew that resolves within the bound settles as a renewal', async () => {
    const outcome = await getOneRenewalSettled(
      { grant },
      { getOneRenewal: async () => renewal, timeoutMs: 1000 },
    );
    expect(outcome).toEqual({ renewal, fault: null });
  });

  test('a renew that hangs past the bound settles as a MalfunctionError fault', async () => {
    const outcome = await getOneRenewalSettled(
      { grant },
      { getOneRenewal: () => new Promise(() => undefined), timeoutMs: 20 },
    );
    expect(outcome.renewal).toBeNull();
    expect(outcome.fault).toBeInstanceOf(MalfunctionError);
    expect(outcome.fault?.message).toContain('renew timed out');
  });

  test('a ConstraintError settles as a fault', async () => {
    const outcome = await getOneRenewalSettled(
      { grant },
      {
        getOneRenewal: async () => {
          throw new ConstraintError('sso session lapsed');
        },
        timeoutMs: 1000,
      },
    );
    expect(outcome.fault).toBeInstanceOf(ConstraintError);
  });

  test('any other throw is a defect and is rethrown', async () => {
    const error = await getError(
      getOneRenewalSettled(
        { grant },
        {
          getOneRenewal: async () => {
            throw new TypeError('grant.key is undefined');
          },
          timeoutMs: 1000,
        },
      ),
    );
    expect(error).toBeInstanceOf(TypeError);
  });
});
