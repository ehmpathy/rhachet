import { given, then, when } from 'test-fns';

import type { CloneMessage } from '../socket/asCloneMessage';
import { asCloneConversationText } from './asCloneConversationText';

const CONVERSATION: CloneMessage[] = [
  {
    direction: 'in',
    text: 'wrap up and commit what you have',
    at: '2026-08-14T12:00:00Z',
  },
  {
    direction: 'out',
    text: 'on it — commit the WIP now 🐢\ndone, pushed to the branch.',
    // 65 minutes after T0 → T0+01H05M (exercises the hour+minute split)
    at: '2026-08-14T13:05:00Z',
  },
];

describe('asCloneConversationText', () => {
  given('[case1] a two-turn in/out conversation', () => {
    when('[t0] rendered as blocks (the default treebucket)', () => {
      then(
        'a `😶🎧 talk of <addr>` root names whose talk + the tail cap, each turn a directioned branch',
        () => {
          const tree = asCloneConversationText(
            { messages: CONVERSATION, tail: 20, address: '@:driver' },
            { format: 'blocks' },
          );
          // the root names whose talk this is (the clone address) + the tail cap, so a
          // short view explains itself
          expect(tree).toContain('😶🎧 talk of @:driver  ·  tail 20');
          // each turn is a `├─`/`└─` branch: the direction glyph (🎙️ in / 🎧 out) + the
          // relative offset, no words, no dot
          expect(tree).toContain('├─ 🎙️ T0+00H00M');
          expect(tree).toContain('└─ 🎧 T0+01H05M');
          // the inbound body sits in a sub.bucket under a `   │  ` continuation (non-last turn)
          expect(tree).toContain('   │  │  wrap up and commit what you have');
          // a multi-line reply keeps every line in the last turn's `      │  ` sub.bucket
          expect(tree).toContain('      │  on it — commit the WIP now 🐢');
          expect(tree).toContain('      │  done, pushed to the branch.');
          // the trunk `│` bridges the header down into the first branch — no
          // bare blank line, the treestruct reads connected
          expect(tree).toContain(
            '😶🎧 talk of @:driver  ·  tail 20\n   │\n   ├─ 🎙️ T0+00H00M',
          );
          // between turns too, the trunk's `│` continues through the separator —
          // a bare blank line there would break the treestruct's visual connection
          expect(tree).toContain('   │  └─\n   │\n   └─ 🎧 T0+01H05M');
          expect(tree).toMatchSnapshot();
        },
      );
    });

    when('[t0] rendered as raw (the relay path)', () => {
      then('only the outbound replies survive, bare, no glyphs', () => {
        const raw = asCloneConversationText(
          { messages: CONVERSATION, tail: 20, address: '@:driver' },
          { format: 'raw' },
        );
        expect(raw).not.toContain('🎙️');
        expect(raw).not.toContain('talk of');
        expect(raw).not.toContain('wrap up and commit');
        expect(raw).toEqual(
          'on it — commit the WIP now 🐢\ndone, pushed to the branch.',
        );
        expect(raw).toMatchSnapshot();
      });
    });

    when('[t0] rendered as blocks with --tail all', () => {
      then('the root names `tail all` so the human sees the whole cap', () => {
        const tree = asCloneConversationText(
          { messages: CONVERSATION, tail: 'all', address: '@:driver' },
          { format: 'blocks' },
        );
        expect(tree).toContain('😶🎧 talk of @:driver  ·  tail all');
      });
    });
  });

  given('[case2] an empty conversation', () => {
    when('[t0] rendered as blocks (the human default)', () => {
      then(
        'the root + an explicit empty-state leaf, never blank stdout',
        () => {
          // rule.require.status-feedback: a human read must never be blank — the
          // labelled leaf distinguishes "no history yet" from a silent failure
          expect(
            asCloneConversationText(
              { messages: [], tail: 20, address: '@:driver' },
              { format: 'blocks' },
            ),
          ).toEqual(
            '😶🎧 talk of @:driver  ·  tail 20\n   │\n   └─ (no messages yet)',
          );
        },
      );
    });

    when('[t0] rendered as raw (the relay path)', () => {
      then('a bare empty string, pipe-clean for a comms relay', () => {
        // the machine/pipe stream stays label-free — a human-read marker
        // would corrupt what a relay forwards verbatim
        expect(
          asCloneConversationText(
            { messages: [], tail: 20, address: '@:driver' },
            { format: 'raw' },
          ),
        ).toEqual('');
      });
    });
  });

  given('[case3] a turn with no timestamp (a brain that omits it)', () => {
    when('[t0] rendered as blocks', () => {
      then(
        'the turn renders without a `T0+` offset, never a broken one',
        () => {
          const tree = asCloneConversationText(
            {
              messages: [{ direction: 'out', text: 'hi', at: null }],
              tail: 20,
              address: '@:driver',
            },
            { format: 'blocks' },
          );
          expect(tree).toContain('└─ 🎧');
          expect(tree).not.toContain('T0+');
        },
      );
    });
  });
});
