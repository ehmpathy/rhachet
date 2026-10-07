import { execSync } from 'node:child_process';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import { isAbsolute, join } from 'node:path';

import { given, then, useBeforeAll, when } from 'test-fns';

import { asBrainDirReportBlock } from '@/blackbox/.test/infra/asBrainDirReportBlock';
import { asBrainDirReportSnapshot } from '@/blackbox/.test/infra/asBrainDirReportSnapshot';
import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';

/**
 * .what = the BARE `rhx upgrade` journey — no flags — over a repo whose `<repo>/.claude`
 *         is still a REAL dir, through to a repo whose `<repo>/.claude` is a relative
 *         symlink into the default actor's brain dir, with the corpus rendered and the
 *         boot context owned by rhachet
 *
 * 🔴 .why = bare `rhx upgrade` is the default experience the vast majority of repos take.
 *   every other upgrade case in this suite is flag-qualified (`--roles ehmpathy/mechanic`,
 *   `--roles *`, `--brains anthropic`), and the two bare `upgrade` invocations that do
 *   exist live in `rhx.acceptance.test.ts`, where they prove only that the `rhx` sigil
 *   ROUTES to `rhachet upgrade` rather than to the skill path — they assert naught about
 *   the brain dir. so the migration 99% of humans walk was proved by INFERENCE from
 *   `determineUpgradeScope`'s `--self --roles * --brains *` default, never by a run.
 *   this walks it.
 *
 * .why a JOURNEY rather than a case = the value is in the ORDER. a pre-state that is a
 *   real dir, then one bare command, then a second bare command that must NOT churn what
 *   the first built. each step reads the state the prior step left, so the file walks one
 *   repo through time rather than asserts three independent snapshots.
 *
 * .note = the migration under test is `setRepoBrainDirSymlink`, reached through
 *   `syncDefaultBrainDir` ← `syncAndReportBrainDirBoots` ← `execUpgrade`. it has two
 *   dispositions per entry — DROP a boot name, MOVE every other name — and a name both
 *   dirs hold is MOVED too, with the replacement reported rather than refused (rhachet
 *   owns the default brain dir). the pre-state below seeds one drop and one move.
 */

/** .what = the default actor's brain dir, relative to a repo root */
const DEFAULT_BRAIN_DIR = join(
  '.agent',
  '.actors',
  'actor.via.slug=.default',
  'brain',
  '.claude',
);

/** .what = a hook command distinctive enough that a hit is a fact about our own code */
const HUMAN_HOOK = 'echo upgrade-journey-human-hook';

/** .what = the body of the tracked boot file the migration must DROP, never move */
const STALE_CLAUDE_MD = '# a stale hand-authored CLAUDE.md the migration must drop\n';

/** .what = the body of the non-boot file the migration must MOVE, never drop */
const KEPT_FILE_BODY = '{"keep":"upgrade-journey"}\n';

describe('upgrade — the default actor brain dir migration, under a BARE rhx upgrade', () => {
  const scene = useBeforeAll(async () => {
    const repo = await genTestTempRepo({
      fixture: 'with-roles-linked',
      install: true,
    });

    // seed `<repo>/.claude` as a REAL dir — the pre-upgrade shape every repo that
    // predates the brain dir carries
    const repoClaudeDir = join(repo.path, '.claude');
    mkdirSync(repoClaudeDir, { recursive: true });

    // a settings.json with a human hook — a NON-boot name, so the migration must MOVE it
    writeFileSync(
      join(repoClaudeDir, 'settings.json'),
      `${JSON.stringify(
        { hooks: { SessionStart: [{ hooks: [{ command: HUMAN_HOOK }] }] } },
        null,
        2,
      )}\n`,
    );

    // a second NON-boot name, so the MOVE disposition is proved on more than one entry
    writeFileSync(join(repoClaudeDir, 'keep.json'), KEPT_FILE_BODY);

    // a BOOT name, so the DROP disposition is proved too. it must be TRACKED and clean:
    // `getAllPathsGitCannotRestore` refuses to drop a boot file git cannot hand back, so
    // an untracked one would make the migration exit 2 rather than migrate
    writeFileSync(join(repoClaudeDir, 'CLAUDE.md'), STALE_CLAUDE_MD);
    execSync('git add -A', { cwd: repo.path, stdio: 'ignore' });
    execSync('git -c commit.gpgsign=false commit -m "seed the pre-upgrade tree"', {
      cwd: repo.path,
      stdio: 'ignore',
    });

    return { repo, repoClaudeDir, defaultBrainDir: join(repo.path, DEFAULT_BRAIN_DIR) };
  });

  given('[case1] a repo whose <repo>/.claude is still a real dir', () => {
    when('[t0] before any upgrade', () => {
      then('<repo>/.claude is a real dir, never a symlink', () => {
        const stat = lstatSync(scene.repoClaudeDir);
        expect({
          isDirectory: stat.isDirectory(),
          isSymbolicLink: stat.isSymbolicLink(),
        }).toEqual({ isDirectory: true, isSymbolicLink: false });
      });

      then('the default actor brain dir does not exist yet', () => {
        expect(existsSync(scene.defaultBrainDir)).toBe(false);
      });

      then('the real dir holds the three seeded entries', () => {
        for (const name of ['settings.json', 'keep.json', 'CLAUDE.md'])
          expect(existsSync(join(scene.repoClaudeDir, name))).toBe(true);
      });

      then('the seeded boot file is tracked, so the migration may drop it', () => {
        // an UNTRACKED boot file makes `setRepoBrainDirSymlink` refuse with exit 2
        // rather than migrate, so this premise is asserted rather than assumed — the
        // case proves its own precondition
        // (`rule.require.clamp-the-premise-a-guard-rests-on`)
        const tracked = execSync('git ls-files -- .claude/CLAUDE.md', {
          cwd: scene.repo.path,
        })
          .toString()
          .trim();
        expect(tracked).toEqual('.claude/CLAUDE.md');
      });
    });

    when('[t1] rhx upgrade — bare, with NO flags at all', () => {
      const upgrade = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['upgrade'],
          cwd: scene.repo.path,
          logOnError: false,
        }),
      );

      then('exits 0', () => {
        // stderr rides beside the status only on a failure, so a failed upgrade shows its
        //   cause in the diff (`rule.require.failloud`)
        expect({
          status: upgrade.status,
          stderr: upgrade.status === 0 ? null : upgrade.stderr,
        }).toEqual({ status: 0, stderr: null });
      });

      // ── the migration itself ────────────────────────────────────────────────

      then('<repo>/.claude is now a SYMLINK', () => {
        expect(lstatSync(scene.repoClaudeDir).isSymbolicLink()).toBe(true);
      });

      then('that symlink points at the default actor brain dir', () => {
        expect(realpathSync(scene.repoClaudeDir)).toEqual(
          realpathSync(scene.defaultBrainDir),
        );
      });

      then('the symlink is RELATIVE, never absolute', () => {
        // the link is tracked, so an absolute target breaks in every other clone of the
        // repo — the reason `setRepoBrainDirSymlink` rewrites an absolute one relative
        const target = readlinkSync(scene.repoClaudeDir);
        expect({ target, isAbsolute: isAbsolute(target) }).toMatchObject({
          isAbsolute: false,
        });
      });

      // ── the three dispositions: MOVE, MOVE, DROP ────────────────────────────

      then('the non-boot settings.json MOVED, with its human hook intact', () => {
        const settings = readFileSync(
          join(scene.defaultBrainDir, 'settings.json'),
          'utf-8',
        );
        expect(settings).toContain(HUMAN_HOOK);
      });

      then('the second non-boot entry MOVED, byte-identical', () => {
        expect(
          readFileSync(join(scene.defaultBrainDir, 'keep.json'), 'utf-8'),
        ).toEqual(KEPT_FILE_BODY);
      });

      then('the stale boot file was DROPPED, never carried forward', () => {
        // a drop that silently became a MOVE would leave the hand-authored body in the
        // brain dir, where the cli would read it as the boot door
        const claudeMd = join(scene.defaultBrainDir, 'CLAUDE.md');
        expect(existsSync(claudeMd)).toBe(true);
        expect(readFileSync(claudeMd, 'utf-8')).not.toEqual(STALE_CLAUDE_MD);
      });

      // ── the rendered boot context ───────────────────────────────────────────

      then('AGENTS.md is exactly the boot.md import', () => {
        expect(
          readFileSync(join(scene.defaultBrainDir, 'AGENTS.md'), 'utf-8'),
        ).toEqual('@boot.md\n');
      });

      then('CLAUDE.md is the rhachet symlink to AGENTS.md', () => {
        const claudeMd = join(scene.defaultBrainDir, 'CLAUDE.md');
        expect(lstatSync(claudeMd).isSymbolicLink()).toBe(true);
        expect(readlinkSync(claudeMd)).toEqual('AGENTS.md');
      });

      then('boot.md rendered a real corpus, not an empty file', () => {
        // the pair is deliberate: a `.length > 0` alone would hold for a file of one
        // newline, so the tag assert proves a brief actually landed
        const boot = readFileSync(join(scene.defaultBrainDir, 'boot.md'), 'utf-8');
        expect(boot.length).toBeGreaterThan(0);
        expect(boot).toContain('<brief.say');
      });

      then('boot.md carries no <stats> census — the transport is a filter', () => {
        const boot = readFileSync(join(scene.defaultBrainDir, 'boot.md'), 'utf-8');
        expect(boot).not.toContain('<stats>');
      });

      // ── the two gitignore edits ─────────────────────────────────────────────

      then('the brain dir .gitignore holds boot.md and *.local.json', () => {
        const ignore = readFileSync(
          join(scene.defaultBrainDir, '.gitignore'),
          'utf-8',
        );
        expect(ignore).toContain('boot.md');
        expect(ignore).toContain('*.local.json');
      });

      then('the root .gitignore negates the default actor dir', () => {
        expect(readFileSync(join(scene.repo.path, '.gitignore'), 'utf-8')).toContain(
          '!.agent/.actors/actor.via.slug=.default/',
        );
      });

      then('git ignores the rendered corpus but sees the door', () => {
        // 🟡 the pathspec is load-bearing, never tidiness. `--untracked-files=all`
        // enumerates every file under an untracked dir, and this fixture installs, so
        // an unscoped status emits the whole `node_modules` tree and overruns
        // execSync's 1MB buffer with ENOBUFS. the scope is also the honest one — the
        // claim is about the brain dir alone
        const status = execSync(
          `git status --porcelain --untracked-files=all -- ${DEFAULT_BRAIN_DIR}`,
          { cwd: scene.repo.path },
        ).toString();
        expect(status).toContain(`${DEFAULT_BRAIN_DIR}/AGENTS.md`);
        expect(status).not.toContain(`${DEFAULT_BRAIN_DIR}/boot.md`);
      });

      then('stdout reports the migration as one tree, never a census line', () => {
        // the `boot.md (default): <path> — N roles, M chars` census is gone: what a human
        //   reads is one `🧠 brain dir` treestruct that says what the sync DID — what it
        //   moved, what it dropped, where it linked, and whether the corpus was created or
        //   upgraded (`rule.require.treestruct-output`)
        expect(upgrade.stdout).not.toContain('boot.md (default):');

        const block = asBrainDirReportBlock({ stdout: upgrade.stdout });
        expect(block).toContain('🧠 brain dir (default)');
        expect(block).toContain(`→ ${DEFAULT_BRAIN_DIR}/`);
        expect(block).toContain(`linked`);
      });

      then('the migration tree is locked to a snapshot', () => {
        // the asserts above fix the substance; only a snapshot shows a reader the tree's
        //   own order, glyphs, and words in a pr diff — and this journey is the one place
        //   the WHOLE migration renders at once
        //   (`rule.require.contract-snapshot-exhaustiveness`, paired with the asserts
        //   above rather than alone — `rule.forbid.failhide`)
        expect(
          asBrainDirReportSnapshot({ stdout: upgrade.stdout }),
        ).toMatchSnapshot();
      });
    });

    when('[t2] rhx upgrade a SECOND time — bare again', () => {
      const again = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['upgrade'],
          cwd: scene.repo.path,
          logOnError: false,
        }),
      );

      then('exits 0 — the migration is idempotent', () => {
        expect({
          status: again.status,
          stderr: again.status === 0 ? null : again.stderr,
        }).toEqual({ status: 0, stderr: null });
      });

      then('<repo>/.claude is still the same relative symlink', () => {
        // the second run takes the FOUND branch rather than MIGRATED: there is no real
        // dir left to migrate, so a re-run must leave the link untouched
        expect(lstatSync(scene.repoClaudeDir).isSymbolicLink()).toBe(true);
        expect(isAbsolute(readlinkSync(scene.repoClaudeDir))).toBe(false);
        expect(realpathSync(scene.repoClaudeDir)).toEqual(
          realpathSync(scene.defaultBrainDir),
        );
      });

      then('the moved entries survived the second run', () => {
        expect(
          readFileSync(join(scene.defaultBrainDir, 'keep.json'), 'utf-8'),
        ).toEqual(KEPT_FILE_BODY);
        expect(
          readFileSync(join(scene.defaultBrainDir, 'settings.json'), 'utf-8'),
        ).toContain(HUMAN_HOOK);
      });

      then('the boot context is still the rhachet-owned trio', () => {
        expect(
          readFileSync(join(scene.defaultBrainDir, 'AGENTS.md'), 'utf-8'),
        ).toEqual('@boot.md\n');
        expect(readlinkSync(join(scene.defaultBrainDir, 'CLAUDE.md'))).toEqual(
          'AGENTS.md',
        );
        expect(
          readFileSync(join(scene.defaultBrainDir, 'boot.md'), 'utf-8'),
        ).toContain('<brief.say');
      });
    });
  });
});
