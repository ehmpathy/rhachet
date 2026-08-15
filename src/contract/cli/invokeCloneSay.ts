import type { Command } from 'commander';
import { ConstraintError, MalfunctionError } from 'helpful-errors';

import { asCloneReachError } from '@src/domain.operations/clone/asCloneReachError';
import { asCloneRef } from '@src/domain.operations/clone/asCloneRef';
import { CLONE_SUBMIT_VERIFY_TIMEOUT_MS } from '@src/domain.operations/clone/constants';
import { genCloneHistoryRelink } from '@src/domain.operations/clone/genCloneHistoryRelink';
import { getCloneReachState } from '@src/domain.operations/clone/getCloneReachState';
import { getCloneSocketPath } from '@src/domain.operations/clone/getCloneSocketPath';
import { getCloneSubmitLanded } from '@src/domain.operations/clone/getCloneSubmitLanded';
import { getCloneSubmittedCount } from '@src/domain.operations/clone/getCloneSubmittedCount';
import { getOneCloneByRef } from '@src/domain.operations/clone/getOneCloneByRef';
import { sayClone } from '@src/domain.operations/clone/socket/sayClone';
import { getHomeHash } from '@src/infra/host/getHomeHash';
import { getOneRepoPath } from '@src/infra/host/getOneRepoPath';

import { asCliOutputMode } from './asCliOutputMode';
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
    .action(
      async (address: string, opts: { what: string; output?: string }) => {
        await withCliOutputErrors({
          outputRaw: opts.output,
          run: async () => {
            const mode = asCliOutputMode({ raw: opts.output });
            const repoPath = getOneRepoPath({ from: process.cwd() });

            // read the message: literal, or the whole of stdin
            if (opts.what === '@stdin' && process.stdin.isTTY)
              console.error(
                'ℹ awaiting the message on stdin — pipe it in, or pass --what <message>',
              );
            const message =
              opts.what === '@stdin' ? await readStdin() : opts.what;

            // a multi-line message IS supported: asCloneDispatchFrame maps each interior
            // `\n` to the soft-newline escape (Shift/Option-Enter), so the whole block
            // lands as ONE turn instead of a truncated first line. the delivery self-verify
            // below still proves the WHOLE message left the input buffer, so a brain that
            // does not honor the soft-newline fails LOUD, never a silent truncation

            // find the clone this address names — unknown = fail loud, never a no-op
            const cloneFound = getOneCloneByRef({
              repoPath,
              ref: asCloneRef({ raw: address }),
            });
            if (cloneFound === null)
              throw new ConstraintError(`no clone answers to '${address}'`, {
                hint: 'list clones with `rhx clone list`',
              });

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

            // baseline the message's transcript count BEFORE dispatch, so the verify
            // below counts only THIS submit (a repeated message ticks up from >= 1).
            // refresh the transcript link explicitly first, then read the pure count
            genCloneHistoryRelink({ repoPath, clone: cloneFound });
            const baselineCount = getCloneSubmittedCount({
              clone: cloneFound,
              message,
            });

            // dispatch: bulk-write the whole message in one pty write, then submit it
            // with a separate `\r` after a length-scaled delay. the socket ack proves
            // only that the bytes were handed off
            await sayClone({ socketPath, message });

            // SELF-TEST the submit: a hand-off ack is not proof the brain submitted.
            // poll the brain's own transcript until our message appears (the user turn
            // it writes ON submit) — deterministic proof it left the input buffer. a
            // submit that never lands (the dogfood defect) fails LOUD here, never a
            // false `delivered`
            const landed = await getCloneSubmitLanded({
              repoPath,
              clone: cloneFound,
              message,
              baselineCount,
              timeoutMs: CLONE_SUBMIT_VERIFY_TIMEOUT_MS,
            });
            if (!landed)
              throw new MalfunctionError(
                'message was written to the clone but did NOT leave its input buffer — the brain never submitted it',
                {
                  serial: cloneFound.serial,
                  hint: 'the brain-cli may not have accepted the typed submit on this host; check the clone is a real interactive brain',
                },
              );

            // status feedback: name what landed and where (rule.require.status-feedback).
            // `delivered` is now HONEST — it prints only AFTER the self-verify above
            // confirmed the message left the input buffer (was submitted), never on a
            // bare byte hand-off
            const addressShown = cloneFound.slug
              ? `@:${cloneFound.slug}`
              : `@:${cloneFound.serial}`;
            // the clone talk header (rule.prefer.emoji-language): `😶` the clone face,
            // `🎙️` the say artifact — you speak INTO the clone (the input counterpart to
            // get's `🎧` headphones). `said to <addr>` confirms the message left the input
            // buffer (this prints only AFTER the self-verify above)
            console.log(
              renderCliOutput({
                mode,
                tree: `😶🎙️ said to ${addressShown}`,
                data: {
                  delivered: true,
                  serial: cloneFound.serial,
                  slug: cloneFound.slug,
                },
              }),
            );
          },
        });
      },
    );
};
