import { asIsoTimeStamp } from 'iso-time';
import { getError, given, then, when } from 'test-fns';

import type {
  KeyrackGrantAttempt,
  KeyrackKeyReach,
} from '@src/domain.objects/keyrack';

import { assertKeyrackExportNamesDistinct } from './assertKeyrackExportNamesDistinct';

/**
 * .what = binds e23 — two reaches of one slug would claim one shell variable name
 * .why = the only failure shape in this design that SUCCEEDS: both values are legitimately
 *        held, the second silently overwrites the first, and the caller never learns
 */
describe('assertKeyrackExportNamesDistinct', () => {
  const expiresAt = asIsoTimeStamp(new Date(Date.now() + 60000));

  const genGranted = (input: {
    slug: string;
    reach?: KeyrackKeyReach;
  }): KeyrackGrantAttempt =>
    ({
      status: 'granted',
      grant: {
        slug: input.slug,
        key: {
          secret: 'secret',
          grade: { protection: 'encrypted', duration: 'ephemeral' },
        },
        source: { vault: 'os.secure', mech: 'EPHEMERAL_VIA_GITHUB_APP' },
        env: 'prep',
        org: 'ahbode',
        reach: input.reach,
        expiresAt,
      },
    }) as KeyrackGrantAttempt;

  /**
   * .what = the hint the error hands a human, pulled off the thrown metadata
   * .why = the fix differs per which axis collided, and a hint that names the wrong axis is
   *        worse than none — it walks a human down a road that cannot work
   */
  const asHint = (error: unknown): string =>
    (error as { metadata?: { hint?: string } }).metadata?.hint ?? '';

  given('[case1] one key per name', () => {
    when('[t0] two distinct names are emitted', () => {
      then('e1: it passes — today’s output is unchanged', () => {
        expect(() =>
          assertKeyrackExportNamesDistinct({
            attempts: [
              genGranted({ slug: 'ahbode.prep.BEAVER_TOKEN' }),
              genGranted({ slug: 'ahbode.prep.OTHER_TOKEN' }),
            ],
          }),
        ).not.toThrow();
      });
    });

    when('[t1] one name is emitted at one reach only', () => {
      then('it passes — a lone reach-key has no peer to collide with', () => {
        expect(() =>
          assertKeyrackExportNamesDistinct({
            attempts: [
              genGranted({
                slug: 'ahbode.prep.BEAVER_TOKEN',
                reach: { exid: 'github://org=ehmpathy' },
              }),
            ],
          }),
        ).not.toThrow();
      });
    });
  });

  given('[case2] one name claimed by two reaches', () => {
    const attempts = [
      genGranted({
        slug: 'ahbode.prep.BEAVER_TOKEN',
        reach: { exid: 'github://org=ehmpathy' },
      }),
      genGranted({
        slug: 'ahbode.prep.BEAVER_TOKEN',
        reach: { exid: 'github://org=seaturtle' },
      }),
    ];

    when('[t0] the export set is checked', () => {
      then('e23: it throws rather than let the second overwrite', async () => {
        const error = await getError(async () =>
          assertKeyrackExportNamesDistinct({ attempts }),
        );
        expect(error.message).toContain('BEAVER_TOKEN');
      });

      then('e23: the error names BOTH reaches', async () => {
        const error = await getError(async () =>
          assertKeyrackExportNamesDistinct({ attempts }),
        );
        expect(error.message).toContain('github://org=ehmpathy');
        expect(error.message).toContain('github://org=seaturtle');
      });

      // .note = the axis that collided decides the fix. these two differ in REACH, so
      //         `--reach` is the move that separates them
      then(
        'e23: the hint names the reach, because reach is what differs',
        async () => {
          const error = await getError(async () =>
            assertKeyrackExportNamesDistinct({ attempts }),
          );
          expect(asHint(error)).toContain('--reach');
        },
      );
    });
  });

  given('[case3] a reachless key and a reach-key of one slug', () => {
    when('[t0] the export set is checked', () => {
      then(
        'e23: it throws — a reachless peer collides just the same',
        async () => {
          const error = await getError(async () =>
            assertKeyrackExportNamesDistinct({
              attempts: [
                genGranted({ slug: 'ahbode.prep.BEAVER_TOKEN' }),
                genGranted({
                  slug: 'ahbode.prep.BEAVER_TOKEN',
                  reach: { exid: 'github://org=ehmpathy' },
                }),
              ],
            }),
          );
          // the bare slug IS the reachless address, so both are named in full
          expect(error.message).toContain('ahbode.prep.BEAVER_TOKEN');
          expect(error.message).toContain(
            'ahbode.prep.BEAVER_TOKEN@github://org=ehmpathy',
          );
        },
      );

      then(
        'e23: the hint names the reach — one has a reach, one has none',
        async () => {
          const error = await getError(async () =>
            assertKeyrackExportNamesDistinct({
              attempts: [
                genGranted({ slug: 'ahbode.prep.BEAVER_TOKEN' }),
                genGranted({
                  slug: 'ahbode.prep.BEAVER_TOKEN',
                  reach: { exid: 'github://org=ehmpathy' },
                }),
              ],
            }),
          );
          expect(asHint(error)).toContain('--reach');
        },
      );
    });
  });

  /**
   * .what = the OTHER axis that collides on this flat namespace, and it predates reach
   * .why = `asKeyrackKeyName` drops the org AND the env, so one key name declared under two
   *        envs collides on an `--env all` sweep with no reach in sight. the guard must fire
   *        there too — and must NOT offer `--reach`, which cannot separate two envs
   * .note = this is the case the CLI acceptance run exposed. the hint read
   *         "add --reach to name which one you want" for a pair where both keys were
   *         reachless — a fix that names a road with no destination
   *         (rule.require.errors-name-the-fix)
   */
  given('[case5] one key name declared under two envs', () => {
    const attempts = [
      genGranted({ slug: 'ahbode.prep.SHARED_API_KEY' }),
      genGranted({ slug: 'ahbode.prod.SHARED_API_KEY' }),
    ];

    when('[t0] the export set is checked', () => {
      then('it throws — the env is dropped from the name too', async () => {
        const error = await getError(async () =>
          assertKeyrackExportNamesDistinct({ attempts }),
        );
        expect(error.message).toContain('SHARED_API_KEY');
        expect(error.message).toContain('ahbode.prep.SHARED_API_KEY');
        expect(error.message).toContain('ahbode.prod.SHARED_API_KEY');
      });

      then('the hint names the ENV, never --reach', async () => {
        const error = await getError(async () =>
          assertKeyrackExportNamesDistinct({ attempts }),
        );
        expect(asHint(error)).toContain('--env');
        expect(asHint(error)).not.toContain('--reach');
      });
    });
  });

  /**
   * .what = the THIRD axis that collides on this flat namespace — two orgs, one key name
   * .why = `asKeyrackKeyName` drops the org as well as the env, so a pair that spans two orgs
   *        emits one `export FOO=` exactly as a pair that spans two envs does. this is the
   *        axis the brain-creds path (`getKeyrackKeySecrets`) reaches: with no repo manifest,
   *        `getOneKeyrackGrantByKey` passes a full slug through verbatim, so `orgA.prep.FOO`
   *        and `orgB.prep.FOO` both survive and both claim `FOO`
   * .note = the hint MUST NOT name `--env`. both keys sit at `prep`, so a human who obeyed
   *         `narrow --env` would arrive at the identical refusal — the walk-a-human-down-a-
   *         road-that-cannot-work defect (rule.require.errors-name-the-fix), which is why the
   *         axes are checked outermost-first
   */
  given('[case6] one key name claimed by two orgs', () => {
    const attempts = [
      genGranted({ slug: 'ahbode.prep.SHARED_API_KEY' }),
      genGranted({ slug: 'ehmpathy.prep.SHARED_API_KEY' }),
    ];

    when('[t0] the export set is checked', () => {
      then('it throws — the org is dropped from the name too', async () => {
        const error = await getError(async () =>
          assertKeyrackExportNamesDistinct({ attempts }),
        );
        expect(error.message).toContain('SHARED_API_KEY');
        expect(error.message).toContain('ahbode.prep.SHARED_API_KEY');
        expect(error.message).toContain('ehmpathy.prep.SHARED_API_KEY');
      });

      then('the hint names the ORG — never --env, never --reach', async () => {
        const error = await getError(async () =>
          assertKeyrackExportNamesDistinct({ attempts }),
        );
        expect(asHint(error)).toContain('org');
        expect(asHint(error)).not.toContain('--reach');
        expect(asHint(error)).not.toContain('narrow --env');
      });

      // ⚠️ the brain-creds clamp. `getKeyrackKeySecrets` is the one flatten surface with no
      //    human at the terminal, so a hint that named a cli flag would be unusable there
      then('a caller-supplied org hint reaches the human', async () => {
        const error = await getError(async () =>
          assertKeyrackExportNamesDistinct({
            attempts,
            hints: {
              forReachCollision: 'pass `reach`',
              forEnvCollision: 'narrow `env`',
              forOrgCollision: 'name fewer keys',
            },
          }),
        );
        expect(asHint(error)).toEqual('name fewer keys');
      });
    });

    when('[t1] the two orgs ALSO differ on env', () => {
      // the outermost axis wins: to narrow `--env` cannot separate two orgs, so the org hint
      // is the only one that always works on a pair that differs on both
      then('the hint still names the ORG, not the env', async () => {
        const error = await getError(async () =>
          assertKeyrackExportNamesDistinct({
            attempts: [
              genGranted({ slug: 'ahbode.prep.SHARED_API_KEY' }),
              genGranted({ slug: 'ehmpathy.prod.SHARED_API_KEY' }),
            ],
          }),
        );
        expect(asHint(error)).toContain('org');
        expect(asHint(error)).not.toContain('narrow --env');
      });
    });
  });

  /**
   * .what = one key asked for twice — every axis matches, so no narrower fix exists
   * .why = reachable from any surface that takes a key list (`keys: ['FOO','FOO']`). each of
   *        the three axis hints would send a human to change an axis that is ALREADY
   *        identical, which is the same road-that-cannot-work defect one degree further in
   */
  given('[case7] one address asked for twice', () => {
    when('[t0] the export set is checked', () => {
      then(
        'the hint says to name each key once, and names no axis',
        async () => {
          const error = await getError(async () =>
            assertKeyrackExportNamesDistinct({
              attempts: [
                genGranted({ slug: 'ahbode.prep.BEAVER_TOKEN' }),
                genGranted({ slug: 'ahbode.prep.BEAVER_TOKEN' }),
              ],
            }),
          );
          expect(asHint(error)).toContain('name each key once');
          expect(asHint(error)).not.toContain('--reach');
          expect(asHint(error)).not.toContain('--env');
        },
      );
    });
  });

  given('[case4] a name claimed twice, but only one grant landed', () => {
    when('[t0] the peer is locked rather than granted', () => {
      then('it passes — only granted attempts emit an export line', () => {
        expect(() =>
          assertKeyrackExportNamesDistinct({
            attempts: [
              genGranted({
                slug: 'ahbode.prep.BEAVER_TOKEN',
                reach: { exid: 'github://org=ehmpathy' },
              }),
              {
                status: 'locked',
                slug: 'ahbode.prep.BEAVER_TOKEN',
              } as unknown as KeyrackGrantAttempt,
            ],
          }),
        ).not.toThrow();
      });
    });
  });

  /**
   * [case5] the per-surface hint — one message, three fixes
   *
   * .what = the same collision, asked by a caller that supplies its own hints
   * .why = THREE surfaces flatten a grant set onto bare key names — the cli `source`, the sdk
   *        `keyrack.source`, and the brain-creds `getKeyrackKeySecrets`. they must agree on
   *        WHAT a collision is (one shared message) and differ on HOW to fix it (a per-surface
   *        hint), because a `--reach` flag named on an sdk path is a fix that cannot be typed
   *
   * .note = this is the same message/hint split `assertKeyrackReachRequiresKey` uses, and for
   *         the same reason: a shared message cannot drift, a shared hint would misdirect
   */
  given('[case5] a caller that supplies its own hints', () => {
    const attempts = [
      genGranted({
        slug: 'ahbode.prep.BEAVER_TOKEN',
        reach: { exid: 'github://org=ehmpathy' },
      }),
      genGranted({
        slug: 'ahbode.prep.BEAVER_TOKEN',
        reach: { exid: 'github://org=seaturtle' },
      }),
    ];

    when('[t0] a reach collision is refused', () => {
      then(
        'the caller-supplied hint reaches the human, never the cli default',
        async () => {
          const error = await getError(async () =>
            assertKeyrackExportNamesDistinct({
              attempts,
              hints: {
                forReachCollision: 'pass `reach` to name which one you want',
                forEnvCollision: 'narrow `env`',
                forOrgCollision: 'name fewer keys',
              },
            }),
          );
          expect(asHint(error)).toContain('pass `reach`');
          // ⚠️ THE clamp. an sdk caller must never be told to add a flag it cannot type
          expect(asHint(error)).not.toContain('--reach');
        },
      );

      // the message states the INVARIANT, so it is identical whatever the surface. a message
      // that varied per caller is the drift this assertion exists to prevent
      then('the message is identical to the default-hint call', async () => {
        const errorWithHints = await getError(async () =>
          assertKeyrackExportNamesDistinct({
            attempts,
            hints: {
              forReachCollision: 'pass `reach` to name which one you want',
              forEnvCollision: 'narrow `env`',
              forOrgCollision: 'name fewer keys',
            },
          }),
        );
        const errorWithDefaults = await getError(async () =>
          assertKeyrackExportNamesDistinct({ attempts }),
        );

        const asSentence = (message: string): string =>
          message.split('\n')[0] ?? '';
        expect(asSentence((errorWithHints as Error).message)).toEqual(
          asSentence((errorWithDefaults as Error).message),
        );
      });
    });

    when('[t1] no hints are supplied', () => {
      // e1: the cli caller passes no hints, so its error is byte-identical to before — which
      // is what keeps every extant `keyrack source` snapshot still
      then('the cli-shaped default is used', async () => {
        const error = await getError(async () =>
          assertKeyrackExportNamesDistinct({ attempts }),
        );
        expect(asHint(error)).toContain('--reach');
      });
    });
  });
});
