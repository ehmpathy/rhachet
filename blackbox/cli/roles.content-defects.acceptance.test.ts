import { given, then, useBeforeAll, useThen, when } from 'test-fns';

import { asCountOfOccurrences } from '@/blackbox/.test/infra/asCountOfOccurrences';
import { asHookWarnReply } from '@/blackbox/.test/infra/asHookWarnReply';
import { asRoleContentDefectReceiptBlock } from '@/blackbox/.test/infra/asRoleContentDefectReceiptBlock';
import {
  genRepoWithLinkedRoleContent,
  genRepoWithLinkedRoleOrphan,
} from '@/blackbox/.test/infra/genRepoWithLinkedRoleOrphan';
import {
  BOOT_YML_SAY_CORE,
  BOUNDARY_LITERAL,
  FIXTURE_BY_KIND,
  genRepoWithRoleContentDefect,
  KINDS_OF_FIXTURE,
} from '@/blackbox/.test/infra/genRepoWithRoleContentDefect';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * .what = run one rhx command in a scene, as a caller would
 */
const invokeIn = (input: {
  scene: { dir: string; env: Record<string, string> };
  args: string[];
}) =>
  invokeRhachetCliBinary({
    args: input.args,
    cwd: input.scene.dir,
    env: input.scene.env,
    logOnError: false,
    timeoutMs: 60_000,
  });

const ARGS_STOP = ['roles', 'cost', '--all', '--when', 'hook.onStop'];
const ARGS_ROSTER = ['roles', 'cost', '--all'];

/**
 * .what = clamps that a content defect is held, warned, and reported where a clone can repair
 *         it — the stop, the roster, and every rerender — never refused
 * .why = the birth clamp (`enroll.content-defects.integration.test.ts`) proves the clone is born;
 *        this proves the clone is then told, and released once it repairs the file. no brain
 *        runs here, so this is the acceptance grain
 *
 * .note = each stop `[t0]` invokes the sweep by hand, as the hook would. most scenes arm no
 *   hook, so their roster `[t1]` truthfully says no stop will hold; the hold `[t0]` locks is
 *   what an armed repo's hook prints (`[case8.spec-mixed-modes]` is armed, and reads so)
 */
describe('rhx roles, content defects are held at the stop and never refuse (acceptance)', () => {
  KINDS_OF_FIXTURE.forEach(
    (kind, index) =>
      given(`[case${index + 1}] a .this role with one ${kind} defect`, () => {
        const scene = useBeforeAll(async () =>
          genRepoWithRoleContentDefect({ kind }),
        );
        const pathNamed = FIXTURE_BY_KIND[kind].pathNamed;

        when('[t0] the onStop sweep runs', () => {
          const run = useThen('it returns', () =>
            invokeIn({ scene, args: ARGS_STOP }),
          );
          // a second stop over the same tree: the memo must never record a defect as clean
          const again = useThen('it returns again', () =>
            invokeIn({ scene, args: ARGS_STOP }),
          );

          then('the stop is held, exit 2, and the defect is named', () => {
            expect(run.status).toEqual(2);
            expect(run.stderr).toContain('role content defect');
            expect(run.stderr).toContain(pathNamed);
          });

          then('the hold a clone reads is locked', () => {
            expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
          });

          then('a second stop still holds: a defect is never memoized clean', () => {
            expect(again.status).toEqual(2);
            expect(again.stderr).toContain(pathNamed);
          });
        });

        when('[t1] a human runs the roster', () => {
          const run = useThen('it returns', () =>
            invokeIn({ scene, args: ARGS_ROSTER }),
          );

          then('a report never gates: exit 0', () => {
            expect(run.status).toEqual(0);
          });

          then('the roster names the defect on a 🟡 receipt', () => {
            expect(run.stdout).toContain('🟡 boot set aside');
            expect(run.stdout).toContain(pathNamed);
          });

          then('the receipt a human reads is locked', () => {
            expect(
              asSnapshotSafe(asRoleContentDefectReceiptBlock({ output: run.stdout })),
            ).toMatchSnapshot();
          });
        });

        when('[t2] the clone repairs the file and stops again', () => {
          const run = useThen('it returns', () => {
            const { relpath, content } = FIXTURE_BY_KIND[kind].repair;
            const pathToRepair = join(
              scene.dir,
              '.agent',
              'repo=.this',
              'role=any',
              relpath,
            );
            if (content === null) rmSync(pathToRepair);
            if (content !== null) writeFileSync(pathToRepair, content);
            return invokeIn({ scene, args: ARGS_STOP });
          });

          then('the stop is released, exit 0, and says naught', () => {
            expect(run.status).toEqual(0);
            expect(run.stdout.trim()).toEqual('');
            expect(run.stderr).not.toContain(pathNamed);
          });
        });
      }),
  );

  given('[case4] a linked package role with an orphan .md.min', () => {
    const scene = useBeforeAll(async () => genRepoWithLinkedRoleOrphan());

    when('[t0] the onStop sweep runs', () => {
      const run = useThen('it returns', () =>
        invokeIn({ scene, args: ARGS_STOP }),
      );

      then('the stop is never held on a defect this repo cannot repair', () => {
        expect(run.status).toEqual(0);
      });

      then('it warns via a json systemMessage that names the defect', () => {
        const reply = asHookWarnReply({ stdout: run.stdout });
        expect(reply.systemMessage).toContain(
          '.agent/repo=fixturepkg/role=lint/briefs/gone.md.min',
        );
        expect(reply.systemMessage).toContain('upgrade via rhx upgrade');
        expect(reply.systemMessage).toContain(
          'mod via a write to .agent/repo=.mods/role=lint/briefs/gone.md',
        );
      });

      then('the warn the brain-cli reads is one json line, its message locked', () => {
        // the reply is one line the brain-cli parses; the snap holds the message it shows
        expect(run.stdout.trim().split('\n')).toHaveLength(1);
        expect(
          asSnapshotSafe(asHookWarnReply({ stdout: run.stdout }).systemMessage),
        ).toMatchSnapshot();
      });
    });

    when('[t1] a human runs the roster', () => {
      const run = useThen('it returns', () =>
        invokeIn({ scene, args: ARGS_ROSTER }),
      );

      then('a report never gates: exit 0, and the linked defect is named', () => {
        expect(run.status).toEqual(0);
        expect(run.stdout).toContain(
          '.agent/repo=fixturepkg/role=lint/briefs/gone.md.min',
        );
      });

      then('the receipt a human reads is locked', () => {
        // the receipt alone: the linked rows carry token counts a dependency bump moves
        expect(
          asSnapshotSafe(asRoleContentDefectReceiptBlock({ output: run.stdout })),
        ).toMatchSnapshot();
      });
    });

    when('[t2] init rerenders every brain dir (vision case 8 [t0])', () => {
      const run = useThen('it returns', () =>
        invokeIn({ scene, args: ['init', '--hooks'] }),
      );

      // the fixture plants a role dir with no package behind it, so the hook discovery that
      //   follows the render cannot load `rhachet-roles-fixturepkg` and exits 1. a real linked
      //   role has its package; the render and its receipt run before that discovery
      then('the rerender is never refused on the defect: its one fault is the fixture package', () => {
        expect(run.stderr).not.toContain('ConstraintError');
        expect(run.stdout).toContain("Cannot find module 'rhachet-roles-fixturepkg'");
        expect(run.stdout).toContain('✨ hooks');
      });

      then('the receipt names the orphan, its owner, and the levers this repo holds', () => {
        const receipt = asRoleContentDefectReceiptBlock({ output: run.stderr });
        expect(receipt).toContain('.agent/repo=fixturepkg/role=lint/briefs/gone.md.min');
        expect(receipt).toContain('upgrade via rhx upgrade');
        expect(receipt).toContain('to the owner of the rhachet-roles-fixturepkg package');
      });

      then('the linked rerender receipt is locked', () => {
        expect(
          asSnapshotSafe(asRoleContentDefectReceiptBlock({ output: run.stderr })),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case4.1] a linked package role whose said brief holds the cache boundary literal', () => {
    const scene = useBeforeAll(async () =>
      genRepoWithLinkedRoleContent({
        slug: 'role-defect-linked-boundary',
        files: { 'briefs/core.md': `# core\n\n${BOUNDARY_LITERAL}\n` },
      }),
    );
    const pathNamed = '.agent/repo=fixturepkg/role=lint/briefs/core.md';

    when('[t0] the onStop sweep runs', () => {
      const run = useThen('it returns', () =>
        invokeIn({ scene, args: ARGS_STOP }),
      );

      then('the stop is never held, and its json warn names the literal', () => {
        expect(run.status).toEqual(0);
        expect(asHookWarnReply({ stdout: run.stdout }).systemMessage).toContain(pathNamed);
      });

      then('the warn the brain-cli reads is one json line, its message locked', () => {
        // the reply is one line the brain-cli parses; the snap holds the message it shows
        expect(run.stdout.trim().split('\n')).toHaveLength(1);
        expect(
          asSnapshotSafe(asHookWarnReply({ stdout: run.stdout }).systemMessage),
        ).toMatchSnapshot();
      });
    });

    when('[t1] a human runs the roster', () => {
      const run = useThen('it returns', () =>
        invokeIn({ scene, args: ARGS_ROSTER }),
      );

      then('a report never gates, and the 🟡 receipt names the literal', () => {
        expect(run.status).toEqual(0);
        expect(asRoleContentDefectReceiptBlock({ output: run.stdout })).toContain(pathNamed);
      });

      then('the receipt a human reads is locked', () => {
        expect(
          asSnapshotSafe(asRoleContentDefectReceiptBlock({ output: run.stdout })),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case4.2] a linked package role whose boot.yml will not parse', () => {
    const scene = useBeforeAll(async () =>
      genRepoWithLinkedRoleContent({
        slug: 'role-defect-linked-spec',
        files: {
          'boot.yml': 'always:\n  briefs:\n    say: [briefs/core.md\n',
          'briefs/core.md': '# core\n',
        },
      }),
    );
    const pathNamed = '.agent/repo=fixturepkg/role=lint/boot.yml';

    when('[t0] the onStop sweep runs', () => {
      const run = useThen('it returns', () =>
        invokeIn({ scene, args: ARGS_STOP }),
      );

      then('the stop is never held, and its json warn names the spec', () => {
        expect(run.status).toEqual(0);
        expect(asHookWarnReply({ stdout: run.stdout }).systemMessage).toContain(pathNamed);
      });

      then('the warn the brain-cli reads is one json line, its message locked', () => {
        // the reply is one line the brain-cli parses; the snap holds the message it shows
        expect(run.stdout.trim().split('\n')).toHaveLength(1);
        expect(
          asSnapshotSafe(asHookWarnReply({ stdout: run.stdout }).systemMessage),
        ).toMatchSnapshot();
      });
    });

    when('[t1] a human runs the roster', () => {
      const run = useThen('it returns', () =>
        invokeIn({ scene, args: ARGS_ROSTER }),
      );

      then('a report never gates, and the 🟡 receipt names the spec', () => {
        expect(run.status).toEqual(0);
        expect(asRoleContentDefectReceiptBlock({ output: run.stdout })).toContain(pathNamed);
      });

      then('the receipt a human reads is locked', () => {
        expect(
          asSnapshotSafe(asRoleContentDefectReceiptBlock({ output: run.stdout })),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case4.3] a linked package role with a sound spec and an orphan .md.min (vision case 2 [t2], the row tag)', () => {
    const scene = useBeforeAll(async () =>
      genRepoWithLinkedRoleContent({
        slug: 'role-defect-linked-spec-sound',
        files: {
          'boot.yml': BOOT_YML_SAY_CORE,
          'briefs/core.md': '# core\n',
          'briefs/gone.md.min': '# gone\n',
        },
      }),
    );
    const pathNamed = '.agent/repo=fixturepkg/role=lint/briefs/gone.md.min';

    when('[t0] a human runs the roster', () => {
      const run = useThen('it returns', () =>
        invokeIn({ scene, args: ARGS_ROSTER }),
      );

      then("the linked role's row carries the 🟡 defect tag", () => {
        const row = run.stdout
          .split('\n')
          .find((line: string) =>
            line.includes('.agent/repo=fixturepkg/role=lint/boot.yml'),
          );
        expect(row).toContain('🟡 1 role content defect set aside');
        expect(run.stdout).toContain(pathNamed);
      });
    });
  });

  given('[case5] an owned orphan in a role whose spec the roster costs', () => {
    const scene = useBeforeAll(async () =>
      genRepoWithRoleContentDefect({ kind: 'orphan-min' }),
    );

    when('[t0] a human runs the roster', () => {
      const run = useThen('it returns', () =>
        invokeIn({ scene, args: ARGS_ROSTER }),
      );

      then("the role's row carries the 🟡 defect tag", () => {
        const row = run.stdout
          .split('\n')
          .find((line: string) =>
            line.includes('.agent/repo=.this/role=any/boot.yml'),
          );
        expect(row).toContain('🟡 1 role content defect set aside');
      });

      then('the tagged row and its receipt are locked', () => {
        // the owned row and the receipt alone: the linked rows carry token counts a dependency
        //   bump moves. a `⋯` row marks the cut above and below it, so the row's alignment pad
        //   reads as the trace of a wider roster, and the receipt never seems to sit right below
        const row = run.stdout
          .split('\n')
          .find((line: string) =>
            line.includes('.agent/repo=.this/role=any/boot.yml'),
          );
        expect(
          asSnapshotSafe(
            [
              '⋯ (roster header and rows cut)',
              row,
              '⋯ (roster rows cut)',
              '',
              asRoleContentDefectReceiptBlock({ output: run.stdout }),
            ].join('\n'),
          ),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case6] a .this role that a mod also names (an identity refusal, F18)', () => {
    const scene = useBeforeAll(async () => {
      const repo = genRepoWithRoleContentDefect({ kind: 'orphan-min' });
      const pathModSpec = join(repo.dir, '.agent', 'repo=.mods', 'role=any', 'boot.yml');
      mkdirSync(dirname(pathModSpec), { recursive: true });
      writeFileSync(pathModSpec, 'of: .this/any\nbriefs:\n  say: []\n');
      return repo;
    });

    when('[t0] a human runs the roster', () => {
      const run = useThen('it returns', () =>
        invokeIn({ scene, args: ARGS_ROSTER }),
      );

      then('a report never gates: the content scan sets the identity refusal aside, exit 0', () => {
        expect(run.status).toEqual(0);
      });

      then('the refusal is named once, by the roster, never doubled by the content scan', () => {
        expect(
          asCountOfOccurrences({ text: run.stderr, needle: 'names a role this repo owns' }),
        ).toEqual(1);
      });

      then('the roster on stdout lacks the refused role, as the notice says', () => {
        expect(run.stdout).not.toContain('.agent/repo=.this/role=any/boot.yml');
      });

      then('the notice a human reads is locked', () => {
        // stderr alone: the roster it points at is on stdout, asserted by the then above
        expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case7] an orphan in a .this role that declares no boot.yml', () => {
    const scene = useBeforeAll(async () => {
      const repo = genRepoWithRoleContentDefect({ kind: 'orphan-min' });
      rmSync(join(repo.dir, '.agent', 'repo=.this', 'role=any', 'briefs', 'lost.md.min'));
      const roleDir = join(repo.dir, '.agent', 'repo=.this', 'role=nospec');
      mkdirSync(join(roleDir, 'briefs'), { recursive: true });
      writeFileSync(join(roleDir, 'briefs', 'stray.md.min'), '# stray\n');
      return repo;
    });

    when('[t0] the onStop sweep runs', () => {
      const run = useThen('it returns', () =>
        invokeIn({ scene, args: ARGS_STOP }),
      );

      then('a role with no spec is still walked: the stop holds and names the orphan', () => {
        expect(run.status).toEqual(2);
        expect(run.stderr).toContain('.agent/repo=.this/role=nospec/briefs/stray.md.min');
      });

      then('the hold a clone reads is locked', () => {
        expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case7.1] a brief that quotes the boundary literal, booted as a ref only', () => {
    const scene = useBeforeAll(async () => {
      const repo = genRepoWithRoleContentDefect({ kind: 'boundary-literal' });
      // no boot.yml: the brief boots as a path-only ref, so its body never reaches the corpus
      rmSync(join(repo.dir, '.agent', 'repo=.this', 'role=any', 'boot.yml'));
      return repo;
    });

    when('[t0] init rerenders every brain dir', () => {
      const run = useThen('it returns', () =>
        invokeIn({ scene, args: ['init', '--hooks'] }),
      );

      then('no defect is named: only a booted body can split the prefix', () => {
        expect(run.status).toEqual(0);
        expect(run.stderr).not.toContain('🟡 boot set aside');
        expect(run.stderr).not.toContain('.agent/repo=.this/role=any/briefs/core.md');
      });
    });

    when('[t1] the onStop sweep runs', () => {
      const run = useThen('it returns', () =>
        invokeIn({ scene, args: ARGS_STOP }),
      );

      then('the stop holds on naught: exit 0, no defect named', () => {
        expect(run.status).toEqual(0);
        expect(run.stderr).not.toContain('boundary');
        expect(run.stdout).not.toContain('🟡 boot set aside');
      });
    });
  });

  given('[case7.2] a .this role whose one file is an orphan .md.min (F15 bound)', () => {
    const scene = useBeforeAll(async () => {
      const repo = genRepoWithRoleContentDefect({ kind: 'orphan-min' });
      const roleDir = join(repo.dir, '.agent', 'repo=.this', 'role=any');
      rmSync(join(roleDir, 'boot.yml'));
      rmSync(join(roleDir, 'briefs', 'core.md'));
      return repo;
    });

    when('[t0] a human boots the role alone', () => {
      const run = useThen('it returns', () =>
        invokeIn({ scene, args: ['roles', 'boot', '--repo', '.this', '--role', 'any'] }),
      );

      then('the role yields no payload, and says so: no refusal, exit 0', () => {
        expect(run.status).toEqual(0);
        expect(run.stdout + run.stderr).toContain('no resources found');
        expect(run.stderr).not.toContain('ConstraintError');
      });

      then('the empty boot a human reads is locked', () => {
        expect(
          asSnapshotSafe(['stdout:', run.stdout, 'stderr:', run.stderr].join('\n')),
        ).toMatchSnapshot();
      });
    });

    when('[t1] the onStop sweep runs', () => {
      const run = useThen('it returns', () =>
        invokeIn({ scene, args: ARGS_STOP }),
      );

      then('the stop still names the orphan and holds: it reads the role dir, not the payload', () => {
        expect(run.status).toEqual(2);
        expect(run.stderr).toContain('.agent/repo=.this/role=any/briefs/lost.md.min');
      });
    });
  });

  // the rerender init, upgrade and roles link end on: one given per kind, since the repo's own
  //   boot guard reads role=any/boot.yml before the render does
  KINDS_OF_FIXTURE.forEach((kind) =>
    given(`[case8.${kind}] a rerender over an owned ${kind} defect (the sweep init, upgrade and roles link end on)`, () => {
      const scene = useBeforeAll(async () => genRepoWithRoleContentDefect({ kind }));
      const pathNamed = FIXTURE_BY_KIND[kind].pathNamed;

      when('[t0] init rerenders every brain dir', () => {
        const run = useThen('it returns', () =>
          invokeIn({ scene, args: ['init', '--hooks'] }),
        );

        then('the rerender completes past the defect: exit 0', () => {
          expect(run.status).toEqual(0);
        });

        then('stderr names the defect once on the 🟡 receipt, never a refusal', () => {
          expect(run.stderr).toContain('🟡 boot set aside 1 role content defect');
          expect(
            asCountOfOccurrences({ text: run.stderr, needle: pathNamed }),
          ).toEqual(1);
          expect(run.stderr).not.toContain('ConstraintError');
        });

        then('the receipt a human reads is locked', () => {
          expect(
            asSnapshotSafe(asRoleContentDefectReceiptBlock({ output: run.stderr })),
          ).toMatchSnapshot();
        });
      });
    }),
  );

  given('[case8.spec-mixed-modes] a budgeted role=any spec that parses as yaml but mixes two modes (the carrier of the sweep)', () => {
    const scene = useBeforeAll(async () => {
      const repo = genRepoWithRoleContentDefect({ kind: 'spec-unparsed' });
      writeFileSync(
        join(repo.dir, '.agent', 'repo=.this', 'role=any', 'boot.yml'),
        [
          'budget:',
          '  tokens: 5_000',
          'briefs:',
          '  say:',
          '    - briefs/core.md',
          'always:',
          '  briefs:',
          '    say:',
          '      - briefs/core.md',
          '',
        ].join('\n'),
      );
      return repo;
    });
    const pathNamed = FIXTURE_BY_KIND['spec-unparsed'].pathNamed;

    when('[t0] init rerenders every brain dir', () => {
      const run = useThen('it returns', () =>
        invokeIn({ scene, args: ['init', '--hooks'] }),
      );

      then('the rerender completes past the spec: exit 0, no refusal', () => {
        expect(run.status).toEqual(0);
        expect(run.stderr).not.toContain('ConstraintError');
      });

      then('the receipt names the spec, and says the stop will hold on it', () => {
        const receipt = asRoleContentDefectReceiptBlock({ output: run.stderr });
        expect(receipt).toContain(pathNamed);
        expect(receipt).not.toContain('no stop sweep is armed');
        expect(receipt).toContain('a stop holds until each owned row is repaired');
      });

      then('the armed receipt is locked: it announces the hold the stop below prints', () => {
        expect(
          asSnapshotSafe(asRoleContentDefectReceiptBlock({ output: run.stderr })),
        ).toMatchSnapshot();
      });
    });

    when('[t1] the onStop sweep runs', () => {
      const run = useThen('it returns', () =>
        invokeIn({ scene, args: ARGS_STOP }),
      );

      then('the stop holds on the spec itself: exit 2, the spec named', () => {
        expect(run.status).toEqual(2);
        expect(run.stderr).toContain(pathNamed);
      });

      then('the hold a clone reads is locked', () => {
        expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case9] an owned orphan in a role whose boot is past its budget', () => {
    const scene = useBeforeAll(async () => {
      const repo = genRepoWithRoleContentDefect({ kind: 'orphan-min' });
      writeFileSync(
        join(repo.dir, '.agent', 'repo=.this', 'role=any', 'boot.yml'),
        `budget:\n  tokens: 1\n${BOOT_YML_SAY_CORE}`,
      );
      return repo;
    });

    when('[t0] the onStop sweep runs', () => {
      const run = useThen('it returns', () =>
        invokeIn({ scene, args: ARGS_STOP }),
      );

      then('the stop holds on the budget, the gravest drift, exit 2', () => {
        expect(run.status).toEqual(2);
        expect(run.stderr).toContain('boot specs exceed their declared budget');
      });

      then('the budget refusal names the content defect beside it', () => {
        expect(run.stderr).toContain('"defects"');
        expect(run.stderr).toContain(
          '.agent/repo=.this/role=any/briefs/lost.md.min (orphan-min)',
        );
      });

      then('the hold a clone reads is locked', () => {
        expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case10] an owned orphan and a linked orphan together (vision case 6)', () => {
    const scene = useBeforeAll(async () => {
      const repo = genRepoWithRoleContentDefect({ kind: 'orphan-min' });
      const roleDirLinked = join(repo.dir, '.agent', 'repo=fixturepkg', 'role=lint');
      mkdirSync(join(roleDirLinked, 'briefs'), { recursive: true });
      writeFileSync(join(roleDirLinked, 'briefs', 'gone.md.min'), '# gone\n');
      return repo;
    });

    when('[t0] the onStop sweep runs', () => {
      const run = useThen('it returns', () =>
        invokeIn({ scene, args: ARGS_STOP }),
      );

      then('the stop holds on the owned orphan, exit 2', () => {
        expect(run.status).toEqual(2);
        expect(run.stderr).toContain('.agent/repo=.this/role=any/briefs/lost.md.min');
      });

      then('the held readout omits the linked one, which this repo cannot repair', () => {
        expect(run.stderr).not.toContain('.agent/repo=fixturepkg/role=lint/briefs/gone.md.min');
        expect(run.stdout.trim()).toEqual('');
      });

      then('the hold a clone reads is locked, with the linked row absent', () => {
        expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case11] the densest stop: three kinds, two owners, two readouts (vision row 16)', () => {
    const scene = useBeforeAll(async () => {
      // an owned orphan in role=any, whose boot is past its budget
      const repo = genRepoWithRoleContentDefect({ kind: 'orphan-min' });
      writeFileSync(
        join(repo.dir, '.agent', 'repo=.this', 'role=any', 'boot.yml'),
        `budget:\n  tokens: 1\n${BOOT_YML_SAY_CORE}`,
      );

      // an owned spec that will not parse, in a second .this role
      const roleDirBroken = join(repo.dir, '.agent', 'repo=.this', 'role=broken');
      mkdirSync(join(roleDirBroken, 'briefs'), { recursive: true });
      writeFileSync(join(roleDirBroken, 'briefs', 'core.md'), '# core\n');
      writeFileSync(join(roleDirBroken, 'boot.yml'), 'briefs:\n  say: [unclosed\n');

      // a linked orphan, which this repo cannot repair
      const roleDirLinked = join(repo.dir, '.agent', 'repo=fixturepkg', 'role=lint');
      mkdirSync(join(roleDirLinked, 'briefs'), { recursive: true });
      writeFileSync(join(roleDirLinked, 'briefs', 'gone.md.min'), '# gone\n');
      return repo;
    });

    when('[t0] the onStop sweep runs', () => {
      const run = useThen('it returns', () =>
        invokeIn({ scene, args: ARGS_STOP }),
      );

      then('the stop holds once: exit 2', () => {
        expect(run.status).toEqual(2);
      });

      then('one frame: the invocation heads the hold once', () => {
        expect(
          asCountOfOccurrences({
            text: run.stderr,
            needle: '🧢 roles cost --all --when hook.onStop',
          }),
        ).toEqual(1);
      });

      then('both readouts print: the budget breach and the content defects', () => {
        expect(run.stderr).toContain('1 boot spec over budget');
        expect(run.stderr).toContain('2 role content defects, set aside at boot');
      });

      then('the content readout names both owned defects', () => {
        expect(run.stderr).toContain('.agent/repo=.this/role=any/briefs/lost.md.min');
        expect(run.stderr).toContain('.agent/repo=.this/role=broken/boot.yml');
      });

      then('the held readout omits the linked one, which this repo cannot repair', () => {
        expect(run.stderr).not.toContain('.agent/repo=fixturepkg/role=lint/briefs/gone.md.min');
      });

      then('the densest hold a clone reads is locked', () => {
        expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
      });
    });
  });
});
