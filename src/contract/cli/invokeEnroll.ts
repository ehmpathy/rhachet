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
import { asCloneRef } from '@src/domain.operations/clone/asCloneRef';
import { computeCloneAccrualWarn } from '@src/domain.operations/clone/computeCloneAccrualWarn';
import { genCloneOndisk } from '@src/domain.operations/clone/genCloneOndisk';
import { getOneCloneLiveCountForActor } from '@src/domain.operations/clone/getOneCloneLiveCountForActor';
import { isSafeCloneSlug } from '@src/domain.operations/clone/isSafeCloneSlug';
import { asBrainCliSpawnArgs } from '@src/domain.operations/enroll/asBrainCliSpawnArgs';
import { computeBrainCliEnrollment } from '@src/domain.operations/enroll/computeBrainCliEnrollment';
import { computeBrainCliInput } from '@src/domain.operations/enroll/computeBrainCliInput';
import { genBrainCliConfigArtifact } from '@src/domain.operations/enroll/genBrainCliConfigArtifact';
import { getBrainCliPassthroughArgs } from '@src/domain.operations/enroll/getBrainCliPassthroughArgs';
import { getRolesSpaceFormCollision } from '@src/domain.operations/enroll/getRolesSpaceFormCollision';
import { parseBrainCliEnrollmentSpec } from '@src/domain.operations/enroll/parseBrainCliEnrollmentSpec';
import { getDecodedRoleDeltaToken } from '@src/domain.operations/roles/deltas/getDecodedRoleDeltaToken';
import { getRoleDeltaTokens } from '@src/domain.operations/roles/deltas/getRoleDeltaTokens';
import { getOneRepoPath } from '@src/infra/host/getOneRepoPath';
import { CLONE_ACCRUAL_THRESHOLD } from '@src/utils/cloneAccrualThreshold';

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
  const args = asBrainCliSpawnArgs({
    configPath,
    passthrough: getBrainCliPassthroughArgs({
      args: rawArgs,
      positionalBrain: input.positionalBrain,
    }),
  });

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
    interactive: !!process.stdout.isTTY,
    noSocket: input.noSocket,
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
    if (mode === 'json') {
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
  if (mode === 'json')
    console.log(
      JSON.stringify({
        outcome: result.outcome,
        serial,
        slug,
        socketEligible: result.clone.socketEligible,
        ...(accrual.warn ? { accrualWarn: accrual } : {}),
      }),
    );

  // human breadcrumb (tree output only): a bare enroll (no --as) is not a dead
  // end — show the clone's own address so the human can reach it later without a
  // `clone list`, and surface the accrual advisory past the soft threshold
  if (mode === 'tree' && slug === null)
    console.error(`🔌 reach this clone: rhx clone say @:${serial} --what "…"`);
  if (mode === 'tree' && accrual.warn)
    console.error(
      asCloneAccrualWarnLine({ liveCount: accrual.liveCount, actorHash: hash }),
    );

  // forward the child's exit code — one owner of process lifecycle
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
              outputRaw: opts.output,
              gitroot,
            });
          },
        });
      },
    );
};
