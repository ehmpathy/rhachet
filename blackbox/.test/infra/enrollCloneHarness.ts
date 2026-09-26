import { ConstraintError } from 'helpful-errors';

import { asLegibleScreen } from './asLegibleScreen';
import { genRealBrainSlot } from './genRealBrainSlot';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
  invokeRhachetCliBinaryAsync,
} from './invokeRhachetCliBinary';
import { setupRoleFixtureRepo } from './roleFixtureRepo';
import {
  spawnRhachetCliBackground,
  type RhachetBackgroundHandle,
} from './spawnRhachetCliBackground';

import {
  chmodSync,
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { BRAIN_CLI_VERSION_FLOOR } from '@src/domain.operations/enroll/assertBrainCliVersionFloor';
import {
  getAllBrainCliPathResolutions,
  type BrainCliPathResolution,
} from '@src/domain.operations/enroll/getAllBrainCliPathResolutions';
import { isBrainCliVersionAtOrAboveFloor } from '@src/domain.operations/enroll/isBrainCliVersionAtOrAboveFloor';

/**
 * .what = shared harness for clone-reach acceptance tests — link roles, shim a
 *   `claude` that execs the rich stub brain, and enroll a clone through a real pty
 * .why =
 *   - the socket only stands up on an interactive tty, so every reach test must
 *     enroll through the OUTER pty (spawnRhachetCliBackground). that setup is
 *     identical across clone/actor/journey acceptance files — one home for it, per
 *     rule.require.shared-test-fixtures
 *   - the rich stub is a REAL child (never a mock): it stays alive, replies with a
 *     transformed ack, and writes a claude-shaped transcript, so say/get are proven
 *     end to end
 */

// the rich stub brain — stays alive, transforms `poke <n>` → `ack:<n>`, writes a
// claude-shaped transcript so `get` has real output to read
export const STUB_BRAIN = join(
  __dirname,
  '../../../src/.test/assets/stubBrainCli.cjs',
);

/**
 * .what = link a known role set so enroll's default roleset is non-empty
 */
export const setupEnrollFixture = (input: { dir: string }): void => {
  setupRoleFixtureRepo({ dir: input.dir });
  invokeRhachetCliBinary({
    args: ['init', '--roles', 'mechanic', 'architect', 'driver'],
    cwd: input.dir,
  });
};

/**
 * .what = write a `claude` shim that execs the rich stub, return a PATH that finds
 *   it first
 * .why = enroll spawns the brain by its command name (`claude`); the shim makes the
 *   stub answer to that name so the whole reach path runs against a real child
 */
export const setupRichStubBrainPath = (input: { dir: string }): string => {
  const binDir = join(input.dir, '.stub-bin');
  mkdirSync(binDir, { recursive: true });
  const shimPath = join(binDir, 'claude');
  writeFileSync(
    shimPath,
    `#!/usr/bin/env bash\nexec "${process.execPath}" "${STUB_BRAIN}" "$@"\n`,
    'utf-8',
  );
  chmodSync(shimPath, 0o755);
  return `${binDir}:${process.env.PATH ?? ''}`;
};

/**
 * .what = enroll a clone through the outer pty and wait for the stub's ready line
 * .why = the one setup every reach test shares — spawn `rhx enroll` under a pty (so
 *   the socket stands up), then block until the stub announces `ready serial=<uuid>`.
 *   yields the live background handle + the clone's serial
 */
export const enrollCloneAndWaitReady = async (input: {
  dir: string;
  env: Record<string, string | undefined>;
  as?: string;
  extraArgs?: string[];
  timeoutMs?: number;
}): Promise<{ bg: RhachetBackgroundHandle; serial: string }> => {
  const bg = spawnRhachetCliBackground({
    args: [
      'enroll',
      'claude',
      ...(input.as ? ['--as', input.as] : []),
      ...(input.extraArgs ?? []),
    ],
    cwd: input.dir,
    env: input.env,
  });
  const ready = await bg.waitForOutput({
    pattern: /ready serial=(?<serial>[0-9a-f-]{36})/,
    timeoutMs: input.timeoutMs ?? 20000,
  });
  return { bg, serial: ready.groups!.serial! };
};

/**
 * .what = poll `rhx clone get <address>` until its output carries `ack:<nonce>`
 * .why = the say returns once the byte is DELIVERED to the child; the child writes
 *   its transcript a tick later, so `get` is polled until the reply appears (or a
 *   bounded number of tries elapse, after which the last read is handed back so the
 *   assertion fails loud with real context)
 */
export const pollForAck = async (input: {
  address: string;
  nonce: string;
  dir: string;
  env: Record<string, string | undefined>;
}): Promise<string> => {
  const readOnce = (): ReturnType<typeof invokeRhachetCliBinary> =>
    invokeRhachetCliBinary({
      args: ['clone', 'get', input.address, '--tail', '5'],
      cwd: input.dir,
      env: input.env,
      logOnError: false,
    });

  // .note = deliberate mutation — a bounded poll counter local to this loop; it
  //   counts ack-poll attempts (max 50) and never escapes this function
  for (let attempt = 0; attempt < 50; attempt++) {
    const got = readOnce();
    if (got.stdout.includes(`ack:${input.nonce}`)) return got.stdout;
    await new Promise((r) => setTimeout(r, 100));
  }

  const last = readOnce();
  return `NO ack:${input.nonce} after 50 tries.\n--- last stdout ---\n${last.stdout}\n--- last stderr ---\n${last.stderr}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// the REAL-claude reach tier — shared by every real-brain reach acceptance test
// (the 1-turn sentinel reach + the 5-turn joker conversation). a real claude spawn
// is credential-gated + costly, so these fixtures gate LOUD (never skip) and drive a
// real say/get exchange against a live brain.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * .what = every real `claude` on PATH, each with the version it reports
 * .why = a host carries MORE THAN ONE install — measured here, 2.1.280 at
 *   `<repo>/.temp/bin/claude` and 2.1.87 at the pnpm global — so the tier needs the
 *   whole list, never the first hit, to pass over one the product would refuse.
 *   `getAllBrainCliPathResolutions` is the same walk enroll's own refusal uses, so the
 *   harness and the product read one PATH the same way
 *
 * .note = an override env pins one exact binary for a nightly runner; a bin that holds
 *   a separator is taken as that one path, so the override flows through unchanged
 */
const getAllRealClaudeResolutions = (): BrainCliPathResolution[] =>
  getAllBrainCliPathResolutions({
    bin: process.env.RHACHET_REAL_CLAUDE_BIN ?? 'claude',
    env: process.env,
  });

/**
 * .what = a version triple as a human reads it
 */
const asVersionWords = (version: BrainCliPathResolution['version']): string =>
  version ? `${version.major}.${version.minor}.${version.patch}` : 'unreadable';

/**
 * .what = locate a real `claude` that CLEARS the brain-cli version floor, or null
 * .why = enroll REFUSES a below-floor brain outright (assertBrainCliVersionFloor), so
 *   a harness that hands the tier the first binary it merely FINDS hands it a
 *   guaranteed refusal. existence was the old test, and it picked the pnpm global at
 *   2.1.87 while a 2.1.280 sat one PATH entry ahead. the floor is now the test, so the
 *   tier spawns a brain the product will actually accept — or fails loud below
 */
export const getRealClaudeBinPath = (): string | null =>
  getAllRealClaudeResolutions().find(
    (resolution) =>
      !!resolution.version &&
      isBrainCliVersionAtOrAboveFloor({
        version: resolution.version,
        floor: BRAIN_CLI_VERSION_FLOOR,
      }),
  )?.path ?? null;

/**
 * .what = is a real claude authenticated on this host?
 * .why = the binary alone is not enough — claude-code needs credentials (an oauth
 *   login file, or an api-key env). absent auth would hang or 401 mid-reach, so the
 *   gate refuses up front with a fix-named error rather than burn a 2-minute wait.
 */
export const isRealClaudeAuthed = (): boolean => {
  const credsFile = join(homedir(), '.claude', '.credentials.json');
  return (
    existsSync(credsFile) ||
    !!process.env.ANTHROPIC_API_KEY ||
    !!process.env.CLAUDE_CODE_OAUTH_TOKEN
  );
};

/**
 * .what = assert a real, authenticated claude is reachable — else fail LOUD
 * .why = the roadmap mandate: an absent credential is a ConstraintError (exit 2) that
 *   names the fix, NEVER a skip and NEVER a pass. it also names the local-auth reality
 *   (claude auth is a login on THIS host, not a keyrack env-var), so the hint is truly
 *   actionable. shared so every real-brain tier gates identically.
 */
export const getRealClaudeOrThrow = (): { binPath: string; binDir: string } => {
  const binPath = getRealClaudeBinPath();
  if (!binPath) {
    // name what WAS found, with each version — the measured failure is not "no cli",
    // it is "the one that wins PATH is too old", and only the list tells them apart
    const resolutions = getAllRealClaudeResolutions();
    const foundWords = resolutions.length
      ? resolutions
          .map((one) => `${one.path}=${asVersionWords(one.version)}`)
          .join(', ')
      : 'none on PATH';
    throw new ConstraintError(
      [
        `no real \`claude\` at or above the brain-cli floor ${asVersionWords(BRAIN_CLI_VERSION_FLOOR)}`,
        `for the real-claude reach tier. found: ${foundWords}.`,
        'fix: upgrade the install that wins your PATH (`pnpm add -g @anthropic-ai/claude-code@latest`),',
        'put a newer one first on PATH, or set RHACHET_REAL_CLAUDE_BIN to a binary that clears the',
        'floor. this tier NEVER skips — an absent or below-floor brain is a loud gate, not a silent pass.',
      ].join(' '),
    );
  }

  if (!isRealClaudeAuthed())
    throw new ConstraintError(
      [
        'real `claude` found but NOT authenticated — the reach round-trip would 401 or hang.',
        'fix: authenticate claude-code (`claude` interactive login) or export ANTHROPIC_API_KEY;',
        'in ci, `rhx keyrack unlock --owner ehmpath --env test`. this tier NEVER skips.',
      ].join(' '),
    );

  return { binPath, binDir: binPath.slice(0, binPath.lastIndexOf('/')) };
};

/**
 * .what = run `mutate` while this process holds an exclusive on-disk lock beside `path`
 *
 * 🚨 .why = the mutation below is a READ-MODIFY-WRITE of `~/.claude.json`, which is
 *   HOST-GLOBAL and shared with the human's own claude. jest runs test files in parallel
 *   worker PROCESSES, so two real-brain files that each read-then-write it interleave, and
 *   the later write is built on a snapshot taken before the earlier one landed:
 *
 *   | worker A | worker B |
 *   |---|---|
 *   | read `{…}` | |
 *   | | read `{…}` — the SAME snapshot |
 *   | write `{…, projects: {A}}` | |
 *   | | write `{…, projects: {B}}` ⇒ **A's trust grant is gone** |
 *
 *   ⇒ worker A's enroll then wedges on the folder-trust dialog it already answered, and a
 *   field the human's own claude expects can be dropped the same way. the merge is
 *   non-destructive per invocation and NO lever serialized the invocations
 *   (raised by the r007 `behavior-hazards` lane at i076).
 *
 * .why an `O_EXCL` create rather than a flock = `openSync(…, 'wx')` is atomic on posix and
 *   on win32 and needs no library. the lock is a FILE beside the target, never the target
 *   itself, so a crash mid-mutate cannot leave the config truncated.
 *
 * ⚠️ a stale lock is RECLAIMED by age rather than waited on forever — a worker killed
 *   mid-mutate would otherwise wedge every later run on this host, which is a worse
 *   failure than the race it guards. the reclaim window is far longer than the mutation.
 */
const withHostFileLock = <T>(input: { path: string; mutate: () => T }): T => {
  const lockPath = `${input.path}.rhachet-test.lock`;
  const staleAfterMs = 30_000;
  const deadline = Date.now() + 15_000;

  // .note = deliberate mutation — the spin must carry its own acquired-flag out of the
  //   loop, and a lock is by nature a stateful claim. bounded to this call
  let held = false;
  while (!held) {
    try {
      closeSync(openSync(lockPath, 'wx'));
      held = true;
    } catch (error) {
      // ⚠️ an ALLOWLIST, never a blanket catch — only "someone else holds it" is a
      //   condition to wait on. every other fault (a read-only home, a bad path) rethrows
      //   so it is never absorbed into a spin (`rule.forbid.failhide`)
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;

      const age = Date.now() - statSync(lockPath).mtimeMs;
      if (age > staleAfterMs) {
        rmSync(lockPath, { force: true });
        continue;
      }
      if (Date.now() > deadline)
        throw new ConstraintError(
          `could not acquire the ${lockPath} lock within 15s`,
          {
            lockPath,
            ageMs: age,
            hint: 'another jest worker may be wedged mid-mutate; remove the lock file to clear it',
          },
        );
      // a short SYNC pause — this whole path is sync so its callers keep their signature,
      // and a jest worker has no other work to do while it waits its turn
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25);
    }
  }

  try {
    return input.mutate();
  } finally {
    // ⚠️ released on EVERY exit path. a throw inside `mutate` that leaked the lock would
    //   wedge this host until the stale window expired
    rmSync(lockPath, { force: true });
  }
};

/**
 * .what = pre-accept EVERY one-time gate claude-code puts between a cold start and a
 *   ready input box — the per-project folder-trust dialog, the account-level first-run
 *   setup, and the "detected a custom API key in your environment" prompt — so a fresh
 *   fixture dir on a fresh host never wedges an enroll on a question there is no
 *   keyboard to answer.
 * .why =
 *   - each of these blocks the tui until a human presses Enter, and a pty enroll has
 *     no human behind it. a dev box cleared all three by hand, long ago; a ci runner
 *     with a just-installed claude and no ~/.claude.json meets all three at once.
 *   - the API-key gate is the one that actually bit (ci run 31886980514): the runner
 *     exports ANTHROPIC_API_KEY from keyrack, claude asks whether to use it and waits
 *     on `1. Yes / 2. No`. the enroll's own handoff still prints and the socket still
 *     stands up, so the clone reads LIVE — but every `say` types into that prompt
 *     instead of the input box. no turn is submitted, the transcript stays empty,
 *     `get` reads empty, and `say` fails loud with "did NOT leave its input buffer".
 *   - claude records the answer as the key's LAST 20 CHARACTERS under
 *     customApiKeyResponses.approved (the same suffix its prompt displays), so
 *     recording it up front is exactly the state a human's "1. Yes" leaves behind.
 *   - this replicates a set-up host; it does NOT fake the brain — real claude still
 *     boots, thinks, and replies.
 *   - findsert + non-destructive: reads the real ~/.claude.json, fills ONLY absent
 *     keys, unions the approved-key list, preserves every other field, writes it back.
 */
export const setRealClaudeFirstRunAccepted = (input: { dir: string }): void => {
  const configPath = join(homedir(), '.claude.json');
  return withHostFileLock({ path: configPath, mutate: () => setAccepted(input) });
};

/**
 * .what = the read-modify-write itself, ALWAYS called under the lock above
 * .why = split out so the lock is not optional at the one call site that matters — a
 *   caller reaches `setRealClaudeFirstRunAccepted`, which cannot be invoked unlocked
 */
const setAccepted = (input: { dir: string }): void => {
  const configPath = join(homedir(), '.claude.json');
  const prior = existsSync(configPath)
    ? (JSON.parse(readFileSync(configPath, 'utf-8')) as {
        projects?: Record<string, Record<string, unknown>>;
        hasCompletedOnboarding?: boolean;
        theme?: string;
        customApiKeyResponses?: { approved?: string[]; rejected?: string[] };
      })
    : {};
  const projects = prior.projects ?? {};
  const project = projects[input.dir] ?? {};

  // approve the key this run will actually hand claude, by the last-20 suffix claude
  // itself keys on. absent a key, leave the list exactly as found
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const approvedPrior = prior.customApiKeyResponses?.approved ?? [];
  const approvedNext = apiKey
    ? Array.from(new Set([...approvedPrior, apiKey.slice(-20)]))
    : approvedPrior;

  const next = {
    ...prior,
    // fill the account-level gates ONLY when absent — an already-set-up host keeps
    // whatever the human chose (their theme is theirs, not ours to overwrite)
    hasCompletedOnboarding: prior.hasCompletedOnboarding ?? true,
    theme: prior.theme ?? 'dark',
    customApiKeyResponses: {
      ...prior.customApiKeyResponses,
      approved: approvedNext,
      rejected: prior.customApiKeyResponses?.rejected ?? [],
    },
    projects: {
      ...projects,
      [input.dir]: { ...project, hasTrustDialogAccepted: true },
    },
  };
  writeFileSync(configPath, JSON.stringify(next, null, 2), 'utf-8');
};

/**
 * .what = the readiness MARKERS a real claude prints once its tui is up and its input
 *   reader is armed — shapes the brain-cli emits, which we match (`term=marker`)
 * .why = the readiness signal must survive a banner redesign, so it names SEVERAL markers
 *   any one of which proves the tui took over, rather than one word that a release can
 *   retire. claude v1 opened with a "Welcome" box; v2.1.251 opens with a version banner
 *   (`Claude Code` / `Haiku 4.5 · API Usage Billing` / cwd), an input box, and a mode
 *   footer (`⏸ manual mode on · ← for agents`) — and holds no "Welcome" at all.
 *
 *   🚨 NO multi-word literal can match. the tui positions each word with its own
 *      `\u001b[NNG` cursor-move, so `API Usage Billing` reaches the stream as
 *      `API\u001b[28GUsage\u001b[34GBilling` — the spaces a human reads are never in the
 *      bytes. a marker is therefore EITHER one word, OR it spans the gaps with
 *      `[^\r\n]*`, which crosses an escape but not a line.
 *
 *   ⚠️ verify every new marker against the RAW BYTES, never against the rendered screen.
 *      the screen is what the escapes produce; the regex reads what precedes them.
 */
const CLAUDE_IS_READY =
  /Welcome|Usage[^\r\n]*Billing|manual[^\r\n]*mode[^\r\n]*on/;

/**
 * .what = drive claude's folder-trust menu(s) through the outer pty until the brain boots
 * .why = a fresh dir raises a one-time trust menu before claude boots. a
 *   `~/.claude.json` pre-accept CAN clear it, but a nested claude session races that
 *   write and clobbers it, so the menu must be driven the way a human drives it.
 *
 *   ⚠️ three properties of that menu defeat a fixed key burst, and each is observed:
 *   1. the SELECTED option is not stable across claude versions. a build that
 *      pre-approves many tool permissions renders the safe refusal first —
 *      `❯ No, exit`, with `Yes, I trust this folder` below — so a bare Enter confirms
 *      the EXIT and the brain never boots
 *   2. the menu can render MORE THAN ONCE (the nested session raises its own), each
 *      fresh render back on the refusal
 *   3. it redraws async, so keys fired back-to-back outrun the render
 *
 *   so poll instead: act only when the stream has gone quiet (the menu awaits a key)
 *   AND the menu is the last panel drawn, then step toward the trust option or confirm
 *   it. yields as soon as claude's welcome box appears.
 */
const driveTrustMenus = async (input: {
  bg: RhachetBackgroundHandle;
  timeoutMs?: number;
}): Promise<void> => {
  // the cursor sits on whichever option follows the LAST `❯` drawn. the menu writes each
  // word with a `[NNG` cursor-move between, but never a newline mid-option, so the option
  // label is read as the remainder of that line.
  const cursorSitsOnTrust = (): boolean => {
    const output = input.bg.getOutput();
    const at = output.lastIndexOf('❯');
    if (at < 0) return false;
    return (output.slice(at, at + 200).split(/[\r\n]/)[0] ?? '').includes(
      'Yes,',
    );
  };

  // the menu is ON SCREEN when its cursor, its trust option, and its confirm footer are
  // all among the last bytes drawn. the buffer only ever grows, so a tail read is what
  // distinguishes "menu up now" from "menu was up earlier".
  // ⚠️ NEVER match a multi-word literal here. the menu draws each word with a `[NNG`
  //    cursor-move between, so `to confirm` and `trust this folder` are NOT contiguous
  //    in the stream — a plain `.includes()` on either silently never matches, and the
  //    loop then sits on its hands for the whole timeout. match single words, or span
  //    the escapes with a same-line `[^\r\n]*`.
  const menuIsOnScreen = (): boolean => {
    const tail = input.bg.getOutput().slice(-1500);
    return (
      /❯/.test(tail) && /confirm/.test(tail) && /Yes,[^\r\n]*folder/.test(tail)
    );
  };

  const deadline = Date.now() + (input.timeoutMs ?? 120000);
  // .note = deliberate mutation — a pty is driven over time, so the loop MUST carry the
  //   prior byte count to tell a quiet stream from a live one. bounded to this closure.
  let lengthPrior = -1;
  while (!CLAUDE_IS_READY.test(input.bg.getOutput()) && Date.now() < deadline) {
    const output = input.bg.getOutput();
    const streamIsQuiet = output.length === lengthPrior;
    lengthPrior = output.length;

    // one key per quiet tick: step down toward the trust option, or confirm it once the
    // cursor is there. a key per tick keeps every press paired with a fresh read, so a
    // wrap or a second menu is handled the same way the first one was.
    if (streamIsQuiet && menuIsOnScreen())
      input.bg.write(cursorSitsOnTrust() ? '\r' : '\u001b[B');

    await new Promise<void>((done) => setTimeout(done, 400));
  }
};

/**
 * .what = enroll a REAL claude through the outer pty and wait for its serial handoff
 * .why = the real-tier counterpart of enrollCloneAndWaitReady. a real claude prints no
 *   stub `ready serial=` line, and the human breadcrumb (`asCloneReachBreadcrumb`) is a
 *   TREE-mode emit on stderr, interleaved with the brain's own boot noise on a shared pty
 *   — so it is a poor sync point even though it now fires on a named enroll too.
 *   `--output json` gives a deterministic handoff for BOTH cases: a compact single-line
 *   `{"outcome":…,"serial":…,"slug":…,"socketEligible":true}` printed to stdout, after
 *   which enroll blocks on the brain's lifetime (invokeEnroll awaits waitForExit), so
 *   the brain stays alive + the socket stays up. yields the live handle + the clone's
 *   address + serial. NOTE the caller must put the real claude first on PATH and must
 *   NOT override CLAUDE_CONFIG_DIR (the brain needs its real ~/.claude).
 */
export const enrollRealClaudeAndWaitReach = async (input: {
  dir: string;
  env: Record<string, string | undefined>;
  as?: string;
  /** the roleset to enroll; absent → the repo default */
  roles?: string[];
  model?: string;
  timeoutMs?: number;
}): Promise<{ bg: RhachetBackgroundHandle; address: string; serial: string }> => {
  // 🔴 take a host-wide slot BEFORE the spawn. every realbrain suite passes through this
  // one door, so the bound applies by construction rather than by each suite's diligence —
  // and a suite added next year inherits it with no edit. the measured defect it closes:
  // 11 concurrent live brains starved the daemons' own event loops and reddened 8 rows in
  // three suites, where the same three passed 35/35 at a concurrency of 3
  // (genRealBrainSlot carries both log paths)
  const slot = await genRealBrainSlot();

  // default the real brain to haiku — the reach proof needs a LIVE brain that submits
  // + replies, not a smart one. haiku answers fastest + cheapest, so the round-trip is
  // quick and the token spend is minimal (rule.require.test-claude-cli-against-haiku).
  // `--model` is a claude passthrough arg (enroll consumes only its own flags).
  const bg = spawnRhachetCliBackground({
    args: [
      'enroll',
      'claude',
      '--model',
      input.model ?? 'haiku',
      ...(input.as ? ['--as', input.as] : []),
      ...(input.roles ? ['--roles', input.roles.join(',')] : []),
      '--output',
      'json',
    ],
    cwd: input.dir,
    env: input.env,
  });
  // 🔴 every step from here to the return may throw, and each throw must release the slot.
  // an enroll that fails its trust menu or its readiness bound would otherwise hold a slot
  // until the stale sweep reclaims it — and starve every peer suite meanwhile for a brain
  // that is already dead. on SUCCESS the slot stays held, and its release rides the wrapped
  // `kill` below
  const serial = await (async (): Promise<string> => {
    const reach = await bg.waitForOutput({
      pattern: /"serial":\s*"(?<serial>[0-9a-f-]{36})"/,
      timeoutMs: input.timeoutMs ?? 120000,
    });

    // claude shows a one-time folder-trust menu for a fresh dir before it boots ("Is this
    // a project you created or one you trust?"). race that menu against the ready marks —
    // whichever lands first says whether the menu must be driven at all. the menu text is
    // drawn word-by-word with `[NNG` cursor-move escapes between words, so
    // "trust this folder" is NOT contiguous; the header "you trust?" gives a reliable
    // contiguous literal to match.
    const gate = await bg.waitForOutput({
      pattern: new RegExp(`trust\\?|${CLAUDE_IS_READY.source}`),
      timeoutMs: input.timeoutMs ?? 120000,
    });
    if (gate[0].includes('trust?'))
      await driveTrustMenus({ bg, timeoutMs: input.timeoutMs });

    return reach.groups!.serial!;
  })().catch(async (error: unknown) => {
    slot.release();
    await bg.kill();
    throw error;
  });

  // the `"serial":` handoff prints from rhachet BEFORE claude's tui input reader is
  // armed. a dispatch that lands before the reader is ready is lost (a mid-boot claude
  // buffers it as literal text; a booted claude discards a burst). the stub draws no such
  // banner, so both waits below are real-claude-only.
  //
  // ⚠️ these are TWO waits, and only the first is a signal. an earlier comment said "a
  //   signal, not a fixed delay" over BOTH lines, which read as a claim about the settle
  //   too — it was not one, and a reviewer read it exactly that way
  //   (`rule.require.timeless-comments`).
  //
  //   1. the SIGNAL — claude's own readiness banner, however long its boot took
  await bg
    .waitForOutput({
      pattern: CLAUDE_IS_READY,
      timeoutMs: input.timeoutMs ?? 120000,
    })
    .catch(async (error: unknown) => {
      // same contract as the block above: a brain that never announced itself is dead
      // weight, and its slot belongs to a peer
      slot.release();
      await bg.kill();
      throw error;
    });

  //   2. a FIXED settle, stated as one. the banner marks the RENDER; claude publishes no
  //      second mark for "the input reader is armed", so there is no signal left to wait
  //      on and this is a guess at that gap. on a loaded host it can be short.
  //
  //   ⇒ the residue is covered DELIBERATELY, never incidentally: `sayAndPollForMarker`
  //     re-sends a non-landed dispatch up to `maxAttempts`, which is the shipped consumer
  //     contract (fail loud on exit 2, then retry) rather than a mask over this delay. so
  //     a settle too short costs a retry, never a red — and ALL attempts wedged still
  //     fails loud with the brain's own screen attached
  await new Promise<void>((done) => setTimeout(done, 2000));

  // 🔴 the slot's release rides `kill`, so a caller frees host capacity by the SAME act it
  // already performs in its `afterAll` — no second call to forget. every realbrain suite
  // already kills its brain (the brain outlives the test otherwise), so the release is
  // carried by a habit the suites have, rather than by one this cure would have to teach
  // them.
  // .note = idempotent on both halves: `release` tolerates an already-swept slot, and the
  //   underlying `kill` is the same handle the caller held before
  const killAndRelease = async (): Promise<{ exited: boolean }> => {
    try {
      return await bg.kill();
    } finally {
      slot.release();
    }
  };

  return {
    bg: { ...bg, kill: killAndRelease },
    address: `@:${serial}`,
    serial,
  };
};

/**
 * .what = poll `clone list` until the reach-state a caller expects is on screen
 *
 * 🚨 .why a POLL and not a settle = the callers each killed a brain and then slept a fixed
 *   500ms before they read its reach-state. that is a LATENCY BOUND asserted as fact, and
 *   the two cases it covers do not even share a mechanism:
 *
 *   | the read | what it actually waits on |
 *   |---|---|
 *   | a socketed clone → DEAD | the listener is gone. `bg.kill()` already awaits the child's exit, so this is settled BEFORE the sleep begins |
 *   | a socketless clone → DEAF→DEAD | a `kill(pid, 0)` probe, which answers ALIVE for a zombie until its parent reaps it — a genuinely unbounded wait |
 *
 *   ⇒ one guess covered a case that needed none and a case no fixed number can bound. a
 *   poll of the OBSERVABLE is right for both, and it reports the last screen it saw when
 *   the bound expires, so an expiry names what it found rather than only that it waited
 *   (`rule.forbid.time-assumptions`, raised by the r007 `behavior-hazards` lane at i076).
 *
 * ⚠️ it does NOT throw on expiry. the caller's own `expect` is the verdict, and a throw
 *   here would replace a legible assertion diff with a harness fault.
 */
export const pollForCloneListState = async (input: {
  /** the text the caller expects on screen, e.g. `'DEAD'` */
  wanted: string;
  dir: string;
  env: Record<string, string | undefined>;
  timeoutMs?: number;
}): Promise<ReturnType<typeof invokeRhachetCliBinary>> => {
  const deadline = Date.now() + (input.timeoutMs ?? 15000);
  // .note = deliberate mutation — the loop must carry the most recent read out, so the
  //   caller asserts against a real screen rather than an absent one. bounded to this call
  let listed = invokeRhachetCliBinary({
    args: ['clone', 'list'],
    cwd: input.dir,
    env: input.env,
    logOnError: false,
  });
  while (!listed.stdout.includes(input.wanted) && Date.now() < deadline) {
    await new Promise((wake) => setTimeout(wake, 100));
    listed = invokeRhachetCliBinary({
      args: ['clone', 'list'],
      cwd: input.dir,
      env: input.env,
      logOnError: false,
    });
  }
  return listed;
};

/**
 * .what = say a message to a real clone, then poll `get` until a marker appears
 * .why = a real brain takes seconds to think + write its transcript, so a dispatch is
 *   observed by a poll of `get` for a deterministic marker the prompt asked the brain to
 *   emit (LLM reply text is nondeterministic; the marker is not). returns the say result
 *   + the last read + whether the marker landed, so the caller asserts loud with context.
 */
export const sayAndPollForMarker = async (input: {
  address: string;
  what: string;
  marker: string;
  dir: string;
  env: Record<string, string | undefined>;
  stdin?: string;
  timeoutMs?: number;
  maxAttempts?: number;
  /**
   * force the say past a `dirty` input-region pre-check — the one refusal `--force`
   * overrides.
   * .why = a box reads `dirty` only where it holds genuinely BRIGHT text, which is what
   *   a human types. so a force claims: the text in that box is expendable. the write
   *   inserts at the cursor and the submit commits the WHOLE box, so whatever sat there
   *   rides along as one fused turn — by construction, never by the brain's discretion.
   *   left OFF by default: a probe that asserts an un-forced verdict must never be
   *   handed a flag that changes it.
   * .note = a real claude (v2.1.87) draws a CONTEXTUAL greyed placeholder into the empty
   *   box between turns (e.g. `Another joke?`). that is DIM, so the attribute-aware feed
   *   (genCloneScreenFeed.asBrightOnlyRow) reads the band `clear` and a conversation
   *   needs no force at all — see the joker suite, which drives five turns unforced.
   *   a force reached for to get past a placeholder is a signal the feed regressed.
   * .note = --force can override a dirty region but NEVER a modal (no force path), so
   *   this never masks a modal refusal (define.brain-cli-input-states, case=6).
   */
  force?: boolean;
  /**
   * the clone's pty mirror, so an exhausted dispatch can report the brain's OWN
   * screen. without it a failure reads only `exit 1` — with it, the screen names
   * the cause (a first-run setup prompt, a trust dialog, a crashed tui)
   */
  getScreen?: () => string;
}): Promise<{
  said: Awaited<ReturnType<typeof invokeRhachetCliBinaryAsync>>;
  lastRead: string;
  landed: boolean;
}> => {
  // one dispatch attempt — the say cli invocation, factored so a retry re-sends it.
  // 🚨 ASYNC, never spawnSync: the clone's pty is drained only while this event loop
  //   turns. a sync say froze the loop, the undrained pty blocked the clone's own mirror
  //   write, and its socket could not ack — a harness-made wedge (exit 2) whose message
  //   then landed seconds later. see `invokeRhachetCliBinaryAsync`
  const sendSay = (): ReturnType<typeof invokeRhachetCliBinaryAsync> =>
    invokeRhachetCliBinaryAsync({
      args: [
        'clone',
        'say',
        input.address,
        '--what',
        input.stdin !== undefined ? '@stdin' : input.what,
        ...(input.force ? ['--force'] : []),
      ],
      cwd: input.dir,
      env: input.env,
      stdin: input.stdin,
    });

  // a wedged/undelivered say is the FAIL-LOUD signal (exit 2), and the wish's real
  // consumer (a cron/comms handler) RETRIES it. a booted claude has a brief settle window
  // between turns — right after it renders a reply, its input reader is momentarily not
  // drained, so a rapid next-turn say can land in that window and wedge on a live-brain
  // race (the flagged say-vs-settle boundary). so re-say a non-landed dispatch up to
  // maxAttempts, exactly as the consumer must — this models the shipped contract (fail
  // loud, then retry), NOT a masked defect: the deterministic submit path is proven
  // separately by the stub-brain suites, and ALL attempts wedged still surfaces a
  // genuinely broken submit here.
  const maxAttempts = input.maxAttempts ?? 3;

  // .note = deliberate mutation — `said` latches the most-recent say result, `lastRead`
  //   the most-recent `get` read; both reassigned across attempts, neither escapes
  let said = await sendSay();
  let lastRead = '';

  // 🚨 the SAY TRAIL, one row per attempt — the instrument this harness lacked
  // .why = measured 2026-09-18, the joker t3 by-serial dispatch: the marker LANDED and the
  //   say still exited 1. the caller asserts `said.status === 0`, so the red reads
  //   `Expected 0 / Received 1` and no more than that — the verdict, the reason slug, the
  //   stderr, and the brain's screen were every one of them swallowed, because the
  //   diagnostic block below fires only on `landed: false`.
  //   ⇒ that is the exact failure class this wish exists to name (a dispatch the brain took,
  //   reported as a failure), so an instrument blind to it cannot verify the fix
  //   (`rule.require.read-the-record-not-the-correlate`). the trail is recorded per attempt
  //   rather than latched, because a retry overwrites `said` and the FIRST attempt's verdict
  //   is usually the load-bearing one.
  const trail: {
    attempt: number;
    status: number | null;
    stdout: string;
    stderr: string;
  }[] = [];
  const recordSay = (attempt: number): void =>
    void trail.push({
      attempt,
      status: said.status,
      stdout: said.stdout,
      stderr: said.stderr,
    });

  /**
   * .what = print every attempt's say verdict, the last `get` read, and the brain's own screen
   * .why = one reporter for BOTH exits. each say ran with `logOnError: false` (a retried say is
   *   expected to fail, so per-attempt logs are noise), so the WHY is otherwise swallowed —
   *   and it is swallowed identically whether the marker landed or never did. the two exits
   *   differ only in their headline, so a second copy of this block would drift from the first
   */
  const reportSayTrail = (report: { headline: string }): void => {
    // stripped BEFORE the slice below — on a raw pty buffer the 4000-char budget is spent
    // almost entirely on escapes, so the dump shows a few hundred chars of real text
    const screen = input.getScreen
      ? asLegibleScreen(input.getScreen())
      : '(no screen supplied)';
    console.error(
      [
        report.headline,
        `   address = ${input.address}`,
        `   marker  = ${input.marker}`,
        ...trail.flatMap((row) => [
          `--- attempt ${row.attempt} of ${maxAttempts} — exit ${String(row.status)} ---`,
          `   stdout: ${row.stdout.trim()}`,
          `   stderr: ${row.stderr.trim()}`,
        ]),
        `--- last get read ---`,
        lastRead,
        `--- brain screen (last 4000 chars) ---`,
        screen.slice(-4000),
      ].join('\n'),
    );
  };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // a retry (attempt 2+) re-sends before its poll; attempt 1 was sent above
    if (attempt > 1) said = await sendSay();
    recordSay(attempt);

    // a TIGHT per-attempt deadline — claude replies + writes its transcript within
    // seconds, so a marker absent after this cap means THIS attempt did not land; the
    // retry above covers the live settle-race, so the cap need not swallow it
    const deadline = Date.now() + (input.timeoutMs ?? 30000);
    while (Date.now() < deadline) {
      // async for the same reason as the say — a poll must never stall the pty drain
      const got = await invokeRhachetCliBinaryAsync({
        args: ['clone', 'get', input.address, '--tail', '10'],
        cwd: input.dir,
        env: input.env,
      });
      lastRead = got.stdout;
      if (got.stdout.includes(input.marker)) {
        // 🚨 LANDED, and a say on the way here reported a failure verdict — report it.
        // .why = this is the wish's own primary defect shape: the brain TOOK the message and
        //   `say` called it a failure. the caller's `expect(said.status).toEqual(0)` renders
        //   that as `Expected 0 / Received 1`, which names no verdict and no cause. so the
        //   one moment the record is load-bearing is the one moment it was absent
        if (trail.some((row) => row.status !== 0))
          reportSayTrail({
            headline: '💥 dispatch LANDED, yet a say reported a failure',
          });
        return { said, lastRead, landed: true };
      }
      await new Promise((r) => setTimeout(r, 1500));
    }

    // this attempt did not land — a short settle before the retry lets claude's input
    // reader return to a ready state after the prior turn's render
    if (attempt < maxAttempts)
      await new Promise((r) => setTimeout(r, 2000));
  }

  // every attempt is spent and the marker never landed — the caller's `landed` assert will
  // fail, but on its own it reads as a bare `false`. the trail names each attempt's verdict
  // and the brain's own screen, which reports a cause no rhachet-side error can (a first-run
  // setup prompt, a trust dialog, a crashed tui)
  reportSayTrail({
    headline: `💥 dispatch NEVER landed after ${maxAttempts} attempts`,
  });

  return { said, lastRead, landed: false };
};

/**
 * .what = assert a successful `clone say` against a LIVE brain rendered one of its two
 *   success trees, addressed to the clone that was dispatched to
 * .why =
 *   - ⚠️ measured 2026-09-16: a real-brain say stdout is NOT deterministic, and three
 *     realbrain suites asserted that it was. each snapshotted `said.stdout` under a comment
 *     that called it "a plain `delivered` tree with NO brain prose in it, so it is fully
 *     deterministic". that held before the read channel shipped; it does not hold now
 *   - the verdict is a READ OF BRAIN STATE. a say dispatched while the brain is mid-turn
 *     renders `enqueued for`; one dispatched while it is idle renders `said to`. both are
 *     exit 0, both are correct, and WHICH one a real brain produces is a race against its
 *     own turn — so a full-stdout snapshot passes or fails by the clock. the saybulk probe
 *     caught the enqueued branch and went red against a snapshot pinned to the released one
 *   - a resnap would be the wrong repair TWICE over: it pins one side of a coin flip, and
 *     the next run flips it back (`rule.require.snapshot-verified-on-independent-run`)
 *   - ⇒ the render SHAPES are already locked exhaustively and deterministically at the unit
 *     grain — `computeCloneSayReport.test.ts` snapshots all 13 verdict renders off fixed
 *     input. so the realbrain snapshot added no shape coverage the unit grain lacks; it
 *     added only a flake. what a real brain uniquely proves is that a LIVE dispatch reaches
 *     one of the success branches at all, which is what this asserts
 * .note = it stays STRICT on each property that is genuinely brain-independent: the tree
 *   must name one of the two SUCCESS verdicts, and the address it names must belong to the
 *   clone that was dispatched to — a `buffered`, `withheld`, `absent`, or `unreadable`
 *   render fails here, as it must, and so does a tree addressed to some other clone
 * .note = the address is matched as a PREFIX of the serial, never as an equality. the human
 *   surface abbreviates an unslugged clone to a short serial
 *   (`rule.require.short-serial-for-unslugged-clones`), so the rendered `@:1a2b3c4d` is a
 *   prefix of the `@:1a2b3c4d-....` the caller dispatched to
 *
 * ⚠️ .note = `clone say` echoes THE ADDRESS THE CALLER USED, never a canonical one. so a
 *   clone dispatched to by slug renders `@:joker`, and a serial-only matcher reads its own
 *   success tree as "neither success verdict". pass `slug` whenever the clone carries one —
 *   the check then admits either form, and admits no third
 */
export const expectCloneSaySuccessTree = (input: {
  stdout: string;
  serial: string;
  /** the clone's slug, when it has one — a say addressed by slug renders the slug */
  slug?: string;
}): void => {
  // ⚠️ the charset spans a SLUG as well as a serial. a hex-only class silently refuses
  //   `@:joker` at the match step, which reports as an absent verdict rather than as
  //   the address mismatch it actually is — a diagnosis one layer off the defect
  const matched = /😶🎙️ (said to|enqueued for) @:([0-9a-z-]+)/.exec(
    input.stdout,
  );
  if (!matched)
    throw new ConstraintError(
      'clone say stdout named neither success verdict tree',
      {
        serial: input.serial,
        slug: input.slug ?? null,
        expectedOneOf: [
          '😶🎙️ said to @:<serial|slug>',
          '😶🎙️ enqueued for @:<serial|slug>',
        ],
        stdout: input.stdout,
      },
    );
  const addressShown = matched[2] ?? '';
  const namesThisClone =
    input.serial.startsWith(addressShown) || addressShown === input.slug;
  if (!namesThisClone)
    throw new ConstraintError(
      'clone say success tree named a DIFFERENT clone than the one dispatched to',
      {
        serial: input.serial,
        slug: input.slug ?? null,
        addressShown,
        stdout: input.stdout,
      },
    );

  // the TAIL, asserted structurally because the masked snapshot below cannot carry it: a success
  // render is a head plus AT MOST ONE leaf, and whether the leaf is present is brain/peer state
  // (a probe-blind or feed-not-live peer earns a degrade leaf; a healthy one earns none). so a
  // single snapshot key holds only the head, and the shape of what may follow it is checked here
  //
  // ⚠️ .why NOT a line count = `said to` has FOUR renders, three of which carry a degrade leaf
  //   (`feed faulted`, `feed not live`, `probe-blind`). an `=== 1` check would redden against a
  //   legitimate degrade — a false failure on a peer that is merely older than the read channel
  const verdict = matched[1];
  const lines = asSnapshotSafe(input.stdout).trimEnd().split('\n');
  const tail = lines.slice(1);
  const strays = tail.filter((line) => !/^ {3}└─ 🟡 /.test(line));
  if (strays.length)
    throw new ConstraintError(
      'a clone say success tree carried a tail line that is not a `└─ 🟡` leaf',
      { verdict, strays, stdout: input.stdout },
    );
  if (tail.length > 1)
    throw new ConstraintError(
      'a clone say success tree carried more than one leaf',
      { verdict, tail, stdout: input.stdout },
    );
  // the one branch whose leaf is MANDATORY: a hold must state why it is held and what voids it,
  // which is the caution the retry contract rests on (an aborted turn drops the hold, unsent)
  if (verdict === 'enqueued for') {
    if (!/ — /.test(lines[0] ?? ''))
      throw new ConstraintError(
        'an `enqueued for` head line carried no detail suffix; a hold must state why',
        { stdout: input.stdout },
      );
    if (!tail.length)
      throw new ConstraintError(
        'an `enqueued for` tree carried no hold-caution leaf',
        { stdout: input.stdout },
      );
  }
};

/**
 * .what = the COMMON head of a `clone say` success tree, masked for a snapshot — the glyph
 *   pair, the verdict slot, and the address slot, with both volatile values replaced
 *
 * .why a live snapshot at all = the render SHAPES are locked deterministically at the unit
 *   grain (`computeCloneSayReport.test.ts`, all 13 verdicts off fixed input), and that proves
 *   the renderer. it does NOT prove the LIVE pipeline: a pty, a socket, a subprocess, and a
 *   stdout write sit between that string and a human's terminal. so this is COMPLEMENTARY to
 *   the unit-grain snapshot, never a substitute for it
 *
 * ⚠️ .what it does and does NOT catch — stated plainly, because the guard below catches most
 *   shape breaks and the snapshot diff carries the rest:
 *
 *   | change | who catches it |
 *   |---|---|
 *   | a glyph swap, a lost space, an absent `@:` sigil, a blank first line | the GUARD throws |
 *   | a third verdict word, or a success render that reaches stdout malformed | the GUARD throws |
 *   | 🟡 an ANSI escape that reached stdout | NEITHER — `asSnapshotSafe` strips ANSI by design |
 *   | any change to the invariant envelope, made VISIBLE to a human in the PR diff | the SNAPSHOT |
 *
 *   ⇒ so its value is the one `rule.require.snapshots` names first: a reviewer reads the shape a
 *   live pty + socket + subprocess actually put on a terminal, with no run of their own. the
 *   guard is what FAILS; the snapshot is what a human READS when it changes
 *
 * 🚨 .why only the HEAD = FIVE success renders exist, and their line count and detail suffix are
 *   both a read of brain/peer state, so no two of them share a full-render key:
 *
 *     😶🎙️ said to @:driver
 *     😶🎙️ said to @:oldpeer
 *        └─ 🟡 probe-blind (older clone) — verified by transcript; re-enroll for the full read
 *     😶🎙️ enqueued for @:busybrain — mid-turn; lands next
 *        └─ 🟡 held behind the active turn, not yet taken — …
 *
 *   ⚠️ and a per-branch key is NOT the escape: the acceptance runner passes no `--ci`, so an
 *   unwritten key is WRITTEN on first encounter rather than failed. a branch that ran once in
 *   ci would mint its own snapshot and pass — a clamp that certifies whatever it happened to
 *   see (`rule.require.snapshot-verified-on-independent-run`). so the key must be single, and
 *   the content must be the render-invariant head
 *
 * .note = the tail the mask drops is not lost — `expectCloneSaySuccessTree` asserts its SHAPE:
 *   at most one leaf, every tail line a `   └─ 🟡 ` leaf, and for `enqueued for` that leaf plus
 *   a detail suffix are both mandatory
 * .note = it THROWS on a non-success stdout rather than mask it. a masker that quietly returned
 *   a garbled string would snap a lie and read as a pass (`rule.forbid.failhide`)
 */
export const asCloneSayHeadSnapshotSafe = (input: {
  stdout: string;
}): string => {
  // ⚠️ the address class is `\S+`, NOT a hex/slug charset. `asSnapshotSafe` runs FIRST, and it
  //   has already rewritten a serial address to `@:__SERIAL__` or `@:__SERIAL8__` — forms a
  //   `[0-9a-z-]+` class refuses on its underscores and caps. so a charset guard threw against
  //   every SERIAL-addressed dispatch (clone.realbrain, clone.saybulk-probe), while the
  //   slug-addressed sites passed — a defect visible only once both address forms are exercised
  //   (`expectCloneSaySuccessTree.test.ts [case1]` is the clamp that caught it)
  const head = asSnapshotSafe(input.stdout).split('\n')[0] ?? '';
  if (!/^😶🎙️ (said to|enqueued for) @:\S+/.test(head))
    throw new ConstraintError(
      'clone say stdout head is not a success tree — no safe mask applies',
      { head, stdout: input.stdout },
    );
  return head
    .replace(/(said to|enqueued for)/, '<verdict>')
    .replace(/@:\S+.*$/, '@:<address>');
};
