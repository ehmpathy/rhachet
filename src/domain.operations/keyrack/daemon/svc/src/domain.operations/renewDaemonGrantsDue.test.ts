import { getError, MalfunctionError } from 'helpful-errors';
import { asIsoTimeStamp, type IsoTimeStamp } from 'iso-time';
import { given, then, when } from 'test-fns';

import type { KeyrackGrantRenewal } from '@src/domain.objects/keyrack/KeyrackGrantMechanismAdapter';
import { KeyrackKeyGrant } from '@src/domain.objects/keyrack/KeyrackKeyGrant';

import { createDaemonKeyStore } from '../domain.objects/daemonKeyStore';
import { createDaemonRenewRecord } from '../domain.objects/daemonRenewRecord';
import { handleRelockCommand } from './handleRelockCommand';
import { handleUnlockCommand } from './handleUnlockCommand';
import { renewDaemonGrantsDue } from './renewDaemonGrantsDue';

const MIN = 60 * 1000;
const WINDOW_MS = 10 * MIN;
const RENEW_TIMEOUT_MS = 2 * MIN;

/**
 * .what = the fixed moment every case reads as now
 */
const T0 = new Date('2026-11-14T00:00:00.000Z').getTime();

/**
 * .what = a stamp `offsetMs` from T0
 */
const at = (offsetMs: number): IsoTimeStamp =>
  asIsoTimeStamp(new Date(T0 + offsetMs));

/**
 * .what = an sso grant for the camp key that expires `expiresInMs` after T0
 */
const genSsoGrant = (input: { expiresInMs: number }): KeyrackKeyGrant =>
  new KeyrackKeyGrant({
    slug: 'ahbode.camp.AWS_PROFILE',
    key: {
      secret: 'ahbode.camp',
      grade: { protection: 'reference', duration: 'ephemeral' },
    },
    source: { vault: 'aws.config', mech: 'EPHEMERAL_VIA_AWS_SSO' },
    env: 'camp',
    org: 'ahbode',
    expiresAt: at(input.expiresInMs),
  });

/**
 * .what = a daemon's store and renew record, with one sso grant unlocked
 * .why = every case starts from the state an unlock leaves behind
 */
const genDaemonWithSsoGrant = (input: {
  expiresInMs: number;
  capInMs: number;
}) => {
  const keyStore = createDaemonKeyStore();
  const renewRecord = createDaemonRenewRecord();
  const grant = genSsoGrant({ expiresInMs: input.expiresInMs });
  handleUnlockCommand(
    {
      keys: [grant],
      renewals: [{ slug: grant.slug, capAt: at(input.capInMs) }],
    },
    { keyStore, renewRecord },
  );
  return { keyStore, renewRecord, grant };
};

/**
 * .what = a renew stand-in that answers from a plan, and counts its calls
 * .why = an injected collaborator (dependency injection), so each outcome — a renew,
 *        a lapse, a fault — is driven on demand with no aws cli in reach
 */
const genRenewalPlan = (input: {
  answers: Array<KeyrackGrantRenewal | Error>;
}) => {
  const calls: KeyrackKeyGrant[] = [];
  const getOneRenewal = async (args: {
    grant: KeyrackKeyGrant;
  }): Promise<KeyrackGrantRenewal> => {
    calls.push(args.grant);
    const answer =
      input.answers[Math.min(calls.length - 1, input.answers.length - 1)]!;
    if (answer instanceof Error) throw answer;
    return answer;
  };
  return { getOneRenewal, calls };
};

describe('renewDaemonGrantsDue', () => {
  beforeEach(() => {
    jest.useFakeTimers({ advanceTimers: false });
    jest.setSystemTime(new Date(T0));
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  given('[case1] an sso grant inside its renew window, portal live', () => {
    when('[t0] the tick runs', () => {
      then(
        'the grant is renewed and the store holds the new expiry',
        async () => {
          const daemon = genDaemonWithSsoGrant({
            expiresInMs: 9 * MIN,
            capInMs: 9 * 60 * MIN,
          });
          const plan = genRenewalPlan({
            answers: [{ status: 'renewed', expiresAt: at(69 * MIN) }],
          });

          await renewDaemonGrantsDue(
            { now: at(0) },
            {
              ...daemon,
              inflight: new Set(),
              windowMs: WINDOW_MS,
              renewTimeoutMs: RENEW_TIMEOUT_MS,
              getOneRenewal: plan.getOneRenewal,
            },
          );

          expect(plan.calls).toHaveLength(1);
          expect(
            daemon.keyStore.get({ slug: daemon.grant.slug })?.expiresAt,
          ).toEqual(at(69 * MIN));
          expect(
            daemon.renewRecord.get({ slug: daemon.grant.slug }),
          ).toMatchObject({
            renewedCount: 1,
            faultCount: 0,
            mark: null,
          });
        },
      );
    });
  });

  given('[case2] an sso grant outside its renew window', () => {
    when('[t0] the tick runs', () => {
      then('no renew is tried', async () => {
        const daemon = genDaemonWithSsoGrant({
          expiresInMs: 30 * MIN,
          capInMs: 9 * 60 * MIN,
        });
        const plan = genRenewalPlan({
          answers: [{ status: 'renewed', expiresAt: at(90 * MIN) }],
        });

        await renewDaemonGrantsDue(
          { now: at(0) },
          {
            ...daemon,
            inflight: new Set(),
            windowMs: WINDOW_MS,
            renewTimeoutMs: RENEW_TIMEOUT_MS,
            getOneRenewal: plan.getOneRenewal,
          },
        );

        expect(plan.calls).toHaveLength(0);
        expect(
          daemon.keyStore.get({ slug: daemon.grant.slug })?.expiresAt,
        ).toEqual(at(30 * MIN));
      });
    });
  });

  given('[case3] the cap is nearer than the renewed expiry', () => {
    when('[t0] the tick renews', () => {
      then('the new expiry stops at the cap', async () => {
        const daemon = genDaemonWithSsoGrant({
          expiresInMs: 5 * MIN,
          capInMs: 20 * MIN,
        });
        const plan = genRenewalPlan({
          answers: [{ status: 'renewed', expiresAt: at(65 * MIN) }],
        });

        await renewDaemonGrantsDue(
          { now: at(0) },
          {
            ...daemon,
            inflight: new Set(),
            windowMs: WINDOW_MS,
            renewTimeoutMs: RENEW_TIMEOUT_MS,
            getOneRenewal: plan.getOneRenewal,
          },
        );

        expect(
          daemon.keyStore.get({ slug: daemon.grant.slug })?.expiresAt,
        ).toEqual(at(20 * MIN));
      });
    });

    when('[t1] the cap has passed', () => {
      then('the entry is dropped and no renew is tried', async () => {
        const daemon = genDaemonWithSsoGrant({
          expiresInMs: 5 * MIN,
          capInMs: 3 * MIN,
        });
        const plan = genRenewalPlan({
          answers: [{ status: 'renewed', expiresAt: at(65 * MIN) }],
        });

        await renewDaemonGrantsDue(
          { now: at(4 * MIN) },
          {
            ...daemon,
            inflight: new Set(),
            windowMs: WINDOW_MS,
            renewTimeoutMs: RENEW_TIMEOUT_MS,
            getOneRenewal: plan.getOneRenewal,
          },
        );

        expect(plan.calls).toHaveLength(0);
        expect(daemon.renewRecord.size()).toEqual(0);
      });
    });
  });

  given('[case4] the cli hands back an unchanged expiry', () => {
    when('[t0] the tick runs', () => {
      then('naught is written and naught is counted', async () => {
        const daemon = genDaemonWithSsoGrant({
          expiresInMs: 8 * MIN,
          capInMs: 9 * 60 * MIN,
        });
        const entryBefore = daemon.renewRecord.get({ slug: daemon.grant.slug });
        const plan = genRenewalPlan({
          answers: [{ status: 'renewed', expiresAt: at(8 * MIN) }],
        });

        await renewDaemonGrantsDue(
          { now: at(0) },
          {
            ...daemon,
            inflight: new Set(),
            windowMs: WINDOW_MS,
            renewTimeoutMs: RENEW_TIMEOUT_MS,
            getOneRenewal: plan.getOneRenewal,
          },
        );

        expect(daemon.renewRecord.get({ slug: daemon.grant.slug })).toBe(
          entryBefore,
        );
      });
    });

    when('[t1] the new expiry is later by a fraction of a second', () => {
      then('it is a renew: stamps compare as instants, not text', async () => {
        // `00:08:00.500Z` sorts before `00:08:00Z` as text, though it is later
        const daemon = genDaemonWithSsoGrant({
          expiresInMs: 8 * MIN,
          capInMs: 9 * 60 * MIN,
        });
        const plan = genRenewalPlan({
          answers: [{ status: 'renewed', expiresAt: at(8 * MIN + 500) }],
        });

        await renewDaemonGrantsDue(
          { now: at(0) },
          {
            ...daemon,
            inflight: new Set(),
            windowMs: WINDOW_MS,
            renewTimeoutMs: RENEW_TIMEOUT_MS,
            getOneRenewal: plan.getOneRenewal,
          },
        );

        expect(
          daemon.keyStore.get({ slug: daemon.grant.slug })?.expiresAt,
        ).toEqual(at(8 * MIN + 500));
        expect(
          daemon.renewRecord.get({ slug: daemon.grant.slug })?.renewedCount,
        ).toEqual(1);
      });
    });
  });

  given('[case5] the portal session lapsed', () => {
    when('[t0] the tick runs, then runs again', () => {
      then(
        'the key is marked lapsed once, and no second try fires',
        async () => {
          const daemon = genDaemonWithSsoGrant({
            expiresInMs: 8 * MIN,
            capInMs: 9 * 60 * MIN,
          });
          const plan = genRenewalPlan({ answers: [{ status: 'lapsed' }] });
          const context = {
            ...daemon,
            inflight: new Set<string>(),
            windowMs: WINDOW_MS,
            renewTimeoutMs: RENEW_TIMEOUT_MS,
            getOneRenewal: plan.getOneRenewal,
          };

          await renewDaemonGrantsDue({ now: at(0) }, context);
          await renewDaemonGrantsDue({ now: at(1 * MIN) }, context);

          expect(plan.calls).toHaveLength(1);
          expect(
            daemon.renewRecord.get({ slug: daemon.grant.slug })?.mark,
          ).toEqual({
            kind: 'lapsed',
            error: null,
          });
          // the grant lives out its last minutes, untouched
          expect(
            daemon.keyStore.get({ slug: daemon.grant.slug })?.expiresAt,
          ).toEqual(at(8 * MIN));
        },
      );
    });

    when('[t1] the cap passes while the key is marked lapsed', () => {
      then(
        'the mark stays held, so status still names it the next day',
        async () => {
          const daemon = genDaemonWithSsoGrant({
            expiresInMs: 8 * MIN,
            capInMs: 15 * MIN,
          });
          const plan = genRenewalPlan({ answers: [{ status: 'lapsed' }] });
          const context = {
            ...daemon,
            inflight: new Set<string>(),
            windowMs: WINDOW_MS,
            renewTimeoutMs: RENEW_TIMEOUT_MS,
            getOneRenewal: plan.getOneRenewal,
          };

          await renewDaemonGrantsDue({ now: at(0) }, context);
          await renewDaemonGrantsDue({ now: at(16 * 60 * MIN) }, context);

          expect(
            daemon.renewRecord.get({ slug: daemon.grant.slug })?.mark,
          ).toEqual({ kind: 'lapsed', error: null });
          expect(daemon.renewRecord.size()).toEqual(1);
        },
      );
    });
  });

  given('[case6] the renew faults', () => {
    when('[t0] one blip, then a success', () => {
      then('the blip is not marked, and the next tick renews', async () => {
        const daemon = genDaemonWithSsoGrant({
          expiresInMs: 8 * MIN,
          capInMs: 9 * 60 * MIN,
        });
        const plan = genRenewalPlan({
          answers: [
            new MalfunctionError('network timeout'),
            { status: 'renewed', expiresAt: at(68 * MIN) },
          ],
        });
        const context = {
          ...daemon,
          inflight: new Set<string>(),
          windowMs: WINDOW_MS,
          renewTimeoutMs: RENEW_TIMEOUT_MS,
          getOneRenewal: plan.getOneRenewal,
        };

        await renewDaemonGrantsDue({ now: at(0) }, context);
        expect(
          daemon.renewRecord.get({ slug: daemon.grant.slug }),
        ).toMatchObject({
          faultCount: 1,
          mark: null,
        });

        await renewDaemonGrantsDue({ now: at(1 * MIN) }, context);
        expect(
          daemon.renewRecord.get({ slug: daemon.grant.slug }),
        ).toMatchObject({
          faultCount: 0,
          renewedCount: 1,
          mark: null,
        });
      });
    });

    when('[t1] ten faults in a row', () => {
      then(
        'the key is marked halted with the last error, and tries stop',
        async () => {
          const daemon = genDaemonWithSsoGrant({
            expiresInMs: 8 * MIN,
            capInMs: 9 * 60 * MIN,
          });
          const plan = genRenewalPlan({
            answers: [new MalfunctionError('unexpected aws error')],
          });
          const context = {
            ...daemon,
            inflight: new Set<string>(),
            windowMs: WINDOW_MS,
            renewTimeoutMs: RENEW_TIMEOUT_MS,
            getOneRenewal: plan.getOneRenewal,
          };

          for (const minute of Array.from({ length: 12 }, (_, i) => i))
            await renewDaemonGrantsDue({ now: at(minute * MIN) }, context);

          expect(plan.calls).toHaveLength(10);
          expect(
            daemon.renewRecord.get({ slug: daemon.grant.slug })?.mark,
          ).toEqual({
            kind: 'halted',
            error: '💥 MalfunctionError: unexpected aws error',
          });
        },
      );
    });
  });

  given('[case7] a grant that expired while the host slept', () => {
    when('[t0] the first tick after wake runs', () => {
      then(
        'the grant is renewed from the record, and get returns it again',
        async () => {
          const daemon = genDaemonWithSsoGrant({
            expiresInMs: 5 * MIN,
            capInMs: 9 * 60 * MIN,
          });
          jest.setSystemTime(new Date(T0 + 40 * MIN));
          expect(daemon.keyStore.get({ slug: daemon.grant.slug })).toBeNull();
          const plan = genRenewalPlan({
            answers: [{ status: 'renewed', expiresAt: at(100 * MIN) }],
          });

          await renewDaemonGrantsDue(
            { now: at(40 * MIN) },
            {
              ...daemon,
              inflight: new Set(),
              windowMs: WINDOW_MS,
              renewTimeoutMs: RENEW_TIMEOUT_MS,
              getOneRenewal: plan.getOneRenewal,
            },
          );

          expect(
            daemon.keyStore.get({ slug: daemon.grant.slug })?.expiresAt,
          ).toEqual(at(100 * MIN));
        },
      );
    });

    when('[t1] the first tick after wake blips', () => {
      then('the key is not halted; it is retried', async () => {
        const daemon = genDaemonWithSsoGrant({
          expiresInMs: 5 * MIN,
          capInMs: 9 * 60 * MIN,
        });
        const plan = genRenewalPlan({
          answers: [new MalfunctionError('blip at wake')],
        });

        await renewDaemonGrantsDue(
          { now: at(40 * MIN) },
          {
            ...daemon,
            inflight: new Set(),
            windowMs: WINDOW_MS,
            renewTimeoutMs: RENEW_TIMEOUT_MS,
            getOneRenewal: plan.getOneRenewal,
          },
        );

        expect(
          daemon.renewRecord.get({ slug: daemon.grant.slug })?.mark,
        ).toBeNull();
      });
    });
  });

  given('[case8] a relock lands mid-renew', () => {
    when('[t0] the renew answers after the relock', () => {
      then('the key stays locked; the renew is not written back', async () => {
        const daemon = genDaemonWithSsoGrant({
          expiresInMs: 8 * MIN,
          capInMs: 9 * 60 * MIN,
        });
        const getOneRenewal = async (): Promise<KeyrackGrantRenewal> => {
          // the human relocks while the silent proof is in flight
          handleRelockCommand({ slugs: [daemon.grant.slug] }, daemon);
          return { status: 'renewed', expiresAt: at(68 * MIN) };
        };

        await renewDaemonGrantsDue(
          { now: at(0) },
          {
            ...daemon,
            inflight: new Set(),
            windowMs: WINDOW_MS,
            renewTimeoutMs: RENEW_TIMEOUT_MS,
            getOneRenewal,
          },
        );

        expect(daemon.keyStore.get({ slug: daemon.grant.slug })).toBeNull();
        expect(daemon.renewRecord.size()).toEqual(0);
      });
    });
  });

  given('[case9] a hand unlock lands mid-renew', () => {
    when('[t0] the renew answers after the unlock', () => {
      then("the hand unlock's grant and cap win", async () => {
        const daemon = genDaemonWithSsoGrant({
          expiresInMs: 8 * MIN,
          capInMs: 9 * 60 * MIN,
        });
        const grantByHand = genSsoGrant({ expiresInMs: 55 * MIN });
        const getOneRenewal = async (): Promise<KeyrackGrantRenewal> => {
          handleUnlockCommand(
            {
              keys: [grantByHand],
              renewals: [{ slug: grantByHand.slug, capAt: at(30 * MIN) }],
            },
            daemon,
          );
          return { status: 'renewed', expiresAt: at(68 * MIN) };
        };

        await renewDaemonGrantsDue(
          { now: at(0) },
          {
            ...daemon,
            inflight: new Set(),
            windowMs: WINDOW_MS,
            renewTimeoutMs: RENEW_TIMEOUT_MS,
            getOneRenewal,
          },
        );

        expect(
          daemon.keyStore.get({ slug: daemon.grant.slug })?.expiresAt,
        ).toEqual(at(55 * MIN));
        expect(
          daemon.renewRecord.get({ slug: daemon.grant.slug }),
        ).toMatchObject({
          capAt: at(30 * MIN),
          renewedCount: 0,
        });
      });
    });
  });

  given('[case10] a renew still in flight when the next tick fires', () => {
    when('[t0] two ticks overlap', () => {
      then('the second tick does not try the same key', async () => {
        const daemon = genDaemonWithSsoGrant({
          expiresInMs: 8 * MIN,
          capInMs: 9 * 60 * MIN,
        });
        const calls: number[] = [];
        const getOneRenewal = (): Promise<KeyrackGrantRenewal> => {
          calls.push(calls.length);
          return new Promise((fulfill) =>
            setTimeout(
              () => fulfill({ status: 'renewed', expiresAt: at(68 * MIN) }),
              5_000,
            ),
          );
        };
        const context = {
          ...daemon,
          inflight: new Set<string>(),
          windowMs: WINDOW_MS,
          renewTimeoutMs: RENEW_TIMEOUT_MS,
          getOneRenewal,
        };

        const first = renewDaemonGrantsDue({ now: at(0) }, context);
        await renewDaemonGrantsDue({ now: at(1_000) }, context);
        jest.advanceTimersByTime(5_000);
        await first;

        expect(calls).toHaveLength(1);
      });
    });
  });

  given('[case11] grants the unlock did not opt into renew', () => {
    when('[t0] each is unlocked with no renewal at its address', () => {
      then('none is filed for renew', () => {
        const keyStore = createDaemonKeyStore();
        const renewRecord = createDaemonRenewRecord();
        const grantSso = genSsoGrant({ expiresInMs: 8 * MIN });
        const grantOther = new KeyrackKeyGrant({
          ...genSsoGrant({ expiresInMs: 8 * MIN }),
          slug: 'ahbode.camp.GITHUB_TOKEN',
          source: { vault: 'os.secure', mech: 'EPHEMERAL_VIA_GITHUB_APP' },
        });

        handleUnlockCommand(
          {
            keys: [grantSso, grantOther],
            renewals: [{ slug: 'ahbode.camp.OTHER_KEY', capAt: at(60 * MIN) }],
          },
          { keyStore, renewRecord },
        );

        expect(renewRecord.size()).toEqual(0);
      });
    });
  });

  given(
    '[case12] the renew throws a code defect, not an operational fault',
    () => {
      when('[t0] the tick runs', () => {
        then(
          'the defect propagates, and the key is marked halted at once with it',
          async () => {
            const daemon = genDaemonWithSsoGrant({
              expiresInMs: 8 * MIN,
              capInMs: 9 * 60 * MIN,
            });
            const context = {
              ...daemon,
              inflight: new Set<string>(),
              windowMs: WINDOW_MS,
              renewTimeoutMs: RENEW_TIMEOUT_MS,
              getOneRenewal: async (): Promise<KeyrackGrantRenewal> => {
                throw new TypeError('grant.key is undefined');
              },
            };

            const error = await getError(
              renewDaemonGrantsDue({ now: at(0) }, context),
            );

            expect(error).toBeInstanceOf(TypeError);
            expect(
              daemon.renewRecord.get({ slug: daemon.grant.slug }),
            ).toMatchObject({
              faultCount: 0,
              mark: { kind: 'halted', error: 'defect: grant.key is undefined' },
            });
            expect(context.inflight.size).toEqual(0);
          },
        );
      });
    },
  );

  given('[case13] the renew hangs and never settles', () => {
    when('[t0] the renew timeout passes', () => {
      then(
        'the hang counts as a fault, and the key is free for the next tick',
        async () => {
          const daemon = genDaemonWithSsoGrant({
            expiresInMs: 8 * MIN,
            capInMs: 9 * 60 * MIN,
          });
          const context = {
            ...daemon,
            inflight: new Set<string>(),
            windowMs: WINDOW_MS,
            renewTimeoutMs: RENEW_TIMEOUT_MS,
            getOneRenewal: (): Promise<KeyrackGrantRenewal> =>
              new Promise(() => undefined),
          };

          const tick = renewDaemonGrantsDue({ now: at(0) }, context);
          await jest.advanceTimersByTimeAsync(RENEW_TIMEOUT_MS);
          await tick;

          expect(
            daemon.renewRecord.get({ slug: daemon.grant.slug }),
          ).toMatchObject({ faultCount: 1, mark: null });
          expect(context.inflight.size).toEqual(0);
        },
      );
    });
  });
});
