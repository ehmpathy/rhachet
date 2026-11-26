import { ConstraintError, MalfunctionError } from 'helpful-errors';
import type { IPty } from 'node-pty';
import { genTempDir, given, then, useThen, when } from 'test-fns';

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getPtyModuleOrNull } from './getPtyModuleOrNull';

/**
 * .what = spawn a typescript program in a child whose stdout and stderr are a real pty
 * .why = the subject is how the host writes to a tty whose reader may be still; only a real pty
 *   gives that, and its reader can be paused to play a starved tmux server
 */
const spawnInPty = (input: { program: string }): IPty => {
  const ptyModule = getPtyModuleOrNull();
  if (!ptyModule)
    throw new ConstraintError('node-pty is required for this test', {
      hint: 'run: pnpm install (node-pty builds its native addon on install)',
    });
  return ptyModule.spawn(
    process.execPath,
    ['-r', 'tsx/cjs', '-e', input.program],
    {
      cols: 80,
      rows: 24,
      cwd: process.cwd(),
      // .note = node-pty types env as a string map; process.env holds string values plus
      //   undefined keys, which node-pty skips
      env: process.env as Record<string, string>,
    },
  );
};

/**
 * .what = await a pty child's exit code, within a bound
 * .why = a child that never exits must fail the test with a cause, never hang it to the jest
 *   timeout; the child is killed so no process outlives the run
 */
const awaitPtyExit = (input: {
  child: IPty;
  boundMs: number;
}): Promise<number> =>
  new Promise((settle, fail) => {
    const bound = setTimeout(() => {
      input.child.kill();
      fail(
        new MalfunctionError('host child did not exit within its bound', {
          boundMs: input.boundMs,
          hint: 'a hang here means the host held the exit; check that the async mirror release settles at its bound',
        }),
      );
    }, input.boundMs);
    input.child.onExit(({ exitCode }) => {
      clearTimeout(bound);
      settle(exitCode);
    });
  });

/**
 * .what = run the prod host in a child whose stdout is a real pty, hold that pty's reader still
 *   for a span, and measure how late the child's own event loop ran in that span
 * .why = an attended daemon mirrors the brain-cli to its tty, and a starved tmux server stops to
 *   read that tty. a sync write to a tty whose reader is still blocks the whole loop: the socket
 *   goes deaf and the stall watch fires. only a real pty with a held reader shows it, with no spy
 * .note = the child writes its measure to a file, since its stdout and stderr ARE the held pty
 * .note = the child writes a brain-cli redraw every 10ms (64KB), far past the kernel's pty
 *   buffer, so a sync write blocks within the first few chunks
 */
const runHostBehindStillReader = async (input: {
  stillMs: number;
}): Promise<{ maxDriftMs: number }> => {
  const dir = genTempDir({ slug: 'pty-host-still-reader' });
  const measurePath = join(dir, 'measure.json');
  const hostPath = JSON.stringify(
    join(__dirname, 'genPtyCloneHostFromProcess'),
  );
  const program = [
    `const { writeFileSync } = require('node:fs');`,
    `const { genPtyCloneHostFromProcess } = require(${hostPath});`,
    `const host = genPtyCloneHostFromProcess();`,
    `host.enterAsyncMirror();`,
    `const chunk = 'x'.repeat(64 * 1024);`,
    `let tickedAt = Date.now(); let maxDriftMs = 0;`,
    `const tick = setInterval(() => {`,
    `  const now = Date.now();`,
    `  maxDriftMs = Math.max(maxDriftMs, now - tickedAt - 50);`,
    `  tickedAt = now;`,
    `}, 50);`,
    `const redraw = setInterval(() => host.writeOut(chunk), 10);`,
    `setTimeout(() => {`,
    `  clearInterval(redraw); clearInterval(tick);`,
    `  writeFileSync(${JSON.stringify(measurePath)}, JSON.stringify({ maxDriftMs }));`,
    `  process.exit(0);`,
    `}, ${input.stillMs + 1000});`,
  ].join('\n');

  // the pty reader is the pane; pause it to play a starved tmux server
  const child = spawnInPty({ program });
  const exited = awaitPtyExit({ child, boundMs: input.stillMs + 30000 });
  child.pause();
  await new Promise((settle) => setTimeout(settle, input.stillMs));
  child.resume();

  // drain the pane to the end, so the child can finish and exit
  child.onData(() => undefined);
  const code = await exited;
  if (code !== 0)
    throw new MalfunctionError('host child exited nonzero', {
      code,
      hint: 'the child crashed; run its program by hand under a pty to read the crash',
    });
  // .note = the child wrote this file with JSON.stringify of this exact shape, just above
  return JSON.parse(readFileSync(measurePath, 'utf8')) as {
    maxDriftMs: number;
  };
};

/**
 * .what = await a pane's capture sink until no new data arrives for a quiet span, within a bound
 * .why = node-pty may report a child's exit before it has read the last bytes the child wrote to
 *   the pty: the exit event and the final data event race. a pane read at the exit can miss its
 *   tail although the child delivered it; a short quiet span lets the tail land, and the bound
 *   keeps a pane that never settles from a hang
 */
const awaitPaneQuiet = async (input: {
  pane: string[];
  quietMs: number;
  boundMs: number;
}): Promise<void> => {
  const boundAt = Date.now() + input.boundMs;
  const awaitFrom = async (seen: number): Promise<void> => {
    await new Promise((settle) => setTimeout(settle, input.quietMs));
    if (input.pane.length === seen) return;
    if (Date.now() > boundAt) return;
    return awaitFrom(input.pane.length);
  };
  return awaitFrom(input.pane.length);
};

/**
 * .what = run the prod host behind a still reader, write numbered chunks, flush, then exit, and
 *   collect every byte the pane received
 * .why = an async mirror must keep the human's screen whole: every chunk, in order, with the
 *   last frames flushed before the exit — the fidelity the sync write gave for free
 */
const runHostFlushBehindStillReader = async (input: {
  stillMs: number;
  chunks: number;
}): Promise<{ pane: string }> => {
  const hostPath = JSON.stringify(
    join(__dirname, 'genPtyCloneHostFromProcess'),
  );
  const program = [
    `const { genPtyCloneHostFromProcess } = require(${hostPath});`,
    `const host = genPtyCloneHostFromProcess();`,
    `const release = host.enterAsyncMirror();`,
    `const pad = 'x'.repeat(16 * 1024);`,
    `for (let n = 0; n < ${input.chunks}; n++) host.writeOut('<' + n + '>' + pad);`,
    `host.writeOut('<end>');`,
    `release().then(() => process.exit(0));`,
  ].join('\n');
  const child = spawnInPty({ program });
  const exited = awaitPtyExit({ child, boundMs: input.stillMs + 30000 });

  // .note = deliberate mutation — a capture sink for the pane's bytes, local to this run
  const pane: string[] = [];
  child.onData((data) => pane.push(data));
  child.pause();
  await new Promise((settle) => setTimeout(settle, input.stillMs));
  child.resume();
  const code = await exited;
  if (code !== 0)
    throw new MalfunctionError('host child exited nonzero', {
      code,
      hint: 'the child crashed; run its program by hand under a pty to read the crash',
    });

  // the exit can outrun the pane's last read; let the tail land before the pane is judged
  await awaitPaneQuiet({ pane, quietMs: 200, boundMs: 3000 });
  return { pane: pane.join('') };
};

/**
 * .what = run the prod host behind a pane frozen for longer than the flush bound, write past the
 *   kernel buffer, flush, and record how long the flush took
 * .why = a frozen pane must never hold the exit: the flush must settle at its bound, not wait on
 *   the pane. the reader resumes only after the bound, so the callback path cannot settle first
 * .note = the child writes its measure to a file, since its stdout IS the frozen pty
 */
const runHostFlushBehindFrozenReader = async (input: {
  frozenMs: number;
}): Promise<{ flushMs: number }> => {
  const dir = genTempDir({ slug: 'pty-host-frozen-reader' });
  const measurePath = join(dir, 'measure.json');
  const flushPath = join(dir, 'flush.began');
  const hostPath = JSON.stringify(
    join(__dirname, 'genPtyCloneHostFromProcess'),
  );
  const program = [
    `const { writeFileSync } = require('node:fs');`,
    `const { genPtyCloneHostFromProcess } = require(${hostPath});`,
    `const host = genPtyCloneHostFromProcess();`,
    `const release = host.enterAsyncMirror();`,
    `const pad = 'x'.repeat(64 * 1024);`,
    `for (let n = 0; n < 32; n++) host.writeOut(pad);`,
    `writeFileSync(${JSON.stringify(flushPath)}, '');`,
    `const flushedFrom = Date.now();`,
    `release().then(() => {`,
    `  writeFileSync(${JSON.stringify(measurePath)}, JSON.stringify({ flushMs: Date.now() - flushedFrom }));`,
    `  process.exit(0);`,
    `});`,
  ].join('\n');

  // subscribe to the exit at spawn: the child exits while the pane is still frozen, and a late
  //   subscriber would miss that one-shot event
  const child = spawnInPty({ program });
  const exited = awaitPtyExit({ child, boundMs: input.frozenMs + 30000 });
  child.pause();

  // the freeze is timed from the flush call, not the spawn: a slow child boot then cannot eat
  //   into it, so a flush that waited on the pane reads near frozenMs on any host
  const bootBoundAt = Date.now() + 30000;
  while (!existsSync(flushPath)) {
    if (Date.now() > bootBoundAt)
      throw new MalfunctionError('host child never reached its flush', {
        hint: 'the child crashed or hung at boot; run its program by hand under a pty',
      });
    await new Promise((settle) => setTimeout(settle, 20));
  }
  await new Promise((settle) => setTimeout(settle, input.frozenMs));
  child.resume();
  child.onData(() => undefined);
  const code = await exited;
  if (code !== 0)
    throw new MalfunctionError('host child exited nonzero', {
      code,
      hint: 'the child crashed; run its program by hand under a pty to read the crash',
    });
  // .note = the child wrote this file with JSON.stringify of this exact shape, just above
  return JSON.parse(readFileSync(measurePath, 'utf8')) as { flushMs: number };
};

describe('genPtyCloneHostFromProcess', () => {
  given('[case3] an attended host that flushes behind a frozen pane', () => {
    when('[t0] the pane stays frozen past the flush bound', () => {
      const run = useThen('the host flushes', async () =>
        runHostFlushBehindFrozenReader({ frozenMs: 6000 }),
      );

      then(
        'the flush settles at its bound — the frozen pane never holds the exit',
        () => {
          // the bound is 2000ms; the pane thaws 6000ms after the flush call, so a flush that
          //   waited on the pane reads near 6000ms — 2000ms past the cap, on any host
          expect(run.flushMs).toBeGreaterThanOrEqual(1900);
          expect(run.flushMs).toBeLessThan(4000);
        },
      );
    });
  });

  given('[case1] an attended host whose pane reader is held still', () => {
    when('[t0] the brain-cli redraws while the reader is still', () => {
      const stillMs = 3000;
      const run = useThen('the host mirrors the redraws', async () =>
        runHostBehindStillReader({ stillMs }),
      );

      then(
        'the host loop still turns on time — the mirror never blocks it',
        () => {
          // a sync tty write holds the loop for the whole still span; a third of it is a wide
          //   margin for a loaded host, and still far below the span a block would show
          expect(run.maxDriftMs).toBeLessThan(stillMs / 3);
        },
      );
    });
  });

  given('[case2] an attended host that flushes behind a still reader', () => {
    when('[t0] it writes many chunks, flushes, and exits', () => {
      const run = useThen('the pane collects every byte', async () =>
        runHostFlushBehindStillReader({ stillMs: 1000, chunks: 64 }),
      );

      then(
        'every chunk reaches the pane, in order, the last before exit',
        () => {
          const markers = [...run.pane.matchAll(/<(\d+|end)>/g)].map(
            (match) => match[1],
          );
          expect(markers).toEqual([
            ...Array.from({ length: 64 }, (_, n) => String(n)),
            'end',
          ]);
        },
      );
    });
  });
});
