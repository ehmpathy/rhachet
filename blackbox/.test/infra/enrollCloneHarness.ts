import { ConstraintError } from 'helpful-errors';

import { invokeRhachetCliBinary } from './invokeRhachetCliBinary';
import { setupRoleFixtureRepo } from './roleFixtureRepo';
import {
  spawnRhachetCliBackground,
  type RhachetBackgroundHandle,
} from './spawnRhachetCliBackground';

import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, join } from 'node:path';

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
 * .what = locate the real `claude` binary this host would spawn, or null if absent
 * .why = the real tier needs the genuine brain-cli on PATH. an override env lets a
 *   nightly runner pin an exact binary; otherwise the well-known pnpm global path and
 *   a PATH scan are tried. null means "no real claude" — the gate then fails loud.
 */
export const getRealClaudeBinPath = (): string | null => {
  const override = process.env.RHACHET_REAL_CLAUDE_BIN;
  if (override && existsSync(override)) return override;

  const candidates = [
    join(homedir(), '.local', 'share', 'pnpm', 'claude'),
    ...(process.env.PATH ?? '')
      .split(delimiter)
      .filter((dir) => dir.length > 0)
      .map((dir) => join(dir, 'claude')),
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
};

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
  if (!binPath)
    throw new ConstraintError(
      [
        'no real `claude` binary found for the real-claude reach tier.',
        'fix: install claude-code (`pnpm add -g @anthropic-ai/claude-code`) or set',
        'RHACHET_REAL_CLAUDE_BIN to its path. this tier NEVER skips — an absent brain',
        'is a loud gate, not a silent pass.',
      ].join(' '),
    );

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
 * .what = pre-accept claude-code's one-time first-run gates — BOTH the per-project
 *   folder-trust dialog (`projects[<dir>].hasTrustDialogAccepted`) and the
 *   account-level first-run setup (`hasCompletedOnboarding`, `theme`) — so a fresh
 *   fixture dir on a fresh host never wedges a non-interactive enroll on a prompt
 *   there is no keyboard to answer.
 * .why =
 *   - claude-code blocks on a one-time trust dialog per project dir until a human
 *     presses Enter. a fixture dir is always fresh, so that gate fires on EVERY run.
 *   - a fresh HOST (a ci runner with a just-installed claude and no ~/.claude.json)
 *     hits a SECOND gate first: the account-level first-run setup (theme pick).
 *     both its banner and the ready ui say "Welcome", so a wait on that word alone
 *     cannot tell them apart — the enroll proceeds, the socket stands up, and every
 *     `say` then types into a setup prompt instead of the input box: no turn is ever
 *     submitted, the transcript stays empty, and `say` fails loud with "did NOT leave
 *     its input buffer". clearing the gate up front is what makes a ci host behave
 *     like the already-set-up dev box the tier was written on.
 *   - a real user clears both gates once, by hand. this replicates that state; it
 *     does NOT fake the brain — real claude still boots, thinks, and replies.
 *   - findsert + non-destructive: reads the real ~/.claude.json, fills ONLY absent
 *     keys, preserves every other project + top-level field, writes it back.
 */
export const setRealClaudeFirstRunAccepted = (input: { dir: string }): void => {
  const configPath = join(homedir(), '.claude.json');
  const prior = existsSync(configPath)
    ? (JSON.parse(readFileSync(configPath, 'utf-8')) as {
        projects?: Record<string, Record<string, unknown>>;
        hasCompletedOnboarding?: boolean;
        theme?: string;
      })
    : {};
  const projects = prior.projects ?? {};
  const project = projects[input.dir] ?? {};
  const next = {
    ...prior,
    // fill the account-level gates ONLY when absent — an already-set-up host keeps
    // whatever the human chose (their theme is theirs, not ours to overwrite)
    hasCompletedOnboarding: prior.hasCompletedOnboarding ?? true,
    theme: prior.theme ?? 'dark',
    projects: {
      ...projects,
      [input.dir]: { ...project, hasTrustDialogAccepted: true },
    },
  };
  writeFileSync(configPath, JSON.stringify(next, null, 2), 'utf-8');
};

/**
 * .what = enroll a REAL claude through the outer pty and wait for its serial handoff
 * .why = the real-tier counterpart of enrollCloneAndWaitReady. a real claude prints no
 *   stub `ready serial=` line, and the human F7 breadcrumb (`rhx clone say @:<serial>`)
 *   fires ONLY on a bare, unnamed enroll — so a NAMED (`--as`) enroll has no such line.
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
  model?: string;
  timeoutMs?: number;
}): Promise<{ bg: RhachetBackgroundHandle; address: string; serial: string }> => {
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
      '--output',
      'json',
    ],
    cwd: input.dir,
    env: input.env,
  });
  const reach = await bg.waitForOutput({
    pattern: /"serial":\s*"(?<serial>[0-9a-f-]{36})"/,
    timeoutMs: input.timeoutMs ?? 120000,
  });
  const serial = reach.groups!.serial!;

  // claude shows a one-time folder-trust menu for a fresh dir before it boots ("Is this
  // a project you trust?", option 1 "Yes, I trust this folder" pre-selected). a
  // ~/.claude.json pre-accept CAN clear it, but a nested claude session races that write
  // and clobbers it, so the robust path is to drive the menu the way a human does: race
  // the trust prompt against the welcome box, and if the menu appears, confirm it with
  // an Enter through the outer pty. the menu text is drawn char-by-char with `[1C`
  // cursor-move escapes between words, so "trust this folder" is NOT contiguous; the
  // header "you trust?" gives a reliable contiguous literal to match.
  const gate = await bg.waitForOutput({
    pattern: /trust\?|Welcome/,
    timeoutMs: input.timeoutMs ?? 120000,
  });
  if (!gate[0].includes('Welcome')) bg.write('\r');

  // the `"serial":` handoff prints from rhachet BEFORE claude's tui input reader is
  // armed. a dispatch that lands before the reader is ready is lost (a mid-boot claude
  // buffers it as literal text; a booted claude discards a burst). so wait for claude's
  // OWN readiness marker — its welcome box renders "Welcome" — then a short settle, so
  // the reach `say` types into a ready reader. a signal, not a fixed delay (claude boot
  // time varies run to run). the stub prints no such box, so this is real-claude-only.
  await bg.waitForOutput({
    pattern: /Welcome/,
    timeoutMs: input.timeoutMs ?? 120000,
  });
  await new Promise<void>((done) => setTimeout(done, 2000));

  return { bg, address: `@:${serial}`, serial };
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
   * the clone's pty mirror, so an exhausted dispatch can report the brain's OWN
   * screen. without it a failure reads only `exit 1` — with it, the screen names
   * the cause (a first-run setup prompt, a trust dialog, a crashed tui)
   */
  getScreen?: () => string;
}): Promise<{
  said: ReturnType<typeof invokeRhachetCliBinary>;
  lastRead: string;
  landed: boolean;
}> => {
  // one dispatch attempt — the say cli invocation, factored so a retry re-sends it
  const sendSay = (): ReturnType<typeof invokeRhachetCliBinary> =>
    invokeRhachetCliBinary({
      args: [
        'clone',
        'say',
        input.address,
        '--what',
        input.stdin !== undefined ? '@stdin' : input.what,
      ],
      cwd: input.dir,
      env: input.env,
      stdin: input.stdin,
      logOnError: false,
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
  let said = sendSay();
  let lastRead = '';
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // a retry (attempt 2+) re-sends before its poll; attempt 1 was sent above
    if (attempt > 1) said = sendSay();

    // a TIGHT per-attempt deadline — claude replies + writes its transcript within
    // seconds, so a marker absent after this cap means THIS attempt did not land; the
    // retry above covers the live settle-race, so the cap need not swallow it
    const deadline = Date.now() + (input.timeoutMs ?? 30000);
    while (Date.now() < deadline) {
      const got = invokeRhachetCliBinary({
        args: ['clone', 'get', input.address, '--tail', '10'],
        cwd: input.dir,
        env: input.env,
        logOnError: false,
      });
      lastRead = got.stdout;
      if (got.stdout.includes(input.marker))
        return { said, lastRead, landed: true };
      await new Promise((r) => setTimeout(r, 1500));
    }

    // this attempt did not land — a short settle before the retry lets claude's input
    // reader return to a ready state after the prior turn's render
    if (attempt < maxAttempts)
      await new Promise((r) => setTimeout(r, 2000));
  }

  // every attempt is spent and the marker never landed — the caller's `landed` assert
  // will fail, but on its own it reads as a bare `false`. each say ran with
  // logOnError:false (a retried say is expected to fail, so per-attempt logs are noise),
  // so the WHY is otherwise swallowed. print it once, here, at the only moment it is
  // load-bearing: the last say's exit + stderr, the last `get` read, and — when the
  // caller supplies it — the brain's own screen, which names a cause no rhachet-side
  // error can (a first-run setup prompt, a trust dialog, a crashed tui)
  const screen = input.getScreen?.() ?? '(no screen supplied)';
  console.error(
    [
      `⛈️ dispatch NEVER landed after ${maxAttempts} attempts`,
      `   address = ${input.address}`,
      `   marker  = ${input.marker}`,
      `   say.status = ${String(said.status)}`,
      `--- say.stderr ---`,
      said.stderr,
      `--- say.stdout ---`,
      said.stdout,
      `--- last get read ---`,
      lastRead,
      `--- brain screen (last 4000 chars) ---`,
      screen.slice(-4000),
    ].join('\n'),
  );

  return { said, lastRead, landed: false };
};
