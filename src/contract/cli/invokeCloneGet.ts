import type { Command } from 'commander';
import { ConstraintError } from 'helpful-errors';

import { getActorOndiskDir } from '@src/domain.operations/actor/enrolled/getActorOndiskDir';
import { getActorsRootDir } from '@src/domain.operations/actor/enrolled/getActorsRootDir';
import { getOneActorOndiskByHash } from '@src/domain.operations/actor/enrolled/getOneActorOndiskByHash';
import { asCloneRef } from '@src/domain.operations/clone/asCloneRef';
import { asCloneSerialHuman } from '@src/domain.operations/clone/asCloneSerialHuman';
import type { CloneConversationFormat } from '@src/domain.operations/clone/cli/asCloneConversationText';
import { asCloneConversationText } from '@src/domain.operations/clone/cli/asCloneConversationText';
import { genCloneHistoryLink } from '@src/domain.operations/clone/genCloneHistoryLink';
import { getBrainTranscriptDir } from '@src/domain.operations/clone/getBrainTranscriptDir';
import { getCloneDir } from '@src/domain.operations/clone/getCloneDir';
import { getCloneOutput } from '@src/domain.operations/clone/getCloneOutput';
import { getOneCloneByRef } from '@src/domain.operations/clone/getOneCloneByRef';
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
 * .what = register `rhx clone get @:<slug|serial> [--tail N] [--format blocks|raw]`
 *   on the clone group
 * .why =
 *   - `get` observes a clone's recent CONVERSATION without a terminal takeover
 *     (usecase.7). it reads the brain-cli's own transcripts, so it works on a DEAD
 *     clone that has output — no reach probe, no cred gate
 *   - the default `blocks` tree is human-legible — each turn a `← say` / `→ reply`
 *     header over its body, so a reader tells an inbound dispatch from an outbound
 *     reply. `--format raw` keeps the pipe-clean verbatim reply stream a comms relay
 *     forwards; the warns (a shared-cwd empty, a vanished episode) go to stderr, so
 *     the stdout a relay reads stays clean
 *
 * .note = an unknown address fails loud, so a caller never mistakes a silent empty
 *   for "the clone stayed silent"
 */
export const invokeCloneGet = ({ clone }: { clone: Command }): void => {
  clone
    .command('get <address>')
    .description("observe a clone's recent output (by @:<slug|serial>)")
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
        opts: { tail: string; format: string; output?: string },
      ) => {
        await withCliOutputErrors({
          outputRaw: opts.output,
          run: async () => {
            const mode = asCliOutputMode({ raw: opts.output });
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
            // invokeEnroll advisory (socketFallback / breadcrumb / accrual) — a
            // json caller reads the same facts as structured fields on the body
            // (exidsUnreadable / exidsAmbiguous), never unconditional stderr prose
            // it has no contract to parse. for tree, warns go to stderr so the
            // stdout a relay reads stays clean
            if (mode === 'tree' && output.exidsUnreadable.length > 0)
              console.error(
                `⚠ ${output.exidsUnreadable.length} episode(s) could not be read (a moved transcript)`,
              );
            if (
              mode === 'tree' &&
              output.messages.length === 0 &&
              output.exidsAmbiguous.length > 0
            )
              console.error(
                '⚠ history is empty because this clone shared a cwd with another at spawn — enroll each in its own worktree to separate their transcripts',
              );

            // the header echoes the clone's canonical address — its slug if named, else
            // its human serial (the first uuid segment) — so a reader sees WHOSE talk
            // this is, in a form they can reach again
            const addressShown = cloneFound.slug
              ? `@:${cloneFound.slug}`
              : `@:${asCloneSerialHuman({ serial: cloneFound.serial })}`;
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
