import { genTempDir, given, then, useBeforeAll, useThen, when } from 'test-fns';

import {
  setupEnrollFixture,
  setupRichStubBrainPath,
} from '@/blackbox/.test/infra/enrollCloneHarness';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * .what = the cache boundary literal is spelled here by parts, never whole
 * .why = this file sits in the repo whose own boot is rendered; a whole copy in any brief
 *        would trip the very guard this test proves. a test file is no brief, but the parts
 *        keep a grep for the literal clean
 */
const BOUNDARY_LITERAL = ['__SYSTEM_PROMPT', 'DYNAMIC_BOUNDARY__'].join('_');

/**
 * .what = proves `rhx enroll` refuses a boot whose role brief holds the cache boundary literal
 * .why = the render owns that line; a brief that quotes it, even inside a code fence, would split
 *   the cached prefix at the wrong place, silently. the refusal is the text a human meets on a
 *   failed enroll, so it is snapped
 */
describe('rhx enroll, boot boundary refusal (acceptance)', () => {
  given('[case1] a repo brief that quotes the boundary literal inside a code fence', () => {
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'enroll-bootboundary' });
      const configDir = genTempDir({ slug: 'enroll-bootboundary-cfg' });
      setupEnrollFixture({ dir });
      const stubPath = setupRichStubBrainPath({ dir });

      // a repo brief that quotes the literal, fenced, as a doc about the boot would
      const briefsDir = join(dir, '.agent', 'repo=.this', 'role=any', 'briefs');
      mkdirSync(briefsDir, { recursive: true });
      writeFileSync(
        join(briefsDir, 'about-the-boot.md'),
        [
          '# about the boot',
          '',
          'the render splits the prompt at this line:',
          '',
          '```',
          BOUNDARY_LITERAL,
          '```',
          '',
        ].join('\n'),
      );
      // say the brief whole: with no boot.yml a repo brief boots as a path-only ref, and its
      //   body never reaches the corpus
      writeFileSync(
        join(dir, '.agent', 'repo=.this', 'role=any', 'boot.yml'),
        ['always:', '  briefs:', '    say:', '      - briefs/about-the-boot.md', ''].join(
          '\n',
        ),
      );
      return { dir, env: { PATH: stubPath, CLAUDE_CONFIG_DIR: configDir } };
    });

    when('[t0] a clone is enrolled', () => {
      const run = useThen('it exits non-zero', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
          // a cap on the guard: a refused enroll returns at once; a broken guard reaches a
          //   brain spawn, and the cap turns that hang into a red with its output
          timeoutMs: 60_000,
        }),
      );

      then('it is refused as a constraint, exit 2', () => {
        expect(run.status).toEqual(2);
        expect(run.stderr).toContain('ConstraintError');
        expect(run.stderr).toContain('a role boot holds the cache boundary literal');
      });

      then('the refusal names the offender role', () => {
        expect(run.stderr).toContain('repo=.this/role=any');
      });

      then('the hint names a way out for a repo role and for a package role', () => {
        expect(run.stderr).toContain('name it another way');
        expect(run.stderr).toContain('rhx init --roles -<role>');
      });

      then('no clone was spawned: stdout names no enrolled clone', () => {
        expect(run.stdout).not.toContain('clone enrolled');
        expect(run.stderr).not.toContain('clone enrolled');
      });

      then('the refusal a human reads is locked', () => {
        expect(
          asSnapshotSafe(run.stderr.split(scene.dir).join('<dir>')),
        ).toMatchSnapshot();
      });
    });

    when('[t1] a clone is enrolled with --output json', () => {
      const run = useThen('it exits non-zero', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--output', 'json'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
          timeoutMs: 60_000,
        }),
      );

      then('the refusal is a parseable constraint, exit 2, not prose', () => {
        expect(run.status).toEqual(2);
        expect(run.stderr).not.toContain('✋');
        const parsed = JSON.parse(run.stderr) as { class: string; message: string };
        expect(parsed.class).toEqual('ConstraintError');
        expect(parsed.message).toContain('a role boot holds the cache boundary literal');
      });

      then('no handoff reaches stdout', () => {
        expect(run.stdout).not.toContain('"outcome"');
      });

      then('the json refusal a machine parses is locked', () => {
        expect(
          asSnapshotSafe(run.stderr.split(scene.dir).join('<dir>')),
        ).toMatchSnapshot();
      });
    });

    when('[t2] rhx init --hooks renders the repo brain dir', () => {
      const run = useThen('it exits non-zero', () =>
        invokeRhachetCliBinary({
          // --hooks: a bare init re-renders no brain dir; --roles or --hooks does
          args: ['init', '--hooks'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
          timeoutMs: 60_000,
        }),
      );

      then('init refuses the same boot, as a constraint, exit 2', () => {
        expect(run.status).toEqual(2);
        expect(run.stderr).toContain('ConstraintError');
        expect(run.stderr).toContain('a role boot holds the cache boundary literal');
        expect(run.stderr).toContain('repo=.this/role=any');
      });

      then('the init refusal a human reads is locked', () => {
        expect(
          asSnapshotSafe(run.stderr.split(scene.dir).join('<dir>')),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case2] a repo brief that quotes the literal, booted as a ref only', () => {
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'enroll-bootboundary-ref' });
      const configDir = genTempDir({ slug: 'enroll-bootboundary-ref-cfg' });
      setupEnrollFixture({ dir });
      const stubPath = setupRichStubBrainPath({ dir });

      // no boot.yml: the brief boots as a path-only ref, so its body never reaches the corpus
      const briefsDir = join(dir, '.agent', 'repo=.this', 'role=any', 'briefs');
      mkdirSync(briefsDir, { recursive: true });
      writeFileSync(
        join(briefsDir, 'about-the-boot.md'),
        ['# about the boot', '', '```', BOUNDARY_LITERAL, '```', ''].join('\n'),
      );
      return { dir, env: { PATH: stubPath, CLAUDE_CONFIG_DIR: configDir } };
    });

    when('[t0] rhx init --hooks renders the repo brain dir', () => {
      const run = useThen('it returns', () =>
        invokeRhachetCliBinary({
          // --hooks: a bare init re-renders no brain dir; --roles or --hooks does
          args: ['init', '--hooks'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
          timeoutMs: 60_000,
        }),
      );

      then('it is not refused: only a booted body can split the prefix', () => {
        expect(run.stderr).not.toContain('a role boot holds the cache boundary literal');
        expect(run.status).toEqual(0);
      });
    });
  });
});
