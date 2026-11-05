import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { getError, given, then, useBeforeAll, useThen, when } from 'test-fns';
import { getUuid } from 'uuid-fns';

import { genSceneWithFakeSsOnPath } from '@src/.test/assets/genSceneWithFakeSsOnPath';

import { type ChildProcess, spawn } from 'node:child_process';
import { createServer, type Server, type Socket } from 'node:net';
import { join } from 'node:path';
import { getSocketPeerCred } from './getSocketPeerCred';

/**
 * .what = a unix socket whose client end is held by a child process
 * .why = the peer must be a different process than the reader, so a lookup that matched its
 *   own end instead of the peer's would read the wrong pid and fail. the path is in the linux
 *   abstract namespace (a NUL prefix): no file to clean up, no `sun_path` cap from a deep dir
 * .note = every await settles on success or fault: the server and the child each reject on
 *   'error', so a fixture fault fails by name rather than hangs the scene
 */
const genSocketWithChildPeer = async (): Promise<{
  serverSide: Socket;
  peerPid: number;
  killPeer: () => Promise<void>;
  close: () => Promise<void>;
}> => {
  const name = `rhachet-peer-cred-test-${getUuid()}`;
  const server: Server = createServer();
  await new Promise<void>((done, fail) => {
    server.once('error', fail);
    server.listen(`\0${name}`, () => done());
  });

  // the child connects, then idles until killed; the NUL is added inside, since argv and env
  //   cannot carry one
  const child = spawn(
    process.execPath,
    [
      '-e',
      "const s = require('node:net').connect('\\0' + process.env.PEER_SOCKET_NAME); s.on('error', () => process.exit(3)); setInterval(() => {}, 1000);",
    ],
    { env: { ...process.env, PEER_SOCKET_NAME: name }, stdio: 'ignore' },
  );
  const serverSide = await new Promise<Socket>((done, fail) => {
    server.once('connection', done);
    child.once('error', fail);
    child.once('exit', (code) =>
      fail(
        new MalfunctionError('peer child exited before it connected', {
          code,
          hint: 'exit 3 = the child hit a connect error: check that the abstract socket name is valid and the server listens; any other code = `process.execPath` could not run the child',
        }),
      ),
    );
  });

  // kill the peer child and await its exit, so node has reaped it and its /proc entry is gone
  const killPeer = async (): Promise<void> => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    const exited = new Promise<void>((done) =>
      child.once('exit', () => done()),
    );
    child.kill('SIGKILL');
    await exited;
  };

  const close = async (): Promise<void> => {
    child.kill();
    serverSide.destroy();
    await new Promise<void>((done) => server.close(() => done()));
  };
  return { serverSide, peerPid: child.pid!, killPeer, close };
};

/**
 * .what = the window a peer holds its connection open before it hangs up, in ms
 * .why = the clone observe loop gives each probe 1000ms (CLONE_SAY_PROBE_REPLY_MS) and then
 *   hangs up. the lookup must name the peer inside that window, on a host whose process map
 *   is heavy, or the gate denies a live caller
 */
const PEER_HOLD_MS = 1000;

/**
 * .what = spawn a node child; settle once it prints its ready line
 * .why = both the peer and the ballast are real, separate processes — the lookup must cross a
 *   process boundary the way a `rhx clone say` caller does, never read its own fds alone
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

// the peer: connect, report ready, hold PEER_HOLD_MS, then hang up — the probe's shape
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
 * .what = accept one peer connection and read its cred via the lookup under test
 * .why = the lookup runs server-side on the accepted socket, exactly as the clone gate does
 */
const readPeerCredOnce = async (input: {
  server: Server;
  socketPath: string;
}): Promise<{
  peerPid: number;
  outcome: { pid: number; uid: number } | { error: string };
}> => {
  const accepted = new Promise<Socket>((done) =>
    input.server.once('connection', done),
  );
  const { child } = await spawnNodeChild({
    program: PEER_PROGRAM,
    args: [input.socketPath, String(PEER_HOLD_MS)],
  });
  const socket = await accepted;
  const outcome = await getSocketPeerCred({ socket }).then(
    (cred) => ({ pid: cred.pid, uid: cred.uid }),
    (error: Error) => ({ error: error.message }),
  );
  socket.destroy();
  await new Promise<void>((done) => {
    if (child.exitCode !== null) return done();
    child.once('exit', () => done());
  });
  return { peerPid: child.pid!, outcome };
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
 * .why = each case owns its socket, so no case sees another's connections. the path sits
 *   where the clone sockets sit ($XDG_RUNTIME_DIR), since a temp dir under the repo runs past
 *   the ~104-char unix socket path cap and the bind then fails
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

describe('getSocketPeerCred.integration', () => {
  given(
    '[case1] a unix socket whose peer is a child process, and an `ss` at its normal pace',
    () => {
      const scene = useBeforeAll(async () => genSocketWithChildPeer());
      afterAll(async () => scene?.close?.());

      when('[t0] the peer cred is read', () => {
        const cred = useThen('it settles', async () =>
          getSocketPeerCred({ socket: scene.serverSide }),
        );

        then('it names the child as the peer, never this process', () => {
          expect(cred.pid).toEqual(scene.peerPid);
          expect(cred.pid).not.toEqual(process.pid);
        });

        then('it reads the peer real uid', () => {
          expect(cred.uid).toEqual(process.getuid?.());
        });
      });
    },
  );

  /**
   * .what = the lookup bound kills a slow `ss` scan at the bound, through the real pipeline
   * .why = a slow lookup must end at the lookup, never at the auth gate above it
   *   (ehmpathy/rhachet#678). the lookup runs `ss -x` with no shell, so node's `timeout` kills
   *   `ss` itself at the bound. this drives that exact call, with a 1s bound over a 5s `ss`
   * .note = the fake `ss` is itself a shell, so its `sleep` may outlive the kill in this test; a
   *   real `ss` is one process, and dies at the bound. 5s keeps the test's orphan short, yet stays
   *   far enough past the 1s bound that a late settle on a loaded box is told apart from the exit
   */
  given('[case2] an `ss` scan that outlasts the lookup bound', () => {
    const SS_DELAY_SECONDS = 5;
    const LOOKUP_TIMEOUT_MS = 1_000;

    const scene = useBeforeAll(async () =>
      genSceneWithFakeSsOnPath(
        {
          ss: {
            delaySeconds: SS_DELAY_SECONDS,
            delayAt: 'before-scan',
            view: 'whole',
          },
        },
        { genScene: genSocketWithChildPeer },
      ),
    );
    // ⚠️ optional chain: on a host with no `ss` the scene throws a named ConstraintError, and an
    //   unguarded teardown would replace it with a bare TypeError (`rule.forbid.failhide`)
    afterAll(async () => scene?.close?.());

    when('[t0] the peer cred is read with a 1s lookup bound', () => {
      const outcome = useThen('the lookup settles', async () => {
        const startedAt = Date.now();
        const error = await getError(
          getSocketPeerCred(
            { socket: scene.serverSide },
            { lookupTimeoutMs: LOOKUP_TIMEOUT_MS },
          ),
        );
        return { error, elapsedMs: Date.now() - startedAt };
      });

      then(
        'it rejects by name, killed at the bound — the lookup failed closed',
        () => {
          expect(outcome.error).toBeInstanceOf(MalfunctionError);
          expect(outcome.error.message).toContain(
            '`ss` scan killed at the lookup bound',
          );
          expect(outcome.error).toMatchObject({
            metadata: { killed: true, lookupTimeoutMs: LOOKUP_TIMEOUT_MS },
          });
        },
      );

      then('it settles near the bound, never when the slow `ss` exits', () => {
        expect(outcome.elapsedMs).toBeGreaterThanOrEqual(LOOKUP_TIMEOUT_MS);
        expect(outcome.elapsedMs).toBeLessThan(SS_DELAY_SECONDS * 1000);
      });
    });
  });

  given('[case3] a lookup bound that would arm no kill timer', () => {
    const scene = useBeforeAll(async () => genSocketWithChildPeer());
    afterAll(async () => scene?.close?.());

    when('[t0] the peer cred is read with a bound of 0ms', () => {
      // wrapped in an object: useThen hands back a proxy, which an instanceof check cannot see through
      const outcome = useThen('it refuses', async () => ({
        error: await getError(
          getSocketPeerCred(
            { socket: scene.serverSide },
            { lookupTimeoutMs: 0 },
          ),
        ),
      }));

      then('it halts with a ConstraintError that names the bound', () => {
        expect(outcome.error).toBeInstanceOf(ConstraintError);
        expect(outcome.error.message).toContain(
          'lookup bound must be a positive',
        );
      });
    });
  });

  /**
   * .what = a peer whose end reads closed in `ss` — every peer inode shown as 0
   * .why = the lookup must fail, never fall back to some other pid. the fake `ss` rewrites the
   *   real table, so the real exec and parser run
   */
  given('[case4] a peer the lookup cannot name in `ss`', () => {
    const scene = useBeforeAll(async () =>
      genSceneWithFakeSsOnPath(
        { ss: { delaySeconds: 0, delayAt: 'before-scan', view: 'blind' } },
        { genScene: genSocketWithChildPeer },
      ),
    );
    afterAll(async () => scene?.close?.());

    when('[t0] the peer cred is read', () => {
      const outcome = useThen('it refuses', async () => ({
        error: await getError(getSocketPeerCred({ socket: scene.serverSide })),
      }));

      then('it halts with a MalfunctionError, never a pid', () => {
        expect(outcome.error).toBeInstanceOf(MalfunctionError);
        expect(outcome.error.message).toContain(
          'could not read peer inode from ss',
        );
      });
    });
  });

  /**
   * .what = a host with no `ss` on `PATH`
   * .why = an absent `ss` must reject by name, never read as an empty table that looks like a
   *   peer this user cannot see (the old `|| true` folded it into that miss)
   */
  given('[case5] a host with no `ss` on PATH', () => {
    const scene = useBeforeAll(async () => {
      const pathBefore = process.env.PATH;
      const socket = await genSocketWithChildPeer();
      process.env.PATH = '/nonexistent-rhachet-test-path';
      return { ...socket, pathBefore };
    });
    afterAll(async () => {
      if (scene?.pathBefore !== undefined) process.env.PATH = scene.pathBefore;
      await scene?.close?.();
    });

    when('[t0] the peer cred is read', () => {
      const outcome = useThen('it refuses', async () => ({
        error: await getError(getSocketPeerCred({ socket: scene.serverSide })),
      }));

      then('it names the absent `ss`, never a peer miss', () => {
        expect(outcome.error).toBeInstanceOf(MalfunctionError);
        expect(outcome.error.message).toContain('`ss` (iproute2) is absent');
        expect(outcome.error).toMatchObject({
          metadata: { errnoCode: 'ENOENT' },
        });
      });
    });
  });

  /**
   * .what = a host whose `ss -x` table outgrows the reader's buffer
   * .why = an overflow must reject by its own name, never read as "killed at the lookup bound" (a
   *   slow box) or a generic failure: its cure is a larger buffer, not a longer wait. the fake
   *   `ss` prints the real table, then 70 MiB of filler rows, past `SS_TABLE_MAX_BYTES` (64 MiB)
   */
  given('[case6] an `ss` table larger than the read buffer', () => {
    const scene = useBeforeAll(async () =>
      genSceneWithFakeSsOnPath(
        { ss: { delaySeconds: 0, delayAt: 'before-scan', view: 'flooded' } },
        { genScene: genSocketWithChildPeer },
      ),
    );
    afterAll(async () => scene?.close?.());

    when('[t0] the peer cred is read', () => {
      const outcome = useThen('it refuses', async () => ({
        error: await getError(getSocketPeerCred({ socket: scene.serverSide })),
      }));

      then('it names the overflow, never a slow box or a peer miss', () => {
        expect(outcome.error).toBeInstanceOf(MalfunctionError);
        expect(outcome.error.message).toContain(
          '`ss` table exceeds the read buffer',
        );
        expect(outcome.error).toMatchObject({
          metadata: { errnoCode: 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER' },
        });
      });
    });
  });

  /**
   * .what = a peer that exits after the `ss` scan names its inode and before the holder scan
   * .why = the holder of the peer inode is looked up after the scan returns. a peer gone in that
   *   gap must reject by name, never as a raw errno or another pid. the fake `ss` reads the real
   *   table at once and prints it 2s late (`after-scan`); the peer is killed and reaped inside
   *   that 2s, so the table names a peer inode no live process holds
   */
  given(
    '[case7] a peer that exits between the `ss` scan and its /proc read',
    () => {
      const SS_DELAY_SECONDS = 2;

      const scene = useBeforeAll(async () =>
        genSceneWithFakeSsOnPath(
          {
            ss: {
              delaySeconds: SS_DELAY_SECONDS,
              delayAt: 'after-scan',
              view: 'whole',
            },
          },
          { genScene: genSocketWithChildPeer },
        ),
      );
      afterAll(async () => scene?.close?.());

      when('[t0] the peer cred is read, and the peer exits mid-scan', () => {
        const outcome = useThen('it refuses', async () => {
          const errorAwaited = getError(
            getSocketPeerCred({ socket: scene.serverSide }),
          );
          // the scan has read the table within the first moments; the peer dies before it prints
          await new Promise((done) => setTimeout(done, 500));
          await scene.killPeer();
          return { error: await errorAwaited };
        });

        then('it names the absent holder, never a raw errno or a pid', () => {
          expect(outcome.error).toBeInstanceOf(MalfunctionError);
          expect(outcome.error.message).toContain(
            'could not find the process that holds the peer socket',
          );
        });

        then('its hint names a caller that hung up', () => {
          expect(outcome.error).toMatchObject({
            metadata: { hint: expect.stringContaining('hung up') },
          });
        });
      });
    },
  );

  given('[case8] a peer in a separate process', () => {
    const scene = useBeforeAll(async () =>
      genPeerServer({ slug: 'peer-cred' }),
    );

    when('[t0] eight peers connect, one after the other', () => {
      const reads = useBeforeAll(async () => {
        const rows = await Array.from({ length: 8 }).reduce<
          Promise<Awaited<ReturnType<typeof readPeerCredOnce>>[]>
        >(
          async (prior, _) => [...(await prior), await readPeerCredOnce(scene)],
          Promise.resolve([]),
        );
        return { rows };
      });

      then('each read names the PEER pid, never the server own pid', () => {
        // a pair prints two lines, each with both inodes, in an order that flips run to run.
        // a lookup that reads the first line that holds our inode returns the server's own
        // pid about half the time; eight in a row clamp it
        expect(reads.rows.map((row) => row.outcome)).toEqual(
          reads.rows.map((row) => ({
            pid: row.peerPid,
            uid: process.getuid!(),
          })),
        );
      });
    });
  });

  given(
    '[case9] a host whose process map is heavy — a ballast holds many fds',
    () => {
      const scene = useBeforeAll(async () => {
        const { server, socketPath } = await genPeerServer({
          slug: 'peer-cred-load',
        });
        const ballast = await spawnNodeChild({
          program: BALLAST_PROGRAM,
          args: ['200000'],
        });
        teardowns.push(() => ballast.child.kill());
        return { server, socketPath, fdsHeld: Number(ballast.ready) };
      });

      when('[t0] a peer connects and holds for the probe window alone', () => {
        const read = useBeforeAll(async () => readPeerCredOnce(scene));

        then('the ballast holds a heavy fd count', () => {
          expect(scene.fdsHeld).toBeGreaterThan(50000);
        });

        then('the lookup names the peer before it hangs up', () => {
          expect(read.outcome).toEqual({
            pid: read.peerPid,
            uid: process.getuid!(),
          });
        });
      });
    },
  );

  /**
   * .what = a peer whose inode no readable process holds — how a caller of another uid looks
   *   to a non-root reader
   * .why = a foreign caller's fds cannot be read, so the holder scan skips it. the lookup must
   *   fail closed by name, never fall back to some other pid. the fake `ss` rewrites every peer
   *   inode to one no process holds, so the real exec, parser and holder scan run
   */
  given('[case10] a peer held by a process this user cannot read', () => {
    const scene = useBeforeAll(async () =>
      genSceneWithFakeSsOnPath(
        { ss: { delaySeconds: 0, delayAt: 'before-scan', view: 'foreign' } },
        { genScene: genSocketWithChildPeer },
      ),
    );
    afterAll(async () => scene?.close?.());

    when('[t0] the peer cred is read', () => {
      const outcome = useThen('it refuses', async () => ({
        error: await getError(getSocketPeerCred({ socket: scene.serverSide })),
      }));

      then('it fails closed by name, never a pid', () => {
        expect(outcome.error).toBeInstanceOf(MalfunctionError);
        expect(outcome.error.message).toContain(
          'could not find the process that holds the peer socket',
        );
      });

      then('its hint names the other-user cause and its cure', () => {
        expect(outcome.error).toMatchObject({
          metadata: { hint: expect.stringContaining('another user') },
        });
      });
    });
  });
});
