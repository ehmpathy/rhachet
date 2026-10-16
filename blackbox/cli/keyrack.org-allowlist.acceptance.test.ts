import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
  invokeRhachetCliBinaryAsync,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';
import { maskKeyrackGrantVolatiles } from '@/blackbox/.test/infra/maskKeyrackGrantVolatiles';

/**
 * .what = cast a cli output into a snapshot-safe form, with each fixture secret masked
 * .why = a snapshot is committed, so a secret value must never land in it — even a fixture one;
 *        each member keeps its own mask, so a row that read the wrong org still shows in the diff.
 *        the grant clock (`expires in: Nm`) counts down between unlock and read, so it is masked too
 */
const asSnapshotSafeOfSecrets = (text: string): string =>
  maskKeyrackGrantVolatiles({ stdout: asSnapshotSafe(text) })
    .split('sk-bhanya-prep-xyz789')
    .join('$SECRET_AETHER')
    .split('sk-testorg-prep-abc123')
    .join('$SECRET_TESTORG');

/**
 * .what = the org allowlist, end to end, through the cli a human types
 * .why = a manifest whose `org:` is a list lets one repo address several orgs. the first is the
 *        default, so a bare ask is byte-identical to a scalar `org:`; any other member is legal
 *        via `--org <member>`; an org off the list is refused loud, never served an empty set
 * .note = the fixture holds the SAME key name under both members, each with a distinct value,
 *         so a row that read the wrong org would read the wrong secret — the assert cannot pass
 *         by accident
 */
describe('keyrack org allowlist', () => {
  beforeAll(() => killKeyrackDaemonForTests());

  given('[case1] a manifest whose org: is [testorg, bhanya]', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-org-allowlist' }),
    );

    when('[t0] unlock --env prep, no --org (case=1)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'prep', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('only the default org key unlocks', () => {
        const parsed = JSON.parse(result.stdout);
        const slugs = parsed.unlocked.map((k: { slug: string }) => k.slug);
        expect(slugs).toEqual(['testorg.prep.SHARED_API_KEY']);
      });

      then('the output matches snapshot', () => {
        expect(asSnapshotSafeOfSecrets(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] unlock --env prep --org bhanya (case=4)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--env',
            'prep',
            '--org',
            'bhanya',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('the member key unlocks, never the default', () => {
        const parsed = JSON.parse(result.stdout);
        const slugs = parsed.unlocked.map((k: { slug: string }) => k.slug);
        expect(slugs).toEqual(['bhanya.prep.SHARED_API_KEY']);
      });

      then('the output matches snapshot', () => {
        expect(asSnapshotSafeOfSecrets(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t2] get --key SHARED_API_KEY --env prep --org bhanya (case=2)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'SHARED_API_KEY',
            '--env',
            'prep',
            '--org',
            'bhanya',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('it grants the member key, with the member value', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
        expect(parsed.grant.slug).toEqual('bhanya.prep.SHARED_API_KEY');
        expect(parsed.grant.key.secret).toEqual('sk-bhanya-prep-xyz789');
      });

      then('the output matches snapshot, with the secret masked', () => {
        expect(asSnapshotSafeOfSecrets(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t2b] get --org bhanya --key SHARED_API_KEY --value, the grove consumer form (wish)', () => {
      // the exact read the wish names for a multi-org grove fleet: a raw value, no json
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--org',
            'bhanya',
            '--env',
            'prep',
            '--key',
            'SHARED_API_KEY',
            '--value',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout is the member value alone, never the default', () => {
        expect(result.stdout.trim()).toEqual('sk-bhanya-prep-xyz789');
      });

      then('the output matches snapshot, with the secret masked', () => {
        expect(asSnapshotSafeOfSecrets(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t3] get --key SHARED_API_KEY --env prep, no --org (case=1)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'SHARED_API_KEY',
            '--env',
            'prep',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('it grants the default org key, byte-identical to a scalar org:', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
        expect(parsed.grant.slug).toEqual('testorg.prep.SHARED_API_KEY');
        expect(parsed.grant.key.secret).toEqual('sk-testorg-prep-abc123');
      });

      then('the output matches snapshot, with the secret masked', () => {
        expect(asSnapshotSafeOfSecrets(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t4] get --org bhnya, a typo off the allowlist (case=5)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'SHARED_API_KEY',
            '--env',
            'prep',
            '--org',
            'bhnya',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exits with code 2 (constraint error)', () => {
        expect(result.status).toEqual(2);
      });

      then('the refusal names the typo and every member', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain(
          "--org 'bhnya' is not on this manifest's org allowlist",
        );
        expect(output).toContain('testorg, bhanya');
      });

      // .note = a flag ask keeps the `--org @all` door: a key that belongs to no org is still
      //         reachable (fulcrum F7). a slug ask omits it — see keyrack.del [case4]
      then('the hint names the allowlist edit and keeps the @all door', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain("or add 'bhnya' to org: in .agent/keyrack.yml");
        expect(output).toContain('--org @all');
      });

      then('the human-seen refusal matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout + result.stderr)).toMatchSnapshot();
      });
    });

    when('[t4b] get --key testorg.prep.SHARED_API_KEY --org bhanya, a slug of another member', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'testorg.prep.SHARED_API_KEY',
            '--org',
            'bhanya',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exits with code 2 (constraint error), never a grant of the testorg key', () => {
        expect(result.status).toEqual(2);
      });

      then('the refusal names the conflict, as set and del do', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain(
          '--org bhanya conflicts with org in slug testorg.prep.SHARED_API_KEY',
        );
      });

      then('the human-seen refusal matches snapshot', () => {
        expect(
          asSnapshotSafeOfSecrets(result.stdout + result.stderr),
        ).toMatchSnapshot();
      });
    });

    const SLUG_CONFLICT_MUTATIONS = [
      {
        description: '[t4c] set --key testorg.prep.SHARED_API_KEY --org bhanya',
        args: [
          'keyrack',
          'set',
          '--key',
          'testorg.prep.SHARED_API_KEY',
          '--org',
          'bhanya',
          '--vault',
          'os.direct',
        ],
      },
      {
        description: '[t4d] del --key testorg.prep.SHARED_API_KEY --org bhanya',
        args: [
          'keyrack',
          'del',
          '--key',
          'testorg.prep.SHARED_API_KEY',
          '--org',
          'bhanya',
        ],
      },
    ];

    SLUG_CONFLICT_MUTATIONS.map((thisCase) =>
      when(`${thisCase.description}, a slug of another member`, () => {
        const result = useBeforeAll(async () =>
          invokeRhachetCliBinary({
            args: thisCase.args,
            cwd: repo.path,
            env: { HOME: repo.path },
            stdin: 'sk-never-written\n',
            logOnError: false,
          }),
        );

        then('exits with code 2 (constraint error), and mutates no key', () => {
          expect(result.status).toEqual(2);
        });

        then('the refusal names the conflict, as get does', () => {
          expect(result.stdout + result.stderr).toContain(
            '--org bhanya conflicts with org in slug testorg.prep.SHARED_API_KEY',
          );
        });

        then('the human-seen refusal matches snapshot', () => {
          expect(
            asSnapshotSafeOfSecrets(result.stdout + result.stderr),
          ).toMatchSnapshot();
        });
      }),
    );

    when('[t5] unlock --env prep --org bhnya (case=5)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'prep', '--org', 'bhnya'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exits with code 2, never an empty sweep', () => {
        expect(result.status).toEqual(2);
        const output = result.stdout + result.stderr;
        expect(output).toContain(
          "--org 'bhnya' is not on this manifest's org allowlist",
        );
      });

      then('the human-seen refusal matches snapshot', () => {
        expect(
          asSnapshotSafeOfSecrets(result.stdout + result.stderr),
        ).toMatchSnapshot();
      });
    });

    when('[t6] get --for repo --env prep --org bhanya (case=4)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--for',
            'repo',
            '--env',
            'prep',
            '--org',
            'bhanya',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('the sweep grants the member key with the member value, never an empty set', () => {
        const parsed = JSON.parse(result.stdout);
        const granted = parsed.filter(
          (a: { status: string }) => a.status === 'granted',
        );
        expect(granted.map((a: { grant: { slug: string } }) => a.grant.slug)).toEqual([
          'bhanya.prep.SHARED_API_KEY',
        ]);
        expect(granted[0].grant.key.secret).toEqual('sk-bhanya-prep-xyz789');
      });

      then('the output matches snapshot, with the secret masked', () => {
        expect(asSnapshotSafeOfSecrets(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t7] source --env prep --org bhanya (case=4)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'source', '--env', 'prep', '--org', 'bhanya'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('it exports the member value, never the default', () => {
        expect(result.stdout).toContain('sk-bhanya-prep-xyz789');
        expect(result.stdout).not.toContain('sk-testorg-prep-abc123');
      });

      then('the output matches snapshot, with the secret masked', () => {
        expect(asSnapshotSafeOfSecrets(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t8] status --env prep --org bhanya (case=4)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'status', '--env', 'prep', '--org', 'bhanya'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('the rows list the member slug, never an empty rack', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('bhanya.prep.SHARED_API_KEY');
      });

      then('the output matches snapshot', () => {
        expect(asSnapshotSafeOfSecrets(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t8b] list --org bhanya (case=4)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--org', 'bhanya'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('the rows list the member slug, never the default', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('bhanya.prep.SHARED_API_KEY');
        expect(result.stdout).not.toContain('testorg.prep.SHARED_API_KEY');
      });

      then('the output matches snapshot', () => {
        expect(asSnapshotSafeOfSecrets(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t8c] unlock --env prep --key SHARED_API_KEY --org bhanya, a keyed member unlock (case=4 [t4])', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--env',
            'prep',
            '--key',
            'SHARED_API_KEY',
            '--org',
            'bhanya',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('the member slug unlocks — the re-slug precedes the filter-miss guard', () => {
        const parsed = JSON.parse(result.stdout);
        const slugs = parsed.unlocked.map((k: { slug: string }) => k.slug);
        expect(slugs).toEqual(['bhanya.prep.SHARED_API_KEY']);
      });

      then('never a filter-miss refusal, never a fix that names the default org', () => {
        const output = result.stdout + result.stderr;
        expect(output).not.toContain('excluded by --org filter');
        expect(output).not.toContain('--org testorg');
      });

      then('the output matches snapshot', () => {
        expect(asSnapshotSafeOfSecrets(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t8d] two clones overlap: unlock --env prep, beside unlock --env prep --org bhanya (case=4 [t5])', () => {
      const overlap = useBeforeAll(async () => {
        // start from an empty daemon, so each grant below is minted by the overlap itself
        invokeRhachetCliBinary({
          args: ['keyrack', 'relock'],
          cwd: repo.path,
          env: { HOME: repo.path },
        });
        const [unlockDefault, unlockMember] = await Promise.all([
          invokeRhachetCliBinaryAsync({
            args: ['keyrack', 'unlock', '--env', 'prep', '--json'],
            cwd: repo.path,
            env: { HOME: repo.path },
          }),
          invokeRhachetCliBinaryAsync({
            args: ['keyrack', 'unlock', '--env', 'prep', '--org', 'bhanya', '--json'],
            cwd: repo.path,
            env: { HOME: repo.path },
          }),
        ]);
        const readArgs = ['keyrack', 'get', '--key', 'SHARED_API_KEY', '--env', 'prep'];
        const getDefault = invokeRhachetCliBinary({
          args: [...readArgs, '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        });
        const getMember = invokeRhachetCliBinary({
          args: [...readArgs, '--org', 'bhanya', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        });
        return { unlockDefault, unlockMember, getDefault, getMember };
      });

      then('both overlapped unlocks exit 0', () => {
        expect(overlap.unlockDefault.status).toEqual(0);
        expect(overlap.unlockMember.status).toEqual(0);
      });

      then('the daemon holds both grants — neither overwrote the other', () => {
        const granted = [overlap.getDefault, overlap.getMember].map(
          (r) => JSON.parse(r.stdout).status,
        );
        expect(granted).toEqual(['granted', 'granted']);
      });

      then('each read gets back its own org value, never its peer value', () => {
        const parsedDefault = JSON.parse(overlap.getDefault.stdout);
        const parsedMember = JSON.parse(overlap.getMember.stdout);
        expect(parsedDefault.grant.slug).toEqual('testorg.prep.SHARED_API_KEY');
        expect(parsedDefault.grant.key.secret).toEqual('sk-testorg-prep-abc123');
        expect(parsedMember.grant.slug).toEqual('bhanya.prep.SHARED_API_KEY');
        expect(parsedMember.grant.key.secret).toEqual('sk-bhanya-prep-xyz789');
      });

      then('the member read matches snapshot, with the secret masked', () => {
        expect(
          asSnapshotSafeOfSecrets(overlap.getMember.stdout),
        ).toMatchSnapshot();
      });
    });

    when('[t8e] a locked member key: get --org bhanya, then its fix line run verbatim (case=8 [t0], [t1])', () => {
      const journey = useBeforeAll(async () => {
        // lock the rack, so the member read meets a locked key
        invokeRhachetCliBinary({
          args: ['keyrack', 'relock'],
          cwd: repo.path,
          env: { HOME: repo.path },
        });
        const readArgs = [
          'keyrack',
          'get',
          '--key',
          'SHARED_API_KEY',
          '--env',
          'prep',
          '--org',
          'bhanya',
        ];
        const readLocked = invokeRhachetCliBinary({
          args: readArgs,
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        });

        // run the printed fix line verbatim, as a human would paste it
        const fixLine =
          /rhx keyrack (unlock [^\n\x1b]*)/.exec(
            readLocked.stdout + readLocked.stderr,
          )?.[1] ?? null;
        const fixRun = fixLine
          ? invokeRhachetCliBinary({
              args: ['keyrack', ...fixLine.trim().split(' ')],
              cwd: repo.path,
              env: { HOME: repo.path },
            })
          : null;
        const readAfterFix = invokeRhachetCliBinary({
          args: [...readArgs, '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        });
        return { readLocked, fixLine, fixRun, readAfterFix };
      });

      then('the locked read exits non-zero and says locked', () => {
        expect(journey.readLocked.status).not.toEqual(0);
        expect(journey.readLocked.stdout + journey.readLocked.stderr).toContain(
          'locked',
        );
      });

      then('the fix line ends --org bhanya, so it unlocks the key that was asked for', () => {
        expect(journey.fixLine).toEqual(
          'unlock --env prep --key SHARED_API_KEY --org bhanya',
        );
      });

      then('the fix line, run verbatim, exits 0', () => {
        expect(journey.fixRun?.status).toEqual(0);
      });

      then('the second read grants the member key — no loop', () => {
        const parsed = JSON.parse(journey.readAfterFix.stdout);
        expect(parsed.status).toEqual('granted');
        expect(parsed.grant.slug).toEqual('bhanya.prep.SHARED_API_KEY');
        expect(parsed.grant.key.secret).toEqual('sk-bhanya-prep-xyz789');
      });

      then('the locked member read render matches snapshot', () => {
        expect(
          asSnapshotSafeOfSecrets(
            journey.readLocked.stdout + journey.readLocked.stderr,
          ),
        ).toMatchSnapshot();
      });

      then('the member grant render after the fix matches snapshot', () => {
        expect(
          asSnapshotSafeOfSecrets(journey.readAfterFix.stdout),
        ).toMatchSnapshot();
      });
    });

    // .note = the REPO sweeps only. `status` and `list` narrow the HOST rack, which may hold
    //         keys of any org, so an off-list org there is a legit narrow whose empty answer
    //         names its cause — pinned by keyrack.machine-wide-skips-manifest [case2][t2b]
    const SWEEPS_OFF_THE_ALLOWLIST = [
      {
        description: 'get --for repo',
        args: ['get', '--for', 'repo', '--env', 'prep', '--org', 'bhnya'],
      },
      { description: 'source', args: ['source', '--env', 'prep', '--org', 'bhnya'] },
    ];
    SWEEPS_OFF_THE_ALLOWLIST.map((thisCase) =>
      when(`[t9] ${thisCase.description} --org bhnya (case=5)`, () => {
        const result = useBeforeAll(async () =>
          invokeRhachetCliBinary({
            args: ['keyrack', ...thisCase.args],
            cwd: repo.path,
            env: { HOME: repo.path },
            logOnError: false,
          }),
        );

        then('exits with code 2, never an empty rack', () => {
          expect(result.status).toEqual(2);
          const output = result.stdout + result.stderr;
          expect(output).toContain(
            "--org 'bhnya' is not on this manifest's org allowlist",
          );
        });

        then('the human-seen refusal matches snapshot', () => {
          expect(
            asSnapshotSafeOfSecrets(result.stdout + result.stderr),
          ).toMatchSnapshot();
        });
      }),
    );
  });

  given('[case2] a manifest whose org: list names @all (case=6)', () => {
    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-org-allowlist' });
      writeFileSync(
        join(r.path, '.agent', 'keyrack.yml'),
        "org:\n  - testorg\n  - '@all'\n\nenv.prep:\n  - SHARED_API_KEY\n",
      );
      return r;
    });

    when('[t0] get --key SHARED_API_KEY --env prep', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'SHARED_API_KEY', '--env', 'prep'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exits with code 2 (constraint error)', () => {
        expect(result.status).toEqual(2);
      });

      then('the refusal names the malformed member', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('@all');
      });

      then('the human-seen refusal matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout + result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case2c] a manifest whose org: list names @this (case=6)', () => {
    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-org-allowlist' });
      writeFileSync(
        join(r.path, '.agent', 'keyrack.yml'),
        "org:\n  - testorg\n  - '@this'\n\nenv.prep:\n  - SHARED_API_KEY\n",
      );
      return r;
    });

    when('[t0] get --key SHARED_API_KEY --env prep', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'SHARED_API_KEY', '--env', 'prep'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exits with code 2 (constraint error)', () => {
        expect(result.status).toEqual(2);
      });

      then('the refusal names the sigil member, as it does for @all', () => {
        expect(result.stdout + result.stderr).toContain(
          "'@this' cannot be an org: member",
        );
      });

      then('the human-seen refusal matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout + result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case2b] a manifest whose org: list is empty or repeats a member (case=6)', () => {
    const MALFORMED_CASES = [
      {
        description: '[t1] org: [] — no default for @this',
        orgBlock: 'org: []\n',
        expectText: 'keyrack manifest org: lists no org',
      },
      {
        description: '[t2] org: [testorg, testorg] — a repeat',
        orgBlock: 'org:\n  - testorg\n  - testorg\n',
        expectText: "org 'testorg' is listed more than once",
      },
    ];

    MALFORMED_CASES.map((thisCase) =>
      when(thisCase.description, () => {
        const repo = useBeforeAll(async () => {
          const r = await genTestTempRepo({
            fixture: 'with-keyrack-org-allowlist',
          });
          writeFileSync(
            join(r.path, '.agent', 'keyrack.yml'),
            `${thisCase.orgBlock}\nenv.prep:\n  - SHARED_API_KEY\n`,
          );
          return r;
        });

        const result = useBeforeAll(async () =>
          invokeRhachetCliBinary({
            args: ['keyrack', 'get', '--key', 'SHARED_API_KEY', '--env', 'prep'],
            cwd: repo.path,
            env: { HOME: repo.path },
            logOnError: false,
          }),
        );

        then('exits with code 2 (constraint error)', () => {
          expect(result.status).toEqual(2);
        });

        then('the refusal names the malformed line', () => {
          expect(result.stdout + result.stderr).toContain(thisCase.expectText);
        });

        then('the human-seen refusal matches snapshot', () => {
          expect(asSnapshotSafe(result.stdout + result.stderr)).toMatchSnapshot();
        });
      }),
    );
  });

  given('[case4] a member key set, then deleted, via --org bhanya (case=3)', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-org-allowlist' }),
    );

    when('[t0] set --key MEMBER_KEY --env prep --org bhanya', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'MEMBER_KEY',
            '--env',
            'prep',
            '--org',
            'bhanya',
            '--vault',
            'os.direct',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'sk-bhanya-member-value\n',
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('the key is filed under the member, never the default', () => {
        expect(result.stdout).toContain('bhanya.prep.MEMBER_KEY');
        expect(result.stdout).not.toContain('testorg.prep.MEMBER_KEY');
      });

      then('the manifest org: list survives, in order', () => {
        const manifest = readFileSync(
          join(repo.path, '.agent', 'keyrack.yml'),
          'utf8',
        );
        expect(manifest).toContain('org:\n  - testorg\n  - bhanya\n');
      });

      then('the output matches snapshot', () => {
        expect(asSnapshotSafeOfSecrets(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] get --key MEMBER_KEY --env prep --org bhanya, after unlock', () => {
      const result = useBeforeAll(async () => {
        await invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'prep', '--org', 'bhanya'],
          cwd: repo.path,
          env: { HOME: repo.path },
        });
        return invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'MEMBER_KEY',
            '--env',
            'prep',
            '--org',
            'bhanya',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        });
      });

      then('it grants the member value that was set', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
        expect(parsed.grant.slug).toEqual('bhanya.prep.MEMBER_KEY');
        expect(parsed.grant.key.secret).toEqual('sk-bhanya-member-value');
      });

      then('the output matches snapshot, with the secret masked', () => {
        expect(
          asSnapshotSafeOfSecrets(result.stdout)
            .split('sk-bhanya-member-value')
            .join('$SECRET_MEMBER'),
        ).toMatchSnapshot();
      });
    });

    when('[t2] del --key MEMBER_KEY --env prep --org bhanya', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'del',
            '--key',
            'MEMBER_KEY',
            '--env',
            'prep',
            '--org',
            'bhanya',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );
      // .note = the hooks run in declared order, so the list reads after the del lands
      const listed = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('only the member row is gone; the peer rows stay', () => {
        expect(listed.stdout).not.toContain('bhanya.prep.MEMBER_KEY');
        expect(listed.stdout).toContain('bhanya.prep.SHARED_API_KEY');
        expect(listed.stdout).toContain('testorg.prep.SHARED_API_KEY');
      });

      then('the manifest org: list still survives, in order', () => {
        const manifest = readFileSync(
          join(repo.path, '.agent', 'keyrack.yml'),
          'utf8',
        );
        expect(manifest).toContain('org:\n  - testorg\n  - bhanya\n');
      });

      then('the output matches snapshot', () => {
        expect(asSnapshotSafeOfSecrets(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case3] a declared key held under no member (case=8)', () => {
    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-org-allowlist' });
      writeFileSync(
        join(r.path, '.agent', 'keyrack.yml'),
        'org:\n  - testorg\n  - bhanya\n\nenv.prep:\n  - SHARED_API_KEY\n  - UNHELD_KEY\n',
      );
      return r;
    });

    when('[t0] get --key UNHELD_KEY --env prep --org bhanya', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'UNHELD_KEY',
            '--env',
            'prep',
            '--org',
            'bhanya',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('the fix line names the member, so a copy-paste sets the key it asked for', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('bhanya.prep.UNHELD_KEY');
        // the whole fix line, to its end — a prefix match would admit a stray trailer
        expect(output).toMatch(
          /rhx keyrack set --key UNHELD_KEY --env prep --org bhanya --vault <vault>(\x1b\[0m)?$/m,
        );
      });

      then('the human-seen absent render matches snapshot', () => {
        expect(
          asSnapshotSafeOfSecrets(result.stdout + result.stderr),
        ).toMatchSnapshot();
      });
    });

    when('[t1] get --key UNHELD_KEY --env prep, no --org', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'UNHELD_KEY', '--env', 'prep'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('the fix line spells no --org, since the default needs none', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('testorg.prep.UNHELD_KEY');
        expect(output).toContain('rhx keyrack set --key UNHELD_KEY --env prep');
        expect(output).not.toContain('--org');
      });

      then('the human-seen absent render matches snapshot', () => {
        expect(
          asSnapshotSafeOfSecrets(result.stdout + result.stderr),
        ).toMatchSnapshot();
      });
    });

    // ⛔ THE OWNER CLAMP. the sweep tip once dropped `--owner`, while the keyed `get` tip kept
    //    it — so a robot owner's tip, run as printed, wrote to the default owner's rack
    when('[t2] unlock --env prep --org bhanya --owner mechanic, a member sweep', () => {
      const result = useBeforeAll(async () => {
        // a named owner reads its own host manifest, so init it first (no --org → the repo manifest stays)
        await invokeRhachetCliBinary({
          args: ['keyrack', 'init', '--owner', 'mechanic'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        });
        return invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--env',
            'prep',
            '--org',
            'bhanya',
            '--owner',
            'mechanic',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        });
      });

      then('the absent key tip carries the owner the sweep ran as', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('bhanya.prep.UNHELD_KEY');
        expect(output).toMatch(
          /rhx keyrack set --owner mechanic --key UNHELD_KEY --env prep --org bhanya --vault <vault>(\x1b\[0m)?$/m,
        );
      });

      then('the human-seen sweep render matches snapshot', () => {
        expect(
          asSnapshotSafeOfSecrets(result.stdout + result.stderr),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case5] a root allowlist extends a manifest of another org (case=7)', () => {
    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-org-allowlist' });
      const roleDir = join(r.path, '.agent', 'repo=test-repo', 'role=tester');
      mkdirSync(roleDir, { recursive: true });
      writeFileSync(
        join(roleDir, 'keyrack.yml'),
        'org:\n  - ehmpathy\n\nenv.prep:\n  - SHARED_API_KEY\n',
      );
      writeFileSync(
        join(r.path, '.agent', 'keyrack.yml'),
        'org:\n  - testorg\n  - bhanya\n\nextends:\n  - .agent/repo=test-repo/role=tester/keyrack.yml\n\nenv.prep:\n  - SHARED_API_KEY\n',
      );
      return r;
    });

    when('[t0] get --key SHARED_API_KEY --env prep --org ehmpathy, the extended org', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'SHARED_API_KEY',
            '--env',
            'prep',
            '--org',
            'ehmpathy',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exits with code 2, since an extended org never joins the allowlist', () => {
        expect(result.status).toEqual(2);
      });

      then('the refusal names the root members only', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain(
          "--org 'ehmpathy' is not on this manifest's org allowlist",
        );
        expect(output).toContain('testorg, bhanya');
      });

      then('the human-seen refusal matches snapshot', () => {
        expect(
          asSnapshotSafeOfSecrets(result.stdout + result.stderr),
        ).toMatchSnapshot();
      });
    });

    when('[t1] get --key SHARED_API_KEY --env prep --org bhanya, a root member, after unlock', () => {
      const unlocked = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'prep', '--org', 'bhanya'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );
      // .note = beforeAll hooks run in declared order, so this read sees the unlock above
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'SHARED_API_KEY',
            '--env',
            'prep',
            '--org',
            'bhanya',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('the root member unlocks under the extends', () => {
        expect(unlocked.status).toEqual(0);
      });

      then('the root member still reads its own value', () => {
        expect(result.status).toEqual(0);
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.slug).toEqual('bhanya.prep.SHARED_API_KEY');
        expect(parsed.grant.key.secret).toEqual('sk-bhanya-prep-xyz789');
      });

      then('the output matches snapshot, with the secret masked', () => {
        expect(asSnapshotSafeOfSecrets(result.stdout)).toMatchSnapshot();
      });
    });
  });
});
