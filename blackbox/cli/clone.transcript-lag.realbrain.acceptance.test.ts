import { MalfunctionError } from 'helpful-errors';
import { given, then, useBeforeAll, when } from 'test-fns';
import { genTempDir } from 'test-fns';

import {
  asCloneSayHeadSnapshotSafe,
  enrollRealClaudeAndWaitReach,
  expectCloneSaySuccessTree,
  getRealClaudeOrThrow,
  setupEnrollFixture,
  setRealClaudeFirstRunAccepted,
} from '@/blackbox/.test/infra/enrollCloneHarness';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import type { CloneOndisk } from '@src/domain.objects/CloneOndisk';
import { asCloneRef } from '@src/domain.operations/clone/asCloneRef';
import { genCloneHistoryRelink } from '@src/domain.operations/clone/genCloneHistoryRelink';
import { getCloneSocketPath } from '@src/domain.operations/clone/getCloneSocketPath';
import { getCloneSubmittedCount } from '@src/domain.operations/clone/getCloneSubmittedCount';
import { getOneCloneByRef } from '@src/domain.operations/clone/getOneCloneByRef';
import { getCloneInputStateOrBlind } from '@src/domain.operations/clone/socket/getCloneInputStateOrBlind';
import { getOneRepoPath } from '@src/infra/host/getOneRepoPath';

/**
 * .what = the A1 measurement, and 🔴 **it REFUTES the claim it was written to confirm**. a
 *   real brain-cli does NOT hold a queued message out of its transcript: it writes the
 *   user turn at SUBMIT, while the message still sits unreleased in the queue. so this
 *   test now clamps the measured truth, and with it the reason the screen read exists.
 * .why =
 *   - vision premise A1 (V12) read: *"a brain-cli queues a submitted message when a turn
 *     is in flight, and does not write it to the transcript jsonl until it dispatches as a
 *     turn"* — called *"the whole diagnosis rests on this"*. it was testimony. this is the
 *     measurement, and it comes back the other way.
 *   - ⇒ the consequence the cure rests on: **a transcript rise proves SUBMIT and asserts
 *     naught about release.** both `enqueued` and `released` satisfy it, so the transcript
 *     CANNOT part them. that is why `CloneInputState` carries a `queued` field read off the
 *     brain's own dim `❯ Press up to edit queued messages` hint — the one screen signal
 *     that discriminates (see computeCloneInputState, the queue-hint block).
 *   - ⇒ and it names what broke without that field: both the poll step and the verdict
 *     terminated on the transcript rise alone, so `released` outranked `enqueued` on every
 *     busy dispatch. `enqueued` was unreachable (vision R3 unmet) and `--await release`
 *     returned at a submit.
 *   - so this test is the clamp in BOTH directions now. it goes red if a future brain-cli
 *     defers the transcript write to release — which would mean the transcript alone could
 *     discriminate and the screen read had become unnecessary. that is a real possibility
 *     worth a loud signal, not a silent windfall.
 *   - every dispatch rides the shipped CLI (`rhx clone say`), per
 *     rule.require.acceptance.blackbox — the ACTION goes through the contract; only the
 *     setup and the transcript read use internals.
 *
 * .note = 🔴 the MEASUREMENT, 2026-09-18, live claude v2.1.87 on a peer mid-print of
 *   1..2000: the dispatched sentinel rendered in the queue region of a genuinely busy peer
 *   AND raised its own transcript count within 678ms. the capture is
 *   `.agent/.cache/repo=rhachet/skill=clone-say/debug.2026-09-18.log`.
 * .note = the codebase already contradicted the vision, in prose, before this ran —
 *   `getCloneSubmittedCount.ts:12-15` says the brain records each user turn *"the moment it
 *   is submitted (before the assistant even replies)."* two artifacts asserted opposite
 *   facts about one behavior and neither had been measured. ⇒ where two sources disagree,
 *   reach for the instrument, never the more confident prose.
 *
 * .note = the CLI is the STRONGER instrument here, not merely the compliant one. M2's
 *   `enqueued` verdict is the shipped contract's own claim that the brain HOLDS the
 *   message — exactly the precondition this observation needs proven, and a claim the old
 *   byte-handoff dispatch could not make (it resolved before the brain had classified the
 *   message at all).
 * .note = M1 prints 2000 lines so the in-flight window stays open across M2's whole
 *   dispatch — a node boot, a socket round trip, and the probe cycles behind the verdict.
 *   60 lines left almost no margin and 400 was measured as marginal on the haiku this tier
 *   pins; 2000 makes the margin an order of magnitude.
 * .note = the RELEASE-side read is deliberately out of scope. a proof that the submit write
 *   is the ONLY write would need M1's 2000-line reply to finish first, which costs minutes
 *   and answers a different question. what IS clamped here is that the count reads EXACTLY
 *   1 at the queued window, so a double write at submit could not pass unseen.
 * .note = a real-brain tier: credential-gated, costly, gates LOUD (never skips) via
 *   getRealClaudeOrThrow, per rule.forbid.faked-or-quarantined-acceptance.
 */

// a cold claude boot plus two CLI dispatches runs minutes on a small ci runner — the same
// 5-minute bound the peer real-brain clamps carry. the test no longer waits for M1's reply
// to FINISH (the release-side read is out of scope), so the bound is headroom for the boot
// and the two node subprocesses, never for 2000 lines of streamed output
jest.setTimeout(300000);

/**
 * .what = relink the lazily-written transcript, then count a message's submitted turns
 * .why = getCloneSubmittedCount is a pure read; the relink is the explicit side-effect
 *   step the caller sequences first (get-verb purity)
 */
const readSubmittedCount = (input: {
  clone: CloneOndisk;
  repoPath: string;
  message: string;
}): number => {
  genCloneHistoryRelink({ repoPath: input.repoPath, clone: input.clone });
  return getCloneSubmittedCount({
    clone: input.clone,
    message: input.message,
  });
};

/**
 * .what = dispatch a message through the shipped CLI (`rhx clone say`) and return its
 *   verdict line; a non-zero exit throws rather than returns
 * .why = the ACTION of an acceptance test rides the contract, per
 *   rule.require.acceptance.blackbox. and the contract is the stronger instrument here:
 *   `say` defaults to `--await enqueue`, so it returns the instant the brain HOLDS the
 *   message — which both preserves A1's observation window and makes the shipped
 *   verdict itself the proof that the queued precondition was reached.
 * .note = the throw carries both streams, so a dispatch failure names its own cause
 *   rather than shows up later as a bare `onScreen: false`
 */
const dispatchViaCli = (input: {
  dir: string;
  env: Record<string, string | undefined>;
  address: string;
  message: string;
}): { stdout: string } => {
  const result = invokeRhachetCliBinary({
    binary: 'rhx',
    args: ['clone', 'say', input.address, '--what', input.message],
    cwd: input.dir,
    env: input.env,
    logOnError: false,
  });
  if (result.status !== 0)
    throw new MalfunctionError('a `clone say` dispatch did not exit 0', {
      address: input.address,
      message: input.message,
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
    });
  return { stdout: result.stdout };
};

/**
 * .what = wait until the clone's screen probe answers `capable`, or fail loud at the bound
 * .why = 🔴 the PRECONDITION this journey assumed rather than asserted, and the flake it
 *   cost. measured 2026-09-18: a run reddened with `expected "enqueued", received "😶🎙️
 *   said to @: … └─ 🟡 feed not live"`. the shipped product was CORRECT — a `released`
 *   verdict verified by transcript IS the declared degrade for an unreadable screen
 *   (computeCloneSayVerdict.test.ts:264 covers it, and the copy self-heals) — but
 *   `enqueued` is unreachable while the probe is blind, so the test's own premise was the
 *   thing unmet. the mismatch named no part of its real cause.
 *   - the extant harness waits for claude's own readiness banner plus a fixed settle.
 *     NEITHER is a read of the screen channel: the banner marks the RENDER, and the probe
 *     answers over a socket the daemon serves
 *   - ⇒ so this waits on the capability the premise needs, rather than on a correlate of
 *     it (`rule.require.read-the-record-not-the-correlate`)
 * .note = it is a SETUP read through an internal, which `rule.require.acceptance.blackbox`
 *   permits — only the ACTION is bound to the contract. the CLI exposes no probe surface to
 *   poll (`clone get` reads the transcript), and this costs no brain turn at all
 */
const awaitProbeCapableOrThrow = async (input: {
  clone: CloneOndisk;
  timeoutMs: number;
}): Promise<void> => {
  const socketPath = getCloneSocketPath({ serial: input.clone.serial });
  if (socketPath === null)
    throw new MalfunctionError('the enrolled clone reported no socket path', {
      serial: input.clone.serial,
    });

  const deadline = Date.now() + input.timeoutMs;
  // .note = deliberate mutation — a bounded poll for a capability latch
  let reply = await getCloneInputStateOrBlind({ socketPath });
  while (reply.probe !== 'capable' && Date.now() < deadline) {
    await new Promise((wake) => setTimeout(wake, 200));
    reply = await getCloneInputStateOrBlind({ socketPath });
  }
  if (reply.probe !== 'capable')
    throw new MalfunctionError(
      'the clone screen probe never became capable — this journey cannot observe a queued state without it',
      {
        socketPath,
        probe: reply.probe,
        reason: reply.probe === 'unsupported' ? reply.reason : null,
        timeoutMs: input.timeoutMs,
      },
    );
};

/**
 * .what = wait until a message's text is on the pty SCREEN, then read its transcript
 *   count at that instant — the A1 observation window
 * .why = the instant a queued message renders on screen, what is its transcript count? A1
 *   predicted ZERO; the measurement says ONE. the prior turn's 2000-line reply keeps the
 *   brain busy for a long while, so this first-on-screen read lands well inside the queued
 *   window — the count it returns is the count while the message is still HELD, which is
 *   the whole point of the read.
 * .note = the on-screen wait is what makes the read land inside the window rather than at a
 *   guessed offset. the screen echo and the transcript write are the two events this test
 *   compares, so it anchors on the one it can watch cheaply and reads the other at once
 */
const captureQueuedWindow = async (input: {
  bg: { getOutput: () => string };
  clone: CloneOndisk;
  repoPath: string;
  message: string;
  timeoutMs: number;
}): Promise<{ onScreen: boolean; transcriptCount: number }> => {
  const deadline = Date.now() + input.timeoutMs;
  // .note = deliberate mutation — a bounded wait for the on-screen echo
  let onScreen = input.bg.getOutput().includes(input.message);
  while (!onScreen && Date.now() < deadline) {
    await new Promise((wake) => setTimeout(wake, 100));
    onScreen = input.bg.getOutput().includes(input.message);
  }
  const transcriptCount = readSubmittedCount(input);
  return { onScreen, transcriptCount };
};

describe('A1 refuted — a brain-cli writes a QUEUED message to the transcript at submit (real acceptance)', () => {
  given('[case1] a real claude with a turn already in flight', () => {
    const scene = useBeforeAll(async () => {
      // the loud gate — a ConstraintError (exit 2) when the real brain or its
      // credentials are absent; this tier proves the premise or fails, never skips
      const { binDir } = getRealClaudeOrThrow();

      const dir = genTempDir({ slug: 'clone-a1' });
      setupEnrollFixture({ dir });
      setRealClaudeFirstRunAccepted({ dir });

      const env = { PATH: `${binDir}:${process.env.PATH ?? ''}` };
      const enrolled = await enrollRealClaudeAndWaitReach({ dir, env });

      const repoPath = getOneRepoPath({ from: dir });
      const clone = getOneCloneByRef({
        repoPath,
        ref: asCloneRef({ raw: enrolled.address }),
      });
      if (clone === null)
        throw new MalfunctionError('the enrolled clone was not found on disk', {
          address: enrolled.address,
        });

      return { dir, env, repoPath, clone, ...enrolled };
    });
    afterAll(async () => {
      await scene.bg.kill();
    });

    when('[t0] a second message is dispatched while the first turn streams', () => {
      const observed = useBeforeAll(async () => {
        // 🔴 the premise, asserted rather than assumed: `enqueued` is reachable ONLY while
        // the screen probe answers. a blind probe collapses the verdict to the
        // transcript-only path, which reports `released` — correct product behavior, and a
        // false red for this journey. the harness's own waits read the RENDER, never this
        // channel, so the capability is waited on directly here
        await awaitProbeCapableOrThrow({ clone: scene.clone, timeoutMs: 30000 });

        // M1 — a reply long enough that its turn is still IN FLIGHT by the time M2's
        // dispatch reaches the socket. 2000 lines streams for a long while on the haiku
        // this tier pins, against a ~1-2s M2 dispatch cost — an order of magnitude of
        // margin, where 60 lines left almost none and 400 measured as marginal
        const m1 =
          'Print each integer from 1 to 2000, one per line, and no other text.';
        const m1Dispatch = dispatchViaCli({
          dir: scene.dir,
          env: scene.env,
          address: scene.address,
          message: m1,
        });

        // M2 — a unique sentinel dispatched INTO the in-flight turn, with NO transcript
        // poll in between: M1's own SUCCESS verdict is already the proof the brain holds
        // it, so a second wait for M1's disk write only burns the window this test needs
        // open
        const m2 = `A1-QUEUED-${Date.now().toString(36)}`;
        const m2Dispatch = dispatchViaCli({
          dir: scene.dir,
          env: scene.env,
          address: scene.address,
          message: m2,
        });

        // the A1 observation: at the first instant M2 is on screen, is it absent from
        // the transcript?
        const window = await captureQueuedWindow({
          bg: scene.bg,
          clone: scene.clone,
          repoPath: scene.repoPath,
          message: m2,
          timeoutMs: 20000,
        });

        // M1's own transcript count, read AFTER the window rather than before M2 —
        // the same assertion, taken at a moment that costs the observation naught
        const m1Count = readSubmittedCount({
          clone: scene.clone,
          repoPath: scene.repoPath,
          message: m1,
        });

        return { m1, m1Count, m1Dispatch, m2, m2Dispatch, window };
      });

      then('the first message was submitted (the brain is genuinely busy)', () => {
        // two independent reads of the same fact: the shipped contract's own verdict at
        // dispatch, and the transcript on disk afterward
        //
        // ⚠️ 🔴 the premise M1 carries is **the brain HOLDS it**, and BOTH success words
        //   satisfy that — so the assert is over the success SET, never over one word. it
        //   once demanded `said to` alone, and the demand was wrong on its own terms:
        //   - `said to` (released) ⇒ the brain took M1 as a turn ⇒ busy from now
        //   - `enqueued` ⇒ the brain was ALREADY busy with a prior turn at M1's dispatch,
        //     so M1 waits behind it ⇒ busy from now, and busy for LONGER
        //   ⇒ an `enqueued` M1 is a STRONGER busy-ness precondition, not a collapsed one.
        //     measured 2026-09-18 under an 11-suite parallel realbrain tier: M1 came back
        //     `enqueued for @:4c92db0f — mid-turn; lands next` and this row reddened while
        //     every observation downstream of it held
        //   - and the busy-ness this journey actually needs at the observation window is
        //     proven directly by M2's own `enqueued` verdict, two rows below — never
        //     inferred from M1's word
        // .note = the verdict is still asserted, and still strictly: what widened is the
        //   SET, from one word to the shipped success pair. a `withheld` or an `absent` M1
        //   reddens this row exactly as before, so no defect class was traded away
        expect(observed.m1Dispatch.stdout).toMatch(/said to|enqueued for/);
        expect(observed.m1Count).toBeGreaterThanOrEqual(1);
      });

      then(
        'the contract itself reported the second message as ENQUEUED — the A1 precondition',
        () => {
          expect(observed.m2Dispatch.stdout).toContain('enqueued');
        },
      );

      then(
        'both live say trees name a SUCCESS verdict, addressed to THIS clone',
        () => {
          // the branch-invariant properties a `toContain` cannot reach: the head glyph, the
          // `@:` sigil, the address that must belong to the clone dispatched to, and the
          // tail shape (at most one leaf; `enqueued for` owes its leaf plus a detail suffix).
          // ⇒ a tree addressed to some OTHER clone carries `enqueued` too, so the contains
          //   above passes on it. this is what refuses it
          expectCloneSaySuccessTree({
            stdout: observed.m1Dispatch.stdout,
            serial: scene.serial,
          });
          expectCloneSaySuccessTree({
            stdout: observed.m2Dispatch.stdout,
            serial: scene.serial,
          });
        },
      );

      then('the LIVE say heads render as snapped (masked vibecheck)', () => {
        // the vibecheck half the assertions above cannot give: a reviewer of this PR reads
        // the shape a live pty + socket + subprocess actually put on stdout, with no run of
        // their own. the mask drops the two fields that are a read of state — the verdict
        // word and the address — so what the key holds is the render-invariant envelope
        expect({
          m1: asCloneSayHeadSnapshotSafe({
            stdout: observed.m1Dispatch.stdout,
          }),
          m2: asCloneSayHeadSnapshotSafe({
            stdout: observed.m2Dispatch.stdout,
          }),
        }).toMatchSnapshot();
      });

      then('the queued second message rendered on the pty screen', () => {
        expect(observed.window.onScreen).toBe(true);
      });

      then(
        '🔴 A1 REFUTED — the queued message was ALREADY in the transcript, exactly once',
        () => {
          // the measurement that inverts the premise. A1 predicted 0 here. it reads 1 — the
          // brain wrote the user turn at SUBMIT, and the message is nonetheless still HELD
          // (the `enqueued` verdict above is the contract's own word for that).
          //
          // EXACTLY 1, never `>= 1`: a double write at submit would make a count-based rise
          // ambiguous in a second way, so the tighter assert is the one worth taking. the
          // release-side read is out of scope (see the .note in the header)
          expect(observed.window.transcriptCount).toEqual(1);
        },
      );

      then(
        '⇒ so the transcript CANNOT part `enqueued` from `released` — the screen read is what does',
        () => {
          // the corollary, asserted as the PAIR rather than restated in prose: one dispatch
          // carries an `enqueued` verdict AND a risen transcript count at the same instant.
          // any verdict computed from the transcript alone would have to call this
          // `released`, which is the exact mislabel the `queued` screen field exists to
          // close. this row is what goes red if a future brain-cli defers the write to
          // release — the signal that the screen read had become unnecessary
          expect(observed.m2Dispatch.stdout).toContain('enqueued');
          expect(observed.window.transcriptCount).toBeGreaterThanOrEqual(1);
        },
      );
    });
  });
});
