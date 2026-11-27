import { given, then, useBeforeAll, useThen, when } from 'test-fns';

import { setupRichStubBrainPath } from '@/blackbox/.test/infra/enrollCloneHarness';
import { asCountOfOccurrences } from '@/blackbox/.test/infra/asCountOfOccurrences';
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

import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

const PATH_BOOT_MD = '.agent/.actors/actor.via.repo=ambient/brain/.claude/boot.md';

/**
 * .what = a defect repo, with a stub brain on PATH so a clone can be born
 * .why = the clamp asks whether rhachet births the clone; the brain only has to answer. a stub
 *        brain makes this the integration grain (`rule.forbid.faked-or-quarantined-acceptance`)
 */
const genSceneWithStubBrain = (input: { dir: string; env: object }) => ({
  dir: input.dir,
  env: { ...input.env, PATH: setupRichStubBrainPath({ dir: input.dir }) },
});

/**
 * .what = the said block of one brief, cut from the boot corpus
 * .why = the corpus also holds the linked roles, whose text a dependency bump moves; the snap
 *        holds only the block the defect touched
 */
const asCorpusSayBlock = (input: { bootMd: string; path: string }): string => {
  const start = input.bootMd.indexOf(`<brief.say path="${input.path}"`);
  if (start < 0) return '';
  const end = input.bootMd.indexOf('</brief.say>', start);
  return input.bootMd.slice(start, end + '</brief.say>'.length);
};

/**
 * .what = the corpus tags that name one role's files
 * .why = a refs-only role leaves its paths and no body; these tags are all it contributes. the
 *        filter keeps tags only, since a linked brief's prose may mention the same path
 */
const asCorpusLinesOfRole = (input: { bootMd: string; role: string }): string =>
  input.bootMd
    .split('\n')
    .filter(
      (line) =>
        line.trimStart().startsWith('<brief.') && line.includes(input.role),
    )
    .join('\n');

/**
 * .what = enroll a clone that answers one prompt, then exit
 */
const enrollOnce = (input: {
  dir: string;
  env: Record<string, string>;
  prompt: string;
}) =>
  invokeRhachetCliBinary({
    args: ['enroll', 'claude', '--await', '-p', input.prompt],
    cwd: input.dir,
    env: input.env,
    logOnError: false,
    timeoutMs: 60_000,
  });

/**
 * .what = clamps that no boot-time content check halts a clone birth
 * .why = a clone that cannot be born cannot repair the defect that refused it. each content
 *        defect is set aside at birth with a 🟡 receipt; the stop clamp is its acceptance peer
 *        (`roles.content-defects.acceptance.test.ts`)
 *
 * .note = red without the fix: each kind once refused `rhx enroll` with exit 2
 */
describe('rhx enroll, content defects never halt a clone birth (integration)', () => {
  KINDS_OF_FIXTURE.forEach(
    (kind, index) =>
      given(`[case${index + 1}] a .this role with one ${kind} defect`, () => {
        const scene = useBeforeAll(async () =>
          genSceneWithStubBrain(genRepoWithRoleContentDefect({ kind })),
        );
        const pathNamed = FIXTURE_BY_KIND[kind].pathNamed;

        when('[t0] a clone is enrolled', () => {
          const run = useThen('it returns', () =>
            enrollOnce({ ...scene, prompt: 'poke defect' }),
          );

          then('🔴 the clone is born: enroll exits 0 and the brain answers', () => {
            expect(run.status).toEqual(0);
            expect(run.stdout).toContain('got:poke defect');
          });

          then('the boot corpus was written', () => {
            expect(existsSync(join(scene.dir, PATH_BOOT_MD))).toEqual(true);
          });

          then('the corpus holds no content of an orphan', () => {
            const bootMd = readFileSync(join(scene.dir, PATH_BOOT_MD), 'utf8');
            expect(bootMd).not.toContain('a minified brief whose source is gone');
          });

          then('stderr names the defect on a 🟡 receipt', () => {
            expect(run.stderr).toContain('🟡 boot set aside');
            expect(run.stderr).toContain(pathNamed);
            expect(run.stderr).not.toContain('ConstraintError');
          });

          // a spec that will not parse arms the sweep on itself (its budget is unknown, F17), so
          //   only the other kinds meet a repo with no sweep armed
          then('the receipt says it is the one notice exactly where no stop sweep is armed', () => {
            const isOneNotice = run.stderr.includes(
              'no stop sweep is armed for this clone, so this receipt is the one notice',
            );
            expect(isOneNotice).toEqual(kind !== 'spec-unparsed');
          });

          then('the receipt a human reads is locked', () => {
            expect(
              asSnapshotSafe(asRoleContentDefectReceiptBlock({ output: run.stderr })),
            ).toMatchSnapshot();
          });
        });
      }),
  );

  given('[case4] a boundary literal defect, at the boot corpus', () => {
    const scene = useBeforeAll(async () => {
      const repo = genSceneWithStubBrain(
        genRepoWithRoleContentDefect({ kind: 'boundary-literal' }),
      );
      // `enrollOnce` is a sync spawn, so the corpus is written before the read below
      const run = enrollOnce({ ...repo, prompt: 'poke corpus' });
      return {
        run,
        bootMd: readFileSync(join(repo.dir, PATH_BOOT_MD), 'utf8'),
      };
    });

    when('[t0] the corpus is read', () => {
      then('the clone was born before the corpus was read', () => {
        expect(scene.run.status).toEqual(0);
      });

      then('it holds the boundary literal once, the line the render placed', () => {
        expect(
          asCountOfOccurrences({ text: scene.bootMd, needle: BOUNDARY_LITERAL }),
        ).toEqual(1);
      });

      then('the brief still renders, its copy defanged', () => {
        expect(scene.bootMd).toContain('the render splits the prompt at this line');
        expect(scene.bootMd).toContain('cache boundary literal, set aside');
      });

      then('the defanged block the brain reads is locked', () => {
        const block = asCorpusSayBlock({
          bootMd: scene.bootMd,
          path: '.agent/repo=.this/role=any/briefs/core.md',
        });
        expect(block).toContain('cache boundary literal, set aside');
        expect(asSnapshotSafe(block)).toMatchSnapshot();
      });
    });
  });

  given('[case5] an unparseable boot.yml, at the boot corpus', () => {
    const scene = useBeforeAll(async () => {
      const repo = genSceneWithStubBrain(
        genRepoWithRoleContentDefect({ kind: 'spec-unparsed' }),
      );
      // `enrollOnce` is a sync spawn, so the corpus is written before the read below
      const run = enrollOnce({ ...repo, prompt: 'poke refs' });
      return {
        run,
        bootMd: readFileSync(join(repo.dir, PATH_BOOT_MD), 'utf8'),
      };
    });

    when('[t0] the corpus is read', () => {
      then('the clone was born before the corpus was read', () => {
        expect(scene.run.status).toEqual(0);
      });

      then('the role renders refs-only: its brief is listed by path, its body unsaid', () => {
        expect(scene.bootMd).toContain('role=any/briefs/core.md');
        expect(scene.bootMd).not.toContain('the one brief every clone reads');
      });

      then('the refs-only lines the brain reads are locked', () => {
        const lines = asCorpusLinesOfRole({
          bootMd: scene.bootMd,
          role: 'repo=.this/role=any',
        });
        expect(lines).toContain('role=any/briefs/core.md');
        expect(lines).not.toContain('<brief.say');
        expect(asSnapshotSafe(lines)).toMatchSnapshot();
      });
    });
  });

  given('[case6] a linked package role with an orphan .md.min', () => {
    const scene = useBeforeAll(async () =>
      genSceneWithStubBrain(genRepoWithLinkedRoleOrphan()),
    );

    when('[t0] a clone is enrolled', () => {
      const run = useThen('it returns', () =>
        enrollOnce({ ...scene, prompt: 'poke linked' }),
      );

      then('🔴 the clone is born: enroll exits 0 and the brain answers', () => {
        expect(run.status).toEqual(0);
        expect(run.stdout).toContain('got:poke linked');
      });

      then('the receipt names the linked defect with the levers this repo holds', () => {
        expect(run.stderr).toContain(
          '.agent/repo=fixturepkg/role=lint/briefs/gone.md.min',
        );
        expect(run.stderr).toContain('upgrade via rhx upgrade');
        expect(run.stderr).toContain(
          'mod via a write to .agent/repo=.mods/role=lint/briefs/gone.md',
        );
        expect(run.stderr).toContain(
          'plus a .agent/repo=.mods/role=lint/boot.yml with of: fixturepkg/lint that says the file, then rhx init --hooks',
        );
        expect(run.stderr).toContain(
          'to the owner of the rhachet-roles-fixturepkg package',
        );
        expect(run.stderr).not.toContain('radio.task.push');
        expect(run.stderr).not.toContain('ConstraintError');
      });

      then('the receipt a human reads is locked', () => {
        expect(
          asSnapshotSafe(asRoleContentDefectReceiptBlock({ output: run.stderr })),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case7] an owned orphan in a repo that arms the stop sweep (a budget)', () => {
    const scene = useBeforeAll(async () => {
      const repo = genSceneWithStubBrain(
        genRepoWithRoleContentDefect({ kind: 'orphan-min' }),
      );
      writeFileSync(
        join(repo.dir, '.agent', 'repo=.this', 'role=any', 'boot.yml'),
        `budget:\n  tokens: 50000\n${BOOT_YML_SAY_CORE}`,
      );
      return repo;
    });

    when('[t0] a clone is enrolled', () => {
      const run = useThen('it returns', () =>
        enrollOnce({ ...scene, prompt: 'poke armed' }),
      );

      then('the clone is born, and the receipt names the orphan', () => {
        expect(run.status).toEqual(0);
        expect(run.stderr).toContain('.agent/repo=.this/role=any/briefs/lost.md.min');
      });

      then('the receipt says a stop will hold, never that it is the one notice', () => {
        expect(run.stderr).toContain('🟡 boot set aside');
        expect(run.stderr).not.toContain('the one notice');
        expect(run.stderr).toContain(
          'a stop holds this clone until each owned row is repaired',
        );
      });

      then('the armed receipt a clone reads is locked', () => {
        expect(
          asSnapshotSafe(asRoleContentDefectReceiptBlock({ output: run.stderr })),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case7.1] an armed repo, and a clone whose roles drop the carrier (vision row 20.1)', () => {
    const scene = useBeforeAll(async () => {
      const repo = genSceneWithStubBrain(
        genRepoWithRoleContentDefect({ kind: 'orphan-min' }),
      );
      // role=any carries the sweep (its budget); the orphan sits in a second native role
      const dirThis = join(repo.dir, '.agent', 'repo=.this');
      rmSync(join(dirThis, 'role=any', 'briefs', 'lost.md.min'));
      writeFileSync(
        join(dirThis, 'role=any', 'boot.yml'),
        `budget:\n  tokens: 50000\n${BOOT_YML_SAY_CORE}`,
      );
      mkdirSync(join(dirThis, 'role=side', 'briefs'), { recursive: true });
      writeFileSync(join(dirThis, 'role=side', 'boot.yml'), BOOT_YML_SAY_CORE);
      writeFileSync(join(dirThis, 'role=side', 'briefs', 'core.md'), '# side\n');
      writeFileSync(join(dirThis, 'role=side', 'briefs', 'lost.md.min'), '# lost\n');
      return repo;
    });

    when('[t0] a clone is enrolled with `--roles -any`', () => {
      const run = useThen('it returns', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--roles', '-any', '--await', '-p', 'poke carrier'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
          timeoutMs: 60_000,
        }),
      );

      then('the clone is born, and the receipt names the orphan', () => {
        expect(run.status).toEqual(0);
        expect(run.stderr).toContain('.agent/repo=.this/role=side/briefs/lost.md.min');
      });

      then('the receipt says this clone holds no sweep, so it is the one notice', () => {
        expect(run.stderr).toContain(
          'no stop sweep is armed for this clone, so this receipt is the one notice',
        );
      });

      then('the receipt a clone without the carrier reads is locked', () => {
        expect(
          asSnapshotSafe(asRoleContentDefectReceiptBlock({ output: run.stderr })),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case8] a focused enroll on a role whose boot.yml will not parse', () => {
    const scene = useBeforeAll(async () =>
      genSceneWithStubBrain(genRepoWithRoleContentDefect({ kind: 'spec-unparsed' })),
    );

    when('[t0] a clone is enrolled with a focus on that role', () => {
      const run = useThen('it returns', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--roles', 'any::flow', '--await', '-p', 'poke focus'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
          timeoutMs: 60_000,
        }),
      );

      then('🔴 the clone is born: the focus check never halts on content', () => {
        expect(run.status).toEqual(0);
        expect(run.stdout).toContain('got:poke focus');
      });

      then('the receipt names the spec, and the role renders refs-only', () => {
        expect(run.stderr).toContain('.agent/repo=.this/role=any/boot.yml');
        expect(run.stderr).not.toContain('ConstraintError');
      });

      then('the focus block says the focus waits for the spec, apart from the receipt by a blank line', () => {
        expect(run.stderr).toContain('\n\n🧢 focus');
        expect(run.stderr).toContain(
          'any focused at ::flow, which takes effect once its boot.yml is repaired',
        );
      });

      then('the receipt a focused enroll prints is locked', () => {
        expect(
          asSnapshotSafe(asRoleContentDefectReceiptBlock({ output: run.stderr })),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case9] an owned orphan, enrolled by a machine caller (--output json)', () => {
    const scene = useBeforeAll(async () =>
      genSceneWithStubBrain(genRepoWithRoleContentDefect({ kind: 'orphan-min' })),
    );

    when('[t0] a supervisor enrolls with the machine handoff', () => {
      const run = useThen('it returns', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--output', 'json'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
          timeoutMs: 60_000,
        }),
      );

      then('the clone is born, and the handoff names the defect it boots without', () => {
        expect(run.status).toEqual(0);
        const handoff = JSON.parse(run.stdout) as { outcome: string; defects: string[] };
        expect(handoff.outcome).toEqual('baked');
        expect(handoff.defects).toEqual([
          '.agent/repo=.this/role=any/briefs/lost.md.min (orphan-min)',
        ]);
      });

      then('the machine handoff a supervisor parses is locked', () => {
        expect(asSnapshotSafe(run.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case10] an owned orphan, enrolled as a detached host (--async)', () => {
    const scene = useBeforeAll(async () =>
      genSceneWithStubBrain(genRepoWithRoleContentDefect({ kind: 'orphan-min' })),
    );

    when('[t0] the clone is enrolled detached', () => {
      const run = useThen('it terminates on its own', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--async'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
          timeoutMs: 60_000,
        }),
      );

      then('the clone is born: exit 0', () => {
        expect(run.status).toEqual(0);
      });

      then('the caller still reads the 🟡 receipt that names the defect', () => {
        expect(run.stderr).toContain('🟡 boot set aside 1 role content defect');
        expect(run.stderr).toContain(
          '.agent/repo=.this/role=any/briefs/lost.md.min',
        );
      });

      then('the detached receipt is locked', () => {
        expect(
          asSnapshotSafe(asRoleContentDefectReceiptBlock({ output: run.stderr })),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case12] mixed defects: a linked orphan, an owned orphan, and an owned spec that will not parse beside an orphan (vision case 6)', () => {
    const scene = useBeforeAll(async () => {
      const repo = genSceneWithStubBrain(genRepoWithLinkedRoleOrphan());
      const dirThis = join(repo.dir, '.agent', 'repo=.this');
      // role=any: a sound spec, one orphan
      Object.entries(FIXTURE_BY_KIND['orphan-min'].files).forEach(([relpath, content]) => {
        mkdirSync(join(dirThis, 'role=any', relpath, '..'), { recursive: true });
        writeFileSync(join(dirThis, 'role=any', relpath), content);
      });
      // role=side: a spec that will not parse, and an orphan in the same role
      mkdirSync(join(dirThis, 'role=side', 'briefs'), { recursive: true });
      writeFileSync(
        join(dirThis, 'role=side', 'boot.yml'),
        FIXTURE_BY_KIND['spec-unparsed'].files['boot.yml']!,
      );
      writeFileSync(join(dirThis, 'role=side', 'briefs', 'core.md'), '# side\n');
      writeFileSync(join(dirThis, 'role=side', 'briefs', 'lost.md.min'), '# lost\n');
      return repo;
    });

    when('[t0] a clone is enrolled', () => {
      const run = useThen('it returns', () =>
        enrollOnce({ ...scene, prompt: 'poke mixed' }),
      );

      then('🔴 the clone is born: enroll exits 0 and the brain answers', () => {
        expect(run.status).toEqual(0);
        expect(run.stdout).toContain('got:poke mixed');
        expect(run.stderr).not.toContain('ConstraintError');
      });

      then('one receipt names every defect, owned and linked', () => {
        expect(asCountOfOccurrences({ text: run.stderr, needle: '🟡 boot set aside' })).toEqual(1);
        expect(run.stderr).toContain('.agent/repo=fixturepkg/role=lint/briefs/gone.md.min');
        expect(run.stderr).toContain('.agent/repo=.this/role=any/briefs/lost.md.min');
        expect(run.stderr).toContain('🟡 boot set aside 4 role content defects');
      });

      then('each defect is named once, linked before owned, the orphan beside its broken spec too', () => {
        const paths = [
          '.agent/repo=fixturepkg/role=lint/briefs/gone.md.min',
          '.agent/repo=.this/role=any/briefs/lost.md.min',
          '.agent/repo=.this/role=side/briefs/lost.md.min',
          '.agent/repo=.this/role=side/boot.yml',
        ];
        paths.forEach((needle) =>
          expect(asCountOfOccurrences({ text: run.stderr, needle })).toEqual(1),
        );
        const offsets = paths.map((needle) => run.stderr.indexOf(needle));
        expect(offsets).toEqual([...offsets].sort((a, b) => a - b));
      });

      then('the mixed receipt a clone reads is locked', () => {
        expect(
          asSnapshotSafe(asRoleContentDefectReceiptBlock({ output: run.stderr })),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case11] a repo whose roles hold no content defect', () => {
    const scene = useBeforeAll(async () =>
      genSceneWithStubBrain(
        genRepoWithLinkedRoleContent({
          slug: 'role-defect-none',
          files: { 'briefs/core.md': '# core\n' },
        }),
      ),
    );

    when('[t0] a clone is enrolled', () => {
      const run = useThen('it returns', () =>
        enrollOnce({ ...scene, prompt: 'poke clean' }),
      );

      then('the clone is born, and no receipt is printed', () => {
        expect(run.status).toEqual(0);
        expect(run.stdout).toContain('got:poke clean');
        expect(run.stderr).not.toContain('🟡 boot set aside');
        expect(run.stderr).not.toContain('role content defect');
      });
    });
  });
});
