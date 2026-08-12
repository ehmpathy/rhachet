import { ConstraintError } from 'helpful-errors';
import { getError, given, then, useBeforeAll, useThen, when } from 'test-fns';

import { genMockGhRun } from '@src/.test/assets/genMockGhRun';
import { genTempPemFile } from '@src/.test/assets/genTempPemFile';

import { getAllKeyrackInfraRegistryGithubApps } from '../../infra/getAllKeyrackInfraRegistryGithubApps';
import { genGithubAppSource } from './genGithubAppSource';

// the prompt must never be reached on the error paths; fail loud if it is
const questionNeverCalled = async (): Promise<string> => {
  throw new Error('question prompt should not be reached on an error path');
};

describe('genGithubAppSource', () => {
  given('[case1] the org registry already holds a single app', () => {
    const scene = useBeforeAll(async () => {
      const pem = genTempPemFile();
      const registered = {
        org: 'ehmpathy',
        appId: '123',
        installationId: '456',
        slug: 'my-app',
      };
      // seed keyrack-infra with a registry that already lists the app
      const ghRun = genMockGhRun({
        files: [
          {
            repo: 'ehmpathy/keyrack-infra',
            path: 'registry/github-apps.json',
            content: JSON.stringify([registered]),
          },
        ],
      });
      // scripted prompt: the pem-path answer (app is auto-selected, no choice prompt)
      const question = async (): Promise<string> => pem.path;
      return { pem, registered, ghRun, question };
    });

    when('[t0] the source is acquired', () => {
      const result = useThen('it resolves the source blob', async () =>
        genGithubAppSource(
          { keySlug: 'ehmpathy.prep.my-key' },
          { ghRun: scene.ghRun, question: scene.question },
        ),
      );

      then('the source embeds the app ids from the registry', () => {
        const parsed = JSON.parse(result.source);
        expect(parsed.appId).toEqual('123');
        expect(parsed.installationId).toEqual('456');
      });

      then('the source embeds the pem read off disk', () => {
        const parsed = JSON.parse(result.source);
        expect(parsed.privateKey).toEqual(scene.pem.content);
      });

      then('the source is tagged with the github-app mechanism', () => {
        const parsed = JSON.parse(result.source);
        expect(parsed.mech).toEqual('EPHEMERAL_VIA_GITHUB_APP');
      });
    });
  });

  given(
    '[case2] the registry is empty but an admin can list one org install',
    () => {
      const scene = useBeforeAll(async () => {
        const pem = genTempPemFile();
        // keyrack-infra repo exists (registry file absent) + admin install-list has one app
        const ghRun = genMockGhRun({
          repos: ['ehmpathy/keyrack-infra'],
          orgInstalls: {
            forbidden: false,
            installs: [
              { appId: '789', installationId: '1011', slug: 'installed-app' },
            ],
          },
        });
        const question = async (): Promise<string> => pem.path;
        return { pem, ghRun, question };
      });

      when('[t0] the source is acquired', () => {
        const result = useThen('it resolves the source blob', async () =>
          genGithubAppSource(
            { keySlug: 'ehmpathy.prep.my-key' },
            { ghRun: scene.ghRun, question: scene.question },
          ),
        );

        then('the source embeds the app ids from the install list', () => {
          const parsed = JSON.parse(result.source);
          expect(parsed.appId).toEqual('789');
          expect(parsed.installationId).toEqual('1011');
        });

        then('the chosen app is auto-registered into the registry', () => {
          // read the registry back through the same fake gh to prove the write happened
          const registered = getAllKeyrackInfraRegistryGithubApps(
            { org: 'ehmpathy' },
            { ghRun: scene.ghRun },
          );
          expect(registered).toEqual([
            {
              org: 'ehmpathy',
              appId: '789',
              installationId: '1011',
              slug: 'installed-app',
            },
          ]);
        });
      });
    },
  );

  given('[case3] keyrack-infra is not reachable for the org', () => {
    const ghRun = genMockGhRun({ repos: [] });

    when('[t0] the source is acquired', () => {
      then(
        'it fails loud (init your infra first) before any pem prompt',
        async () => {
          const error = await getError(() =>
            genGithubAppSource(
              { keySlug: 'ehmpathy.prep.my-key' },
              { ghRun, question: questionNeverCalled },
            ),
          );
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain('not reachable');
          expect(error.message).toMatchSnapshot();
        },
      );
    });
  });

  given(
    '[case4] the registry is empty and the caller is a member (403)',
    () => {
      const ghRun = genMockGhRun({
        files: [
          {
            repo: 'ehmpathy/keyrack-infra',
            path: 'registry/github-apps.json',
            content: '[]\n',
          },
        ],
        orgInstalls: { forbidden: true },
      });

      when('[t0] the source is acquired', () => {
        then('it fails loud (ask an admin) before any pem prompt', async () => {
          const error = await getError(() =>
            genGithubAppSource(
              { keySlug: 'ehmpathy.prep.my-key' },
              { ghRun, question: questionNeverCalled },
            ),
          );
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain('no github apps registered');
          expect(error.message).toMatchSnapshot();
        });
      });
    },
  );

  /**
   * [case5] THE cross-org mint — the one scenario the whole wish exists for
   *
   * .what = a key declared by `ahbode`, cut for the `ehmpathy` reach. the lookup must
   *         follow the REACH, not the slug's own org
   * .why = `genGithubAppSource.ts:49-51` is the single line this feature adds. it is
   *        "dispatch from `ahbode/svc-quotes` into `ehmpathy/rhachet`" — the vision's very
   *        first example, and its headline demo
   *
   * .note = the registry is seeded under `ehmpathy` and left ABSENT under `ahbode`. that
   *         asymmetry is the whole test: if the lookup ever fell back to the slug's org it
   *         would find no `ahbode/keyrack-infra` at all and throw `not reachable`. so a
   *         green result cannot be produced by a fallback — only by the reach
   * .note = the two app ids are `ehmpathy`'s, deliberately unlike any `ahbode` value, so
   *         the assertion pins WHICH registry answered rather than merely that one did
   * .note = `[case1]` is this case's reachless twin — same shape, same fakes, org from the
   *         slug. read as a pair, they are an A/B on the reach axis alone
   * .note = fully hermetic. `ghRun` and `question` are already fakes here, so this needs no
   *         credential, no network, and no `gh` on PATH
   */
  given('[case5] a key declared by one org, cut for another reach', () => {
    const scene = useBeforeAll(async () => {
      const pem = genTempPemFile();
      const registered = {
        org: 'ehmpathy',
        appId: '4094439',
        installationId: '141321273',
        slug: 'ehm-a-seaturtle',
      };
      // ONLY ehmpathy has a keyrack-infra. ahbode's is absent, on purpose
      const ghRun = genMockGhRun({
        files: [
          {
            repo: 'ehmpathy/keyrack-infra',
            path: 'registry/github-apps.json',
            content: JSON.stringify([registered]),
          },
        ],
      });
      const question = async (): Promise<string> => pem.path;
      return { pem, registered, ghRun, question };
    });

    when('[t0] the source is acquired with a github reach', () => {
      const result = useThen('it resolves the source blob', async () =>
        genGithubAppSource(
          {
            keySlug: 'ahbode.prep.my-key', // declared by ahbode
            reach: { exid: 'github://org=ehmpathy' }, // cut for ehmpathy
          },
          { ghRun: scene.ghRun, question: scene.question },
        ),
      );

      // THE clamp. these ids exist only in ehmpathy's registry, which the slug's org
      // could never have reached — so this pins that the reach drove the lookup
      then("the app ids come from the REACH's registry, not the slug's", () => {
        const parsed = JSON.parse(result.source);
        expect(parsed.appId).toEqual('4094439');
        expect(parsed.installationId).toEqual('141321273');
      });

      // .note = the installationId is the ONE org-bound part of the blob (vision,
      //         internal research). that it carries ehmpathy's is what makes the minted
      //         token open ehmpathy — the entire point of the feature
      then('the blob is otherwise an ordinary github-app source', () => {
        const parsed = JSON.parse(result.source);
        expect(parsed.mech).toEqual('EPHEMERAL_VIA_GITHUB_APP');
        expect(parsed.privateKey).toEqual(scene.pem.content);
      });

      // .note = the registry findsert must also follow the reach. to write ahbode's
      //         registry here would leave an authorization trail in the wrong org — and
      //         ahbode has no keyrack-infra to write to in the first place
      then(
        'the auto-register landed in the reached org, not the slug org',
        () => {
          const registeredAfter = getAllKeyrackInfraRegistryGithubApps(
            { org: 'ehmpathy' },
            { ghRun: scene.ghRun },
          );
          expect(registeredAfter).toEqual([scene.registered]);
        },
      );
    });
  });

  /**
   * [case6] e15 — an unreadable pem, with a reach in play
   *
   * .what = a reach names a reach, and the pem behind it cannot be read. the pem error
   *         must be the error the caller meets, and the reached org's registry must be left
   *         exactly as it was
   * .why = a reach chooses WHICH org's `keyrack-infra` gets written. so the orphan-entry
   *        guarantee — "registration happens only after the pem is in hand" — matters more
   *        with a reach than without one: a premature write would leave an authorization
   *        trail in a THIRD PARTY's repo for a credential that was never stored
   *
   * .note = ⚠️ the vision's e15 says the pem error fires BEFORE any network call. that claim
   *         is stale — it was written when the vision still assumed a per-unlock
   *         installation lookup, and q7 moved the lookup to set time, where it now runs
   *         first (`:54`). so what is checkable is not the order against the LOOKUP; it is
   *         that a reach introduces no failure of its own ahead of the pem, and leaves no
   *         residue behind it
   * .note = `[case5]` is this case's success twin — identical fakes, identical reach, and
   *         one difference: a pem path that cannot be read
   */
  given('[case6] the pem cannot be read, on a reached key', () => {
    const scene = useBeforeAll(async () => {
      const registered = {
        org: 'ehmpathy',
        appId: '4094439',
        installationId: '141321273',
        slug: 'ehm-a-seaturtle',
      };
      const ghRun = genMockGhRun({
        repos: ['ehmpathy/keyrack-infra'],
        orgInstalls: { forbidden: false, installs: [registered] },
      });
      // a path that was never created — the caller mistyped it, which is the ordinary case
      const question = async (): Promise<string> =>
        '/tmp/keyrack-test-pem-that-was-never-created.pem';
      return { ghRun, question };
    });

    when('[t0] the source is acquired with a github reach', () => {
      // .note = the throw is captured into a scene rather than returned by `useThen`,
      //         because `useThen` hands back a PROXY and `toBeInstanceOf` reads the proxy's
      //         own constructor rather than the error's. one property hop off a scene yields
      //         the real error, so the class assertion below means what it says
      const outcome = useBeforeAll(async () => ({
        error: await getError(() =>
          genGithubAppSource(
            {
              keySlug: 'ahbode.prep.my-key',
              reach: { exid: 'github://org=ehmpathy' },
            },
            { ghRun: scene.ghRun, question: scene.question },
          ),
        ),
      }));

      // .note = the pem error, NOT a reach error. a reach that failed its own parse or its
      //         own lookup would surface a different message here, and the caller would be
      //         sent to fix the flag when the file is what is wrong
      then('the error names the pem, not the reach', () => {
        expect(outcome.error).toBeInstanceOf(ConstraintError);
        expect(outcome.error.message).toContain('could not read pem file');
      });

      // ⚠️ THE clamp. `genKeyrackInfraRegistryGithubApp` writes to the REACHED org, so a
      //    write that ran before the pem read would leave an entry in ehmpathy's registry
      //    for a credential that ahbode never stored — a claim of authorization with no
      //    credential behind it, in a repo the caller does not own
      then('the reached org registry is left untouched', () => {
        const registeredAfter = getAllKeyrackInfraRegistryGithubApps(
          { org: 'ehmpathy' },
          { ghRun: scene.ghRun },
        );
        expect(registeredAfter).toEqual([]);
      });
    });
  });

  /**
   * [case7] e21 — the REACHED org has no reachable keyrack-infra
   *
   * .what = a key declared by `ahbode`, cut for `ehmpathy`, where `ehmpathy/keyrack-infra`
   *         cannot be read (absent, or the caller lacks access — github hides which)
   * .why = the extant `not reachable` refusal names the org in BOTH its message and its
   *        hint (`rhx keyrack infra init --org $org`). so which org it names is not a
   *        cosmetic detail — it is the whole fix. an error that named `ahbode` would send
   *        a human to init a repo that was never the problem
   *
   * .note = `[case3]` is this case's reachless twin — same absent-infra fake, org taken
   *         from the slug. read as a pair they are an A/B on the reach axis alone
   */
  given('[case7] the reached org has no reachable keyrack-infra', () => {
    // no org has an infra repo, so a lookup at EITHER org would throw. what is under test
    // is not THAT it throws — it is WHICH org the refusal names
    const ghRun = genMockGhRun({ repos: [] });

    when('[t0] the source is acquired with a github reach', () => {
      const outcome = useBeforeAll(async () => ({
        error: await getError(() =>
          genGithubAppSource(
            {
              keySlug: 'ahbode.prep.my-key',
              reach: { exid: 'github://org=ehmpathy' },
            },
            { ghRun, question: questionNeverCalled },
          ),
        ),
      }));

      then('it fails loud, before any pem prompt', () => {
        expect(outcome.error).toBeInstanceOf(ConstraintError);
        expect(outcome.error.message).toContain('not reachable');
      });

      // THE clamp. the reached org is named, the slug's org is not — so the human is sent
      // to the repo that actually needs initializing
      then('the refusal names the REACHED org, never the slug org', () => {
        expect(outcome.error.message).toContain('ehmpathy');
        expect(outcome.error.message).not.toContain('ahbode');
      });
    });
  });

  /**
   * [case8] e19/e22 — the reached org's infra exists but registers no app
   *
   * .what = `ehmpathy/keyrack-infra` is reachable, its registry is empty, and the caller is
   *         a member (403 on the admin install list). meanwhile `ahbode` — the slug's own
   *         org — has a fully seeded registry
   * .why = this is e19 (no such app registered) and e22 (installed but unregistered) at the
   *        reached org. the registry is the authorization trail, so an unregistered app is
   *        not a reachable app — the refusal must stand rather than be routed around
   *
   * .note = ⚠️ the seeded `ahbode` registry is the point of the fixture, not scenery. it
   *         makes a fallback to the slug's org SUCCEED — it would look up `ahbode`'s app and
   *         hand back a blob. so this case cannot go green by accident: a throw is producible
   *         only by a lookup that followed the reach
   */
  given(
    '[case8] the reached org registers no app, but the slug org does',
    () => {
      const ghRun = genMockGhRun({
        files: [
          // the reached org: infra reachable, registry empty
          {
            repo: 'ehmpathy/keyrack-infra',
            path: 'registry/github-apps.json',
            content: '[]\n',
          },
          // the slug's org: fully seeded — a fallback here would SUCCEED, never throw
          {
            repo: 'ahbode/keyrack-infra',
            path: 'registry/github-apps.json',
            content: JSON.stringify([
              {
                org: 'ahbode',
                appId: '4094439',
                installationId: '141321231',
                slug: 'ehm-a-seaturtle',
              },
            ]),
          },
        ],
        orgInstalls: { forbidden: true },
      });

      when('[t0] the source is acquired with a github reach', () => {
        const outcome = useBeforeAll(async () => ({
          error: await getError(() =>
            genGithubAppSource(
              {
                keySlug: 'ahbode.prep.my-key',
                reach: { exid: 'github://org=ehmpathy' },
              },
              { ghRun, question: questionNeverCalled },
            ),
          ),
        }));

        // a fallback to `ahbode` would have SUCCEEDED here, so the mere presence of an error
        // is itself evidence the reach drove the lookup
        then('it fails loud rather than hand back the slug org app', () => {
          expect(outcome.error).toBeInstanceOf(ConstraintError);
          expect(outcome.error.message).toContain('no github apps registered');
        });

        then('the refusal names the REACHED org, never the slug org', () => {
          expect(outcome.error.message).toContain('ehmpathy');
          expect(outcome.error.message).not.toContain('ahbode');
        });

        // the same admin-free remedy a same-org caller already meets (q7/e19). a cross-org
        // caller is told to register the app, never handed a way around the registry
        then('the fix named is the extant admin-free remedy', () => {
          expect(outcome.error.message).toMatchSnapshot();
        });
      });
    },
  );
});
