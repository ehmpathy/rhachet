import { ConstraintError, MalfunctionError } from 'helpful-errors';
import {
  genTempDir,
  getError,
  given,
  then,
  useBeforeAll,
  when,
} from 'test-fns';
import { getUuid } from 'uuid-fns';

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { genCloneSpawn } from '../genCloneSpawn';
import { getCloneSocketPath } from '../getCloneSocketPath';
import { isCloneLive } from '../isCloneLive';
import { sayClone } from '../socket/sayClone';
import { genBrainCliPtyClone, type PtyCloneHost } from './genBrainCliPtyClone';
import { getPtyHostTupleFromProcess } from './getPtyHostTupleFromProcess';
import { getPtyModuleOrNull, type PtyModule } from './getPtyModuleOrNull';
import { getPtyPlatformSupportFromProcess } from './getPtyPlatformSupportFromProcess';

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

/**
 * .what = the byte cap a unix socket address may hold — `sockaddr_un.sun_path`
 *
 * .why  = [case4] must stay UNDER it. a path past this cap is not refused; libuv truncates
 *   it, and the truncated remainder can land in a dir that exists — so a fixture built to
 *   fault on an absent dir binds successfully instead, and the clamp goes green unarmed.
 *
 * ⚠️ 108 on linux, 104 on darwin/bsd — the SMALLER is taken, so a path that clears this
 *   clears the real cap on either host. it is a conservative ceiling for the test, never a
 *   claim about this host's exact value.
 */
const SUN_PATH_MAX_BYTES = 104;

/**
 * .what = mint the ONE socket path that provokes a real bind fault, with both of its
 *   preconditions asserted rather than assumed
 *
 * .why  = [case4] and [case5] drive the SAME fault at two layers, so they must arm the same
 *   seam. held as two inline copies, one could drift under an edit and the pair would still
 *   report green — which is the exact failure this fixture already produced once. one owner,
 *   one pair of preconditions, checked on every call.
 *
 * 🚨 the assertions ARE the fixture, never decoration. read [case4]'s note for what each
 *   guards; in short, an absent parent makes the bind fail, and a short path keeps libuv
 *   from a truncation that would cut that absent parent out of the address entirely.
 *
 * 🚨 .why the socket path is NOT under `genTempDir` = it cannot be. a temp dir here measured
 *   151 bytes with a 9-byte tail, so NO socket path under it fits `sun_path` — every one is
 *   truncated, which is precisely how this fixture came to bind successfully. so the address
 *   is derived from `getCloneSocketPath`'s OWN base, the runtime dir a real clone binds in,
 *   plus one dir that is not there. the `cwd` handed to the seam stays a real temp dir; only
 *   the socket ADDRESS comes from the runtime base.
 *
 * ⚠️ it litters naught outside the repo. the absent dir is never created, and the bind that
 *   would create the socket is the very subject under test — it fails by construction. no
 *   branch of this row can leave a file behind.
 */
const genBindFaultFixture = (input: {
  slug: string;
}): { cwd: string; socketPath: string } => {
  const cwd = genTempDir({ slug: input.slug });

  // the same base a real clone binds in, so a move of production's runtime dir carries this
  // fixture with it rather than leave it to address a dir the code no longer uses
  const runtimeSocketPath = getCloneSocketPath({ serial: getUuid() });
  if (runtimeSocketPath === null)
    throw new ConstraintError(
      'this host derives no clone socket path, so a bind fault cannot be provoked',
      { hint: 'run the pty integration suite on a POSIX host' },
    );

  // ⚠️ the absent dir carries a per-run suffix, never the slug alone. the runtime base is
  //   HOST-WIDE and shared, so a fixed name is shared across every concurrent run on this
  //   machine — two runs would then address the same absent dir, and whichever created it
  //   first would disarm the other. the suffix is short (8 hex) because the whole path
  //   must still clear `sun_path`, which the bound below re-measures every run
  const socketPath = join(
    dirname(runtimeSocketPath),
    `nd-${input.slug}-${getUuid().slice(0, 8)}`,
    's.sock',
  );

  // ⚠️ the cap is asserted as a BOUND, never as a boolean — a boolean red says only that
  //   the fixture is unarmed, where the bound prints the byte count beside the cap, which
  //   is the one datum needed to resize it
  expect(existsSync(dirname(socketPath))).toEqual(false);
  expect(Buffer.byteLength(socketPath)).toBeLessThanOrEqual(SUN_PATH_MAX_BYTES);

  return { cwd, socketPath };
};

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
 *   observable — the exact seam the host abstraction exists to test
 */
interface FakePtyChild {
  /** how many times the seam killed this child — the bind-fault path's one obligation */
  killCalls: number;
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
    killCalls: 0,
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
    kill: () => {
      // .note = deliberate mutation — the fake counts its own kills so a test can
      //   assert the bind-fault path killed the already-spawned child; bounded to
      //   this fake, never escapes
      child.killCalls += 1;
      onExitCb?.({ exitCode: 0 });
    },
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
    // .note = the hint BRANCHES on platform support, because one sentence cannot be
    //   true for both. told to run `pnpm install` on a host upstream ships no binary
    //   for, a reader gets a cure that runs clean and repairs naught — the same
    //   dead-end shape this whole change exists to retire, at test scale
    MalfunctionError.throw(
      'node-pty addon absent — this test needs a real pty',
      {
        hostTuple: getPtyHostTupleFromProcess(),
        hint:
          getPtyPlatformSupportFromProcess() === 'supported'
            ? 'the prebuilt addon ships inside the node-pty tarball for this platform, so an absent one means the install is damaged — run `pnpm install` to repair it'
            : 'upstream ships no prebuilt addon for this platform (or its libc could not be read), so no install is sure to produce one — this suite can only run on a glibc linux, macos, or windows host',
      },
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

  // 🚨 [case4] drives the REAL `genCloneSocketServer` to a REAL bind fault.
  //
  //   `[case8]` of `genCloneOndisk.integration.test.ts` names `EADDRINUSE` and reads as
  //   this clamp — it is not. it injects a SYNCHRONOUS throw from a stubbed `pty.spawn`,
  //   so the async listen path is never entered. a test that carries the right words for
  //   a path it does not walk is worse than an absent one: a reader who greps the fault
  //   code finds a hit, and the hit is why they stop.
  //
  // 🚨 the fixture is an ABSENT parent dir on a SHORT path, and it takes both halves. one
  //   alternative was measured and rejected, and the other is the trap that made THIS one
  //   read as a pass — each armed the wrong seam, which is the failure mode a green clamp
  //   hides best:
  //
  //   | fixture                | measured 2026-09-03/04                                   |
  //   |------------------------|----------------------------------------------------------|
  //   | parent is a FILE       | deterministic, and it faulted on `syscall: 'unlink'` —   |
  //   |                        | the seam's stale-path DELETE, which runs BEFORE the       |
  //   |                        | server exists. it would stay green with the race deleted  |
  //   | path over `sun_path`   | the bind SUCCEEDED. **libuv TRUNCATES an over-long unix   |
  //   |                        | socket path rather than refuse it**, and the truncated    |
  //   |                        | remainder lands in a dir that DOES exist — so the absent  |
  //   |                        | dir this row names was never the path actually bound      |
  //
  //   ⚠️ that truncation is why this row read differently across three runs — a bind fault,
  //   a deferred `chmod ENOENT`, and a clean pass, from one unchanged fixture. it is not the
  //   seam being flaky; it is the fixture that addressed a path the kernel silently rewrote.
  //   a temp-dir root plus a uuid filename clears `sun_path` on its own, with no long name
  //   anywhere in sight — which is what made the cause so hard to see.
  //
  //   ⇒ so TWO constraints decide the fixture, and neither is optional:
  //   1. `delFileSync` allowlists `ENOENT` and rethrows every other errno, so the `unlink`
  //      that precedes the bind must yield ENOENT ⇒ the parent dir must be ABSENT
  //   2. the path must fit `sun_path` ⇒ no truncation, so the path bound is the path named
  //
  // 🚨 both are ASSERTED rather than assumed, and that is the whole lesson of this row. it
  //   was measured to pass by throwing NO error at all — the socket bound, the clamp was
  //   never armed, and its green meant naught. `getError`'s *"no error was thrown"* was the
  //   only tell, and it took three runs to read. an unarmed clamp reports a green that is
  //   indistinguishable from a working one, so each precondition is named up front.
  given('[case4] a socket path whose parent dir is absent', () => {
    when('[t0] the seam binds and the bind faults', () => {
      then('it REJECTS, and kills the child it already spawned', async () => {
        const fakeChild = genFakePtyChild();
        // .note = deliberate cast at the test boundary — same bridge, same reason as
        //   [case3]: the seam touches only `spawn`, so the fake supplies only that
        //   (rule.forbid.as-cast, test boundary)
        const fakePty = {
          spawn: () => fakeChild,
        } as unknown as PtyModule;

        const serial = getUuid();
        // the fixture asserts its own two preconditions — see `genBindFaultFixture`
        const { cwd, socketPath } = genBindFaultFixture({
          slug: 'ptyclone-bind',
        });

        const error = await getError(
          genBrainCliPtyClone(
            { command: 'noop', args: [], cwd, serial, socketPath },
            { pty: fakePty, host: genCaptureHost([]) },
          ),
        );

        // ⚠️ the assertion is that it REJECTS at all. before the `'error'` race, this
        //   promise never settled — the fault escaped as an unhandled event and killed
        //   the process, so no caller could ever see it
        //
        // ⚠️ read by SHAPE, never by `toBeInstanceOf`. the fault is minted inside
        //   node's own `net`/`fs` realm, so its `Error` constructor is not the one this
        //   module closes over — the identity check fails with the unreadable
        //   *"Expected constructor: Error / Received constructor: Error"*
        //
        // 🚨 and the errno is read as a MEMBER of the bind-fault set, never pinned to
        //   one value. node decides which of the bind's stages reports first, and that is
        //   its business, not this clamp's — to pin one code would make the clamp fail for
        //   a reason unrelated to the defect it guards (`rule.forbid.time-assumptions`,
        //   same shape: a value with no measurement behind it). **what is under test is
        //   that it REJECTS AT ALL** — before the race, this promise never settled: the
        //   fault escaped as an unhandled event and killed the process, so the suite
        //   aborted with zero results rather than reported a failure
        // ⚠️ the received VALUES are carried into the assertion object, never reduced to
        //   a bare boolean. a `false` says only that the row failed; the errno and the
        //   syscall say WHICH of the gate's stages node reported from — and this row has
        //   already been red for two different stages, so the next reader needs the
        //   value, not the verdict
        const { code, syscall } = error as NodeJS.ErrnoException;
        expect({
          isBindFault: [
            'ENOTDIR',
            'ENOENT',
            'EADDRINUSE',
            'EACCES',
            'ENAMETOOLONG',
          ].includes(code ?? ''),
          hasMessage: ((error as Error).message ?? '').length > 0,
          code: code ?? null,
          // 🚨 the field the classifier one layer up actually keys on, asserted HERE at
          //   the layer that raises it — so a change in what node stamps reddens the row
          //   that measured it rather than only the row that consumes it
          syscallIsGateOwned: ['bind', 'listen', 'chmod'].includes(
            syscall ?? '',
          ),
          syscall: syscall ?? null,
          // ⚠️ the message rides along so a red row is self-diagnosing. an errno pair of
          //   `null`/`null` says only that the throw was not an errno — the message says
          //   what it WAS, and that is the datum a reader would otherwise have to re-run
          //   the suite to obtain
          message: (error as Error).message,
          // 🚨 `toMatchObject`, and the three carriers are ABSENT from the expectation —
          //   which is the whole reason it is not `toEqual`. `expect.any(String)` sat here
          //   for two rounds, and the r002 `mech-failhides` lane raised it at i065 and
          //   again at i076 as a matcher that verifies naught. both reads were right about
          //   the matcher and wrong about the intent: the carriers were never the
          //   verification, only the datum a RED row must print.
          //
          //   ⇒ `toMatchObject` is what lets those two jobs sit apart. the received object
          //   still carries `code`, `syscall`, and `message`, and jest prints it whole on
          //   any mismatch — so a red row still names its own cause — while the expectation
          //   names only the three propositions actually under test. no `any` matcher, no
          //   second copy of an assertion, no carrier that reads as a claim.
          //
          //   | the carrier printed on red | the row that VERIFIES its subject           |
          //   |----------------------------|---------------------------------------------|
          //   | `code`                     | `isBindFault` — set membership              |
          //   | `syscall`                  | `syscallIsGateOwned` — the classifier's set |
          //   | `message`                  | `hasMessage` — non-empty                    |
          //
          //   ⚠️ the laxity `toMatchObject` buys costs naught here: the received object is
          //   a literal built six lines above, so it cannot grow a key from elsewhere
        }).toMatchObject({
          isBindFault: true,
          hasMessage: true,
          syscallIsGateOwned: true,
        });

        // and the child spawned one line earlier is reaped, never left alive behind a
        // terminal whose enroll failed
        expect(fakeChild.killCalls).toEqual(1);
      });
    });
  });

  // 🚨 [case5] is [case4] one layer up — the SAME real bind fault, driven through the
  //   classifier that a human's report is actually built from.
  //
  //   [case4] proved the fault SETTLES. that is only half of what a human needs: a fault
  //   that settles and then reaches them as a bare node stack is legible to nobody, which
  //   is the very condition `asCloneSocketOmissionReasonError` and `asPtyDeviceRefusedError`
  //   exist to retire for their own classes. so this row asserts the report, not the throw.
  //
  // ⚠️ it must be an INTEGRATION row, never a unit one. the unit tests beside the two new
  //   files pin the predicate and the payload, and both would stay green if the wire
  //   between them were cut — `genCloneSpawn`'s catch is the only place that joins them,
  //   and only a real bind fault proves node stamps the `syscall` the predicate reads.
  given(
    '[case5] the same bind fault, seen through the spawn orchestrator',
    () => {
      when('[t0] a human reads what the enroll reports', () => {
        then('it is a CLASSIFIED malfunction, never a bare stack', async () => {
          const fakeChild = genFakePtyChild();
          const fakePty = {
            spawn: () => fakeChild,
          } as unknown as PtyModule;

          // the SAME fixture as [case4], from the same generator — so the two layers cannot
          // drift onto different seams. see [case4]'s note for what its preconditions guard
          const serial = getUuid();
          const { cwd, socketPath } = genBindFaultFixture({
            slug: 'spawn-bind',
          });

          const error = await getError(
            genCloneSpawn(
              {
                command: 'noop',
                args: [],
                cwd,
                serial,
                socketPath,
                // the gate ALREADY cleared a socket for this enroll — which is exactly why
                // the bind fault that follows is ours rather than the caller's
                socketEligible: true,
                pty: fakePty,
              },
              { host: genCaptureHost([]) },
            ),
          );

          // 🚨 a MALFUNCTION, never a constraint. the wrong class here would tell a human
          //   "you can fix this" and hand them `--no-socket` as the cure for a defect they
          //   cannot reach — loud about the wrong party (`rule.forbid.failhide`)
          expect(error).toBeInstanceOf(MalfunctionError);
          expect((error as Error).message).toContain(
            'its socket could not be bound',
          );

          // and the errno the kernel gave is carried through to the report, so a filed bug
          // says WHICH call refused rather than only that a call did
          const { hint, socketSyscall } = (
            error as MalfunctionError<{
              hint: string;
              socketSyscall: string | null;
            }>
          ).metadata;
          expect(hint).toContain('a defect in rhachet');
          expect(
            ['bind', 'listen', 'chmod'].includes(socketSyscall ?? ''),
          ).toEqual(true);

          // the kill is the orchestrator's obligation too — it does not stop at the report
          expect(fakeChild.killCalls).toEqual(1);
        });
      });
    },
  );
});
