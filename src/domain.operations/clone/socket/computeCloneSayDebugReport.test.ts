import { given, then, when } from 'test-fns';

import type { CloneScreenLive } from '../screen/genCloneScreenFeed';
import type { CloneGetReply } from './asCloneGetReply';
import {
  type CloneSayDebugCapture,
  type CloneSayReachFaultCapture,
  computeCloneSayDebugReport,
  computeCloneSayReachFaultReport,
  isCloneSayReachFaultCapture,
} from './computeCloneSayDebugReport';

const RULE = '─'.repeat(40);

/**
 * .what = a rendered grid in the shape a brain-cli draws — a turn above, a rule-bounded
 *   input band at the foot
 * .why = the band the classifier reads is index-relative (between the last two full-width
 *   rules), so a clamp of the RENDER must carry that shape; a flat block of text would
 *   prove the render works on a screen the read channel never sees
 */
const asGrid = (input: {
  box: string;
  extraTail?: string[];
}): CloneScreenLive => {
  const lines = [
    '> tell me a joke',
    '',
    '⏺ why did the wave break? it saw the surfboard.',
    '',
    RULE,
    input.box,
    RULE,
    ...(input.extraTail ?? []),
  ];
  return {
    live: true,
    lines,
    // every row BRIGHT — the debug report renders the grid, and never reads the dim signal
    linesBright: lines,
    cursorX: 2,
    cursorY: 5,
    cols: 40,
    rows: 8,
  };
};

const asCapableReply = (input: {
  focus: 'input' | 'modal' | 'unrecognized';
  region: 'clear' | 'dirty';
  countInInput: number;
  countOnScreen: number;
  // an EMPTY queue by default — the idle peer every extant case here models. the cases that
  // exercise the `enqueued` read set it explicitly, so the default states the common shape
  // rather than hides the field
  queued?: boolean;
  grid?: CloneScreenLive;
}): CloneGetReply => ({
  probe: 'capable',
  state: {
    focus: input.focus,
    input: input.region,
    countInInput: input.countInInput,
    countOnScreen: input.countOnScreen,
    queued: input.queued ?? false,
  },
  ...(input.grid === undefined ? {} : { grid: input.grid }),
});

describe('computeCloneSayDebugReport', () => {
  given(
    '[case1] the MEASURED residual — an `absent` on a dispatch whose bytes were delivered, read by a CAPABLE probe (2026-09-16)',
    () => {
      // the shape the dogfood produced three times over: the probe answered, the needle
      // never rose on screen, and the verdict fell past enqueued/buffered to the residual.
      // two rival causes produce it — the box read `dirty` at observe time, or the count
      // never rose — and the CLI alone could not part them. THIS render is what parts them
      const capture: CloneSayDebugCapture = {
        at: '2026-09-16T04:12:00.000Z',
        address: '@:joker',
        serial: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        slug: 'joker',
        message: 'plainascii probe alpha',
        force: false,
        target: 'enqueue',
        timeoutMs: 15000,
        baseline: {
          transcriptCount: 4,
          countInInput: 0,
          countOnScreen: 0,
        },
        baselineReply: asCapableReply({
          focus: 'input',
          region: 'clear',
          countInInput: 0,
          countOnScreen: 0,
          grid: asGrid({ box: '❯ ' }),
        }),
        observation: {
          refusal: null,
          transcriptRose: false,
          screen: {
            focus: 'input',
            input: 'dirty',
            countInInputRose: false,
            countOnScreenRose: false,
            // no queue: the residual is a dispatch that reached NO state at all, so a held
            // message would be the wrong fixture — a queued message is an `enqueued`, not an
            // `absent`
            queued: false,
          },
          probeReason: null,
        },
        outcome: {
          verdict: 'absent',
          reason: 'no-rise-observed',
          probe: 'capable',
          delivered: true,
        },
        trail: [
          {
            cycle: 0,
            sinceDispatchMs: 12,
            transcriptRose: false,
            reply: asCapableReply({
              focus: 'input',
              region: 'clear',
              countInInput: 0,
              countOnScreen: 0,
              grid: asGrid({ box: '❯ ' }),
            }),
          },
          {
            cycle: 1,
            sinceDispatchMs: 271,
            transcriptRose: false,
            reply: asCapableReply({
              focus: 'input',
              region: 'dirty',
              countInInput: 0,
              countOnScreen: 0,
              grid: asGrid({ box: '❯ Another joke?' }),
            }),
          },
        ],
      };

      when('[t0] the report is rendered', () => {
        const report = computeCloneSayDebugReport({ capture });

        then('it names the verdict and the reason slug', () => {
          expect(report).toContain('clone say — absent');
          expect(report).toContain('reason        no-rise-observed');
        });

        then(
          'it parts the two rival causes — the box read DIRTY at observe, and neither count rose',
          () => {
            expect(report).toContain('screen.input              dirty');
            expect(report).toContain('screen.countOnScreenRose  false');
            expect(report).toContain('screen.countInInputRose   false');
          },
        );

        then(
          'it prints the baseline the rises were measured against, so a reader checks the subtraction',
          () => {
            expect(report).toContain('countOnScreen    0');
            expect(report).toContain('baseline reply   probe=capable');
          },
        );

        then('it prints every observe cycle, in order, with its lag', () => {
          expect(report).toContain('#  0 +    12ms');
          expect(report).toContain('#  1 +   271ms');
          expect(report).toContain('(2 cycles)');
        });

        then(
          'it prints the exact grid rows the classifier saw — before AND after the dispatch',
          () => {
            // the box row that flipped the classification, verbatim, in both screens
            expect(report).toContain('│❯ │');
            expect(report).toContain('│❯ Another joke?│');
            // the geometry a band read depends on
            expect(report).toContain('cols=40 rows=8');
          },
        );

        then('it echoes the capture stamp it was handed', () => {
          // the ASSERTION that carries this line's coverage, because the snapshot below
          // masks it. the value is a fixed literal (`capture.at`, above), so this is exact
          expect(report).toContain('at            2026-09-16T04:12:00.000Z');
        });

        then('it locks the whole rendered shape', () => {
          // 🔴 the stamp is MASKED, and not because it drifts — `capture.at` is a fixed
          //   literal, so this render is deterministic. the repo's pre-commit gate
          //   (`.husky/check.timestamps.sh`) scans every staged non-`.ts`/`.sh` file for an
          //   `HH:MM:SS`, and it cannot part a fixed literal from a live clock. so a raw
          //   stamp in a committed `.snap` reads to that gate — and to a human — as a
          //   permadrift risk it is not
          // .why = the mask costs no coverage: the `then` above asserts the exact stamp, so
          //   what the snapshot still proves is the SHAPE (the label, the column, the line's
          //   place in the block), which is the whole reason it is snapped
          expect(
            report.replace(
              /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g,
              '__STAMP__',
            ),
          ).toMatchSnapshot();
        });
      });
    },
  );

  given(
    '[case2] a WITHHELD refusal — the pre-check refused, so no observe ever ran',
    () => {
      const capture: CloneSayDebugCapture = {
        at: '2026-09-16T04:20:00.000Z',
        address: '@:dirtybox',
        serial: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        slug: 'dirtybox',
        message: 'hello',
        force: false,
        target: 'enqueue',
        timeoutMs: 15000,
        baseline: { transcriptCount: 2, countInInput: 0, countOnScreen: 0 },
        baselineReply: asCapableReply({
          focus: 'input',
          region: 'dirty',
          countInInput: 0,
          countOnScreen: 0,
          grid: asGrid({ box: '❯ a human was mid-type' }),
        }),
        observation: {
          refusal: 'input-region-dirty',
          transcriptRose: false,
          screen: null,
          probeReason: null,
        },
        outcome: {
          verdict: 'withheld',
          reason: 'input-region-dirty',
          probe: 'capable',
          delivered: false,
        },
        trail: [],
      };

      when('[t0] the report is rendered', () => {
        const report = computeCloneSayDebugReport({ capture });

        then(
          'the empty trail is EXPLAINED, never left as a silent blank',
          () => {
            expect(report).toContain('(0 cycles)');
            expect(report).toContain(
              '(no observe ran — a withheld refusal never reaches the poll)',
            );
          },
        );

        then('the absent post-dispatch grid is explained too', () => {
          expect(report).toContain('(no probe ran at this point)');
        });

        then(
          'the pre-dispatch grid still shows the human text the pre-check refused over',
          () => {
            expect(report).toContain('│❯ a human was mid-type│');
          },
        );
      });
    },
  );

  given(
    '[case3] a PROBE-BLIND read — the feed handed back no grid at all',
    () => {
      const blind: CloneGetReply = {
        probe: 'unsupported',
        reason: 'peer-probe-blind',
      };
      const capture: CloneSayDebugCapture = {
        at: '2026-09-16T04:30:00.000Z',
        address: '@:olddaemon',
        serial: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        slug: null,
        message: 'hello',
        force: false,
        target: 'enqueue',
        timeoutMs: 15000,
        baseline: {
          transcriptCount: 0,
          countInInput: null,
          countOnScreen: null,
        },
        baselineReply: blind,
        observation: {
          refusal: null,
          transcriptRose: false,
          screen: null,
          probeReason: 'peer-probe-blind',
        },
        outcome: {
          verdict: 'unreadable',
          reason: 'peer-probe-blind',
          probe: 'unsupported',
          delivered: true,
        },
        trail: [
          {
            cycle: 0,
            sinceDispatchMs: 9,
            transcriptRose: false,
            reply: blind,
          },
        ],
      };

      when('[t0] the report is rendered', () => {
        const report = computeCloneSayDebugReport({ capture });

        then(
          'an UNMEASURED baseline count is spelled out, never printed as a bare 0',
          () => {
            expect(report).toContain(
              'countInInput     unmeasured (probe-blind)',
            );
            expect(report).toContain(
              'countOnScreen    unmeasured (probe-blind)',
            );
          },
        );

        then('the absent grids name the probe-blind cause', () => {
          expect(report).toContain(
            '(probe-blind: peer-probe-blind — the feed handed back no grid)',
          );
        });

        then('a null slug renders as an explicit none', () => {
          expect(report).toContain('slug          (none)');
        });
      });
    },
  );

  given(
    '[case4] a CAPABLE read whose reply carried no grid (an older daemon, or a grid the parse rejected)',
    () => {
      const capture: CloneSayDebugCapture = {
        at: '2026-09-16T04:40:00.000Z',
        address: '@:nogrid',
        serial: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        slug: 'nogrid',
        message: 'hello',
        force: false,
        target: 'enqueue',
        timeoutMs: 15000,
        baseline: { transcriptCount: 0, countInInput: 0, countOnScreen: 0 },
        baselineReply: asCapableReply({
          focus: 'input',
          region: 'clear',
          countInInput: 0,
          countOnScreen: 0,
        }),
        observation: {
          refusal: null,
          transcriptRose: false,
          screen: {
            focus: 'input',
            input: 'clear',
            countInInputRose: false,
            countOnScreenRose: false,
            queued: false,
          },
          probeReason: null,
        },
        outcome: {
          verdict: 'absent',
          reason: 'no-rise-observed',
          probe: 'capable',
          delivered: true,
        },
        trail: [
          {
            cycle: 0,
            sinceDispatchMs: 5,
            transcriptRose: false,
            reply: asCapableReply({
              focus: 'input',
              region: 'clear',
              countInInput: 0,
              countOnScreen: 0,
            }),
          },
        ],
      };

      when('[t0] the report is rendered', () => {
        const report = computeCloneSayDebugReport({ capture });

        then(
          'the absent grid is named OUTRIGHT — a silent blank would read as an empty screen',
          () => {
            expect(report).toContain(
              '(the reply carried a classification but no grid — an older daemon, or a grid the wire parse rejected)',
            );
          },
        );

        then('the classification it DID carry is still printed in full', () => {
          expect(report).toContain(
            'probe=capable focus=input input=clear countInInput=0 countOnScreen=0',
          );
        });
      });
    },
  );

  given(
    '[case4] a `withheld` on a box the BRAIN drew — the dim signal a reader cannot see in rendered text',
    () => {
      // 🔴 the measured diagnosis gap, 2026-09-18. a live say returned
      // `withheld`/`input-region-dirty` and the snapshot's rendered grid showed
      // `❯ add uname to the allowlist` in the box — the brain's own suggested next turn.
      //
      // two rival causes produce that exact snapshot, and the rendered text cannot part them:
      //   (a) the brain drew it DIM and the dim read failed to reach it
      //   (b) the brain drew it BRIGHT, so no dim signal ever existed to read
      //
      // the remedies are opposite — (a) is a defect in the read, (b) is a defect in the
      // premise the whole dim cure rests on. so the report must print the bright-only grid,
      // and this clamp is what holds it there
      const DIM_BOX = '❯ add uname to the allowlist';
      const lines = ['● prior turn output', RULE, DIM_BOX, RULE];
      const grid: CloneScreenLive = {
        live: true,
        lines,
        // the box row is DIM — brain chrome — so it blanks here while the turn above survives
        linesBright: lines.map((line) => (line === DIM_BOX ? '' : line)),
        cursorX: 2,
        cursorY: 2,
        cols: 40,
        rows: 4,
      };

      const capture: CloneSayDebugCapture = {
        at: '2026-09-18T00:27:48.175Z',
        address: '@:modal1',
        serial: 'caaccaca-4831-44e7-8ec3-340b2210a659',
        slug: 'modal1',
        message: '/model',
        force: false,
        target: 'enqueue',
        timeoutMs: 15000,
        baseline: { transcriptCount: 0, countInInput: 0, countOnScreen: 0 },
        baselineReply: asCapableReply({
          focus: 'input',
          region: 'dirty',
          countInInput: 0,
          countOnScreen: 0,
          grid,
        }),
        observation: {
          refusal: 'input-region-dirty',
          transcriptRose: false,
          screen: null,
          probeReason: null,
        },
        outcome: {
          verdict: 'withheld',
          reason: 'input-region-dirty',
          probe: 'capable',
          delivered: false,
        },
        trail: [],
      };

      when('[t0] the report is rendered', () => {
        const report = computeCloneSayDebugReport({ capture });

        then('the BRIGHT-ONLY grid is printed, and says what it is for', () => {
          // goes RED under the pre-cure renderer, which printed the rendered grid alone
          expect(report).toContain(
            'BRIGHT ONLY (dim cells blanked; this is what the dirty/clear read sees)',
          );
        });

        then('the dim box row is legible as BLANK in the bright grid', () => {
          // the diagnosis itself: the row is present in the rendered grid and absent from the
          // bright one, so a reader reads cause (a) — a dim signal WAS available
          //
          // .note = the index is asserted FOUND first, and that guard is not decoration. the
          //   mutation dogfood caught this clamp PASSING with the whole bright section deleted:
          //   `indexOf` returned -1, `slice(-1)` handed back the final character, and an
          //   absent-text assertion over one character is true for free. a clamp that holds
          //   under the very mutation it exists to catch is worse than absent — it reads as
          //   protection and guards naught
          const brightStart = report.indexOf('BRIGHT ONLY');
          expect(brightStart).toBeGreaterThan(-1);
          const before = report.slice(0, brightStart);
          const after = report.slice(brightStart);
          expect(before).toContain(DIM_BOX);
          expect(after).not.toContain(DIM_BOX);
        });

        then('the bright grid keeps the BRIGHT rows verbatim', () => {
          // the counter-half: a renderer that blanked every row would satisfy the clamp above
          // while it proved naught. the turn row is bright, so it must survive
          const after = report.slice(report.indexOf('BRIGHT ONLY'));
          expect(after).toContain('● prior turn output');
        });

        then('both grids print the SAME row indices', () => {
          // the index-alignment claim the classifier's band math rests on. row 2 is the box in
          // both, so a reader can compare row N to row N rather than hunt for a text that fits
          const after = report.slice(report.indexOf('BRIGHT ONLY'));
          expect(after).toContain('      2 ││');
          expect(report).toContain(`      2 │${DIM_BOX}│`);
        });
      });
    },
  );
});

/**
 * .what = the MEASURED wedge — a dispatch that threw at exactly the 30s floor while its
 *   message demonstrably landed (joker t3/t5, 2026-09-18)
 * .why = the fault this arm exists for. `sayClone` raised it, so no verdict, no observation,
 *   and no observe trail were ever computed — and before this arm existed the run wrote no
 *   diagnostic at all
 */
const asWedgeCapture = (
  input: { baselineReply?: CloneGetReply } = {},
): CloneSayReachFaultCapture => ({
  at: '2026-09-18T06:01:17.000Z',
  address: '@:joker',
  serial: 'ba2ba0e5-0000-0000-0000-000000000000',
  slug: 'joker',
  message: 'one more joke, marker t3',
  force: false,
  target: 'enqueue',
  timeoutMs: 15_000,
  baseline: { transcriptCount: 0, countInInput: 0, countOnScreen: 0 },
  baselineReply:
    input.baselineReply ??
    asCapableReply({
      focus: 'input',
      region: 'clear',
      countInInput: 0,
      countOnScreen: 0,
      grid: asGrid({ box: '❯ ' }),
    }),
  fault: {
    class: 'MalfunctionError',
    message: 'the clone did not settle the dispatch',
    reachState: null,
    reachCause: 'wedged',
    sinceDispatchMs: 30_000,
  },
});

describe('computeCloneSayReachFaultReport', () => {
  given(
    '[case1] the MEASURED wedge — a throw at the 30s floor, upstream of every verdict',
    () => {
      const capture = asWedgeCapture();

      when('[t0] the reach fault is rendered', () => {
        const report = computeCloneSayReachFaultReport({ capture });

        then(
          'the header names a REACH FAULT, never one of the six verdicts',
          () => {
            // 🔴 the discrimination that matters most to a reader who scans a day log: a wedge
            // is NOT an `absent`. to render it under a verdict word would invite a diagnosis
            // against machinery that never ran
            expect(report).toContain(
              '═══ clone say — REACH FAULT (no verdict) ═══',
            );
          },
        );

        then('the fault carries its class, cause, and ELAPSED time', () => {
          // the elapsed time is the field that carries the diagnosis: 30000ms is the
          // wedged-timeout FLOOR, so it names a timer. a fault at 12ms would name a dead
          // socket instead — one number parts two causes that share an error class
          expect(report).toContain('class            MalfunctionError');
          expect(report).toContain('reachCause       wedged');
          expect(report).toContain(
            'threw after      30000ms from the dispatch write',
          );
        });

        then('the absent halves are named OUTRIGHT, not left blank', () => {
          // rule.forbid.failhide at the report grain: a silently absent trail section would
          // read as "the poll ran and saw no cycles", which is a different and wrong diagnosis
          expect(report).toContain('what this capture does NOT hold, and why');
          expect(report).toContain('`sayClone` threw,');
        });

        then('the pre-dispatch baseline is present in FULL', () => {
          // the whole diagnostic value: the baseline is computed BEFORE the throw, so a wedge
          // capture is exactly as complete as a verdict capture on its pre-dispatch half
          expect(report).toContain(
            '── the pre-dispatch baseline (every rise above is measured against THIS) ──',
          );
          expect(report).toContain(
            'baseline reply   probe=capable focus=input input=clear countInInput=0 countOnScreen=0',
          );
        });

        then('the BEFORE screen is rendered verbatim', () => {
          // what a wedge is actually read by — a diff of this screen against the before-screen
          // of a dispatch that succeeded
          expect(report).toContain('BEFORE the dispatch (the baseline probe)');
          expect(report).toContain('> tell me a joke');
        });

        then(
          'it claims NO after-screen — there was no cycle to read one from',
          () => {
            expect(report).not.toContain('AFTER the dispatch');
          },
        );
      });
    },
  );

  given('[case2] a wedge against a PROBE-BLIND peer', () => {
    // the compound case a daemon actually hits: an older peer answers no probe AND the
    // dispatch wedges. the report must degrade on the screen half and keep the fault whole
    const capture = asWedgeCapture({
      baselineReply: { probe: 'unsupported', reason: 'peer-probe-blind' },
    });

    when('[t0] the reach fault is rendered', () => {
      const report = computeCloneSayReachFaultReport({ capture });

      then('the fault still renders in full', () => {
        expect(report).toContain('reachCause       wedged');
        expect(report).toContain(
          'threw after      30000ms from the dispatch write',
        );
      });

      then('the absent screen names its probe-blind cause', () => {
        expect(report).toContain(
          '(probe-blind: peer-probe-blind — the feed handed back no grid)',
        );
      });
    });
  });
});

describe('isCloneSayReachFaultCapture', () => {
  // the discriminant the one writer routes on. it is the `fault` field's PRESENCE rather than
  // a `kind` tag, precisely so the extant verdict capture needed no edit — so a clamp must
  // prove BOTH arms sort correctly, else a tag-free union is a silent mis-route in wait
  given('[case1] the two capture shapes', () => {
    when('[t0] each is sorted', () => {
      then('a reach fault is recognized', () => {
        expect(isCloneSayReachFaultCapture(asWedgeCapture())).toEqual(true);
      });

      then('a decided verdict is NOT', () => {
        const verdict: CloneSayDebugCapture = {
          at: '2026-09-18T06:01:17.000Z',
          address: '@:joker',
          serial: 'ba2ba0e5-0000-0000-0000-000000000000',
          slug: 'joker',
          message: 'one more joke',
          force: false,
          target: 'enqueue',
          timeoutMs: 15_000,
          baseline: { transcriptCount: 0, countInInput: 0, countOnScreen: 0 },
          baselineReply: asCapableReply({
            focus: 'input',
            region: 'clear',
            countInInput: 0,
            countOnScreen: 0,
          }),
          observation: {
            refusal: null,
            transcriptRose: true,
            probeReason: null,
            screen: {
              focus: 'input',
              input: 'clear',
              countInInputRose: false,
              countOnScreenRose: true,
              // 🔴 this field carries weight here; it is no fixture filler. a `released` verdict is
              // NOT the transcript rise alone — the brain writes the user turn at SUBMIT, so a rise
              // is satisfied by a queued message too (measured 2026-09-18). an EMPTY queue is what
              // parts the two, so a `queued: true` here would make this capture's `released`
              // incoherent
              queued: false,
            },
          },
          outcome: {
            verdict: 'released',
            reason: null,
            probe: 'capable',
            delivered: true,
          },
          trail: [],
        };
        expect(isCloneSayReachFaultCapture(verdict)).toEqual(false);
      });
    });
  });
});
