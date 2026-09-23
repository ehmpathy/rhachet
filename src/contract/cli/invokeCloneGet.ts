import type { Command } from 'commander';
import { ConstraintError, MalfunctionError } from 'helpful-errors';

import { getActorOndiskDir } from '@src/domain.operations/actor/enrolled/getActorOndiskDir';
import { getActorsRootDir } from '@src/domain.operations/actor/enrolled/getActorsRootDir';
import { getOneActorOndiskByHash } from '@src/domain.operations/actor/enrolled/getOneActorOndiskByHash';
import { asCloneAddressHuman } from '@src/domain.operations/clone/asCloneAddressHuman';
import { asCloneReachError } from '@src/domain.operations/clone/asCloneReachError';
import { asCloneRef } from '@src/domain.operations/clone/asCloneRef';
import type { CloneConversationFormat } from '@src/domain.operations/clone/cli/asCloneConversationText';
import { asCloneConversationText } from '@src/domain.operations/clone/cli/asCloneConversationText';
import {
  asCloneGetWhat,
  isCloneGetWhatLive,
} from '@src/domain.operations/clone/cli/asCloneGetWhat';
import { asCloneInputSurfaceText } from '@src/domain.operations/clone/cli/asCloneInputSurfaceText';
import { genCloneHistoryLink } from '@src/domain.operations/clone/genCloneHistoryLink';
import { getBrainTranscriptDir } from '@src/domain.operations/clone/getBrainTranscriptDir';
import { getCloneDir } from '@src/domain.operations/clone/getCloneDir';
import { getCloneOutput } from '@src/domain.operations/clone/getCloneOutput';
import { getCloneReachState } from '@src/domain.operations/clone/getCloneReachState';
import { getCloneSocketPath } from '@src/domain.operations/clone/getCloneSocketPath';
import { getOneCloneByRef } from '@src/domain.operations/clone/getOneCloneByRef';
import { getCloneInputStateOrBlind } from '@src/domain.operations/clone/socket/getCloneInputStateOrBlind';
import { getHomeHash } from '@src/infra/host/getHomeHash';
import { getOneRepoPath } from '@src/infra/host/getOneRepoPath';

import { asCliOutputMode } from './asCliOutputMode';
import { renderCliOutput } from './renderCliOutput';
import { withCliOutputErrors } from './withCliOutputErrors';

/**
 * .what = parse the `--tail` flag into a bound or the `all` sentinel
 * .why = a caller bounds how much history it reads; `all` reads every logical
 *   reply, a positive integer the last N, and anything else fails loud
 */
const asTailBound = (input: { raw: string }): number | 'all' => {
  if (input.raw === 'all') return 'all';
  const n = Number(input.raw);
  if (!Number.isInteger(n) || n < 0)
    throw new ConstraintError(`invalid --tail "${input.raw}"`, {
      hint: 'use a non-negative integer (e.g. --tail 20) or --tail all',
    });
  return n;
};

/**
 * .what = parse the `--format` flag into the conversation render mode
 * .why = a human wants the directioned `blocks` view (the default); a comms relay
 *   wants the verbatim `raw` reply stream to forward. any other value fails loud
 */
const asFormat = (input: { raw: string }): CloneConversationFormat => {
  if (input.raw === 'blocks' || input.raw === 'raw') return input.raw;
  throw new ConstraintError(`invalid --format "${input.raw}"`, {
    hint: 'use --format blocks (default, directioned) or --format raw (verbatim replies)',
  });
};

/**
 * .what = register `rhx clone get @:<slug|serial> [--what story|buffer|queue] [--tail N]
 *   [--format blocks|raw]` on the clone group
 * .why =
 *   - `get` observes a clone WITHOUT a terminal takeover (usecase.7), across all three
 *     states of the input triple (define.brain-cli-input-states) — so a caller asks
 *     "where is my message now?" rather than infers it from a dispatch attempt
 *   - `--what story` (the DEFAULT) reads the brain-cli's own transcripts off disk, so it
 *     works on a DEAD clone that has output — no reach probe, no cred gate. this is the
 *     extant behavior, unchanged, so every caller that types the bare command is unaffected
 *   - `--what buffer|queue` reads the two LIVE input surfaces over the clone's socket: the
 *     box a human types into, and the queue that holds what was submitted but unreleased.
 *     these need a LIVE clone (a dead one has no box), so they fail loud with the reach fix
 *   - the default `blocks` tree is human-legible — each turn a `← say` / `→ reply`
 *     header over its body, so a reader tells an inbound dispatch from an outbound
 *     reply. `--format raw` keeps the pipe-clean verbatim reply stream a comms relay
 *     forwards; the warns (a shared-cwd empty, a vanished episode) go to stderr, so
 *     the stdout a relay reads stays clean
 *
 * .note = 🔴 the live reads exist because a classification alone left a human stuck. a say
 *   refused `input-region-dirty` told them THAT their box was occupied and never BY WHAT, so
 *   the only way to look was a second say that may clobber it. that dead end is what
 *   `--what buffer` closes (F15)
 *
 * .note = the live surfaces are an explicit OPT-IN on the wire too: the probe asks for
 *   `content` only when `--what buffer|queue` is named, so a routine `say` probe still
 *   carries a classification and no screen text (the F02/F03 invariant holds by default)
 *
 * .note = an unknown address fails loud, so a caller never mistakes a silent empty
 *   for "the clone stayed silent"
 */
export const invokeCloneGet = ({ clone }: { clone: Command }): void => {
  clone
    .command('get <address>')
    .description("observe a clone's recent output (by @:<slug|serial>)")
    .option(
      '--what <surface>',
      'which surface to read: story (default, the transcript — works on a dead clone) | buffer (the live input box) | queue (submitted but unreleased)',
      'story',
    )
    .option('--tail <n>', 'how many recent messages to show (or all)', '20')
    .option(
      '--format <fmt>',
      'tree render: blocks (default, directioned) or raw (verbatim replies)',
      'blocks',
    )
    .option('--output <mode>', 'output mode: tree (default) or json', 'tree')
    .action(
      async (
        address: string,
        opts: {
          what: string;
          tail: string;
          format: string;
          output?: string;
        },
      ) => {
        await withCliOutputErrors({
          outputRaw: opts.output,
          run: async () => {
            const mode = asCliOutputMode({ raw: opts.output });
            const what = asCloneGetWhat({ raw: opts.what });
            const tail = asTailBound({ raw: opts.tail });
            const format = asFormat({ raw: opts.format });
            const repoPath = getOneRepoPath({ from: process.cwd() });

            // find the clone this address names — unknown = fail loud
            const cloneFound = getOneCloneByRef({
              repoPath,
              ref: asCloneRef({ raw: address }),
            });
            if (cloneFound === null)
              throw new ConstraintError(`no clone answers to '${address}'`, {
                hint: 'list clones with `rhx clone list`',
              });

            const addressShownLive = asCloneAddressHuman(cloneFound);

            // the LIVE branch — the two screen surfaces. it returns EARLY, before the
            // transcript relink + read below: those are the `story` read's own work, and a
            // `--what buffer` that paid for them would relink a history nobody asked for
            if (isCloneGetWhatLive(what)) {
              // a live read needs a live clone: a dead one renders no box, so there is no
              // surface to report. `say` and `get` share this exact failure, so they share its
              // one owner (asCloneReachError) rather than drift two copies of the fix
              const reachState = await getCloneReachState({
                clone: cloneFound,
              });
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

              // `content: true` is the opt-in that carries the two input surfaces back; the
              // needle is omitted since a surface read tallies no caller string. the
              // `OrBlind` wrapper is the one to reach: a transport hiccup degrades to a
              // probe-blind reply the renderer states honestly, never a crash (V7)
              const reply = await getCloneInputStateOrBlind({
                socketPath,
                content: true,
              });

              console.log(
                renderCliOutput({
                  mode,
                  tree: asCloneInputSurfaceText({
                    reply,
                    what,
                    address: addressShownLive,
                  }),
                  data: reply,
                }),
              );
              return;
            }

            // build the clone dir canonically off its own actor ref + serial (the
            // same getCloneDir every writer composes), never by an undo of historyDir
            // via dirname — so the dir shape stays single-owned. the actors root
            // comes off the clone's own actor (canonical), never the cwd
            const cloneDir = getCloneDir({
              actorDir: getActorOndiskDir({
                repoPath: cloneFound.actor.repoPath,
                hash: cloneFound.actor.hash,
              }),
              serial: cloneFound.serial,
            });
            const actorsRoot = getActorsRootDir({
              repoPath: cloneFound.actor.repoPath,
            });

            // re-link any transcript that appeared AFTER spawn — a brain writes its
            // transcript lazily (its process boots after genClone's best-effort
            // spawn-time link already ran), so without this a fresh clone's history
            // stays empty forever. findsert + idempotent: an already-claimed exid is
            // a no-op (genClone.ts note: "a later `get` re-links"). the brain +
            // spawn-cwd come off the actor record, read O(1) by the clone's own hash
            // (not an O(actors) enumerate-then-find scan on this hot reach path)
            const actorRecord = getOneActorOndiskByHash({
              repoPath,
              hash: cloneFound.actor.hash,
            });
            if (actorRecord)
              genCloneHistoryLink({
                cloneDir,
                actorsRoot,
                cwd: cloneFound.actor.repoPath,
                brain: actorRecord.brain,
                spawnedAt: cloneFound.spawnedAt,
              });

            // this clone's OWN transcript dir (its brain + spawn cwd) — the scope the
            // shared-cwd ambiguous-marker read must respect, so a repo-wide marker from
            // an unrelated actor/brain/cwd never yields a false warn. null when the
            // actor record is unreadable or the brain has no transcript layout
            const transcriptDir = actorRecord
              ? getBrainTranscriptDir({
                  brain: actorRecord.brain,
                  cwd: cloneFound.actor.repoPath,
                })
              : null;

            const output = getCloneOutput({
              cloneDir,
              actorsRoot,
              transcriptDir,
              spawnedAt: cloneFound.spawnedAt,
              tail,
            });

            // advisories are tree-only, gated `mode === 'tree'` exactly like every
            // invokeEnroll advisory (socketOmissionReason / breadcrumb / accrual) — a
            // json caller reads the same facts as structured fields on the body
            // (exidsUnreadable / exidsAmbiguous), never unconditional stderr prose
            // it has no contract to parse. for tree, warns go to stderr so the
            // stdout a relay reads stays clean
            //
            // .note = the caution glyph is `🟡`, never a bare `⚠` — `rule.prefer.emoji-language`
            //   forbids a selector-less `⚠` (it renders monochrome on some terminals) and
            //   supersedes `⚠️` itself for new output, since `U+26A0` is
            //   `East_Asian_Width=Ambiguous` and shifts every column to its right
            if (mode === 'tree' && output.exidsUnreadable.length > 0)
              console.error(
                `🟡 ${output.exidsUnreadable.length} episode(s) could not be read (a moved transcript)`,
              );
            if (
              mode === 'tree' &&
              output.messages.length === 0 &&
              output.exidsAmbiguous.length > 0
            )
              console.error(
                '🟡 history is empty because this clone shared a cwd with another at spawn — enroll each in its own worktree to separate their transcripts',
              );
            // a foreign link is warned WHATEVER the message count, unlike the two above:
            // it is not an explanation for a thin read, it is a report that a transcript
            // this clone could not have authored was linked to it — and a partial render
            // would otherwise hide that the history was silently narrowed
            if (mode === 'tree' && output.exidsForeign.length > 0)
              console.error(
                `🟡 ${output.exidsForeign.length} linked transcript(s) predate this clone's spawn, so they are NOT shown — they cannot hold its output`,
              );

            // the header echoes the clone's canonical address — its slug if named, else
            // its human serial (the first uuid segment) — so a reader sees WHOSE talk
            // this is, in a form they can reach again
            const addressShown = asCloneAddressHuman(cloneFound);
            console.log(
              renderCliOutput({
                mode,
                tree: asCloneConversationText(
                  { messages: output.messages, tail, address: addressShown },
                  { format },
                ),
                data: output,
              }),
            );
          },
        });
      },
    );
};
