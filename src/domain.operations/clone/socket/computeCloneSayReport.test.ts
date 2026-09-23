import { computeCloneSayReport } from './computeCloneSayReport';
import type { CloneSayOutcome } from './computeCloneSayVerdict';

const TEST_CASES: {
  description: string;
  given: CloneSayOutcome;
  /**
   * the dispatched message, where the case turns on it. absent → a plain PROMPT, which is the
   * class every extant row exercises; only the `enqueued` advisory branches on it (r029)
   */
  givenMessage?: string;
  expect: {
    channel: 'success' | 'failure';
    tree?: string;
    klass?: 'constraint' | 'malfunction';
    treeIncludes?: string;
  };
}[] = [
  {
    description: 'released → success, the extant tree line byte-for-byte (V13)',
    given: {
      verdict: 'released',
      reason: null,
      probe: 'capable',
      delivered: true,
    },
    expect: { channel: 'success', tree: '😶🎙️ said to @:x' },
  },
  {
    description:
      'released + peer-probe-blind → success, transcript-only degrade names re-enroll (r008-i004-b1)',
    given: {
      verdict: 'released',
      reason: 'peer-probe-blind',
      probe: 'unsupported',
      delivered: true,
    },
    expect: { channel: 'success', treeIncludes: 're-enroll' },
  },
  {
    description:
      'released + feed-not-live → success, transcript-only degrade self-heals, NO re-enroll (r008-i004-b1)',
    given: {
      verdict: 'released',
      reason: 'feed-not-live',
      probe: 'unsupported',
      delivered: true,
    },
    expect: { channel: 'success', treeIncludes: 'self-heals' },
  },
  {
    description:
      'released + feed-faulted → success, transcript-only degrade names re-enroll, NOT self-heal (the faulted emulator never heals on a wait)',
    given: {
      verdict: 'released',
      reason: 'feed-faulted',
      probe: 'unsupported',
      delivered: true,
    },
    expect: { channel: 'success', treeIncludes: 're-enroll' },
  },
  {
    description: 'enqueued → success, a distinct tree line',
    given: {
      verdict: 'enqueued',
      reason: null,
      probe: 'capable',
      delivered: true,
    },
    expect: {
      channel: 'success',
      // the second line DISCLOSES the non-durability the vision names — a caller told not to
      // re-send an enqueued must know the hold dies with an aborted turn (r010-i011-n2)
      tree: [
        '😶🎙️ enqueued for @:x — mid-turn; lands next',
        '   └─ 🟡 held behind the active turn, not yet taken — if that turn is aborted (ctrl-C, crash, prune) the hold dies with it, unsent',
      ].join('\n'),
    },
  },
  {
    // 🔴 r029: the same verdict, the OPPOSITE advisory. a `/…` client command is consumed by the
    // brain-cli at submit and never enters the model's turn queue, so the prompt row's two clauses
    // — "held behind the active turn" and "an abort drops it" — are both FALSE here. measured
    // 2026-09-20: `/model` had already executed while the turn was still live, and the say still
    // printed the turn-hold line. this row locks the split so it cannot silently merge back
    description:
      'enqueued + a /… client command → success, and the advisory does NOT claim a turn hold (r029)',
    given: {
      verdict: 'enqueued',
      reason: null,
      probe: 'capable',
      delivered: true,
    },
    givenMessage: '/model claude-sonnet-5[1m]',
    expect: {
      channel: 'success',
      tree: [
        '😶🎙️ enqueued for @:x — a /… client command; the client takes it at submit',
        '   └─ 🟡 a client command is consumed by the brain-cli itself, never queued as a model turn — so it is not held behind the active turn, and an aborted turn cannot drop it',
      ].join('\n'),
    },
  },
  {
    description: 'withheld modal → failure, constraint class (exit 2)',
    given: {
      verdict: 'withheld',
      reason: 'modal-holds-focus',
      probe: 'capable',
      delivered: false,
    },
    expect: { channel: 'failure', klass: 'constraint' },
  },
  {
    description: 'withheld dirty → failure, constraint, names --force',
    given: {
      verdict: 'withheld',
      reason: 'input-region-dirty',
      probe: 'capable',
      delivered: false,
    },
    expect: {
      channel: 'failure',
      klass: 'constraint',
      treeIncludes: '--force',
    },
  },
  {
    description:
      'withheld unrecognized → failure, constraint, names the unrecognized screen (the third withheld reason — a peer of modal + dirty)',
    given: {
      verdict: 'withheld',
      reason: 'focus-unrecognized',
      probe: 'capable',
      delivered: false,
    },
    expect: {
      channel: 'failure',
      klass: 'constraint',
      treeIncludes: 'unrecognized',
    },
  },
  {
    description: 'buffered → failure, malfunction class (exit 1)',
    given: {
      verdict: 'buffered',
      reason: 'input-region-holds-text',
      probe: 'capable',
      delivered: true,
    },
    expect: { channel: 'failure', klass: 'malfunction' },
  },
  {
    description: 'absent → failure, malfunction class (exit 1)',
    given: {
      verdict: 'absent',
      reason: 'no-rise-observed',
      probe: 'capable',
      delivered: true,
    },
    expect: { channel: 'failure', klass: 'malfunction' },
  },
  {
    description:
      'unreadable feed-not-live → failure, malfunction, names the wait (r9.n1)',
    given: {
      verdict: 'unreadable',
      reason: 'feed-not-live',
      probe: 'unsupported',
      delivered: true,
    },
    expect: {
      channel: 'failure',
      klass: 'malfunction',
      treeIncludes: 'wait',
    },
  },
  {
    description:
      'unreadable feed-faulted → failure, malfunction, names re-enroll (NOT a wait — the emulator threw)',
    given: {
      verdict: 'unreadable',
      reason: 'feed-faulted',
      probe: 'unsupported',
      delivered: true,
    },
    expect: {
      channel: 'failure',
      klass: 'malfunction',
      treeIncludes: 're-enroll',
    },
  },
  {
    description:
      'unreadable peer-probe-blind → failure, malfunction, names re-enroll (r9.n1)',
    given: {
      verdict: 'unreadable',
      reason: 'peer-probe-blind',
      probe: 'unsupported',
      delivered: true,
    },
    expect: {
      channel: 'failure',
      klass: 'malfunction',
      treeIncludes: 're-enroll',
    },
  },
];

describe('computeCloneSayReport', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      const report = computeCloneSayReport({
        outcome: thisCase.given,
        addressShown: '@:x',
        // a plain prompt unless the case names otherwise — the class every row but the
        // client-command one exercises
        message: thisCase.givenMessage ?? 'reply with exactly PONG',
      });
      expect(report.channel).toEqual(thisCase.expect.channel);
      // lock the EXACT rendered copy a caller reads — every success tree line and every
      // failure class/message/hint — so any drift in a user-faced line ships loud (r9.b2)
      expect(report).toMatchSnapshot();
      if (report.channel === 'success' && thisCase.expect.tree)
        expect(report.tree).toEqual(thisCase.expect.tree);
      if (report.channel === 'success' && thisCase.expect.treeIncludes)
        expect(report.tree).toContain(thisCase.expect.treeIncludes);
      if (report.channel === 'failure') {
        expect(report.klass).toEqual(thisCase.expect.klass);
        // every failure names a fix (rule.require.errors-name-the-fix)
        expect(report.hint.length).toBeGreaterThan(0);
        if (thisCase.expect.treeIncludes)
          expect(`${report.message} ${report.hint}`).toContain(
            thisCase.expect.treeIncludes,
          );
      }
    }),
  );
});
