import { ConstraintError } from 'helpful-errors';
import { getError, given, then, useBeforeAll, when } from 'test-fns';
import { getUuid } from 'uuid-fns';

import { rmSync, writeFileSync } from 'node:fs';
import { createServer, type Server, type Socket } from 'node:net';
import { getCloneSocketPath } from '../getCloneSocketPath';
import { connectToClone } from './connectToClone';

/**
 * .what = the shared get-connected adapter that every talk verb (say/get/list)
 *   reaches a clone through, proven against a real unix socket
 * .why = connectToClone is the ONE place a dead/absent socket turns into a named
 *   fail-loud instead of a hang — so its happy path (a live server resolves a
 *   socket) and its two dead paths (absent file, stale orphan file) must each be
 *   clamped, or a regression could silently hang or mis-read a dead clone as live
 */
describe('connectToClone.integration', () => {
  given('[case1] a live clone socket server', () => {
    const scene = useBeforeAll(async () => {
      const socketPath = getCloneSocketPath({ serial: getUuid() })!;
      const accepted: Socket[] = [];
      const server: Server = createServer((peer) => accepted.push(peer));
      await new Promise<void>((done) =>
        server.listen(socketPath, () => done()),
      );
      return { socketPath, server, accepted };
    });
    afterAll(async () => {
      scene.accepted.forEach((peer) => peer.destroy());
      await new Promise<void>((done) => scene.server.close(() => done()));
    });

    when('[t0] a caller connects', () => {
      then('it resolves a live socket the caller owns', async () => {
        const socket = await connectToClone({
          socketPath: scene.socketPath,
          timeoutMs: 1000,
        });
        expect(socket.destroyed).toBe(false);
        // the caller owns the returned socket — it closes it (per the contract)
        socket.destroy();
      });
    });
  });

  given('[case2] a socket path that never existed (an absent clone)', () => {
    when('[t0] a caller connects', () => {
      then('it fails loud — no live clone, never a hang', async () => {
        const absentPath = getCloneSocketPath({ serial: getUuid() })!;
        const error = await getError(() =>
          connectToClone({ socketPath: absentPath, timeoutMs: 1000 }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect((error as Error).message).toContain(
          'no live clone at this socket',
        );
      });
    });
  });

  given('[case3] a STALE orphan socket file (a dead clone, un-reaped)', () => {
    // a dead clone's socket file is NOT reaped (the vision leaves it in place), so
    // the common dead-clone reach is a leftover file where no server listens. a
    // connect to it must fail loud (ECONNREFUSED/ENOTSOCK) — never hang, and never
    // read the orphan file as a live clone
    const scene = useBeforeAll(async () => {
      const stalePath = getCloneSocketPath({ serial: getUuid() })!;
      writeFileSync(stalePath, '');
      return { stalePath };
    });
    afterAll(() => rmSync(scene.stalePath, { force: true }));

    when('[t0] a caller connects', () => {
      then(
        'it fails loud — the orphan socket is not a live clone',
        async () => {
          const error = await getError(() =>
            connectToClone({ socketPath: scene.stalePath, timeoutMs: 1000 }),
          );
          expect(error).toBeInstanceOf(ConstraintError);
          expect((error as Error).message).toContain(
            'no live clone at this socket',
          );
        },
      );
    });
  });
});
