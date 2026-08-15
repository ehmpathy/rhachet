import { MalfunctionError } from 'helpful-errors';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';
import { getUuid } from 'uuid-fns';

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { getCloneSocketPath } from '../getCloneSocketPath';
import { isCloneLive } from '../isCloneLive';
import { sayClone } from '../socket/sayClone';
import { genBrainCliPtyClone, type PtyCloneHost } from './genBrainCliPtyClone';
import { getPtyModuleOrNull, type PtyModule } from './getPtyModuleOrNull';

/**
 * .what = prove genBrainCliPtyClone spawns a REAL child through a REAL pty +
 *   socket (never a mock) — the mirror, the injected self-identity env, the
 *   socket dispatch round-trip, exit-code parity, and the on-exit cleanup
 * .why = the socket is the whole point of the wish; it is only "delivered" when a
 *   `say` provably reaches a live child and the child's reply mirrors back. the
 *   stub brain is that child — it replies with a TRANSFORMED ack, so a pass
 *   cannot be a coincidental echo
 */

const STUB_BRAIN = join(__dirname, '../../../.test/assets/stubBrainCli.cjs');

const delay = (ms: number): Promise<void> =>
  new Promise((done) => setTimeout(done, ms));

/**
 * .what = poll a capture buffer until a predicate holds, or fail loud on timeout
 */
const waitForOutput = async (
  output: string[],
  predicate: (joined: string) => boolean,
  timeoutMs = 8_000,
): Promise<void> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate(output.join(''))) return;
    await delay(25);
  }
  throw new MalfunctionError('predicate never held before timeout', {
    tail: output.join('').slice(-400),
  });
};

/**
 * .what = a capture host — stdout goes to an array, every other wire is a no-op
 */
const genCaptureHost = (output: string[]): PtyCloneHost => ({
  // .note = deliberate mutation — the host mirror IS a capture sink; each pty
  //   chunk is appended to the caller's bounded buffer, which never escapes the test
  writeOut: (data) => output.push(data),
  onInput: () => () => undefined,
  size: () => ({ cols: 80, rows: 24 }),
  onResize: () => () => undefined,
  onSignal: () => () => undefined,
  enterRawMode: () => () => undefined,
});

/**
 * .what = a fake node-pty child that records every resize + settles its exit on kill
 * .why = genBrainCliPtyClone forwards a host resize to child.resize; a real IPty does
 *   NOT expose whether resize was called, so a fake child makes the re-flow
 *   observable — the exact seam the host abstraction exists to test (the i009 r010
 *   review named this the cheapest unwritten test: the seam is fakeable on purpose)
 */
interface FakePtyChild {
  pid: number;
  resizeCalls: Array<{ cols: number; rows: number }>;
  onData: (cb: (data: string) => void) => { dispose: () => void };
  onExit: (cb: (e: { exitCode: number }) => void) => void;
  write: (data: string) => void;
  resize: (cols: number, rows: number) => void;
  kill: (signal?: string) => void;
}

const genFakePtyChild = (): FakePtyChild => {
  // .note = deliberate mutation — the fake child captures its onExit callback so
  //   the test can drive an exit; bounded to this fake, never escapes
  let onExitCb: ((e: { exitCode: number }) => void) | null = null;
  const child: FakePtyChild = {
    pid: 4321,
    resizeCalls: [],
    onData: () => ({ dispose: () => undefined }),
    onExit: (cb) => {
      onExitCb = cb;
    },
    write: () => undefined,
    resize: (cols, rows) => {
      // .note = deliberate mutation — the fake child records each resize call so
      //   the test can assert SIGWINCH re-flow; bounded to this fake, never escapes
      child.resizeCalls.push({ cols, rows });
    },
    // kill settles waitForExit so dispose() never hangs
    kill: () => onExitCb?.({ exitCode: 0 }),
  };
  return child;
};

/**
 * .what = a host whose resize event + reported size are driven by the test
 * .why = genCaptureHost no-ops resize (the gap the review flagged); this host lets a
 *   test fire a SIGWINCH-equivalent and grow the reported terminal, so the re-flow to
 *   child.resize is proven, not skipped
 */
const genResizableHost = (): {
  host: PtyCloneHost;
  fireResize: () => void;
  setSize: (next: { cols: number; rows: number }) => void;
} => {
  let size = { cols: 80, rows: 24 };
  let onResizeCb: (() => void) | null = null;
  const host: PtyCloneHost = {
    writeOut: () => undefined,
    onInput: () => () => undefined,
    size: () => size,
    onResize: (fn) => {
      onResizeCb = fn;
      return () => {
        onResizeCb = null;
      };
    },
    onSignal: () => () => undefined,
    enterRawMode: () => () => undefined,
  };
  return {
    host,
    fireResize: () => onResizeCb?.(),
    setSize: (next) => {
      size = next;
    },
  };
};

/**
 * .what = spawn one stub clone through the real pty, with a capture host
 */
const spawnStubClone = async (): Promise<{
  serial: string;
  socketPath: string;
  output: string[];
  clone: Awaited<ReturnType<typeof genBrainCliPtyClone>>;
}> => {
  const pty = getPtyModuleOrNull();
  if (!pty)
    MalfunctionError.throw(
      'node-pty addon absent — run `pnpm rebuild node-pty` to run this test',
      {},
    );

  const serial = getUuid();
  const socketPath = getCloneSocketPath({ serial })!;
  const cwd = genTempDir({ slug: `ptyclone-cwd-${serial}` });
  const output: string[] = [];
  const clone = await genBrainCliPtyClone(
    {
      command: process.execPath,
      args: [STUB_BRAIN],
      cwd,
      serial,
      socketPath,
    },
    { pty: pty!, host: genCaptureHost(output) },
  );
  return { serial, socketPath, output, clone };
};

describe('genBrainCliPtyClone.integration', () => {
  // keep the child's transcript off the real ~/.claude
  const configBefore = process.env['CLAUDE_CONFIG_DIR'];
  beforeAll(() => {
    process.env['CLAUDE_CONFIG_DIR'] = genTempDir({ slug: 'ptyclone-config' });
  });
  afterAll(() => {
    if (configBefore === undefined) delete process.env['CLAUDE_CONFIG_DIR'];
    else process.env['CLAUDE_CONFIG_DIR'] = configBefore;
  });

  given('[case1] a stub brain spawned through a managed pty', () => {
    const scene = useBeforeAll(async () => spawnStubClone());
    afterAll(async () => {
      await scene.clone.dispose().catch(() => undefined);
    });

    when('[t0] the child boots', () => {
      then('the ready line mirrors back with the injected serial', async () => {
        await waitForOutput(scene.output, (o) =>
          o.includes(`ready serial=${scene.serial}`),
        );
        expect(scene.output.join('')).toContain(`ready serial=${scene.serial}`);
      });

      then('the clone socket is live', async () => {
        expect(await isCloneLive({ socketPath: scene.socketPath })).toBe(true);
      });
    });

    when('[t1] a poke is dispatched over the socket', () => {
      then(
        'the transformed ack mirrors back — the say reached the child',
        async () => {
          const nonce = getUuid();
          await sayClone({
            socketPath: scene.socketPath,
            message: `poke ${nonce}`,
          });
          await waitForOutput(scene.output, (o) => o.includes(`ack:${nonce}`));
          expect(scene.output.join('')).toContain(`ack:${nonce}`);
        },
      );
    });
  });

  given('[case2] a stub told to exit with a code', () => {
    when('[t0] `exit 3` is dispatched', () => {
      then(
        'waitForExit settles with 3 and the socket is cleaned up',
        async () => {
          const spawned = await spawnStubClone();
          await waitForOutput(spawned.output, (o) =>
            o.includes(`ready serial=${spawned.serial}`),
          );

          // the exit tears the child down mid-ack, so the say may not be acked —
          // the point is the code, not the reply
          await sayClone({
            socketPath: spawned.socketPath,
            message: 'exit 3',
          }).catch(() => undefined);

          const code = await spawned.clone.waitForExit;
          expect(code).toBe(3);

          // the socket file is unlinked and no longer connectable
          expect(existsSync(spawned.socketPath)).toBe(false);
          expect(await isCloneLive({ socketPath: spawned.socketPath })).toBe(
            false,
          );
        },
      );
    });
  });

  given('[case3] a host resize event (SIGWINCH fidelity)', () => {
    // only the child is faked so the re-flow is observable; the socket is still a
    // REAL unix socket (bound + closed), so the seam under test is not mocked away
    when('[t0] the host grows and fires a resize', () => {
      then('the child re-flows to the NEW host size', async () => {
        const { host, fireResize, setSize } = genResizableHost();
        const fakeChild = genFakePtyChild();
        // .note = deliberate cast at the test boundary: node-pty is an external module
        //   with a wide IPty surface, but genBrainCliPtyClone touches only `spawn` here,
        //   so the fake supplies just that one member. the `as unknown` bridges the
        //   structural gap between the minimal fake and the full PtyModule type; removal
        //   path: drops when a shared test fake for the whole IPty surface lands
        //   (rule.forbid.as-cast, test boundary)
        const fakePty = {
          spawn: () => fakeChild,
        } as unknown as PtyModule;

        const serial = getUuid();
        const socketPath = getCloneSocketPath({ serial })!;
        const cwd = genTempDir({ slug: `ptyclone-resize-${serial}` });
        const clone = await genBrainCliPtyClone(
          { command: 'noop', args: [], cwd, serial, socketPath },
          { pty: fakePty, host },
        );

        // before any resize, the child was never re-flowed
        expect(fakeChild.resizeCalls).toEqual([]);

        // the human's terminal grows to 120x40; SIGWINCH fires
        setSize({ cols: 120, rows: 40 });
        fireResize();

        // the seam read the NEW host size and re-flowed the child to it
        expect(fakeChild.resizeCalls).toContainEqual({ cols: 120, rows: 40 });

        await clone.dispose();
      });
    });
  });
});
