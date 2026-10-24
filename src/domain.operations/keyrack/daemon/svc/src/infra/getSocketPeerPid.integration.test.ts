import { given, then, useBeforeAll, when } from 'test-fns';
import { getUuid } from 'uuid-fns';

import { type ChildProcess, spawn } from 'node:child_process';
import { createServer, type Server, type Socket } from 'node:net';
import { join } from 'node:path';
import { getSocketPeerPid } from './getSocketPeerPid';

/**
 * .what = the window a peer holds its connection open, in ms
 * .why = a `rhx keyrack` caller holds its connection while the daemon checks its session; the
 *   hold is generous, so a red here is the lookup itself, never a peer that left early
 */
const PEER_HOLD_MS = 4000;

/**
 * .what = spawn a node child; settle once it prints its ready line
 * .why = the peer and the ballast are real, separate processes — the lookup must cross a
 *   process boundary the way a keyrack caller does
 */
const spawnNodeChild = async (input: {
  program: string;
  args: string[];
}): Promise<{ child: ChildProcess; ready: string }> => {
  const child = spawn(process.execPath, ['-e', input.program, ...input.args], {
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  const ready = await new Promise<string>((done, fail) => {
    child.stdout!.once('data', (chunk: Buffer) =>
      done(chunk.toString().trim()),
    );
    child.once('exit', (code) =>
      fail(new Error(`child exited before ready, code ${code}`)),
    );
  });
  return { child, ready };
};

// the peer: connect, report ready, hold PEER_HOLD_MS, then hang up
const PEER_PROGRAM = `
const net = require('node:net');
const client = net.connect(process.argv[1], () => {
  process.stdout.write('ready\\n');
  setTimeout(() => { client.destroy(); process.exit(0); }, Number(process.argv[2]));
});
client.on('error', () => process.exit(0));
`;

// the ballast: hold many fds open, so a host-wide process map has much to read
const BALLAST_PROGRAM = `
const fs = require('node:fs');
const fds = [];
try { for (let i = 0; i < Number(process.argv[1]); i++) fds.push(fs.openSync('/dev/null', 'r')); } catch {}
process.stdout.write(String(fds.length) + '\\n');
setInterval(() => {}, 1 << 30);
`;

/**
 * .what = accept one peer connection, read its pid via the lookup under test, and time it
 * .why = the lookup runs daemon-side on the accepted socket, exactly as the session gate does
 */
const readPeerPidOnce = async (input: {
  server: Server;
  socketPath: string;
}): Promise<{
  peerPid: number;
  outcome: { pid: number } | { error: string };
  lookupMs: number;
}> => {
  const accepted = new Promise<Socket>((done) =>
    input.server.once('connection', done),
  );
  const { child } = await spawnNodeChild({
    program: PEER_PROGRAM,
    args: [input.socketPath, String(PEER_HOLD_MS)],
  });
  const socket = await accepted;
  const startedAt = Date.now();
  const outcome = (() => {
    try {
      return { pid: getSocketPeerPid({ socket }) };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  })();
  const lookupMs = Date.now() - startedAt;
  socket.destroy();
  child.kill();
  await new Promise<void>((done) => {
    if (child.exitCode !== null || child.signalCode !== null) return done();
    child.once('exit', () => done());
  });
  return { peerPid: child.pid!, outcome, lookupMs };
};

/**
 * .what = teardown steps queued at setup, run once after all cases
 * .why = a teardown that reads a `useBeforeAll` value throws when its setup failed, which
 *   masks the setup's own error; a queue filled in setup holds only what setup made
 */
const teardowns: (() => void)[] = [];
afterAll(() => teardowns.forEach((teardown) => teardown()));

/**
 * .what = stand up a unix server on a fresh path in the user runtime dir
 * .why = each case owns its socket; the runtime dir keeps the path under the ~104-char cap
 */
const genPeerServer = async (input: {
  slug: string;
}): Promise<{ server: Server; socketPath: string }> => {
  const runtimeDir =
    process.env['XDG_RUNTIME_DIR'] ?? `/run/user/${process.getuid!()}`;
  const socketPath = join(runtimeDir, `${input.slug}.${getUuid()}.sock`);
  const server = createServer();
  await new Promise<void>((done, fail) => {
    server.once('error', fail);
    server.listen(socketPath, done);
  });
  teardowns.push(() => server.close());
  return { server, socketPath };
};

describe('getSocketPeerPid.integration', () => {
  given('[case1] a peer in a separate process', () => {
    const scene = useBeforeAll(async () =>
      genPeerServer({ slug: 'daemon-peer' }),
    );

    when('[t0] eight peers connect, one after the other', () => {
      const reads = useBeforeAll(async () => {
        const rows = await Array.from({ length: 8 }).reduce<
          Promise<Awaited<ReturnType<typeof readPeerPidOnce>>[]>
        >(
          async (prior, _) => [...(await prior), await readPeerPidOnce(scene)],
          Promise.resolve([]),
        );
        return { rows };
      });

      then('each read names the PEER pid, never the daemon own pid', () => {
        // a pair prints two lines, each with both inodes, in an order that flips run to run;
        // a pid read off the first line that holds our inode names the daemon itself about
        // half the time, so eight in a row clamp it
        expect(reads.rows.map((row) => row.outcome)).toEqual(
          reads.rows.map((row) => ({ pid: row.peerPid })),
        );
      });
    });
  });

  given(
    '[case2] a host whose process map is heavy — a ballast holds many fds',
    () => {
      const scene = useBeforeAll(async () => {
        const { server, socketPath } = await genPeerServer({
          slug: 'daemon-peer-load',
        });
        const ballast = await spawnNodeChild({
          program: BALLAST_PROGRAM,
          args: ['200000'],
        });
        teardowns.push(() => ballast.child.kill());
        return { server, socketPath, fdsHeld: Number(ballast.ready) };
      });

      when('[t0] a peer connects', () => {
        const read = useBeforeAll(async () => readPeerPidOnce(scene));

        then('the ballast holds a heavy fd count', () => {
          expect(scene.fdsHeld).toBeGreaterThan(50000);
        });

        then('the lookup names the peer', () => {
          expect(read.outcome).toEqual({ pid: read.peerPid });
        });

        then('the lookup costs far less than the 5s ss timeout', () => {
          // the gate is sync, so its cost is a stall of every daemon caller; a lookup that
          // maps every fd on the host grows with the ballast, this one does not
          expect(read.lookupMs).toBeLessThan(1000);
        });
      });
    },
  );
});
