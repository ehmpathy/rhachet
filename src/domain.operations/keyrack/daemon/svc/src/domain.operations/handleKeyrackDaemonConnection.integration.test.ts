import { given, then, when } from 'test-fns';

import { createKeyrackDaemonServer } from '@src/domain.operations/keyrack/daemon/svc/src/infra/createKeyrackDaemonServer';

import { mkdtempSync, rmSync } from 'node:fs';
import { connect, type Server } from 'node:net';

/**
 * .what = wait for a socket to open and close again, with no byte sent
 * .why = this is exactly what isDaemonReachable does — a probe. it is the shape the
 *        lazy session gate must NOT charge an `ss -xp` scan to
 */
const probeSocket = async (input: { socketPath: string }): Promise<void> =>
  new Promise<void>((emit, reject) => {
    const socket = connect(input.socketPath, () => {
      socket.destroy();
      emit();
    });
    socket.on('error', reject);
  });

describe('handleKeyrackDaemonConnection: the session check is lazy', () => {
  /**
   * [uc1] a caller that sends no bytes must not trigger the session lookup
   *
   * .why = getSocketPeerPid shells out to `ss -xp`, whose cost grows with every unix
   * socket on the machine. an eager check charges that scan to every reachability
   * probe — and the daemon's own callers probe up to 50 times per test case.
   *
   * this clamp exists because that regression WAS shipped once and passed every
   * targeted suite. it surfaced only when a machine happened to hold ~1867 sockets
   * and the shell-out failed, which turned a slow lookup into a refusal of legitimate
   * callers. "it went red by luck of scale" is not a clamp; a count of the calls is.
   */
  given('[case1] a daemon whose session check is observable', () => {
    jest.setTimeout(20000);

    // a short path: a unix socket path is capped near 108 bytes
    const runtimeDir = mkdtempSync('/tmp/hkdc-');
    const socketPath = `${runtimeDir}/d.sock`;

    // .note = deliberate mutation: this is the observation itself. the whole point
    // of the injection is to count invocations, and a counter that cannot be
    // incremented counts none. confined to this case
    let verifyCalls = 0;
    const verifySession = (() => {
      verifyCalls += 1;
      return { callerPid: process.pid, callerSessionId: 0 };
    }) as Parameters<typeof createKeyrackDaemonServer>[0]['verifySession'];

    // .note = deliberate mutation: the server is born inside beforeAll and closed in
    // afterAll, so it cannot be a const in this scope
    let server: Server;

    beforeAll(async () => {
      const created = createKeyrackDaemonServer({
        socketPath,
        homeHash: 'aaaa0000',
        verifySession,
      });
      server = created.server;
      // let the listen callback run before any client connects
      await new Promise<void>((emit) => server.once('listening', () => emit()));
    });

    afterAll(async () => {
      await new Promise<void>((emit) => server.close(() => emit()));
      rmSync(runtimeDir, { recursive: true, force: true });
    });

    when('[t0] a probe connects and destroys without a byte sent', () => {
      then('the session check does not run at all', async () => {
        for (let i = 0; i < 5; i++) await probeSocket({ socketPath });

        // give any eager handler a chance to have fired
        await new Promise<void>((emit) => setTimeout(emit, 200));

        // the clamp: move the check to connection open and this is 5, not 0
        expect(verifyCalls).toEqual(0);
      });
    });

    when('[t1] a real client sends bytes', () => {
      then('the check runs exactly once for that connection', async () => {
        const response = await new Promise<string>((emit, reject) => {
          const socket = connect(socketPath);
          let received = '';
          socket.on('data', (chunk) => {
            received += chunk.toString();
          });
          socket.on('end', () => emit(received));
          socket.on('error', reject);
          socket.on('connect', () => {
            socket.write(JSON.stringify({ command: 'STATUS', payload: {} }));
          });
        });

        // the caller was served, so the gate admits a legitimate session
        expect(JSON.parse(response).success).toEqual(true);

        // exactly one — bytes trigger it, and the verdict is memoized per connection
        expect(verifyCalls).toEqual(1);
      });
    });
  });
});
