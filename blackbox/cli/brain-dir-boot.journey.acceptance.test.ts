import { MalfunctionError } from 'helpful-errors';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { delimiter, join } from 'node:path';
import {
  genTempDir,
  given,
  then,
  useBeforeAll,
  useThen,
  when,
} from 'test-fns';
import { getUuid } from 'uuid-fns';

import {
  asMaskedClaudeEnvelope,
  asSentinel,
  askClaudePrintForSentinels as askClaudePrintForSentinelsUnbounded,
  askCloneForSentinels as askCloneForSentinelsUnbounded,
  getAllActorHashDirNames,
  ROLES_BOOT_COMMAND_WAXER,
  setupBrainDirBootFixtureRepo,
} from '@/blackbox/.test/infra/brainDirBootJourney';
import { asLegibleScreen } from '@/blackbox/.test/infra/asLegibleScreen';
import { enrollRealClaudeAndWaitReach as enrollRealClaudeAndWaitReachUnbounded } from '@/blackbox/.test/infra/enrollCloneHarness';
import type { RhachetBackgroundHandle } from '@/blackbox/.test/infra/spawnRhachetCliBackground';
import { envIsolated } from '@/blackbox/.test/infra/envIsolated';
import { genIsolatedClaudeHome } from '@/blackbox/.test/infra/genIsolatedClaudeHome';
import { genStepBudget } from '@/blackbox/.test/infra/genStepBudget';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary as invokeRhachetCliBinaryUnbounded,
  invokeRhachetCliBinaryAsync,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

jest.setTimeout(600_000);

/**
 * .what = the brain-dir-boot journey — one repo, one human, from a fresh upgrade to a
 *   changed roleset, against a real haiku
 * .why = each brain-dir-boot claim is proven where it is delivered: a brain that quotes
 *   the sentinel it was handed. a render that lands on disk but never reaches the brain
 *   fails here, and nowhere else
 *
 * .note = the claude-code install is shared across runs (`getCachedClaudeCliBin`); the
 *   HOME is a fresh temp dir per run, so the host's own claude state never enters
 */
const NONCE = getUuid().replace(/-/g, '').slice(0, 10);
const sentinelOf = (of: string): string => asSentinel({ of, nonce: NONCE });
const DEFAULT_DIR = join('.agent', '.actors', 'actor.via.slug=.default');
const DEFAULT_BRAIN_DIR = join(DEFAULT_DIR, 'brain', '.claude');

// end a process by pid; one already gone is the goal met, never a fault
const killQuietly = (pid: number): void => {
  try {
    process.kill(pid, 'SIGTERM');
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ESRCH')) throw error;
  }
};

/**
 * .what = the most each kind of step may cost
 * .why = a step past its budget fails at once and names itself, and every later step
 *   short circuits; the ledger at the end names where every second went
 *
 * .note = a `claude -p` launch splits into two populations, so it takes two kinds. a BARE
 *   launch carries the repo's small default corpus; an ENROLLED launch binds
 *   `CLAUDE_CONFIG_DIR` to an actor's brain dir, so it carries that actor's whole corpus
 *   and costs about twice as much. one budget over both sizes the bound for the cheap
 *   population and leaves the dear one at ~100% of it, where a normal latency wobble
 *   trips it and short circuits every later step. the enrolled bound matches `cloneAsk`,
 *   which is the same model call against the same corpus.
 */
const STEP_BUDGET_MS = {
  cli: 15_000,
  claudePrint: 20_000,
  claudePrintEnrolled: 45_000,
  cloneEnroll: 30_000,
  cloneAsk: 45_000,
  compact: 60_000,
} as const;
const budget = genStepBudget({ budgetsMs: STEP_BUDGET_MS });

// each expensive helper, bound by its kind's budget; the child is killed at the bound
const invokeRhachetCliBinary = (
  input: Parameters<typeof invokeRhachetCliBinaryUnbounded>[0],
): ReturnType<typeof invokeRhachetCliBinaryUnbounded> =>
  budget.withBudgetSync(
    {
      kind: 'cli',
      detail: `rhx ${input.args.join(' ')}`,
      asEvidence: (ran) => ({ status: ran.status, stderr: ran.stderr.slice(-2000) }),
    },
    (budgetMs) => invokeRhachetCliBinaryUnbounded({ ...input, timeoutMs: budgetMs }),
  );
const askClaudePrintForSentinels = (
  input: Parameters<typeof askClaudePrintForSentinelsUnbounded>[0],
): ReturnType<typeof askClaudePrintForSentinelsUnbounded> =>
  budget.withBudgetSync(
    {
      // an enrolled launch carries an actor's whole corpus, so it draws the dearer budget
      kind: input.env['CLAUDE_CONFIG_DIR']
        ? 'claudePrintEnrolled'
        : 'claudePrint',
      detail: `claude -p ${(input.args ?? []).join(' ')}`.trim(),
      // a killed launch shows what it printed before the kill
      asEvidence: (asked) => ({
        status: asked.status,
        configDir: input.env['CLAUDE_CONFIG_DIR'] ?? null,
        stderr: asked.stderr.slice(-2000),
        stdout: asked.stdout.slice(-500),
      }),
    },
    (budgetMs) => askClaudePrintForSentinelsUnbounded({ ...input, timeoutMs: budgetMs }),
  );

/**
 * .what = the config prefix an enroll hands its brain cli, rebuilt from the on-disk actor
 * .why = a direct `claude -p` into an actor brain dir that omits this prefix skips the
 *   enroll config and its claudeMdExcludes, so the cwd walk also loads the repo corpus. a
 *   launch that means to measure what a clone sees must carry the same prefix a clone does
 * .note = the path is read off the actor dir name, never recomputed, so the blackbox
 *   imports no hash logic from src
 */
const asEnrollConfigArgs = (input: { dir: string; actorName: string }): string[] => [
  '--setting-sources',
  'user,local',
  '--settings',
  join(
    input.dir,
    '.claude',
    `settings.enroll.${input.actorName.replace('actor.via.hash=', '')}.local.json`,
  ),
];

const enrollRealClaudeAndWaitReach = (
  input: Parameters<typeof enrollRealClaudeAndWaitReachUnbounded>[0],
): ReturnType<typeof enrollRealClaudeAndWaitReachUnbounded> =>
  budget.withBudget(
    { kind: 'cloneEnroll', detail: `enroll --roles ${(input.roles ?? []).join(',')}` },
    (budgetMs) => enrollRealClaudeAndWaitReachUnbounded({ ...input, timeoutMs: budgetMs }),
  );
const askCloneForSentinels = (
  input: Parameters<typeof askCloneForSentinelsUnbounded>[0],
): ReturnType<typeof askCloneForSentinelsUnbounded> =>
  budget.withBudget(
    { kind: 'cloneAsk', detail: `clone ask ${input.address}` },
    (budgetMs) => askCloneForSentinelsUnbounded({ ...input, timeoutMs: budgetMs }),
  );

/**
 * .what = the bytes of the files rhachet renders into a brain dir
 * .why = a clone must read these and never write them; the brain's own `.claude.json`
 *   and transcripts change per session, so they stay out of the comparison
 */
const asBrainDirFileContents = (input: {
  dir: string;
}): Record<string, string | null> =>
  Object.fromEntries(
    ['AGENTS.md', 'CLAUDE.md', 'boot.md'].map((name) => {
      const path = join(input.dir, name);
      return [name, existsSync(path) ? readFileSync(path, 'utf-8') : null];
    }),
  );

/**
 * .what = a labeled `when` step whose value later steps read
 * .why = test-fns `useWhen` wraps no describe, so its label never reaches the test
 *   names; a `when` runs its fn at collection, so the holder is set on return
 */
const useWhenLabeled = <T>(label: string, fn: () => T): T => {
  const held: { value: T | null } = { value: null };
  when(label, () => {
    held.value = fn();
  });
  if (held.value === null)
    throw new MalfunctionError('when step returned no value', { label });
  return held.value;
};

describe('brain dir boot journey (acceptance, real haiku)', () => {
  // every live clone the journey spawns, reaped at the end
  const clonesLive: RhachetBackgroundHandle[] = [];
  afterAll(async () => {
    await Promise.all(clonesLive.map((clone) => clone.kill()));
    // .note = the cost of every budgeted step, costliest first
    console.log(budget.asLedgerReport());
  });

  const scene = useBeforeAll(async () => {
    const { home, binDir, binPath } = genIsolatedClaudeHome({
      slug: 'brain-dir-boot-home',
    });
    const dir = genTempDir({ slug: 'brain-dir-boot-repo' });
    setupBrainDirBootFixtureRepo({ dir, nonce: NONCE });

    // the user-scope memory of this HOME, which no enrolled clone may read
    writeFileSync(
      join(home, '.claude', 'CLAUDE.md'),
      `the user memory sentinel is ${sentinelOf('user')}.\n`,
    );

    const env = {
      ...envIsolated(home),
      PATH: `${binDir}${delimiter}${process.env.PATH ?? ''}`,
      CLAUDE_CONFIG_DIR: undefined,
    };
    return { dir, home, env, binPath };
  });

  given('[case1] a repo with native roles shaper, glasser, sander and a package role waxer', () => {
    when('[t0] before the upgrade', () => {
      then('no boot.md is anywhere under .claude', () => {
        expect(existsSync(join(scene.dir, '.claude', 'boot.md'))).toBe(false);
        expect(existsSync(join(scene.dir, DEFAULT_BRAIN_DIR))).toBe(false);
      });

      then('settings.json holds the prior role boot hook and the human hook', () => {
        const settings = readFileSync(
          join(scene.dir, '.claude', 'settings.json'),
          'utf-8',
        );
        expect(settings).toContain(ROLES_BOOT_COMMAND_WAXER);
        expect(settings).toContain('echo human-hook');
      });
    });

    when('[t1] rhx init --roles waxer --hooks', () => {
      const init = useThen('init succeeds', () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', 'waxer', '--hooks'],
          cwd: scene.dir,
          env: scene.env,
        }),
      );

      then('exits 0', () => {
        expect(init.status).toEqual(0);
      });

      then('the default brain dir holds AGENTS.md, boot.md, .gitignore', () => {
        for (const name of ['AGENTS.md', 'boot.md', '.gitignore'])
          expect(existsSync(join(scene.dir, DEFAULT_BRAIN_DIR, name))).toBe(true);
        expect(
          readFileSync(join(scene.dir, DEFAULT_BRAIN_DIR, 'AGENTS.md'), 'utf-8'),
        ).toEqual('@boot.md\n');
      });

      then('<repo>/.claude is a symlink to the default brain dir', () => {
        expect(lstatSync(join(scene.dir, '.claude')).isSymbolicLink()).toBe(true);
        expect(realpathSync(join(scene.dir, '.claude'))).toEqual(
          realpathSync(join(scene.dir, DEFAULT_BRAIN_DIR)),
        );
      });

      then('git sees AGENTS.md + .gitignore as addable and ignores boot.md', () => {
        const status = spawnSync(
          'git',
          ['status', '--porcelain', '--untracked-files=all'],
          { cwd: scene.dir },
        ).stdout.toString();
        expect(status).toContain(`${DEFAULT_BRAIN_DIR}/AGENTS.md`);
        expect(status).toContain(`${DEFAULT_BRAIN_DIR}/.gitignore`);
        expect(status).not.toContain(`${DEFAULT_BRAIN_DIR}/boot.md`);
        expect(readFileSync(join(scene.dir, '.gitignore'), 'utf-8')).toContain(
          '!.agent/.actors/actor.via.slug=.default/',
        );
      });

      then('the role boot hook is gone; the adhoc and human hooks stay', () => {
        const settings = readFileSync(
          join(scene.dir, '.claude', 'settings.json'),
          'utf-8',
        );
        expect(settings).not.toContain(ROLES_BOOT_COMMAND_WAXER);
        expect(settings).toContain('echo adhoc-waxer');
        expect(settings).toContain('echo human-hook');
      });

      then('init stdout is locked', () => {
        expect(
          asSnapshotSafe(init.stdout),
        ).toMatchSnapshot();
      });

      const ask = useThen('a bare claude -p answers', () =>
        askClaudePrintForSentinels({
          dir: scene.dir,
          env: scene.env,
          binPath: scene.binPath,
        }),
      );

      then('a bare claude -p quotes the default roles, head to tail (M5)', () => {
        // status beside stderr, so a failed ask names its cause
        expect({ status: ask.status, stderr: ask.stderr }).toMatchObject({
          status: 0,
        });
        expect(ask.sentinels).toEqual(
          expect.arrayContaining([
            sentinelOf('shaperhead'),
            sentinelOf('shapertail'),
            sentinelOf('sandertail'),
            sentinelOf('waxerhead'),
            sentinelOf('waxertail'),
          ]),
        );
      });
    });

    when('[t1.1] a human adds a root CLAUDE.md and a CLAUDE.local.md', () => {
      const ask = useThen('a bare claude -p answers', () => {
        writeFileSync(
          join(scene.dir, 'CLAUDE.md'),
          `the root memory sentinel is ${sentinelOf('root')}.\n`,
        );
        writeFileSync(
          join(scene.dir, 'CLAUDE.local.md'),
          `the local memory sentinel is ${sentinelOf('local')}.\n`,
        );
        return askClaudePrintForSentinels({
          dir: scene.dir,
          env: scene.env,
          binPath: scene.binPath,
        });
      });

      then('all three arrive — the default role beside the human two', () => {
        expect(ask.sentinels).toEqual(
          expect.arrayContaining([
            sentinelOf('shaperhead'),
            sentinelOf('root'),
            sentinelOf('local'),
          ]),
        );
      });
    });

    when('[t1.2] a human hand-edits the default AGENTS.md, then rhx init', () => {
      const init = useThen('init resets the file', () => {
        writeFileSync(
          join(scene.dir, DEFAULT_BRAIN_DIR, 'AGENTS.md'),
          '@boot.md\n\nmy own notes\n',
        );
        return invokeRhachetCliBinary({
          args: ['init', '--hooks'],
          cwd: scene.dir,
          env: scene.env,
        });
      });

      then('AGENTS.md is @boot.md again', () => {
        expect(init.status).toEqual(0);
        expect(
          readFileSync(join(scene.dir, DEFAULT_BRAIN_DIR, 'AGENTS.md'), 'utf-8'),
        ).toEqual('@boot.md\n');
      });

      then('stdout names the reset, and that rhachet owns the file', () => {
        expect(init.stdout).toContain('AGENTS.md');
        expect(
          asSnapshotSafe(init.stdout),
        ).toMatchSnapshot();
      });
    });

    when('[t1.3] rhx roles link of role lifeguard, no init after', () => {
      const link = useThen('link succeeds', () =>
        invokeRhachetCliBinary({
          args: ['roles', 'link', '--repo', 'surfshop', '--role', 'lifeguard'],
          cwd: scene.dir,
          env: scene.env,
        }),
      );

      then('the default boot.md holds lifeguard', () => {
        expect(link.status).toEqual(0);
        expect(
          readFileSync(join(scene.dir, DEFAULT_BRAIN_DIR, 'boot.md'), 'utf-8'),
        ).toContain(sentinelOf('lifeguardhead'));
      });

      then('link stdout is locked', () => {
        expect(
          asSnapshotSafe(link.stdout),
        ).toMatchSnapshot();
      });

      const ask = useThen('a bare claude -p answers', () =>
        askClaudePrintForSentinels({
          dir: scene.dir,
          env: scene.env,
          binPath: scene.binPath,
        }),
      );

      then('a bare claude -p quotes lifeguard', () => {
        expect(ask.sentinels).toContain(sentinelOf('lifeguardhead'));
      });
    });

    const t3 = useWhenLabeled('[t3] rhx enroll claude --roles shaper, real cli, temp HOME', () => {
      const enrolled = useThen('enroll reaches a live clone', async () => {
        const actorsBefore = getAllActorHashDirNames({ dir: scene.dir });
        const clone = await enrollRealClaudeAndWaitReach({
          dir: scene.dir,
          env: scene.env,
          roles: ['shaper'],
        });
        clonesLive.push(clone.bg);
        const actorName = getAllActorHashDirNames({ dir: scene.dir }).find(
          (name) => !actorsBefore.includes(name),
        );
        if (!actorName)
          throw new MalfunctionError('enroll made no actor dir', {
            actorsBefore,
          });
        const brainDir = join(
          scene.dir,
          '.agent',
          '.actors',
          actorName,
          'brain',
          '.claude',
        );
        return { ...clone, actorName, brainDir };
      });

      then('the actor brain dir holds CLAUDE.md, AGENTS.md, boot.md', () => {
        for (const name of ['CLAUDE.md', 'AGENTS.md', 'boot.md'])
          expect(existsSync(join(enrolled.brainDir, name))).toBe(true);
      });

      then('the actor boot.md holds shaper, head to tail, and no other role', () => {
        const boot = readFileSync(join(enrolled.brainDir, 'boot.md'), 'utf-8');
        expect(boot).toContain(sentinelOf('shaperhead'));
        expect(boot).toContain(sentinelOf('shapertail'));
        expect(boot).not.toContain(sentinelOf('glasserhead'));
        expect(boot).not.toContain(sentinelOf('waxerhead'));
      });

      then('the actor .claude.json holds the human first-run state and repo trust (D11)', () => {
        const state = JSON.parse(
          readFileSync(join(enrolled.brainDir, '.claude.json'), 'utf-8'),
        ) as {
          hasCompletedOnboarding?: boolean;
          projects?: Record<string, { hasTrustDialogAccepted?: boolean }>;
        };
        expect(state.hasCompletedOnboarding).toBe(true);
        const trusts = Object.values(state.projects ?? {}).map(
          (project) => project.hasTrustDialogAccepted,
        );
        expect(trusts).toContain(true);
      });

      then('the enroll handoff line is locked', () => {
        const handoff =
          enrolled.bg.getOutput().match(/\{"outcome"[^\n]*\}/)?.[0] ?? '';
        expect(
          handoff.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, '__SERIAL__'),
        ).toMatchSnapshot();
      });

      const ask = useThen('the clone answers its first say (M3)', () =>
        askCloneForSentinels({
          address: enrolled.address,
          dir: scene.dir,
          env: scene.env,
          getScreen: () => enrolled.bg.getOutput(),
        }),
      );

      then('the clone quotes shaper head and tail — the whole corpus arrived', () => {
        expect(ask.sentinels).toContain(sentinelOf('shaperhead'));
        expect(ask.sentinels).toContain(sentinelOf('shapertail'));
      });

      then('the clone holds no unenrolled role and no user memory', () => {
        expect(ask.sentinels).not.toContain(sentinelOf('glasserhead'));
        expect(ask.sentinels).not.toContain(sentinelOf('glassertail'));
        expect(ask.sentinels).not.toContain(sentinelOf('waxerhead'));
        expect(ask.sentinels).not.toContain(sentinelOf('user'));
        // the human's repo CLAUDE.md and CLAUDE.local.md stay out of a clone too
        expect(ask.sentinels).not.toContain(sentinelOf('root'));
        expect(ask.sentinels).not.toContain(sentinelOf('local'));
      });

      const relaunch = useThen('a second launch of the actor answers', () => {
        // two identical launches: the first writes the cache, the second reads it (M2)
        // .note = each launch carries the argv every enrolled clone spawns with, so M2
        //   measures the prompt a clone actually runs under
        const launch = () =>
          askClaudePrintForSentinels({
            dir: scene.dir,
            env: { ...scene.env, CLAUDE_CONFIG_DIR: enrolled.brainDir },
            binPath: scene.binPath,
            args: [
              ...asEnrollConfigArgs({ dir: scene.dir, actorName: enrolled.actorName }),
              '--system-prompt',
              '',
              '--output-format',
              'json',
            ],
          });
        launch();
        const asked = launch();
        const envelope = JSON.parse(asked.stdout) as {
          usage?: { cache_read_input_tokens?: number };
        };
        return { ...asked, envelope };
      });

      then('the second launch bills a cache read (M2)', () => {
        const cacheRead = relaunch.envelope.usage?.cache_read_input_tokens ?? 0;
        const bootChars = readFileSync(
          join(enrolled.brainDir, 'boot.md'),
          'utf-8',
        ).length;
        // .note = the measure the yield records for M2
        console.log('M2 measure', { cacheRead, bootChars });

        // the cached read must at least cover the corpus, at ~4 chars per token
        // .note = a floor, never a proof the corpus itself was read from cache; the system prompt
        //   caches too. the differential against a no-corpus baseline is F39's dream
        expect(cacheRead).toBeGreaterThanOrEqual(Math.ceil(bootChars / 4));
      });

      then('the json envelope shape is locked', () => {
        expect(
          asMaskedClaudeEnvelope({ value: relaunch.envelope }),
        ).toMatchSnapshot();
      });

      // the empty system prompt, measured against the real cli: one launch with the vendor
      //   default prompt, one with the empty prompt a clone spawns with. both carry the
      //   enroll config prefix (its claudeMdExcludes keep the repo corpus out), so the
      //   prompt flag is the ONE variable. the difference in billed input IS the default prompt
      const prompts = useThen('a default-prompt launch and an empty-prompt launch answer', () => {
        const launch = (args: string[]) => {
          const asked = askClaudePrintForSentinels({
            dir: scene.dir,
            env: { ...scene.env, CLAUDE_CONFIG_DIR: enrolled.brainDir },
            binPath: scene.binPath,
            args: [
              ...asEnrollConfigArgs({ dir: scene.dir, actorName: enrolled.actorName }),
              ...args,
              '--output-format',
              'json',
            ],
          });
          const envelope = JSON.parse(asked.stdout) as {
            usage?: {
              input_tokens?: number;
              cache_creation_input_tokens?: number;
              cache_read_input_tokens?: number;
            };
          };
          // every input token billed, whether fresh, cache-written or cache-read
          const inputBilled =
            (envelope.usage?.input_tokens ?? 0) +
            (envelope.usage?.cache_creation_input_tokens ?? 0) +
            (envelope.usage?.cache_read_input_tokens ?? 0);
          return { ...asked, inputBilled };
        };
        return {
          vendor: launch([]),
          empty: launch(['--system-prompt', '']),
        };
      });

      then('the cli accepts the empty system prompt — exit 0', () => {
        expect(prompts.empty.status).toEqual(0);
      });

      then('under the empty prompt, CLAUDE.md still boots the whole corpus', () => {
        expect(prompts.empty.sentinels).toContain(sentinelOf('shaperhead'));
        expect(prompts.empty.sentinels).toContain(sentinelOf('shapertail'));
      });

      then('under the empty prompt, no corpus but the actor one arrives', () => {
        expect(prompts.empty.sentinels).not.toContain(sentinelOf('glasserhead'));
        expect(prompts.empty.sentinels).not.toContain(sentinelOf('root'));
        expect(prompts.empty.sentinels).not.toContain(sentinelOf('local'));
        expect(prompts.empty.sentinels).not.toContain(sentinelOf('user'));
      });

      then('the vendor launch reads the same corpus — the prompt is the one variable', () => {
        expect([...prompts.vendor.sentinels].sort()).toEqual(
          [...prompts.empty.sentinels].sort(),
        );
      });

      then('the empty prompt bills measurably less input — the vendor prompt is gone', () => {
        const removed = prompts.vendor.inputBilled - prompts.empty.inputBilled;
        // .note = the measure the yield records for the empty system prompt
        console.log('system prompt measure', {
          vendor: prompts.vendor.inputBilled,
          empty: prompts.empty.inputBilled,
          removed,
        });

        // a floor, never an exact count: the vendor prompt's size moves with each cli
        //   release. a flag the cli ignored would leave the two launches within a few
        //   tokens of each other, far below this bound
        expect(prompts.vendor.status).toEqual(0);
        expect(removed).toBeGreaterThanOrEqual(1000);
      });

      return enrolled;
    });

    when('[t3.1] the repo brain dir opens every door, then a new shaper clone', () => {
      const doors = useThen('the doors open and a new clone answers', async () => {
        const repoBrainDir = join(scene.dir, DEFAULT_BRAIN_DIR);

        // door 1: a CLAUDE.md that points at the repo AGENTS.md — init already opens it
        if (readlinkSync(join(repoBrainDir, 'CLAUDE.md')) !== 'AGENTS.md')
          throw new MalfunctionError('door 1 is not open: CLAUDE.md -> AGENTS.md', {
            repoBrainDir,
          });

        // door 2: a rules file
        mkdirSync(join(repoBrainDir, 'rules'), { recursive: true });
        writeFileSync(
          join(repoBrainDir, 'rules', 'repo-only.md'),
          `the repo rule sentinel is ${sentinelOf('rule')}.\n`,
        );

        // door 3: an unenrolled role's boot hook that echoes a sentinel
        const settingsPath = join(repoBrainDir, 'settings.json');
        const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
        settings.hooks.SessionStart.push({
          matcher: '# author=repo=.this/role=glasser *',
          hooks: [
            {
              type: 'command',
              command: `echo the glasser hook sentinel is ${sentinelOf('hook')}`,
              timeout: 5000,
            },
          ],
        });
        writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);

        // the actor brain dir, before the new clone
        const actorName = getAllActorHashDirNames({ dir: scene.dir })[0]!;
        const actorBrainDir = join(
          scene.dir,
          '.agent',
          '.actors',
          actorName,
          'brain',
          '.claude',
        );
        const filesBefore = asBrainDirFileContents({ dir: actorBrainDir });

        // a new clone of the same actor
        const clone = await enrollRealClaudeAndWaitReach({
          dir: scene.dir,
          env: scene.env,
          roles: ['shaper'],
        });
        clonesLive.push(clone.bg);
        const ask = await askCloneForSentinels({
          address: clone.address,
          dir: scene.dir,
          env: scene.env,
          getScreen: () => clone.bg.getOutput(),
        });
        // free its host slot now: a later step's enroll waits on a slot inside its budget
        await clone.bg.kill();
        const filesAfter = asBrainDirFileContents({ dir: actorBrainDir });
        return { ask, filesBefore, filesAfter, repoBrainDir, settingsPath };
      });

      then('the clone quotes shaper', () => {
        expect(doors.ask.sentinels).toContain(sentinelOf('shaperhead'));
      });

      then('the clone holds no door: no glasser role, no rule, no hook (M4, M5)', () => {
        expect(doors.ask.sentinels).not.toContain(sentinelOf('glasserhead'));
        expect(doors.ask.sentinels).not.toContain(sentinelOf('rule'));
        expect(doors.ask.sentinels).not.toContain(sentinelOf('hook'));
      });

      then('the actor brain dir files are byte-unchanged', () => {
        expect(doors.filesAfter).toEqual(doors.filesBefore);
      });

      then('the doors close', () => {
        // door 1 stays: init owns it
        rmSync(join(doors.repoBrainDir, 'rules'), { recursive: true });
        const settings = JSON.parse(readFileSync(doors.settingsPath, 'utf-8'));
        settings.hooks.SessionStart = settings.hooks.SessionStart.filter(
          (entry: { matcher: string }) =>
            !entry.matcher.includes('author=repo=.this/role=glasser'),
        );
        writeFileSync(
          doors.settingsPath,
          `${JSON.stringify(settings, null, 2)}\n`,
        );
        expect(existsSync(join(doors.repoBrainDir, 'rules'))).toBe(false);
      });
    });

    when('[t3.2] an unattended enroll of sander under a HOME with no credential', () => {
      // the detached brain outlives the caller, so reap it by the pid its identity records
      afterAll(() => {
        const serial = result.stdout.match(/"serial":"([0-9a-f-]{36})"/)?.[1];
        if (!serial) return;
        const actorsDir = join(scene.dir, '.agent', '.actors');
        for (const actor of readdirSync(actorsDir)) {
          const identityPath = join(actorsDir, actor, 'clones', `serial=${serial}`, 'identity.json');
          if (!existsSync(identityPath)) continue;
          const { hostPid } = JSON.parse(readFileSync(identityPath, 'utf-8')) as {
            hostPid: number | null;
          };
          if (hostPid) killQuietly(hostPid);
        }
      });
      const result = useThen('enroll returns', () => {
        const homeBare = genTempDir({ slug: 'brain-dir-boot-home-bare' });
        return invokeRhachetCliBinary({
          args: [
            'enroll',
            'claude',
            '--model',
            'haiku',
            '--roles',
            'sander',
            '--output',
            'json',
          ],
          cwd: scene.dir,
          env: {
            ...scene.env,
            ...envIsolated(homeBare),
            ANTHROPIC_API_KEY: undefined,
          },
          timeoutMs: 120_000,
          logOnError: false,
        });
      });

      then('an absent credential is no refusal — enroll spawns the brain (D13)', () => {
        // .note = with no tty the enroll detaches: a host stands the brain up and the
        //   caller exits once it holds the address. rhachet's contract is that it never
        //   refuses: no constraint exit, and the spawn handoff prints
        // .note = the handoff is locked as a SNAPSHOT, the same way `[t3]` locks it. a
        //   loose substring check for `"serial"` would pass on any json that merely
        //   carries the word, so it proved the line printed and proved naught about its
        //   shape. the serial is the one volatile span, so it masks to `__SERIAL__` and
        //   the rest of the contract holds still
        const handoff = result.stdout.match(/\{"outcome"[^\n]*\}/)?.[0] ?? '';
        expect(
          handoff.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, '__SERIAL__'),
        ).toMatchSnapshot();
        expect(result.status).not.toEqual(2);
      });

      then('stderr names the shared login path and both fixes', () => {
        const line =
          result.stderr
            .split('\n')
            .find((row) => row.includes('no claude login at')) ?? '';
        expect(line).toContain('/login');
        expect(line).toContain('ANTHROPIC_API_KEY');
        const brainAuthPath = line.match(/login at (\S+) —/)?.[1] ?? '';
        expect(brainAuthPath).toMatch(/\/\.claude\/\.credentials\.json$/);
        expect(existsSync(brainAuthPath)).toBe(false);
        // .note = not asSnapshotSafe: it strips this path to `/PATH_STRIPPED`, which
        //   hides which file the line names; the one masked span is the temp HOME
        expect(
          line.replace(
            /\S+\/\.claude\/\.credentials\.json/,
            '$HOME/.claude/.credentials.json',
          ),
        ).toMatchSnapshot();
      });

      then('no actor brain dir holds a login of its own — every clone shares ~/.claude', () => {
        // .note = lstat, not exists: a 1.48.0 symlink to an absent login still counts
        const actorsDir = join(scene.dir, '.agent', '.actors');
        const brainDirLogins = readdirSync(actorsDir)
          .filter((name) => name.startsWith('actor.via.'))
          .map((name) => join(actorsDir, name, 'brain', '.claude', '.credentials.json'))
          .filter((path) => lstatSync(path, { throwIfNoEntry: false }) !== undefined);
        expect(brainDirLogins).toEqual([]);
      });
    });

    when('[t4] shaper brief changes; rhx init while the [t3] clone lives', () => {
      const changed = useThen('init re-renders every live corpus', () => {
        const headPath = join(
          scene.dir,
          '.agent',
          'repo=.this',
          'role=shaper',
          'briefs',
          'a.head.md',
        );
        writeFileSync(
          headPath,
          `${readFileSync(headPath, 'utf-8')}\nthe shaper new sentinel is ${sentinelOf('shapernew')}.\n`,
        );
        const actorsBefore = getAllActorHashDirNames({ dir: scene.dir });
        const init = invokeRhachetCliBinary({
          args: ['init', '--hooks'],
          cwd: scene.dir,
          env: scene.env,
        });
        return { init, actorsBefore };
      });

      then('exits 0', () => {
        expect(changed.init.status).toEqual(0);
      });

      then('the repo and the [t3] actor boot.md hold the new sentinel, in place', () => {
        expect(
          readFileSync(join(scene.dir, DEFAULT_BRAIN_DIR, 'boot.md'), 'utf-8'),
        ).toContain(sentinelOf('shapernew'));
        expect(readFileSync(join(t3.brainDir, 'boot.md'), 'utf-8')).toContain(
          sentinelOf('shapernew'),
        );
      });

      then('init stdout is locked', () => {
        expect(
          asSnapshotSafe(changed.init.stdout),
        ).toMatchSnapshot();
      });

      // the [t3] actor enrolled shaper alone, so the waxer hook the repo root carries is
      //   foreign to it: its clones read this brain dir at user scope, where a foreign hook
      //   would fire inside them. the actor row above reads a bare hash for this reason
      then('the [t3] actor carries no hook of a role it did not enroll', () => {
        const settingsPath = join(t3.brainDir, 'settings.json');
        const settings = existsSync(settingsPath)
          ? readFileSync(settingsPath, 'utf-8')
          : '';
        expect(settings).not.toContain('echo adhoc-waxer');
      });

      // the /compact of the [t3] clone and the spawn of a fresh shaper clone share no state
      //   past the init, so both brain waits run at once
      const compactThenAsk = async () => {
        // a /compact makes the brain re-read its memory files from disk
        // async, never sync — a spawnSync here starves the pty this test alone drains
        //   (rule.forbid.sync-invoke-while-a-pty-is-live)
        const said = await budget.withBudget(
          { kind: 'cli', detail: `rhx clone say ${t3.address} --what /compact` },
          () =>
            invokeRhachetCliBinaryAsync({
              args: ['clone', 'say', t3.address, '--what', '/compact'],
              cwd: scene.dir,
              env: scene.env,
              logOnError: false,
            }),
        );
        await budget.withBudget(
          { kind: 'compact', detail: `wait for /compact on ${t3.address}` },
          (budgetMs) =>
            t3.bg
              .waitForOutput({ pattern: /Compacted/, timeoutMs: budgetMs })
              .catch((cause: Error) => {
                throw new MalfunctionError('the [t3] clone never compacted', {
                  reason: cause.message,
                  say: { status: said.status, stderr: said.stderr },
                  // stripped BEFORE the slice, the same convention both other dump
                  // sites hold — on a raw pty buffer the 4000-char budget is spent
                  // almost entirely on escapes, so the dump shows a few hundred
                  // chars of real text
                  screen: asLegibleScreen(t3.bg.getOutput()).slice(-4000),
                });
              }),
        );
        return askCloneForSentinels({
          address: t3.address,
          dir: scene.dir,
          env: scene.env,
          getScreen: () => t3.bg.getOutput(),
        });
      };
      const respawnThenAsk = async () => {
        const clone = await enrollRealClaudeAndWaitReach({
          dir: scene.dir,
          env: scene.env,
          roles: ['shaper'],
        });
        clonesLive.push(clone.bg);
        const ask = await askCloneForSentinels({
          address: clone.address,
          dir: scene.dir,
          env: scene.env,
          getScreen: () => clone.bg.getOutput(),
        });
        // free its host slot now: [t5] enrolls next, and waits on a slot inside its budget
        await clone.bg.kill();
        return {
          ask,
          actorsAfter: getAllActorHashDirNames({ dir: scene.dir }),
        };
      };
      const both = useThen(
        'the [t3] clone compacts and a new clone spawns, and both answer',
        async () => {
          const [compacted, respawn] = await Promise.all([
            compactThenAsk(),
            respawnThenAsk(),
          ]);
          return { compacted, respawn };
        },
      );

      then('after /compact the live clone quotes the new sentinel', () => {
        expect(both.compacted.sentinels).toContain(sentinelOf('shapernew'));
      });

      then('the new clone quotes the new sentinel at spawn, and no new actor', () => {
        expect(both.respawn.ask.sentinels).toContain(sentinelOf('shapernew'));
        expect(both.respawn.actorsAfter).toEqual(changed.actorsBefore);
      });
    });

    const t5 = useWhenLabeled('[t5] a lifeguard actor lives; lifeguard is unlinked; rhx init', () => {
      const run = useThen('init returns', async () => {
        const actorsBefore = getAllActorHashDirNames({ dir: scene.dir });
        const clone = await enrollRealClaudeAndWaitReach({
          dir: scene.dir,
          env: scene.env,
          roles: ['lifeguard'],
        });
        clonesLive.push(clone.bg);
        const actorName = getAllActorHashDirNames({ dir: scene.dir }).find(
          (name) => !actorsBefore.includes(name),
        );
        if (!actorName)
          throw new MalfunctionError('enroll of lifeguard made no actor dir', {
            actorsBefore,
          });
        const init = invokeRhachetCliBinary({
          args: ['init', '--roles', '-lifeguard', '--hooks'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        });
        return { init, actorName };
      });

      then('exits 2 — a constraint', () => {
        expect({ status: run.init.status, stderr: run.init.stderr }).toMatchObject({
          status: 2,
        });
      });

      then('the [t3] actor still re-renders', () => {
        expect(run.init.stdout).toContain(t3.actorName.replace('actor.via.hash=', ''));
        // the assert above proves the ONE actor a human looks for is named, WHOLE — the
        // hash is 8 chars, so a truncated render would fail it (define.address-sigils).
        // it cannot catch a dropped change summary or a reordered block, and the stderr
        // half of this journey is pinned below, so a regression in the SUCCESS half
        // would ship green — this is the partial-success report, the shape a human
        // reads to learn which actors survived the refusal
        expect(asSnapshotSafe(run.init.stdout)).toMatchSnapshot();
      });

      then('stderr names the lifeguard actor and both fixes, and offers no prune', () => {
        expect(run.init.stderr).toContain(
          run.actorName.replace('actor.via.hash=', ''),
        );
        expect(run.init.stderr).toContain('a role no longer linked: lifeguard');
        expect(run.init.stderr).toContain('rhx roles link --role lifeguard');
        expect(run.init.stderr).toContain("end the actor's live clones");
        expect(run.init.stderr).not.toContain('prune');
        expect(asSnapshotSafe(run.init.stderr)).toMatchSnapshot();
      });

      return run;
    });

    when('[t5.1] lifeguard re-linked; the [t3] actor brain dir read-only; rhx init', () => {
      const run = useThen('init returns', () => {
        const link = invokeRhachetCliBinary({
          args: ['roles', 'link', '--repo', 'surfshop', '--role', 'lifeguard'],
          cwd: scene.dir,
          env: scene.env,
        });
        chmodSync(t3.brainDir, 0o555);
        try {
          const init = invokeRhachetCliBinary({
            args: ['init', '--hooks'],
            cwd: scene.dir,
            env: scene.env,
            logOnError: false,
          });
          return { link, init };
        } finally {
          chmodSync(t3.brainDir, 0o755);
        }
      });

      then('the re-link succeeds', () => {
        expect(run.link.status).toEqual(0);
      });

      then('exits 1 — a malfunction, not a constraint', () => {
        expect({ status: run.init.status, stderr: run.init.stderr }).toMatchObject({
          status: 1,
        });
      });

      then('the lifeguard actor re-renders', () => {
        expect(run.init.stdout).toContain(
          t5.actorName.replace('actor.via.hash=', ''),
        );
        // pinned for the same reason as [t5]: this is the success half of a mixed
        // success/refusal run, and only its stderr twin below is otherwise pinned
        expect(asSnapshotSafe(run.init.stdout)).toMatchSnapshot();
      });

      then('stderr names the [t3] actor', () => {
        expect(run.init.stderr).toContain(
          t3.actorName.replace('actor.via.hash=', ''),
        );
        // the cause names the atomic temp file, whose pid and random suffix vary per run
        expect(
          asSnapshotSafe(run.init.stderr).replace(
            /\.boot\.md\.\d+\.[0-9a-f]{8}\.tmp/g,
            '.boot.md.__PID__.__HEX__.tmp',
          ),
        ).toMatchSnapshot();
      });
    });

    when('[t6] rhx enroll --roles shaper,sander', () => {
      const run = useThen('a new actor clone answers', async () => {
        const bootBefore = readFileSync(join(t3.brainDir, 'boot.md'), 'utf-8');
        const actorsBefore = getAllActorHashDirNames({ dir: scene.dir });
        const enrollThenAsk = async () => {
          const clone = await enrollRealClaudeAndWaitReach({
            dir: scene.dir,
            env: scene.env,
            roles: ['shaper', 'sander'],
          });
          clonesLive.push(clone.bg);
          const actorsNew = getAllActorHashDirNames({ dir: scene.dir }).filter(
            (name) => !actorsBefore.includes(name),
          );
          const askNew = await askCloneForSentinels({
            address: clone.address,
            dir: scene.dir,
            env: scene.env,
            getScreen: () => clone.bg.getOutput(),
          });
          // free its host slot now: [t7.1] enrolls next, and waits on a slot inside its budget
          await clone.bg.kill();
          return { actorsNew, askNew };
        };

        // the [t3] clone is asked beside the new enroll; neither reads the other
        const [{ actorsNew, askNew }, askOld] = await Promise.all([
          enrollThenAsk(),
          askCloneForSentinels({
            address: t3.address,
            dir: scene.dir,
            env: scene.env,
            getScreen: () => t3.bg.getOutput(),
          }),
        ]);
        const bootAfter = readFileSync(join(t3.brainDir, 'boot.md'), 'utf-8');
        return { actorsNew, askNew, askOld, bootBefore, bootAfter };
      });

      then('a new actor dir is made', () => {
        expect(run.actorsNew).toHaveLength(1);
      });

      then('the [t3] actor boot.md is byte-unchanged', () => {
        expect(run.bootAfter).toEqual(run.bootBefore);
      });

      then('the [t3] clone holds no sander sentinel', () => {
        expect(run.askOld.sentinels).not.toContain(sentinelOf('sanderhead'));
        expect(run.askOld.sentinels).not.toContain(sentinelOf('sandertail'));
      });

      then('the new clone quotes shaper head, sander head and sander tail', () => {
        expect(run.askNew.sentinels).toEqual(
          expect.arrayContaining([
            sentinelOf('shaperhead'),
            sentinelOf('sanderhead'),
            sentinelOf('sandertail'),
          ]),
        );
      });
    });

    when('[t7] rhx clone get on the [t3] clone', () => {
      const got = useThen('get returns', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'get', t3.address, '--output', 'json', '--tail', 'all'],
          cwd: scene.dir,
          env: scene.env,
        }),
      );

      then('its transcript is found, under the actor brain dir', () => {
        expect(got.status).toEqual(0);
        const parsed = JSON.parse(got.stdout) as {
          messages: { direction: 'in' | 'out' }[];
        };
        expect(parsed.messages.length).toBeGreaterThan(0);
        const transcripts = (
          readdirSync(join(t3.brainDir, 'projects'), {
            recursive: true,
          }) as string[]
        ).filter((name) => name.endsWith('.jsonl'));
        expect(transcripts.length).toBeGreaterThan(0);
      });
    });

    when('[t7.1] a decoy transcript under the temp HOME; a fresh glasser clone', () => {
      const run = useThen('get on the fresh clone returns', async () => {
        // the decoy sits where an unenrolled claude would store this cwd's transcripts
        const projectDir = join(
          scene.home,
          '.claude',
          'projects',
          realpathSync(scene.dir).replace(/[^a-zA-Z0-9]/g, '-'),
        );
        mkdirSync(projectDir, { recursive: true });
        writeFileSync(
          join(projectDir, `${getUuid()}.jsonl`),
          `${JSON.stringify({
            type: 'assistant',
            message: {
              role: 'assistant',
              content: [{ type: 'text', text: `decoy ${sentinelOf('decoy')}` }],
            },
          })}\n`,
        );
        const clone = await enrollRealClaudeAndWaitReach({
          dir: scene.dir,
          env: scene.env,
          roles: ['glasser'],
        });
        clonesLive.push(clone.bg);
        return invokeRhachetCliBinary({
          args: ['clone', 'get', clone.address],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        });
      });

      then('the decoy is not returned', () => {
        expect(`${run.stdout}${run.stderr}`).not.toContain(sentinelOf('decoy'));
      });

      then('the empty-history output is locked', () => {
        expect({
          status: run.status,
          stdout: asSnapshotSafe(run.stdout).replace(
            /[0-9a-f]{8}-[0-9a-f-]{27}|\b[0-9a-f]{8}\b/g,
            '__SERIAL__',
          ),
        }).toMatchSnapshot();
      });
    });

    when('[t8] the journey is complete', () => {
      const git = useThen('git status reads', () => ({
        rows: spawnSync(
          'git',
          ['status', '--porcelain', '--untracked-files=all'],
          { cwd: scene.dir },
        )
          .stdout.toString()
          .split('\n')
          .map((row: string) => row.slice(3))
          .filter((row: string) => row.length > 0),
      }));

      then('no boot.md and no per-host settings are addable', () => {
        expect(git.rows.join('\n')).not.toMatch(/boot\.md|\.local\.json/);
      });

      then('the addable tree of the brain dirs is locked', () => {
        const rows = git.rows
          .filter((row: string) => /\.claude|\.agent\/\.actors/.test(row))
          .sort();
        expect(rows).toMatchSnapshot();
      });
    });

    when('[t8.1] a git clone of the tree; claude -p; rhx init; claude -p', () => {
      const run = useThen('both launches answer', () => {
        spawnSync('git', ['add', '-A'], { cwd: scene.dir });
        spawnSync('git', ['commit', '-q', '-m', 'journey tree'], {
          cwd: scene.dir,
        });
        const cloneDir = genTempDir({ slug: 'brain-dir-boot-clone' });
        rmSync(cloneDir, { recursive: true, force: true });
        const cloned = spawnSync('git', ['clone', '-q', scene.dir, cloneDir]);
        const bootPresent = existsSync(
          join(cloneDir, DEFAULT_BRAIN_DIR, 'boot.md'),
        );
        const before = askClaudePrintForSentinels({
          dir: cloneDir,
          env: scene.env,
          binPath: scene.binPath,
        });
        const init = invokeRhachetCliBinary({
          args: ['init', '--hooks'],
          cwd: cloneDir,
          env: scene.env,
        });
        const after = askClaudePrintForSentinels({
          dir: cloneDir,
          env: scene.env,
          binPath: scene.binPath,
        });
        return {
          cloned: { status: cloned.status, stderr: cloned.stderr.toString() },
          bootPresent,
          before,
          init,
          after,
        };
      });

      then('the clone arrives with the .claude symlink and no boot.md', () => {
        expect(run.cloned.status).toEqual(0);
        expect(run.bootPresent).toBe(false);
      });

      then('the first launch starts with no error and no default sentinel (M7)', () => {
        // .note = the measure the yield records for M7
        console.log('M7 measure', {
          status: run.before.status,
          sentinels: run.before.sentinels,
          stderr: run.before.stderr.slice(-500),
        });
        expect({ status: run.before.status, stderr: run.before.stderr }).toMatchObject({
          status: 0,
        });
        expect(run.before.sentinels).not.toContain(sentinelOf('shaperhead'));
      });

      then('after init, the default sentinel arrives', () => {
        expect(run.init.status).toEqual(0);
        expect(run.after.sentinels).toContain(sentinelOf('shaperhead'));
      });
    });
  });
});
