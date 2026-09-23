import type { Command } from 'commander';
import { ConstraintError, MalfunctionError } from 'helpful-errors';

import { asCloneAddressHuman } from '@src/domain.operations/clone/asCloneAddressHuman';
import { asCloneReachError } from '@src/domain.operations/clone/asCloneReachError';
import { asCloneRef } from '@src/domain.operations/clone/asCloneRef';
import { CLONE_SUBMIT_VERIFY_TIMEOUT_MS } from '@src/domain.operations/clone/constants';
import { genCloneHistoryRelink } from '@src/domain.operations/clone/genCloneHistoryRelink';
import { getCloneReachState } from '@src/domain.operations/clone/getCloneReachState';
import { getCloneSocketPath } from '@src/domain.operations/clone/getCloneSocketPath';
import { getCloneSubmittedCount } from '@src/domain.operations/clone/getCloneSubmittedCount';
import { getOneCloneByRef } from '@src/domain.operations/clone/getOneCloneByRef';
import { isCloneSayToSelf } from '@src/domain.operations/clone/isCloneSayToSelf';
import { asCloneSayAwaitTarget } from '@src/domain.operations/clone/socket/asCloneSayAwaitTarget';
import { asCloneSayRecord } from '@src/domain.operations/clone/socket/asCloneSayRecord';
import { asCloneSayRefusalObservation } from '@src/domain.operations/clone/socket/asCloneSayRefusalObservation';
import { computeCloneSayBaseline } from '@src/domain.operations/clone/socket/computeCloneSayBaseline';
import { computeCloneSayReport } from '@src/domain.operations/clone/socket/computeCloneSayReport';
import { computeCloneSayVerdict } from '@src/domain.operations/clone/socket/computeCloneSayVerdict';
import { getCloneInputStateOrBlind } from '@src/domain.operations/clone/socket/getCloneInputStateOrBlind';
import { getCloneSayObservation } from '@src/domain.operations/clone/socket/getCloneSayObservation';
import { sayClone } from '@src/domain.operations/clone/socket/sayClone';
import { throwCloneSayFailure } from '@src/domain.operations/clone/socket/throwCloneSayFailure';
import { writeCloneSayDebugLog } from '@src/domain.operations/clone/socket/writeCloneSayDebugLog';
import { getHomeHash } from '@src/infra/host/getHomeHash';
import { getOneRepoPath } from '@src/infra/host/getOneRepoPath';
import { CLONE_ENV_KEYS } from '@src/utils/cloneEnvKeys';

import { asCliOutputMode } from './asCliOutputMode';
import { asCloneSayReachFault } from './asCloneSayReachFault';
import { renderCliOutput } from './renderCliOutput';
import { withCliOutputErrors } from './withCliOutputErrors';

/**
 * .what = read the whole stdin as one utf8 string
 * .why = `--what @stdin` lets a payload-heavy or multi-line message arrive on a
 *   pipe, the same clean cli path `git.commit.set -m @stdin` uses
 * .note = WET twin of invokeEnroll's readStdin — that one trims (a motive), this
 *   one preserves the message verbatim (whitespace at the tail can be meaningful).
 *   rule-of-three tripwire: a THIRD invoker that reads @stdin earns a shared
 *   readStdinString({ trim }) transformer; until then the two-site WET is deliberate
 */
const readStdin = async (): Promise<string> => {
  // .note = deliberate mutation — a bounded accumulator local to this read; the
  //   array never escapes readStdin, so no external reader observes the mutation
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf8');
};

/**
 * .what = register `rhx clone say @:<slug|serial> --what <message>` on the clone
 *   group
 * .why =
 *   - this is the dispatch primitive: a cron/comms handler drives a live clone
 *     with no keyboard (usecase.6). the address reaches the SAME clone by slug or
 *     serial (matrix 4 symmetry)
 *   - a dead/unknown address fails LOUD with the fix — never a silent drop
 *     (rule.forbid.failhide) — so a caller always knows a dispatch did not land
 *
 * .note = `--what @stdin` reads the message off a pipe; an interactive tty with
 *   `@stdin` gets a hint so a human is not left wondering why it waits
 */
export const invokeCloneSay = ({ clone }: { clone: Command }): void => {
  clone
    .command('say <address>')
    .description('dispatch a message into a live clone (by @:<slug|serial>)')
    .requiredOption('--what <message>', 'the message to dispatch (or @stdin)')
    .option('--output <mode>', 'output mode: tree (default) or json', 'tree')
    .option(
      '--force',
      "override a dirty input box — DESTRUCTIVE: the write inserts at the cursor and the submit commits the WHOLE box, so the human's uncommitted text rides along as one fused turn. only a dirty region is forceable (never a modal, never an unrecognized screen), and only genuinely TYPED text reads dirty — a brain-drawn ghost suggestion reads clear, so it never needs this flag",
    )
    .option(
      '--await <target>',
      `wait until the message reaches enqueue (default; a release satisfies it too, since release is downstream) or release — bounded by a ${CLONE_SUBMIT_VERIFY_TIMEOUT_MS / 1000}s poll, after which it reports the last state observed (never a hang)`,
      'enqueue',
    )
    .option(
      '--debug',
      'capture the whole decision record — the baseline, every poll cycle, and the exact screen rows the classifier read — even when the say SUCCEEDS (a failure always captures)',
    )
    .action(
      async (
        address: string,
        opts: {
          what: string;
          output?: string;
          force?: boolean;
          await?: string;
          debug?: boolean;
        },
      ) => {
        await withCliOutputErrors({
          outputRaw: opts.output,
          run: async () => {
            const mode = asCliOutputMode({ raw: opts.output });
            const repoPath = getOneRepoPath({ from: process.cwd() });

            // `--force` overrides a dirty input box at the server's dequeue pre-check —
            // and ONLY that refusal (computeCloneDispatchPrecheck orders the two focus
            // refusals first, so a modal has no force path at all)
            //
            // .note = the fusion the help text warns of holds by construction: the write inserts
            //   at the cursor and the submit `\r` commits the whole input box, so any uncommitted
            //   text in it rides along as one turn.
            //   only TYPED (bright) text reaches this path — a brain-drawn ghost suggestion is
            //   drawn dim, so it reads `clear` (genCloneScreenFeed.asBrightOnlyRow) and the write
            //   proceeds unforced
            const force = opts.force === true;

            // `--await` is the caller's target state: `enqueue` (default — the message is
            // at least held above the input line) or `release` (the brain took the turn).
            // a self-say clamps it to `enqueue` below — see the clamp past the clone lookup
            const targetAsked = asCloneSayAwaitTarget({
              raw: opts.await ?? 'enqueue',
            });

            // read the message: literal, or the whole of stdin
            if (opts.what === '@stdin' && process.stdin.isTTY)
              console.error(
                'ℹ awaiting the message on stdin — pipe it in, or pass --what <message>',
              );
            const message =
              opts.what === '@stdin' ? await readStdin() : opts.what;

            // a multi-line message IS supported: asCloneDispatchFrame wraps it in the
            // bracketed-paste markers, so its interior newlines land in the input box as
            // real lines and the whole block commits as ONE turn instead of a truncated
            // first line. the delivery self-verify below still proves the WHOLE message
            // left the input buffer, so a brain that does not honor the paste protocol
            // fails LOUD, never a silent truncation

            // find the clone this address names — unknown = fail loud, never a no-op
            const cloneFound = getOneCloneByRef({
              repoPath,
              ref: asCloneRef({ raw: address }),
            });
            if (cloneFound === null)
              throw new ConstraintError(`no clone answers to '${address}'`, {
                hint: 'list clones with `rhx clone list`',
              });

            // a self-say DISPATCHES like any other, and clamps its await target to
            // `enqueue` — the one knob a self-say cannot reach. `released` needs an empty
            // queue, and the caller's own queue cannot drain until this very say returns
            // (the `clone say` process IS a tool call the brain is mid-way through), so
            // `--await release` would poll the whole bound for an impossible drain
            //
            // 🔴 .note = this once REFUSED the verb outright, on two mechanisms called
            //   `nature` and both refuted by this wish's own later measurements — the full
            //   record is in isCloneSayToSelf's docblock. a self-say is how a clone nudges
            //   itself (a loop) and how it sends itself a client-level slash command, so
            //   the refusal closed a key capability with no wisher call
            const toSelf = isCloneSayToSelf({
              targetSerial: cloneFound.serial,
              callerSerial: process.env[CLONE_ENV_KEYS.serial] ?? null,
            });
            const target = toSelf ? 'enqueue' : targetAsked;
            if (toSelf && targetAsked === 'release')
              console.error(
                'ℹ a self-say awaits `enqueue`, never `release` — your own queue cannot drain while this say runs',
              );

            // a non-live clone cannot take a dispatch — fail loud, name the fix
            const reachState = await getCloneReachState({ clone: cloneFound });
            if (reachState !== 'LIVE')
              throw asCloneReachError({
                reachState,
                cloneHostHash: cloneFound.hostHash,
                currentHostHash: getHomeHash(),
              });

            // a LIVE clone always has a socket path; a null here is a real defect
            const socketPath = getCloneSocketPath({
              serial: cloneFound.serial,
            });
            if (socketPath === null)
              throw new MalfunctionError(
                'a live clone reported no socket path',
                { serial: cloneFound.serial },
              );

            // baseline BEFORE dispatch — every verdict field is a RISE, a post read
            // compared against this pre-dispatch baseline, never a presence (a daemon
            // repeats one text, so a prior tick's echo must not read as this dispatch).
            // relink the transcript, read the pure count, then probe the screen once
            genCloneHistoryRelink({ repoPath, clone: cloneFound });
            const baselineTranscriptCount = getCloneSubmittedCount({
              clone: cloneFound,
              message,
            });
            // ⚠️ the baseline probe never throws: a transient probe fault (a socket hiccup,
            //   a reply timeout) must NOT crash a say before it even dispatches — that is the
            //   false-failure-on-a-landed-message class this wish exists to kill, one edge
            //   earlier than the observe loop. getCloneInputStateOrBlind degrades a fault to a
            //   probe-blind baseline, which computeCloneSayBaseline collapses to an UNMEASURED
            //   baseline (null counts, never zero: a rise cannot be asserted against it, so a
            //   prior tick's echo cannot mint a false `enqueued` — r006-i010-b1). a probe-blind
            //   dispatch verifies by transcript regardless (case=4)
            //
            // `debug: true` attaches the raw grid to this reply. it costs one screen's
            // rows over a local socket, and it buys the BEFORE half of the failure log —
            // without it a reader sees the post-dispatch screen with no prior screen to
            // diff it against, which is half the instrument
            const baselineProbe = await getCloneInputStateOrBlind({
              socketPath,
              message,
              debug: true,
            });
            const baseline = computeCloneSayBaseline({
              transcriptCount: baselineTranscriptCount,
              probe: baselineProbe,
            });

            // dispatch: bulk-write the whole message in one pty write, then submit it
            // with a separate `\r`. `force` overrides a dirty box at the server's dequeue
            // pre-check. a `withheld` refusal RESOLVES (a verdict), a reach fault throws
            const dispatchedAtMs = Date.now();
            // one stamp, read by BOTH capture paths (the reach fault below, and the verdict
            // capture further down) — so a fault and a verdict for one dispatch cannot
            // disagree about when it went out
            const dispatchedAt = new Date(dispatchedAtMs);
            const dispatchedAtStamp = dispatchedAt.toISOString();
            // 🔴 the throw is CAUGHT solely to capture, and re-raised unchanged. every one of
            //   the six verdicts is decided downstream of this call, so a reach fault (`wedged`,
            //   `exited-mid-dispatch`) bypasses the verdict machinery AND the capture below it
            //   — measured 2026-09-18, where a joker run wedged twice at exactly 30000ms while
            //   both messages demonstrably LANDED and wrote no diagnostic at all. that left the
            //   one failure class that blocks a reliable say as the one class with no instrument
            //
            // .note = this is NOT a failhide. the error is re-thrown byte for byte, so the exit
            //   code, the stderr text, and the machine channel are untouched (V13); the catch
            //   adds a file append and no more. the append itself never throws — the writer
            //   degrades a write fault to `null` and traces it
            const dispatch = await (async () => {
              try {
                return await sayClone({ socketPath, message, force });
              } catch (error) {
                writeCloneSayDebugLog({
                  repoPath,
                  at: dispatchedAt,
                  capture: {
                    at: dispatchedAtStamp,
                    address: asCloneAddressHuman(cloneFound),
                    serial: cloneFound.serial,
                    slug: cloneFound.slug,
                    message,
                    force,
                    target,
                    timeoutMs: CLONE_SUBMIT_VERIFY_TIMEOUT_MS,
                    baseline,
                    baselineReply: baselineProbe,
                    fault: asCloneSayReachFault({
                      error,
                      sinceDispatchMs: Date.now() - dispatchedAtMs,
                    }),
                  },
                });
                throw error;
              }
            })();

            // observe where the message sits — a withheld refusal skips the observe (its
            // screen is null in the verdict); a delivered dispatch polls the transcript
            // (released) and the screen (enqueued / buffered) until the target or the bound.
            // the observe also hands back its raw per-cycle TRAIL, which only the failure
            // debug log reads — a refusal never polls, so its trail is empty
            const observed = dispatch.delivered
              ? await getCloneSayObservation({
                  repoPath,
                  clone: cloneFound,
                  socketPath,
                  message,
                  baseline,
                  target,
                  timeoutMs: CLONE_SUBMIT_VERIFY_TIMEOUT_MS,
                  dispatchedAtMs,
                })
              : {
                  observation: asCloneSayRefusalObservation({
                    refusal: dispatch.refusal,
                  }),
                  trail: [],
                };
            const observation = observed.observation;

            // decide the ONE verdict, then its rendered report (success line or failure)
            const outcome = computeCloneSayVerdict(observation);
            const addressShown = asCloneAddressHuman(cloneFound);
            // the message rides in so the `enqueued` advisory can tell a PROMPT (genuinely held
            // behind the active turn) from a `/…` CLIENT command (consumed at submit, never queued)
            const report = computeCloneSayReport({
              outcome,
              addressShown,
              message,
            });

            // the machine channel — additive: `delivered` keeps its extant sense (bytes
            // handed to the pty) beside the verdict a retry policy reads, its reason slug,
            // and the probe strength. shared by BOTH channels (stdout record / error metadata)
            const record = asCloneSayRecord({ outcome, clone: cloneFound });

            // the diagnostic stream: append the whole decision record — the baseline, every
            // cycle's raw read, the decided outcome, and the exact grid rows the classifier
            // saw — to a gitignored day log. a verdict is one word about many inputs, and
            // without them two rival causes of the same residual cannot be parted from the
            // CLI at all (measured 2026-09-16, F15). the write never throws and touches
            // neither stdout nor stderr, so no snapshot and no machine-channel consumer moves
            //
            // .note = 🔴 it captures on a FAILURE always, and on a SUCCESS only under
            //   `--debug`. the success half is not symmetry for its own sake: a cure to the
            //   screen read is PROVEN by a success against the exact screen that used to
            //   refuse, and a failure-only capture leaves that success with no evidence at
            //   all. measured 2026-09-18 — the cursor-cell cure landed and could not be shown
            //   to work on a live peer, because every post-cure say returned `released` and
            //   captured naught. it stays OPT-IN on the happy path so a daemon's steady
            //   traffic grows no log nobody reads (the default is byte-for-byte unchanged)
            const captured =
              report.channel === 'failure' || opts.debug === true
                ? writeCloneSayDebugLog({
                    repoPath,
                    at: dispatchedAt,
                    capture: {
                      at: dispatchedAtStamp,
                      address: addressShown,
                      serial: cloneFound.serial,
                      slug: cloneFound.slug,
                      message,
                      force,
                      target,
                      timeoutMs: CLONE_SUBMIT_VERIFY_TIMEOUT_MS,
                      baseline,
                      baselineReply: baselineProbe,
                      observation,
                      outcome,
                      trail: observed.trail,
                    },
                  })
                : null;

            // failure verdicts land on stderr with the class that sets the exit code —
            // the trio rides the thrown error's metadata, which asCliErrorJson projects
            // verbatim, so a `--output json` consumer reads verdict / reason / probe there
            if (report.channel === 'failure')
              return throwCloneSayFailure({
                report,
                record,
                debugLogPath: captured,
              });

            // a `--debug` capture on a SUCCESS must name where it landed — a silent write is a
            // diagnostic nobody can find (rule.require.status-feedback). it goes to STDERR so
            // the success line stays byte-for-byte what it was (V13) and a `--output json`
            // consumer's stdout parses unchanged. a failure carries the path in its metadata
            if (captured !== null)
              console.error(`🔍 clone say capture appended → ${captured}`);

            // status feedback (rule.require.status-feedback): the clone talk header
            // (rule.prefer.emoji-language) — `😶` the clone face, `🎙️` the say artifact.
            // `said to <addr>` (released) is byte-for-byte the extant success line (V13);
            // `enqueued for <addr>` is the distinct held-above-the-line verdict
            console.log(
              renderCliOutput({ mode, tree: report.tree, data: record }),
            );
          },
        });
      },
    );
};
