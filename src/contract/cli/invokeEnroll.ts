import type { Command } from 'commander';
import { ConstraintError } from 'helpful-errors';

import type { BrainCliEnrollmentSpec } from '@src/domain.objects/BrainCliEnrollmentSpec';
import type { BrainSlug } from '@src/domain.objects/BrainSlug';
import type { RoleSlug } from '@src/domain.objects/RoleSlug';
import { genEnrollmentHash } from '@src/domain.operations/actor/enrolled/genEnrollmentHash';
import { getActorOndiskDir } from '@src/domain.operations/actor/enrolled/getActorOndiskDir';
import { getActorsRootDir } from '@src/domain.operations/actor/enrolled/getActorsRootDir';
import { getSupportedBrainCommand } from '@src/domain.operations/brain/getSupportedBrainCommand';
import { asCloneAccrualWarnLine } from '@src/domain.operations/clone/asCloneAccrualWarnLine';
import { asCloneAddressFromHandoff } from '@src/domain.operations/clone/asCloneAddressFromHandoff';
import { asCloneDetachHostArgv } from '@src/domain.operations/clone/asCloneDetachHostArgv';
import {
  asCloneEnrollDepth,
  CLONE_ENROLL_DEPTH_MAX,
} from '@src/domain.operations/clone/asCloneEnrollDepth';
import { asCloneReachBreadcrumb } from '@src/domain.operations/clone/asCloneReachBreadcrumb';
import { asCloneRef } from '@src/domain.operations/clone/asCloneRef';
import { computeCloneAccrualWarn } from '@src/domain.operations/clone/computeCloneAccrualWarn';
import {
  CLONE_ENROLL_DETACH_TIMEOUT_MS,
  genCloneEnrollDetached,
} from '@src/domain.operations/clone/genCloneEnrollDetached';
import { genCloneOndisk } from '@src/domain.operations/clone/genCloneOndisk';
import { getOneCloneLiveCountForActor } from '@src/domain.operations/clone/getOneCloneLiveCountForActor';
import { isSafeCloneSlug } from '@src/domain.operations/clone/isSafeCloneSlug';
import { asCloneEnrollModeAsked } from '@src/domain.operations/clone/pty/asCloneEnrollModeAsked';
import { computeCloneEnrollMode } from '@src/domain.operations/clone/pty/computeCloneEnrollMode';
import { asBrainCliSpawnArgs } from '@src/domain.operations/enroll/asBrainCliSpawnArgs';
import { computeBrainCliEnrollment } from '@src/domain.operations/enroll/computeBrainCliEnrollment';
import { computeBrainCliInput } from '@src/domain.operations/enroll/computeBrainCliInput';
import { genBrainCliConfigArtifact } from '@src/domain.operations/enroll/genBrainCliConfigArtifact';
import { getBrainCliPassthroughArgs } from '@src/domain.operations/enroll/getBrainCliPassthroughArgs';
import { getRolesSpaceFormCollision } from '@src/domain.operations/enroll/getRolesSpaceFormCollision';
import { isBrainCliPrintMode } from '@src/domain.operations/enroll/isBrainCliPrintMode';
import { parseBrainCliEnrollmentSpec } from '@src/domain.operations/enroll/parseBrainCliEnrollmentSpec';
import { getDecodedRoleDeltaToken } from '@src/domain.operations/roles/deltas/getDecodedRoleDeltaToken';
import { getRoleDeltaTokens } from '@src/domain.operations/roles/deltas/getRoleDeltaTokens';
import { getOneRepoPath } from '@src/infra/host/getOneRepoPath';
import { CLONE_ACCRUAL_THRESHOLD } from '@src/utils/cloneAccrualThreshold';
import { CLONE_ENV_KEYS } from '@src/utils/cloneEnvKeys';

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { asCliOutputMode } from './asCliOutputMode';
import { withCliOutputErrors } from './withCliOutputErrors';

/**
 * .what = the brain enroll falls back to when none is named
 * .why = the bare `rhx enroll` common case just works; a flagged fulcrum value —
 *   the council may swap it for the allowlist-head lookup (see the vision)
 */
const DEFAULT_BRAIN: BrainSlug = 'claude';

/**
 * .what = every raw token that followed `enroll` on the command line
 * .why = the brain passthrough goes verbatim to the child cli, so we capture the
 *   full tail and let getBrainCliPassthroughArgs strip only enroll's own flags
 */
const getRawArgsAfterEnroll = (): string[] => {
  const argv = process.argv;
  const idx = argv.indexOf('enroll');
  if (idx === -1) return [];
  return argv.slice(idx + 1);
};

/**
 * .what = read all of stdin as one string (for `--reason @stdin`)
 * .why = a payload-heavy or multi-line motive has a clean CLI path, the same as
 *   `say --what @stdin`
 * .note = WET twin of invokeCloneSay's readStdin — this one trims (a motive reads
 *   cleaner without stray edge whitespace), that one preserves a message verbatim.
 *   rule-of-three tripwire: a THIRD invoker that reads @stdin earns a shared
 *   readStdinString({ trim }) transformer; until then the two-site WET is deliberate
 */
const readStdin = async (): Promise<string> => {
  // .note = deliberate mutation — a bounded accumulator local to this read; the
  //   array never escapes readStdin, so no external reader observes the mutation
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf-8').trim();
};

/**
 * .what = scan .agent/ for the linked role slugs
 * .why = filesystem-only role discovery — enroll needs the linked set both as the
 *   default roleset and to validate a `--roles` delta against
 *
 * .note = scans every `repo=` / `role=` dir; returns a unique slug list
 */
const getLinkedRoleSlugs = (input: { gitroot: string }): RoleSlug[] => {
  const agentDir = join(input.gitroot, '.agent');
  if (!existsSync(agentDir)) return [];

  // .note = deliberate mutation — two bounded accumulators local to this scan (a
  //   dedupe set + the ordered result); neither escapes, so no external reader sees it
  const roleSlugs: RoleSlug[] = [];
  const seen = new Set<string>();

  const repoDirs = readdirSync(agentDir).filter((name) =>
    name.startsWith('repo='),
  );

  for (const repoDir of repoDirs) {
    const repoPath = join(agentDir, repoDir);
    const roleDirs = readdirSync(repoPath).filter((name) =>
      name.startsWith('role='),
    );
    for (const roleDir of roleDirs) {
      const roleSlug = roleDir.replace('role=', '');
      if (!seen.has(roleSlug)) {
        seen.add(roleSlug);
        roleSlugs.push(roleSlug);
      }
    }
  }

  return roleSlugs;
};

/**
 * .what = validate an `--as` value and pull out the clone slug it names
 * .why = `--as` names the CLONE (the `@:` grain, mandated in address form). we
 *   route it through asCloneRef so a dropped `@:` marker fails loud with a
 *   did-you-mean, then bound the slug to the safe on-disk charset
 *
 * .note = a uuid-shaped `@:` body parses as a serial, and every reach path reads a
 *   uuid as a serial — so a uuid-shaped handle would be unreachable. we reject it
 *   here, at mint time, rather than let it fail loud only when a caller tries to
 *   reach it (asCloneRef is the ONE predicate that tells the two shapes apart)
 */
const asValidatedSlug = (input: { as: string }): string => {
  const ref = asCloneRef({ raw: input.as });

  // a uuid-shaped `--as` body parses as a SERIAL, and say/get/list all read a uuid
  // as a serial — so a slug of that shape would never match this clone by its own
  // address (it never equals a real serial). reject at mint time, name the fix
  if (ref.by === 'serial')
    throw new ConstraintError(
      `--as '${input.as}' is uuid-shaped, which reads as a serial — a clone named this way would be unreachable`,
      {
        as: input.as,
        hint: 'pick a non-uuid handle, e.g. --as @:driver',
      },
    );

  const { slug } = ref;
  if (!isSafeCloneSlug({ slug }))
    throw new ConstraintError(`--as slug '${slug}' is not a safe handle`, {
      as: input.as,
      slug,
      hint: 'use lowercase letters, digits, and - . _ (e.g. --as @:driver)',
    });
  return slug;
};

/**
 * .what = turn the optional `--roles` value into a validated enrollment spec
 * .why = an absent `--roles` means "the default roleset" (an incremental spec with
 *   no deltas); a present one is tokenized through the one shared grammar, guarded
 *   against the unquoted space form that commander would mangle
 */
const asEnrollmentSpec = (input: {
  rolesSpec: string | undefined;
  rawArgs: string[];
  rolesLinked: RoleSlug[];
  brain: string;
}): BrainCliEnrollmentSpec => {
  // absent → take the default roleset unchanged
  if (input.rolesSpec === undefined) return { mode: 'incremental', deltas: [] };

  // fail loud on the unquoted multi-delta space form: enroll's `--roles` is
  // single-valued, so a second space-separated role is left raw and commander
  // mangles it — guide the user to the comma form instead of a cryptic miss
  const collision = getRolesSpaceFormCollision({
    rawArgs: input.rawArgs,
    rolesLinked: input.rolesLinked,
  });
  if (collision)
    throw new ConstraintError(
      `enroll's --roles takes a single spec; saw an extra role token '${collision}' as a separate argument. to enroll multiple roles, separate them with commas (e.g. --roles -driver,-reviewer) or quote the space form (--roles "-driver -reviewer")`,
      // decode the argv sentinel before it reaches the error metadata, so the
      // human sees `-driver`, never the raw `\u0000driver` artifact
      {
        brain: input.brain,
        rolesSpec: getDecodedRoleDeltaToken({ token: input.rolesSpec }),
        collision,
      },
    );

  // flatten via the shared tokenizer (accepts the comma + quoted-space forms,
  // decodes the argv sentinel so `-role` survives), then parse the grammar
  const tokens = getRoleDeltaTokens({ raw: [input.rolesSpec] });
  return parseBrainCliEnrollmentSpec({ tokens });
};

/**
 * .what = enroll a brain: ensure the anonymous actor, findsert a clone through the
 *   managed pty (socket + history), and forward the child's exit
 * .why = this IS the invisible hot path — the human sees the brain open exactly as
 *   before, while a durable, addressable clone is left behind for crons/comms
 */
const performEnroll = async (input: {
  positionalBrain: BrainSlug | null;
  flagBrain: BrainSlug | null;
  rolesSpec: string | undefined;
  as: string | undefined;
  reason: string | undefined;
  noSocket: boolean;
  /** hold the clone in the foreground, mirrored into this terminal */
  watch: boolean;
  /** hand back the clone's address and exit; the clone stays reachable */
  async: boolean;
  /** hold until the child answers its prompt and exits; forward its exit code */
  await: boolean;
  outputRaw: string | undefined;
  gitroot: string;
}): Promise<void> => {
  const mode = asCliOutputMode({ raw: input.outputRaw });
  const repoPath = getOneRepoPath({ from: input.gitroot });

  // fail loud if the repo was never initialized (a distinct, more-helpful message
  // than the roles-linked check below — "never ran link" vs "linked but empty")
  if (!existsSync(join(repoPath, '.agent')))
    throw new ConstraintError('no .agent/ found in this repo', {
      gitroot: repoPath,
      hint: 'run `rhachet roles link` first to initialize',
    });

  // fail loud if roles were never linked — the brain would open role-less
  const rolesLinked = getLinkedRoleSlugs({ gitroot: repoPath });
  if (rolesLinked.length === 0)
    throw new ConstraintError('no roles found in .agent/', {
      gitroot: repoPath,
      hint: 'run `rhachet roles link` first to link roles',
    });

  // one brain from the three forms (absent → default, flag, positional)
  const brain = computeBrainCliInput({
    positional: input.positionalBrain,
    flag: input.flagBrain,
    default: DEFAULT_BRAIN,
  });

  // the roleset: an absent `--roles` takes the linked default; a present one patches it
  const rawArgs = getRawArgsAfterEnroll();
  const spec = asEnrollmentSpec({
    rolesSpec: input.rolesSpec,
    rawArgs,
    rolesLinked,
    brain,
  });
  const enrollment = computeBrainCliEnrollment({
    brain,
    spec,
    rolesDefault: rolesLinked,
    rolesLinked,
  });

  // the `--as` handle (optional) — validated to the safe clone-slug charset
  const slug =
    input.as === undefined ? null : asValidatedSlug({ as: input.as });

  // the motive for the audit log — `@stdin` pulls it off the pipe. an interactive
  // tty with `@stdin` gets a hint so a human is not left unsure why it waits
  // (parity with `say --what @stdin`, criteria usecase.11 addendum 6)
  if (input.reason === '@stdin' && process.stdin.isTTY)
    console.error(
      'ℹ reason expected on stdin — pipe it in, or pass --reason <text>',
    );
  const reason =
    input.reason === '@stdin' ? await readStdin() : (input.reason ?? null);

  // write the per-enrollment config, then derive the child command + passthrough
  const { configPath } = await genBrainCliConfigArtifact({
    enrollment,
    repoPath,
  });
  const { command } = getSupportedBrainCommand({ brain: enrollment.brain });

  // 🔴 the passthrough is bound to a name rather than inlined, because the enroll MODE
  //   reads it too: a print flag in here means the invocation owes its caller an answer
  //   (`isBrainCliPrintMode`). one derivation, one source — a second read of `rawArgs` at
  //   the mode site could disagree with the tokens the child actually received
  const passthrough = getBrainCliPassthroughArgs({
    args: rawArgs,
    positionalBrain: input.positionalBrain,
  });
  const args = asBrainCliSpawnArgs({ configPath, passthrough });

  // where in the enroll chain the clone this call mints would sit — 0 for a human's
  // own clone, 1 for a peer that clone enrolls. an over-budget enroll is refused
  // BEFORE any dir or child exists, so a chain never half-forms
  const depth = asCloneEnrollDepth({ env: process.env });
  if (depth > CLONE_ENROLL_DEPTH_MAX)
    throw new ConstraintError('clone enroll depth budget spent', {
      depthRequested: depth,
      depthMax: CLONE_ENROLL_DEPTH_MAX,
      hint: `a clone at depth ${depth - 1} may not enroll another — ask the clone that enrolled you, or a human, to stand this one up`,
    });

  // what this enroll DOES with the child — derived from nature, and narrowed by whichever
  // of the three modes the caller stated. a `watch` enroll mirrors the brain into this
  // terminal and holds it in the foreground; an `async` enroll hands back the address and
  // exits; an `await` enroll awaits the one answer a print-mode child owes, then forwards
  // its exit code.
  //
  // 🔴 .why the ask is read by a transformer = the cli carries the axis as three
  //   booleans, and a ternary chain over them resolves a clash by precedence — so
  //   `--watch --async` returned `watch` and dropped the other flag with no signal.
  //   `asCloneEnrollModeAsked` refuses the clash by name instead
  //
  // 🔴 .why this is derived BEFORE the spawn and forwarded rather than re-read = a
  //   second `process.stdout.isTTY` read at the exit branch could disagree with the
  //   one that picked the host, and the pair would then mirror to a terminal it did
  //   not await, or await a child it never mirrored
  //   (`define.invariant.clone-attendance-is-a-mode-never-a-reach`)
  const watchMode = computeCloneEnrollMode({
    tty: !!process.stdout.isTTY,
    asked: asCloneEnrollModeAsked({
      watch: input.watch,
      async: input.async,
      await: input.await,
    }),
    printMode: isBrainCliPrintMode({ passthrough }),
  });

  // are WE the detached host, or the caller that must stand one up?
  const isDetachedHost = process.env[CLONE_ENV_KEYS.hostDetached] !== undefined;

  // 🔴 the caller's half of an `--async` enroll: stand up a host, report the address
  //   it gives back, and exit. a mere `return` here would NOT detach — the pty master
  //   and the reach socket are live handles, so node would hold this process open on
  //   a session nobody watches (`genCloneEnrollDetached` carries the full why)
  if (watchMode === 'async' && !isDetachedHost) {
    const detached = await genCloneEnrollDetached({
      execPath: process.argv[0]!,
      // 🔴 the argv is replayed with the motive RESOLVED, never as `@stdin`. this
      //   caller already drained the pipe above, and the host is spawned with
      //   `stdin: 'ignore'` — so a verbatim replay hands the host a flag it can only
      //   answer with an empty read, and the audit records no motive at all. the pipe
      //   is the one input the host cannot re-derive, so the caller must hand it over
      argv: asCloneDetachHostArgv({ argv: process.argv.slice(1), reason }),
      cwd: repoPath,
      timeoutMs: CLONE_ENROLL_DETACH_TIMEOUT_MS,
    });

    // 🔴 the host REFUSED, and its own report is already on this process's stderr —
    //   it inherited the stream, so a human read the tree frame and a machine read the
    //   json, in the exact shape an attended enroll prints. the caller's one duty left
    //   is to wear the host's exit code. to add a line here would double-report a
    //   failure that was rendered once, correctly
    if (detached.outcome === 'spoke') {
      process.exitCode = detached.code;
      return;
    }

    // the host's handoff is already the machine shape, so a json caller gets it
    // verbatim — one owner of that line's contents, never a re-render that could
    // disagree with what the host actually stood up
    if (mode === 'json') console.log(detached.handoff);
    if (mode === 'tree') {
      const address = asCloneAddressFromHandoff({ handoff: detached.handoff });

      // 🔴 a REUSE renders as a reuse, never as an enroll. this branch sits ABOVE the
      //   live-slug check (the host runs that), so the caller only learns what happened
      //   from the outcome the host reported — and a reuse spawned no billed brain, so
      //   a breadcrumb that read "clone enrolled" would misreport the one fact a human
      //   watches this command for. the line is the SAME one the attended path prints
      //   (below), so the two modes agree word for word
      if (address.outcome === 'reused') {
        console.error(
          `♻ reused the live clone that already answers to @:${address.slug ?? slug} (no new brain spawned)`,
        );
        return;
      }

      console.error('');
      console.error(
        asCloneReachBreadcrumb({
          slug: address.slug,
          serial: address.serial,
          reachable: address.socketEligible,
        }),
      );
      console.error('');
    }
    return;
  }

  // findsert the clone: reuse a live slug, rebind a dead one, or bake fresh
  const result = await genCloneOndisk({
    repoPath,
    brain: enrollment.brain,
    roles: enrollment.roles,
    delta: input.rolesSpec ?? null,
    reason,
    command,
    args,
    cwd: repoPath,
    slug,
    mode: watchMode,
    noSocket: input.noSocket,
    depth,
  });

  // a live-slug reuse spawns no child — report it and return (no exit to forward).
  // a `--output json` caller (the idempotent-cron-retry path) still gets the
  // machine handoff: the SAME shape a fresh spawn emits, so a supervisor reads the
  // reused clone's serial + address with no second command, never a blank stdout
  if (result.spawn === null) {
    // machine caller: emit the same handoff shape a fresh spawn does, then return.
    // COMPACT single-line json BY DESIGN (unlike the one-shot list/say/get views,
    // which pretty-print): an enroll SPAWNS a child and keeps its stdout stream
    // open, so a supervisor reads this handoff off the live stream by a
    // single-line marker (`/{"outcome":…}/`). a pretty-printed multi-line object
    // would break that line-oriented read — so enroll's handoff stays one line
    // a detached HOST emits the handoff whatever the caller's output mode — that
    // line is how its caller learns the address, so it is the host's obligation
    // rather than a render preference
    if (mode === 'json' || isDetachedHost) {
      console.log(
        JSON.stringify({
          outcome: result.outcome,
          serial: result.clone.serial,
          slug,
          socketEligible: result.clone.socketEligible,
        }),
      );
      return;
    }

    // human caller: report the reuse and return (no child, so no exit to forward)
    console.error(
      `♻ reused the live clone that already answers to @:${slug} (no new brain spawned)`,
    );
    return;
  }

  // a bare create-always enroll can accrue billed brains — count the live clones
  // of this actor and, past the soft threshold, make the accrual visible
  const hash = genEnrollmentHash({
    brain: enrollment.brain,
    roles: enrollment.roles,
  });
  const actorDir = getActorOndiskDir({ repoPath, hash });
  const actorsRoot = getActorsRootDir({ repoPath });
  const liveCount = await getOneCloneLiveCountForActor({
    actorDir,
    actorsRoot,
    repoPath,
    actorHash: hash,
  });
  const accrual = computeCloneAccrualWarn({
    liveCount,
    threshold: CLONE_ACCRUAL_THRESHOLD,
  });

  const serial = result.clone.serial;

  // machine handoff: emit the clone's address as parseable json to stdout, so a
  // supervisor/cron reads the serial it needs to say/get, with no second command.
  // COMPACT single-line BY DESIGN — see the reuse-branch note above: the child's
  // stdout stream stays open, so the supervisor greps this handoff off the live
  // stream by a single-line marker; a multi-line pretty-print would break it
  if (mode === 'json' || isDetachedHost)
    console.log(
      JSON.stringify({
        outcome: result.outcome,
        serial,
        slug,
        socketEligible: result.clone.socketEligible,
        ...(accrual.warn ? { accrualWarn: accrual } : {}),
      }),
    );

  // human breadcrumb (tree output only): an enroll is not a dead end — confirm the
  // clone enrolled and show the address that reaches it later, with no `clone list`
  //
  // .why the text lives in `asCloneReachBreadcrumb` = one owner for a human-faced
  //   line, one exact-text clamp against drift, and the invoker stays a narrative
  //   (rule.require.named-transformers). that file holds the full etymology: why a
  //   NAMED enroll gets it too, why a treestruct, and why `😶`
  //
  // .why BOTH slug and serial are handed over, rather than one resolved address =
  //   which of the two to show, and how to shorten the serial, are that value's own
  //   decisions — so they are clamped by its own rows. a `slug ?? shorten(serial)`
  //   here would be decode-friction in an orchestrator, and would move a real
  //   guarantee into a line no unit test reads
  //   (rule.forbid.decode-friction-in-orchestrators)
  //
  // .why the blank line each side = the brain's own mirror output follows at once,
  //   so with no pad the breadcrumb is swallowed by the wall of text under it. the
  //   pad is the EMIT's, never the value's — see that file's `.note`
  // a detached host renders no human line — nobody reads its stdout but its caller,
  // which renders the breadcrumb itself off the handoff
  if (mode === 'tree' && !isDetachedHost) {
    console.error('');
    console.error(
      asCloneReachBreadcrumb({
        slug,
        serial,
        // 🚨 the breadcrumb reads the SAME flag the json handoff reports above, so the two
        //   renders of one enroll cannot disagree about whether the clone can hear
        reachable: result.clone.socketEligible,
      }),
    );
    console.error('');
  }
  if (mode === 'tree' && !isDetachedHost && accrual.warn)
    console.error(
      asCloneAccrualWarnLine({ liveCount: accrual.liveCount, actorHash: hash }),
    );

  // 🔴 a detached HOST must not await the child either — a brain-cli does not exit,
  //   so `waitForExit` would never settle (the third failure of the 2026-09-16
  //   incident, `define.invariant.clone-attendance-is-a-mode-never-a-reach`). the
  //   host simply RETURNS and stays alive: the pty master and the reach socket are
  //   live handles, so node holds its loop open for exactly as long as the clone
  //   lives. that hold is the host's whole job
  if (watchMode === 'async') return;

  // a `watch` or `await` enroll holds the child and forwards its exit code — one
  // owner of process lifecycle.
  //
  // 🔴 .why an `await` lands here and not in the branch above = the comment above is
  //   true of a SESSION and false of a print-mode child. *"a brain-cli does not exit"*
  //   holds only while it has no prompt to finish; `-p` gives it one, so it answers and
  //   exits, and that exit is the whole point of the invocation. to detach from it
  //   returns a banner where the answer was owed — the measured defect that broke this
  //   route's own l3 review lanes (`isBrainCliPrintMode`)
  const code = await result.spawn.waitForExit;
  process.exit(code);
};

/**
 * .what = register the `enroll` command
 * .why = spawn a brain cli as a managed, addressable clone with customized roles
 *
 * .note = `--roles` spec: mechanic (replace), +architect (append), -driver (subtract)
 * .note = all non-enroll args pass through to the brain cli
 */
export const invokeEnroll = ({ program }: { program: Command }): void => {
  program
    .command('enroll [brain]')
    .description('enroll a brain cli as a managed, addressable clone')
    .option('--brain <brain>', 'the brain to enroll (alias of the positional)')
    .option(
      '-r, --roles <spec>',
      'roles to enroll — a single spec (e.g. mechanic, +architect, -driver). for multiple use the comma form (--roles -driver,-reviewer) or quote the space form (--roles "-driver -reviewer")',
    )
    .option('--as <address>', 'name the clone with a stable handle (@:<slug>)')
    .option('--no-socket', 'enroll without a managed reach socket')
    .option('--reason <text>', 'why this enrollment happened (or @stdin)')
    // how the clone is WATCHED, never whether it can be REACHED — both modes take a
    // pty, a socket, and answer a `say`
    // (`define.invariant.clone-attendance-is-a-mode-never-a-reach`)
    .option(
      '--watch',
      'hold the clone in the foreground (default at a terminal)',
    )
    .option(
      '--async',
      'report the clone address and exit (default with no terminal)',
    )
    // the third value of the mode triple. it was DERIVABLE from a print flag and not
    // statable for a release, which taught the surface rather than the vocabulary —
    // a caller who wanted "hand it this prompt and wait" had to know that `-p` implies
    // the mode (`term=enroll.mode`, `computeCloneEnrollMode`)
    .option(
      '--await',
      'hold until the clone answers its prompt and exits, then forward its exit code (default with a prompt, e.g. -p "<prompt>")',
    )
    .option('--output <mode>', 'output mode: tree (default) or json', 'tree')
    // built-in --help is off so `rhx enroll <brain> --help` forwards to the brain
    // (the wish's passthrough mandate). but a bare `rhx enroll --help` (no brain)
    // would then be a dead end — so we render enroll's OWN help in that one case
    // (handled in the action): the flags stay discoverable AND passthrough holds
    // (rule.require.help-on-demand)
    .helpOption(false)
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .action(
      async (
        brain: string | undefined,
        opts: {
          brain?: string;
          roles?: string;
          as?: string;
          socket?: boolean;
          reason?: string;
          watch?: boolean;
          async?: boolean;
          await?: boolean;
          output?: string;
        },
        command: Command,
      ) => {
        // a bare `rhx enroll --help`/`-h` (help as the FIRST token after `enroll`,
        // with no brain before it) is a request to LEARN enroll, not to
        // enroll-then-forward-help: render enroll's own usage (its registered
        // flags) and exit clean. once a brain comes first (`enroll <brain>
        // --help`), the --help belongs to the brain and passes through untouched.
        // .note = we read the raw tail (the same source the brain passthrough
        //   uses), NOT the `brain` param — commander buckets a first-token `--help`
        //   into the `[brain]` operand under passThroughOptions, so the param is
        //   `'--help'`, never undefined; the tail is the unambiguous signal
        const tailAfterEnroll = getRawArgsAfterEnroll();
        const helpFirst =
          tailAfterEnroll[0] === '--help' || tailAfterEnroll[0] === '-h';
        if (helpFirst && opts.brain === undefined) {
          process.stdout.write(command.helpInformation());
          return;
        }

        await withCliOutputErrors({
          outputRaw: opts.output,
          run: async () => {
            const gitroot = process.cwd();

            await performEnroll({
              positionalBrain: brain ?? null,
              flagBrain: opts.brain ?? null,
              rolesSpec: opts.roles,
              as: opts.as,
              reason: opts.reason,
              // commander maps --no-socket to opts.socket === false
              noSocket: opts.socket === false,
              watch: opts.watch === true,
              async: opts.async === true,
              await: opts.await === true,
              outputRaw: opts.output,
              gitroot,
            });
          },
        });
      },
    );
};
