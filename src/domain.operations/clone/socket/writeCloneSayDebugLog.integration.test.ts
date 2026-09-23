import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type {
  CloneSayDebugCapture,
  CloneSayReachFaultCapture,
} from './computeCloneSayDebugReport';
import { getCloneSayDebugLogPath } from './getCloneSayDebugLogPath';
import { writeCloneSayDebugLog } from './writeCloneSayDebugLog';

/**
 * .what = a minimal capture for a `buffered` failure — the shape the CLI hands the writer
 * .why = the RENDER is clamped at the unit grain (computeCloneSayDebugReport.test). this
 *   file clamps the I/O half only: where the bytes land, and what happens when they cannot
 */
const asCapture = (): CloneSayDebugCapture => ({
  at: '2026-09-16T04:12:00.000Z',
  address: '@:writer',
  serial: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  slug: 'writer',
  message: 'NEEDLE-writeclamp',
  force: false,
  target: 'enqueue',
  timeoutMs: 15000,
  baseline: { transcriptCount: 0, countInInput: 0, countOnScreen: 0 },
  baselineReply: { probe: 'unsupported', reason: 'peer-probe-blind' },
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
  trail: [],
});

/**
 * .what = a reach-fault capture — the shape the CLI hands the writer when `sayClone` THREW
 * .why = the fault arm shares this writer, so the I/O half must be clamped for it too: a
 *   wedge that lands in a different file, or under a verdict header, is a wedge a reader
 *   cannot find beside the successes it must be read against
 */
const asFaultCapture = (): CloneSayReachFaultCapture => ({
  at: '2026-09-18T06:01:17.000Z',
  address: '@:writer',
  serial: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  slug: 'writer',
  message: 'NEEDLE-wedge',
  force: false,
  target: 'enqueue',
  timeoutMs: 15000,
  baseline: { transcriptCount: 0, countInInput: 0, countOnScreen: 0 },
  baselineReply: { probe: 'unsupported', reason: 'peer-probe-blind' },
  fault: {
    class: 'MalfunctionError',
    message: 'the clone did not settle the dispatch',
    reachState: null,
    reachCause: 'wedged',
    sinceDispatchMs: 30_000,
  },
});

describe('writeCloneSayDebugLog.integration', () => {
  given('[case1] a writable repo', () => {
    when('[t0] one failure is written', () => {
      const scene = useBeforeAll(async () => {
        const repoPath = genTempDir({ slug: 'sayDebugWrite-ok' });
        const at = new Date(2026, 8, 16, 4, 12);
        const path = writeCloneSayDebugLog({
          repoPath,
          capture: asCapture(),
          at,
        });
        return { repoPath, at, path };
      });

      then(
        'it lands at the declared coordinate and hands that path back',
        () => {
          expect(scene.path).toEqual(
            getCloneSayDebugLogPath({ repoPath: scene.repoPath, at: scene.at }),
          );
          expect(scene.path).toContain(
            join('.agent', '.cache', 'repo=rhachet', 'skill=clone-say'),
          );
          expect(existsSync(scene.path!)).toEqual(true);
        },
      );

      then('the file holds the rendered report', () => {
        const body = readFileSync(scene.path!, 'utf8');
        expect(body).toContain('clone say — unreadable');
        expect(body).toContain('NEEDLE-writeclamp');
      });
    });

    // a day of failures reads side by side, so the write APPENDS rather than truncates —
    // a second failure must not erase the first one's evidence
    when('[t1] a SECOND failure is written the same day', () => {
      const scene = useBeforeAll(async () => {
        const repoPath = genTempDir({ slug: 'sayDebugWrite-append' });
        const at = new Date(2026, 8, 16, 4, 12);
        const first = asCapture();
        const second = { ...asCapture(), message: 'NEEDLE-second' };
        writeCloneSayDebugLog({ repoPath, capture: first, at });
        const path = writeCloneSayDebugLog({ repoPath, capture: second, at });
        return { path };
      });

      then('both captures are present — the write appends', () => {
        const body = readFileSync(scene.path!, 'utf8');
        expect(body).toContain('NEEDLE-writeclamp');
        expect(body).toContain('NEEDLE-second');
        expect(body.match(/═══ end ═══/g)).toHaveLength(2);
      });
    });

    // 🔴 the arm that closes the instrument gap: a reach fault (`wedged`,
    //   `exited-mid-dispatch`) is raised BY `sayClone`, upstream of every verdict, so it
    //   bypassed the capture entirely. measured 2026-09-18 — a joker run wedged twice at
    //   exactly 30000ms while both messages LANDED, and left no diagnostic at all
    when('[t2] a REACH FAULT is written — no verdict was ever computed', () => {
      const scene = useBeforeAll(async () => {
        const repoPath = genTempDir({ slug: 'sayDebugWrite-fault' });
        const at = new Date(2026, 8, 18, 6, 1);
        const path = writeCloneSayDebugLog({
          repoPath,
          capture: asFaultCapture(),
          at,
        });
        return { path };
      });

      then('it lands in the SAME day log as a verdict capture', () => {
        // one log, one writer, one path — a reader scans a single file and sees a wedge
        // beside the successes it must be diffed against
        expect(existsSync(scene.path!)).toEqual(true);
        expect(scene.path).toContain(
          join('.agent', '.cache', 'repo=rhachet', 'skill=clone-say'),
        );
      });

      then('the writer routed to the FAULT render, not the verdict one', () => {
        // the discriminant is the `fault` field's presence, so this is the clamp that a
        // tag-free union routes correctly through the real writer rather than in theory
        const body = readFileSync(scene.path!, 'utf8');
        expect(body).toContain('clone say — REACH FAULT (no verdict)');
        expect(body).toContain('NEEDLE-wedge');
        expect(body).toContain('reachCause       wedged');
        expect(body).toContain(
          'threw after      30000ms from the dispatch write',
        );
      });

      then('it claims no verdict and no after-screen', () => {
        // the counter-clamp: a mis-route to the verdict render would print `undefined` here
        // rather than fail, so the absence is what proves the route
        const body = readFileSync(scene.path!, 'utf8');
        expect(body).not.toContain('── the verdict ──');
        expect(body).not.toContain('AFTER the dispatch');
        expect(body).not.toContain('undefined');
      });
    });
  });

  // ⚠️ THE guarantee this file exists for. the writer runs AFTER a verdict, on a dispatch
  //   whose bytes may already have reached the pty. a throw here would convert a `buffered`
  //   into a crash — the exact false-failure-on-a-landed-message class this wish kills,
  //   reintroduced by the diagnostic meant to explain it
  given(
    '[case2] a repo where the log path CANNOT be created (a plain file blocks the dir)',
    () => {
      when('[t0] a failure is written into it', () => {
        const scene = useBeforeAll(async () => {
          const repoPath = genTempDir({ slug: 'sayDebugWrite-blocked' });
          // plant a FILE where the `.agent` directory must go, so `mkdirSync` throws
          // ENOTDIR — a real, reproducible fs fault that needs no permission games and
          // behaves the same for root (a chmod-based clamp does not)
          writeFileSync(join(repoPath, '.agent'), 'not a directory', 'utf8');

          // .note = deliberate mutation — a local trace sink, so the clamp reads what the
          //   operator would see without a spy on the process (the injected-sink shape)
          const traced: string[] = [];
          const path = writeCloneSayDebugLog({
            repoPath,
            capture: asCapture(),
            at: new Date(2026, 8, 16, 4, 12),
            traceToStderr: (line) => traced.push(line),
          });
          return { path, traced };
        });

        then('it does NOT throw — it hands back null', () => {
          expect(scene.path).toBeNull();
        });

        then(
          'the fault is TRACED, never swallowed (rule.forbid.failhide)',
          () => {
            expect(scene.traced).toHaveLength(1);
            expect(scene.traced[0]).toContain(
              'clone say debug log write failed',
            );
            // the verdict is explicitly still good — a reader must not conclude the say
            // itself broke because its diagnostic did
            expect(scene.traced[0]).toContain('the verdict stands');
          },
        );
      });
    },
  );
});
