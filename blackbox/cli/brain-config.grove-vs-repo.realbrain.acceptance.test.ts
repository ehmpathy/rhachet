import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { genTempDir, given, then, useBeforeAll, useThen, when } from 'test-fns';

import { asLegibleScreen } from '@/blackbox/.test/infra/asLegibleScreen';
import { enrollRealClaudeAndWaitReach } from '@/blackbox/.test/infra/enrollCloneHarness';
import { genIsolatedClaudeHome } from '@/blackbox/.test/infra/genIsolatedClaudeHome';
import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { RUN_LIVE_API_TEST } from '@/blackbox/.test/infra/RUN_LIVE_API_TEST';
import {
  type RhachetBackgroundHandle,
  spawnPtyCliBackground,
} from '@/blackbox/.test/infra/spawnPtyCliBackground';

import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { delimiter, join } from 'node:path';

// real claude boots + tool turns + a permission prompt; well past the 90s global cap
jest.setTimeout(600000);

/**
 * .what = the brain config criteria, clamped against a REAL claude
 *   (`define.invariant.brain-config-grove-vs-repo`)
 *   1. auth pulls from the machine-global login
 *   2. machine-global settings reach a brain dir only via `settings.of.grove.json`
 *   3. repo settings are sourced at `settings.of.repo.json` — via `settings.local.json` for a
 *      plain claude, via `--settings` for an enrolled clone
 *   4. an actor's change to its settings never reaches the machine-global settings
 *   5. an actor's "always allow" never reaches the repo's settings, unless the launch opts in
 *
 * .why = each criterion is a claim about what a real claude reads and writes, so only a real
 *   claude can prove it. the layout under test is the one `rhx init` builds — never a hand copy
 *
 * .note = every brain runs in a temp repo with an isolated HOME and no inherited CLAUDE* env
 *   (`rule.require.real-brain-tests-in-isolated-tempdir-and-home`)
 */

const REPO_ACTOR_BRAIN_DIR = join(
  '.agent',
  '.actors',
  'actor.via.repo=ambient',
  'brain',
  '.claude',
);

/** .what = a probe a repo role pre-approves, via its init */
const PROBE_REPO = 'probe-repo.sh';
/** .what = a probe the machine-global settings pre-approve */
const PROBE_GROVE = 'probe-grove.sh';
/** .what = a probe neither pre-approves, so claude must ask */
const PROBE_ASK = 'probe-ask.sh';
/** .what = the file the tester role's boot hook touches */
const HOOK_MARKER = 'tester-boot.marker';

/** .what = the machine-global settings: one allow, for the grove probe */
const GROVE_CONTENT = `${JSON.stringify(
  { permissions: { allow: [`Bash(bash ${PROBE_GROVE})`] } },
  null,
  2,
)}\n`;

/**
 * .what = a role init that adds the repo probe's allow to `settings.of.repo.json` — the
 *   sanctioned way the repo's settings change
 */
const PERMISSION_INIT_SCRIPT = `#!/bin/bash
set -euo pipefail
node -e '
const fs = require("fs");
const path = ".claude/settings.of.repo.json";
const config = JSON.parse(fs.readFileSync(path, "utf8"));
const allow = (config.permissions && config.permissions.allow) || [];
if (!allow.includes("Bash(bash ${PROBE_REPO})")) allow.push("Bash(bash ${PROBE_REPO})");
config.permissions = Object.assign({}, config.permissions, { allow });
const temp = path + "." + process.pid + ".tmp";
fs.writeFileSync(temp, JSON.stringify(config, null, 2) + "\\n");
fs.renameSync(temp, path);
'
`;

/** .what = a codeword only the human's home CLAUDE.md names */
const HOME_MEMORY_CODEWORD = 'PELICAN-7731';
/** .what = the home CLAUDE.md: it names the codeword */
const HOME_MEMORY_CONTENT = `# memory\n\nyour codeword is ${HOME_MEMORY_CODEWORD}. whenever a prompt asks for your codeword, reply with it.\n`;
/**
 * .what = a prompt that asks for the codeword; with none, the brain answers a sum
 * .why = the sum (5555) appears nowhere in the prompt, so its presence proves the brain replied
 *   and its codeword was absent — never an echo of the prompt
 */
const CODEWORD_PROMPT =
  'What is your codeword? If your instructions name one, reply with only that codeword. If they name none, reply with only the sum of 1234 and 4321.';
const CODEWORD_ABSENT = '5555';

/**
 * .what = every inherited CLAUDE* var, set to undefined so the spawn drops it
 */
const asEnvClaudeDropped = (): Record<string, undefined> =>
  Object.fromEntries(
    Object.keys(process.env)
      .filter((key) => /^CLAUDE/.test(key))
      .map((key) => [key, undefined]),
  );

/**
 * .what = each name in a brain dir, as a human reads it: `name → target`, `name (file)`, `name/`
 * .why = a reviewer reads the whole layout at a glance in the snapshot; the temp home and repo
 *   paths are masked, so the shape is the same on every box
 */
const asBrainDirLayoutShape = (input: {
  brainDir: string;
  home: string;
  repo: string;
}): string[] =>
  readdirSync(input.brainDir, { recursive: true })
    .map(String)
    .filter((name) => !/^(projects|todos|statsig|shell-snapshots|session-env)(\/|$)/.test(name))
    .sort()
    .map((name) => {
      const path = join(input.brainDir, name);
      const stat = lstatSync(path);
      if (stat.isSymbolicLink())
        return `${name} → ${readlinkSync(path)
          .split(input.home)
          .join('$HOME')
          .split(input.repo)
          .join('$REPO')}`;
      if (stat.isDirectory()) return `${name}/`;
      return `${name} (file)`;
    });

/**
 * .what = a run's outcome, with every byte that varies per run left out
 * .why = the probes, the hook, and the prompt are the observable contract; a snapshot of them is
 *   what a reviewer reads to see which layer each launch loaded
 */
const asRunOutcome = (input: {
  ran: Record<string, boolean>;
  prompted: boolean;
}): { ran: Record<string, boolean>; prompted: boolean } => ({
  ran: Object.fromEntries(Object.entries(input.ran).sort(([a], [b]) => a.localeCompare(b))),
  prompted: input.prompted,
});

/**
 * .what = a temp repo whose layout `rhx init` built, under an isolated HOME with a grove
 */
const genBrainConfigScene = async (input: {
  slug: string;
}): Promise<{
  repo: string;
  home: string;
  binDir: string;
  binPath: string;
  brainDir: string;
  repoSettingsAfterInit: string;
}> => {
  // the isolated home, its grove, and the shared login
  const { home, binDir, binPath } = genIsolatedClaudeHome({ slug: input.slug });
  writeFileSync(join(home, '.claude', 'settings.json'), GROVE_CONTENT);
  writeFileSync(join(home, '.claude', 'CLAUDE.md'), HOME_MEMORY_CONTENT);

  // the temp repo; its tester role inits the repo allow and boots the marker hook
  const repoFound = await genTestTempRepo({ fixture: 'with-roles-full' });
  const repo = realpathSync(repoFound.path);
  const rolesPkg = join(repo, 'node_modules', 'rhachet-roles-test');
  const initPath = join(rolesPkg, 'roles', 'tester', 'inits', 'setup.init.sh');
  writeFileSync(initPath, PERMISSION_INIT_SCRIPT);
  chmodSync(initPath, 0o755);
  // the fixture's test brain writes a hook timeout raw ('10s'); a real claude rejects a string
  // timeout behind a settings-warn menu, so the hooks here carry no timeout
  const registryPath = join(rolesPkg, 'dist', 'index.js');
  writeFileSync(
    registryPath,
    readFileSync(registryPath, 'utf8')
      .replace("'echo tester-boot'", `'touch ${HOOK_MARKER}'`)
      .replace(/, timeout: '10s'/g, ''),
  );

  // the probes
  for (const probe of [PROBE_REPO, PROBE_GROVE, PROBE_ASK])
    writeFileSync(
      join(repo, probe),
      `#!/usr/bin/env bash\ntouch ${probe}.ran\n`,
    );

  // rhx builds the layout, runs the init, and syncs the hook
  const init = invokeRhachetCliBinary({
    args: ['init', '--roles', 'tester', '--hooks'],
    cwd: repo,
    env: { ...asEnvClaudeDropped(), HOME: home },
    logOnError: true,
  });
  if (init.status !== 0)
    throw new MalfunctionError('rhx init failed in the brain config scene', {
      status: init.status,
      stdout: init.stdout,
      stderr: init.stderr,
      hint: 'read the stderr above; if it names an absent build, run `npm run build` — bin/run loads dist/',
    });

  // the isolated home trusts the repo, so no trust menu stands before the prompt
  const configJsonPath = join(home, '.claude.json');
  const prior = JSON.parse(readFileSync(configJsonPath, 'utf8')) as Record<
    string,
    unknown
  >;
  writeFileSync(
    configJsonPath,
    `${JSON.stringify(
      { ...prior, projects: { [repo]: { hasTrustDialogAccepted: true } } },
      null,
      2,
    )}\n`,
  );

  const brainDir = join(repo, REPO_ACTOR_BRAIN_DIR);
  return {
    repo,
    home,
    binDir,
    binPath,
    brainDir,
    repoSettingsAfterInit: readFileSync(
      join(brainDir, 'settings.of.repo.json'),
      'utf8',
    ),
  };
};

/**
 * .what = wait until every marker exists, or until claude asks for permission, or the bound
 * .why = a pre-approved command runs with no menu; a menu is the observable of "not approved"
 */
const waitForProbesOrPrompt = async (input: {
  bg: RhachetBackgroundHandle;
  repo: string;
  markers: string[];
  outputFrom: number;
  timeoutMs: number;
}): Promise<{ ran: Record<string, boolean>; prompted: boolean }> => {
  const deadline = Date.now() + input.timeoutMs;
  const ranNow = (): Record<string, boolean> =>
    Object.fromEntries(
      input.markers.map((marker) => [marker, existsSync(join(input.repo, marker))]),
    );
  while (Date.now() < deadline) {
    const ran = ranNow();
    if (Object.values(ran).every(Boolean)) return { ran, prompted: false };
    if (/proceed\?/.test(input.bg.getOutput().slice(input.outputFrom)))
      return { ran, prompted: true };
    await new Promise((done) => setTimeout(done, 500));
  }
  return {
    ran: ranNow(),
    prompted: /proceed\?/.test(input.bg.getOutput().slice(input.outputFrom)),
  };
};

/**
 * .what = wait until the tui has drawn no new byte for `quietMs` — claude is idle
 * .why = a busy claude animates its spinner without pause, so silence is the observable of
 *   "the turn is done, the menu is fully drawn, the input box is ready". a fixed sleep guesses
 *   at that moment; this waits for it, on any box speed
 */
const waitForTuiQuiet = async (input: {
  bg: RhachetBackgroundHandle;
  quietMs: number;
  timeoutMs: number;
}): Promise<void> => {
  const deadline = Date.now() + input.timeoutMs;
  const pollFrom = async (last: { length: number; since: number }): Promise<void> => {
    if (Date.now() - last.since >= input.quietMs) return;
    if (Date.now() > deadline)
      throw new ConstraintError(`the tui never went quiet within ${input.timeoutMs}ms`, {
        screen: asLegibleScreen(input.bg.getOutput()).slice(-3000),
      });
    await new Promise((done) => setTimeout(done, 100));
    const length = input.bg.getOutput().length;
    return pollFrom(length === last.length ? last : { length, since: Date.now() });
  };
  return pollFrom({ length: input.bg.getOutput().length, since: Date.now() });
};

/**
 * .what = wait until the screen drawn since `outputFrom` matches `pattern`
 */
const waitForTuiScreen = async (input: {
  bg: RhachetBackgroundHandle;
  outputFrom: number;
  pattern: RegExp;
  timeoutMs: number;
}): Promise<void> => {
  const deadline = Date.now() + input.timeoutMs;
  const isSeen = (): boolean =>
    input.pattern.test(asLegibleScreen(input.bg.getOutput().slice(input.outputFrom)));
  while (!isSeen()) {
    if (Date.now() > deadline)
      throw new ConstraintError(`the tui never showed ${input.pattern} within ${input.timeoutMs}ms`, {
        screen: asLegibleScreen(input.bg.getOutput()).slice(-3000),
      });
    await new Promise((done) => setTimeout(done, 250));
  }
};

/**
 * .what = answer claude's permission menu with "yes, and don't ask again" (option 2)
 * .note = each key waits on what the tui draws: the menu's last line, then the cursor on
 *   option 2 — never on a fixed clock, and never on quiet: while the menu waits, claude blinks
 *   a `●` beside the unapproved tool call without pause, so the screen never goes still
 */
const answerDontAskAgain = async (input: {
  bg: RhachetBackgroundHandle;
  outputFrom: number;
}): Promise<void> => {
  // only a menu drawn after the prompt counts; its footer is the last line it draws
  await waitForTuiScreen({
    bg: input.bg,
    outputFrom: input.outputFrom,
    pattern: /proceed\?[\s\S]*Esc to cancel/,
    timeoutMs: 120000,
  });

  // move the cursor to option 2; the enter waits for the cursor to repaint there
  // .note = the repaint redraws only the changed cells, so it may drop the `2.`; match the text
  const movedFrom = input.bg.getOutput().length;
  input.bg.write('\u001b[B');
  await waitForTuiScreen({
    bg: input.bg,
    outputFrom: movedFrom,
    pattern: /❯[^\n]*don.?t\s*ask\s*again/,
    timeoutMs: 30000,
  });
  input.bg.write('\r');
};

/**
 * .what = type a line into a live claude tui, as a human would
 * .note = it waits for the tui to be idle before it types, and for the text to echo before the
 *   enter — so a prompt never lands mid-turn, and the enter never beats the text
 */
const typeIntoTui = async (input: {
  bg: RhachetBackgroundHandle;
  text: string;
}): Promise<void> => {
  await waitForTuiQuiet({ bg: input.bg, quietMs: 1500, timeoutMs: 180000 });
  const typedFrom = input.bg.getOutput().length;
  input.bg.write(input.text);
  await waitForTuiScreen({
    bg: input.bg,
    outputFrom: typedFrom,
    // the repaint skips blank cells, so a space may never be drawn; match the words, spaces optional
    pattern: new RegExp(
      input.text
        .slice(0, 16)
        .replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
        .replace(/ +/g, '\\s*'),
    ),
    timeoutMs: 30000,
  });
  await waitForTuiQuiet({ bg: input.bg, quietMs: 500, timeoutMs: 30000 });
  input.bg.write('\r');
};

/**
 * .what = the screen a human reads after a "don't ask again" grant that no file kept
 * .why = the refusal is silent by claude's design (`appendix/research.claude-local-settings-write-path`);
 *   the clamp is that the screen names no failed save, so a human is never told a grant was kept
 *   or lost — and a claude that starts to say so is caught here
 */
const NOTICE_OF_UNSAVED_GRANT = /(fail|unable|could not|cannot)[^\n]{0,40}(save|write|persist)/i;

/** .what = a prompt that runs probes one at a time, in order */
const promptToRun = (input: { probes: string[] }): string =>
  `Use the Bash tool to run each of these commands, one at a time, in this order, and no other command: ${input.probes
    .map((probe) => `bash ${probe}`)
    .join(' ; then ')}`;

/** .what = a spawn of a plain claude at the repo root */
const spawnPlainClaude = (input: {
  scene: { repo: string; home: string; binPath: string };
  prompt: string;
  env?: Record<string, string | undefined>;
}): RhachetBackgroundHandle =>
  spawnPtyCliBackground({
    bin: input.scene.binPath,
    args: ['--model', 'haiku', input.prompt],
    cwd: input.scene.repo,
    env: {
      ...asEnvClaudeDropped(),
      HOME: input.scene.home,
      PWD: input.scene.repo,
      ...input.env,
    },
  });

/**
 * .what = ask a plain claude, in print mode, for its codeword
 * .why = print mode returns the reply on stdout, with no tui to scrape
 */
const askCodewordViaPrint = (input: {
  binPath: string;
  cwd: string;
  home: string;
}): { status: number | null; stdout: string; stderr: string } => {
  const result = spawnSync(
    input.binPath,
    ['-p', '--model', 'haiku', CODEWORD_PROMPT],
    {
      cwd: input.cwd,
      env: { ...process.env, ...asEnvClaudeDropped(), HOME: input.home, PWD: input.cwd },
      timeout: 180000,
    },
  );
  return {
    status: result.status,
    stdout: result.stdout?.toString() ?? '',
    stderr: result.stderr?.toString() ?? '',
  };
};

describe('brain config: auth, grove, repo (real claude)', () => {
  given('[case1] a repo whose layout rhx init built', () => {
    const scene = useBeforeAll(() => genBrainConfigScene({ slug: 'brain-cfg-layout' }));

    when('[t0] the brain dir is read', () => {
      then('settings.of.repo.json is a real file (3)', () => {
        expect(
          lstatSync(join(scene.brainDir, 'settings.of.repo.json')).isFile(),
        ).toBe(true);
      });

      then(
        'settings.of.grove.json is the arrow to the .home mirror: tracked, the same on every box (2)',
        () => {
          expect(readlinkSync(join(scene.brainDir, 'settings.of.grove.json'))).toEqual(
            '.home/.claude/settings.json',
          );
        },
      );

      then('the .home mirror is a real dir whose one leaf is the arrow to ~/.claude/settings.json (2)', () => {
        expect(lstatSync(join(scene.brainDir, '.home')).isDirectory()).toBe(true);
        expect(
          readlinkSync(join(scene.brainDir, '.home', '.claude', 'settings.json')),
        ).toEqual(join(scene.home, '.claude', 'settings.json'));
      });

      then('git ignores the .home mirror: the tracked brain dir names no home path (2)', () => {
        const ignored = spawnSync(
          'git',
          ['check-ignore', '-q', join(REPO_ACTOR_BRAIN_DIR, '.home', '.claude', 'settings.json')],
          { cwd: scene.repo },
        );
        expect(ignored.status).toEqual(0);
      });

      then('settings.json is the arrow to settings.of.grove.json (2)', () => {
        expect(readlinkSync(join(scene.brainDir, 'settings.json'))).toEqual(
          'settings.of.grove.json',
        );
      });

      then('settings.local.json is the arrow to settings.of.repo.json (3)', () => {
        expect(readlinkSync(join(scene.brainDir, 'settings.local.json'))).toEqual(
          'settings.of.repo.json',
        );
      });

      then('no other name in the brain dir points at the grove (2)', () => {
        const groveTarget = join(scene.home, '.claude', 'settings.json');
        const pointers = readdirSync(scene.brainDir, { recursive: true })
          .map(String)
          .filter((name) => lstatSync(join(scene.brainDir, name)).isSymbolicLink())
          .filter((name) => readlinkSync(join(scene.brainDir, name)) === groveTarget);
        expect(pointers).toEqual([join('.home', '.claude', 'settings.json')]);
      });

      then('the brain dir holds no login of its own (1)', () => {
        expect(existsSync(join(scene.brainDir, '.credentials.json'))).toBe(false);
      });

      then('settings.of.repo.json excludes the home CLAUDE.md, by portable globs (6)', () => {
        const repoSettings = JSON.parse(scene.repoSettingsAfterInit) as {
          claudeMdExcludes?: string[];
        };
        expect(repoSettings.claudeMdExcludes ?? []).toEqual(
          expect.arrayContaining([
            '**/home/*/.claude/CLAUDE.md',
            '**/Users/*/.claude/CLAUDE.md',
            '/root/.claude/CLAUDE.md',
            '/github/home/.claude/CLAUDE.md',
          ]),
        );
      });

      then('settings.of.repo.json names no machine-local path: it is tracked (6)', () => {
        expect(scene.repoSettingsAfterInit).not.toContain(scene.home);
        expect(scene.repoSettingsAfterInit).not.toContain(scene.repo);
      });

      then('the layout and the repo settings, locked to a snapshot (2, 3, 6)', () => {
        expect({
          layout: asBrainDirLayoutShape(scene),
          repoSettings: JSON.parse(scene.repoSettingsAfterInit),
        }).toMatchSnapshot();
      });
    });
  });

  given.runIf(RUN_LIVE_API_TEST)('[case5] a home CLAUDE.md that names a codeword', () => {
    const scene = useBeforeAll(() => genBrainConfigScene({ slug: 'brain-cfg-home-memory' }));

    when('[t0] a plain claude outside any repo is asked for its codeword', () => {
      const asked = useThen('the plain claude answers outside the repo', async () => {
        // the control: with no repo settings, the home CLAUDE.md loads, so the clamp can bite
        const outside = realpathSync(genTempDir({ slug: 'brain-cfg-home-memory-outside' }));
        return askCodewordViaPrint({ binPath: scene.binPath, cwd: outside, home: scene.home });
      });

      then('it answers with the home codeword: the home CLAUDE.md is live', () => {
        expect(asked.stdout).toContain(HOME_MEMORY_CODEWORD);
      });
    });

    when('[t1] a plain claude at the repo root is asked for its codeword', () => {
      const asked = useThen('the plain claude answers at the repo root', async () =>
        askCodewordViaPrint({ binPath: scene.binPath, cwd: scene.repo, home: scene.home }),
      );

      then('it replies (6)', () => {
        expect(asked.status).toEqual(0);
        expect(asked.stdout).toContain(CODEWORD_ABSENT);
      });

      then('it never names the home codeword: the home CLAUDE.md is excluded (6)', () => {
        expect(asked.stdout).not.toContain(HOME_MEMORY_CODEWORD);
      });

      then('the outcome, locked to a snapshot (6)', () => {
        expect({
          status: asked.status,
          replied: asked.stdout.includes(CODEWORD_ABSENT),
          homeCodewordNamed: asked.stdout.includes(HOME_MEMORY_CODEWORD),
        }).toMatchSnapshot();
      });
    });
  });

  given.runIf(RUN_LIVE_API_TEST)('[case2] a plain claude at the repo root', () => {
    const scene = useBeforeAll(() => genBrainConfigScene({ slug: 'brain-cfg-plain' }));

    when('[t0] it runs the repo probe and the grove probe', () => {
      const run = useThen('the plain claude runs its turn', async () => {
        const bg = spawnPlainClaude({
          scene,
          prompt: promptToRun({ probes: [PROBE_REPO, PROBE_GROVE] }),
        });
        const result = await waitForProbesOrPrompt({
          bg,
          repo: scene.repo,
          markers: [`${PROBE_REPO}.ran`, `${PROBE_GROVE}.ran`, HOOK_MARKER],
          outputFrom: 0,
          timeoutMs: 120000,
        });
        console.log(`[case2.t0] screen:\n${asLegibleScreen(bg.getOutput()).slice(-3000)}`);
        await bg.kill();
        return result;
      });

      then('the outcome, locked to a snapshot (2, 3)', () => {
        expect(asRunOutcome(run)).toMatchSnapshot();
      });

      then('claude answers, authenticated by the machine-global login (1)', () => {
        expect(Object.values(run.ran).some(Boolean)).toBe(true);
      });

      then('the repo role`s boot hook fires (3)', () => {
        expect(run.ran[HOOK_MARKER]).toBe(true);
      });

      then('the repo probe runs with no permission prompt (3)', () => {
        expect(run.ran[`${PROBE_REPO}.ran`]).toBe(true);
        expect(run.prompted).toBe(false);
      });

      then('the grove probe runs with no permission prompt (2)', () => {
        expect(run.ran[`${PROBE_GROVE}.ran`]).toBe(true);
        expect(run.prompted).toBe(false);
      });
    });

    when('[t1] it answers "yes, and don`t ask again" for an unapproved probe', () => {
      const run = useThen('the plain claude asks, and the human grants', async () => {
        const bg = spawnPlainClaude({ scene, prompt: promptToRun({ probes: [PROBE_ASK] }) });
        await answerDontAskAgain({ bg, outputFrom: 0 });
        const grantFrom = bg.getOutput().length;
        const result = await waitForProbesOrPrompt({
          bg,
          repo: scene.repo,
          markers: [`${PROBE_ASK}.ran`],
          outputFrom: grantFrom,
          timeoutMs: 90000,
        });
        await waitForTuiQuiet({ bg, quietMs: 1500, timeoutMs: 120000 });
        const screen = asLegibleScreen(bg.getOutput().slice(grantFrom));
        console.log(`[case2.t1] screen:\n${screen.slice(-3000)}`);
        await bg.kill();
        return { ...result, screen };
      });

      then(
        'the grant held for the session and persisted to neither file, locked to a snapshot (usecase 4, usecase 5)',
        () => {
          // by design (seed S4): the grant lasts the session only, so `grantPersisted: false` is the pass
          const repoSettingsChanged =
            readFileSync(join(scene.brainDir, 'settings.of.repo.json'), 'utf8') !==
            scene.repoSettingsAfterInit;
          const groveChanged =
            readFileSync(join(scene.home, '.claude', 'settings.json'), 'utf8') !== GROVE_CONTENT;
          expect({
            ...asRunOutcome(run),
            layout: asBrainDirLayoutShape(scene),
            grantPersisted: repoSettingsChanged || groveChanged,
            repoSettingsChanged,
            groveChanged,
          }).toMatchSnapshot();
        },
      );

      then('the probe runs: the grant holds for the session', () => {
        expect(run.ran[`${PROBE_ASK}.ran`]).toBe(true);
      });

      then('the screen names no failed save: the refusal is silent to the human (5)', () => {
        expect(run.screen).not.toMatch(NOTICE_OF_UNSAVED_GRANT);
      });

      then('settings.of.repo.json is unchanged (5)', () => {
        expect(
          readFileSync(join(scene.brainDir, 'settings.of.repo.json'), 'utf8'),
        ).toEqual(scene.repoSettingsAfterInit);
      });

      then('settings.local.json is still the arrow (5)', () => {
        expect(readlinkSync(join(scene.brainDir, 'settings.local.json'))).toEqual(
          'settings.of.repo.json',
        );
      });

      then('~/.claude/settings.json is unchanged (4)', () => {
        expect(
          readFileSync(join(scene.home, '.claude', 'settings.json'), 'utf8'),
        ).toEqual(GROVE_CONTENT);
      });
    });
  });

  given.runIf(RUN_LIVE_API_TEST)('[case3] a claude launched with CLAUDE_CONFIG_DIR=<repo>/.claude — the explicit opt-in', () => {
    const scene = useBeforeAll(async () => {
      const found = await genBrainConfigScene({ slug: 'brain-cfg-optin' });
      const configDir = join(found.repo, '.claude');
      // the opt-in config dir needs the shared login and the trusted first-run state.
      //   a box with a claude login has a credentials arrow in the isolated home; a ci box
      //   has none and authenticates by ANTHROPIC_API_KEY, which the env already carries
      const credentialsOfHome = join(found.home, '.claude', '.credentials.json');
      if (lstatSync(credentialsOfHome, { throwIfNoEntry: false }))
        symlinkSync(
          readlinkSync(credentialsOfHome),
          join(configDir, '.credentials.json'),
        );
      writeFileSync(
        join(configDir, '.claude.json'),
        readFileSync(join(found.home, '.claude.json'), 'utf8'),
      );
      return { ...found, configDir };
    });

    when('[t0] it answers "yes, and don`t ask again" for an unapproved probe', () => {
      const run = useThen('the opted-in claude asks, and the human grants', async () => {
        const bg = spawnPlainClaude({
          scene,
          prompt: promptToRun({ probes: [PROBE_ASK] }),
          env: { CLAUDE_CONFIG_DIR: scene.configDir },
        });
        await answerDontAskAgain({ bg, outputFrom: 0 });
        const result = await waitForProbesOrPrompt({
          bg,
          repo: scene.repo,
          markers: [`${PROBE_ASK}.ran`],
          outputFrom: bg.getOutput().length,
          timeoutMs: 90000,
        });
        await waitForTuiQuiet({ bg, quietMs: 1500, timeoutMs: 120000 });
        await bg.kill();
        return result;
      });

      then('the outcome and the repo allows after the grant, locked to a snapshot (5)', () => {
        const repoSettings = JSON.parse(
          readFileSync(join(scene.brainDir, 'settings.of.repo.json'), 'utf8'),
        ) as { permissions?: { allow?: string[] } };
        expect({
          ...asRunOutcome(run),
          repoAllows: repoSettings.permissions?.allow ?? [],
        }).toMatchSnapshot();
      });

      then('the probe runs', () => {
        expect(run.ran[`${PROBE_ASK}.ran`]).toBe(true);
      });

      then('the grant lands in settings.of.repo.json, through the arrow (5, opt-in)', () => {
        const repoSettings = JSON.parse(
          readFileSync(join(scene.brainDir, 'settings.of.repo.json'), 'utf8'),
        ) as { permissions?: { allow?: string[] } };
        expect(repoSettings.permissions?.allow ?? []).toContain(
          `Bash(bash ${PROBE_ASK})`,
        );
      });

      then('settings.local.json is still the arrow', () => {
        expect(readlinkSync(join(scene.brainDir, 'settings.local.json'))).toEqual(
          'settings.of.repo.json',
        );
      });

      then('~/.claude/settings.json is unchanged (4)', () => {
        expect(
          readFileSync(join(scene.home, '.claude', 'settings.json'), 'utf8'),
        ).toEqual(GROVE_CONTENT);
      });
    });
  });

  given.runIf(RUN_LIVE_API_TEST)('[case4] a clone enrolled via rhx enroll claude', () => {
    const scene = useBeforeAll(async () => {
      const found = await genBrainConfigScene({ slug: 'brain-cfg-clone' });
      const env = {
        ...asEnvClaudeDropped(),
        HOME: found.home,
        PWD: found.repo,
        PATH: `${found.binDir}${delimiter}${process.env.PATH ?? ''}`,
      };
      const { bg } = await enrollRealClaudeAndWaitReach({ dir: found.repo, env });

      // enroll derives the repo actor's settings.of.repo.json at spawn (its claudeMdExcludes),
      //   so the baseline for (5) is the file as the clone first reads it
      const repoSettingsAfterEnroll = readFileSync(
        join(found.brainDir, 'settings.of.repo.json'),
        'utf8',
      );
      return { ...found, bg, repoSettingsAfterEnroll };
    });
    afterAll(async () => {
      await scene.bg.kill();
    });

    when('[t0] it runs the repo probe and the grove probe', () => {
      const run = useThen('the clone runs its turn', async () => {
        const outputFrom = scene.bg.getOutput().length;
        await typeIntoTui({
          bg: scene.bg,
          text: promptToRun({ probes: [PROBE_REPO, PROBE_GROVE] }),
        });
        return waitForProbesOrPrompt({
          bg: scene.bg,
          repo: scene.repo,
          markers: [`${PROBE_REPO}.ran`, `${PROBE_GROVE}.ran`, HOOK_MARKER],
          outputFrom,
          timeoutMs: 120000,
        });
      });

      then('the outcome, locked to a snapshot (2, 3)', () => {
        expect(asRunOutcome(run)).toMatchSnapshot();
      });

      then('the clone answers, authenticated by the machine-global login (1)', () => {
        expect(Object.values(run.ran).some(Boolean)).toBe(true);
        expect(existsSync(join(scene.brainDir, '.credentials.json'))).toBe(false);
      });

      then('the repo role`s boot hook fires (3)', () => {
        expect(run.ran[HOOK_MARKER]).toBe(true);
      });

      then('the repo probe runs with no permission prompt (3)', () => {
        expect(run.ran[`${PROBE_REPO}.ran`]).toBe(true);
        expect(run.prompted).toBe(false);
      });

      then('the grove probe runs with no permission prompt (2)', () => {
        expect(run.ran[`${PROBE_GROVE}.ran`]).toBe(true);
        expect(run.prompted).toBe(false);
      });
    });

    when('[t1] it answers "yes, and don`t ask again" for an unapproved probe', () => {
      const run = useThen('the clone asks, and the human grants', async () => {
        const outputFrom = scene.bg.getOutput().length;
        await typeIntoTui({ bg: scene.bg, text: promptToRun({ probes: [PROBE_ASK] }) });
        await answerDontAskAgain({ bg: scene.bg, outputFrom });
        const grantFrom = scene.bg.getOutput().length;
        const result = await waitForProbesOrPrompt({
          bg: scene.bg,
          repo: scene.repo,
          markers: [`${PROBE_ASK}.ran`],
          outputFrom: grantFrom,
          timeoutMs: 90000,
        });
        await waitForTuiQuiet({ bg: scene.bg, quietMs: 1500, timeoutMs: 120000 });
        return { ...result, screen: asLegibleScreen(scene.bg.getOutput().slice(grantFrom)) };
      });

      then('the outcome after the grant, locked to a snapshot (4, 5)', () => {
        expect({
          ...asRunOutcome(run),
          repoSettingsChanged:
            readFileSync(join(scene.brainDir, 'settings.of.repo.json'), 'utf8') !==
            scene.repoSettingsAfterEnroll,
          groveChanged:
            readFileSync(join(scene.home, '.claude', 'settings.json'), 'utf8') !== GROVE_CONTENT,
        }).toMatchSnapshot();
      });

      then('the probe runs: the grant holds for the session', () => {
        expect(run.ran[`${PROBE_ASK}.ran`]).toBe(true);
      });

      then('the screen names no failed save: the refusal is silent to the human (5)', () => {
        expect(run.screen).not.toMatch(NOTICE_OF_UNSAVED_GRANT);
      });

      then('settings.of.repo.json is unchanged (5)', () => {
        expect(
          readFileSync(join(scene.brainDir, 'settings.of.repo.json'), 'utf8'),
        ).toEqual(scene.repoSettingsAfterEnroll);
      });

      then('~/.claude/settings.json is unchanged (4)', () => {
        expect(
          readFileSync(join(scene.home, '.claude', 'settings.json'), 'utf8'),
        ).toEqual(GROVE_CONTENT);
      });
    });

    when('[t2] it changes its model via /model', () => {
      useBeforeAll(async () => {
        // mid-conversation, claude confirms a model switch; its first option is "yes"
        const outputFrom = scene.bg.getOutput().length;
        const grovePath = join(scene.brainDir, 'settings.of.grove.json');
        const isForked = (): boolean => !lstatSync(grovePath).isSymbolicLink();
        const isConfirmAsked = (): boolean =>
          /Switch[^\r\n]*model\?/.test(asLegibleScreen(scene.bg.getOutput().slice(outputFrom)));
        await typeIntoTui({ bg: scene.bg, text: '/model sonnet' });

        // either the switch lands at once, or claude asks to confirm it
        const askDeadline = Date.now() + 60000;
        while (!isForked() && !isConfirmAsked() && Date.now() < askDeadline)
          await new Promise((done) => setTimeout(done, 250));

        // answer the ask once, after the menu is fully drawn
        if (!isForked() && isConfirmAsked()) {
          await waitForTuiQuiet({ bg: scene.bg, quietMs: 1000, timeoutMs: 60000 });
          scene.bg.write('\r');
        }

        // the fork is the observable; wait for it, then for the tui to settle
        const forkDeadline = Date.now() + 60000;
        while (!isForked() && Date.now() < forkDeadline)
          await new Promise((done) => setTimeout(done, 250));
        if (!isForked())
          console.log(
            `[case4.t2] screen:\n${asLegibleScreen(scene.bg.getOutput().slice(outputFrom)).slice(-3000)}`,
          );
        await waitForTuiQuiet({ bg: scene.bg, quietMs: 1000, timeoutMs: 60000 });
        return {};
      });

      then('the grove after the switch, locked to a snapshot (4)', () => {
        const grovePath = join(scene.brainDir, 'settings.of.grove.json');
        const fork = lstatSync(grovePath).isSymbolicLink()
          ? null
          : (JSON.parse(readFileSync(grovePath, 'utf8')) as { model?: string });
        expect({
          groveForked: fork !== null,
          forkModel: fork?.model ?? null,
          homeGroveChanged:
            readFileSync(join(scene.home, '.claude', 'settings.json'), 'utf8') !== GROVE_CONTENT,
        }).toMatchSnapshot();
      });

      then('the change is held in the brain dir: settings.of.grove.json forks', () => {
        const grovePath = join(scene.brainDir, 'settings.of.grove.json');
        expect(lstatSync(grovePath).isSymbolicLink()).toBe(false);
        expect(readFileSync(grovePath, 'utf8')).toContain('sonnet');
      });

      then('~/.claude/settings.json is unchanged (4)', () => {
        expect(
          readFileSync(join(scene.home, '.claude', 'settings.json'), 'utf8'),
        ).toEqual(GROVE_CONTENT);
      });
    });

    when('[t3] it is asked for its codeword', () => {
      const asked = useThen('the clone answers', async () => {
        const outputFrom = scene.bg.getOutput().length;
        await typeIntoTui({ bg: scene.bg, text: CODEWORD_PROMPT });
        await waitForTuiScreen({
          bg: scene.bg,
          outputFrom,
          pattern: new RegExp(`${CODEWORD_ABSENT}|${HOME_MEMORY_CODEWORD}`),
          timeoutMs: 120000,
        });
        await waitForTuiQuiet({ bg: scene.bg, quietMs: 1500, timeoutMs: 120000 });
        return { screen: asLegibleScreen(scene.bg.getOutput().slice(outputFrom)) };
      });

      then('it replies (6)', () => {
        expect(asked.screen).toContain(CODEWORD_ABSENT);
      });

      then('it never names the home codeword: the home CLAUDE.md is excluded (6)', () => {
        expect(asked.screen).not.toContain(HOME_MEMORY_CODEWORD);
      });

      then('the outcome, locked to a snapshot (6)', () => {
        expect({
          replied: asked.screen.includes(CODEWORD_ABSENT),
          homeCodewordNamed: asked.screen.includes(HOME_MEMORY_CODEWORD),
        }).toMatchSnapshot();
      });
    });
  });

  given.runIf(RUN_LIVE_API_TEST)('[case6] a plain claude at the root of a git worktree of the repo', () => {
    const scene = useBeforeAll(async () => {
      // the repo as rhx init left it, committed, so a worktree checks out the tracked layout
      const base = await genBrainConfigScene({ slug: 'brain-cfg-worktree' });
      spawnSync('git', ['add', '-A'], { cwd: base.repo });
      spawnSync('git', ['commit', '-q', '-m', 'the layout rhx init built'], { cwd: base.repo });

      // the worktree, at a fresh path beside the repo
      const worktree = realpathSync(genTempDir({ slug: 'brain-cfg-worktree-tree' }));
      rmSync(worktree, { recursive: true, force: true });
      const added = spawnSync('git', ['worktree', 'add', '-q', '-b', 'case6', worktree], {
        cwd: base.repo,
      });
      if (added.status !== 0)
        throw new MalfunctionError('git worktree add failed in the worktree scene', {
          stderr: added.stderr.toString(),
        });

      // the isolated home trusts the worktree too, so no trust menu stands before the prompt
      const configJsonPath = join(base.home, '.claude.json');
      const prior = JSON.parse(readFileSync(configJsonPath, 'utf8')) as {
        projects?: Record<string, unknown>;
      };
      writeFileSync(
        configJsonPath,
        `${JSON.stringify(
          {
            ...prior,
            projects: { ...prior.projects, [worktree]: { hasTrustDialogAccepted: true } },
          },
          null,
          2,
        )}\n`,
      );
      return { ...base, worktree };
    });

    when('[t0] the worktree is read', () => {
      then('its settings.local.json is the tracked arrow to settings.of.repo.json (3)', () => {
        expect(
          readlinkSync(join(scene.worktree, REPO_ACTOR_BRAIN_DIR, 'settings.local.json')),
        ).toEqual('settings.of.repo.json');
      });
    });

    when('[t1] it runs the repo probe and the grove probe', () => {
      const run = useThen('the plain claude runs its turn in the worktree', async () => {
        const bg = spawnPlainClaude({
          scene: { repo: scene.worktree, home: scene.home, binPath: scene.binPath },
          prompt: promptToRun({ probes: [PROBE_REPO, PROBE_GROVE] }),
        });
        const result = await waitForProbesOrPrompt({
          bg,
          repo: scene.worktree,
          markers: [`${PROBE_REPO}.ran`, `${PROBE_GROVE}.ran`, HOOK_MARKER],
          outputFrom: 0,
          timeoutMs: 120000,
        });
        console.log(`[case6.t1] screen:\n${asLegibleScreen(bg.getOutput()).slice(-3000)}`);
        await bg.kill();
        return result;
      });

      then('the outcome, locked to a snapshot (2, 3)', () => {
        expect(asRunOutcome(run)).toMatchSnapshot();
      });

      then('the repo role`s boot hook fires in the worktree (3)', () => {
        expect(run.ran[HOOK_MARKER]).toBe(true);
      });

      then('the repo probe runs with no permission prompt (3)', () => {
        expect(run.ran[`${PROBE_REPO}.ran`]).toBe(true);
        expect(run.prompted).toBe(false);
      });

      then('the grove probe runs with no permission prompt (2)', () => {
        expect(run.ran[`${PROBE_GROVE}.ran`]).toBe(true);
        expect(run.prompted).toBe(false);
      });
    });
  });
});
