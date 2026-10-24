import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { asBrainDirBootFailureLines } from './asBrainDirBootFailureLines';

describe('asBrainDirBootFailureLines', () => {
  given('[case1] a ConstraintError with metadata and a hint', () => {
    when('[t0] reported', () => {
      const lines = asBrainDirBootFailureLines({
        failure: {
          scope: { kind: 'actor', actorExid: 'hash=abc12345' },
          cause: new ConstraintError(
            'actor abc12345 enrolled a role no longer linked: gone',
            {
              hint: 'rhx roles link --role gone',
              actorExid: 'abc12345',
              slugsUnlinked: ['gone'],
            },
          ),
        },
      });

      then('the headline names the scope alone, one glyph', () => {
        expect(lines[0]).toEqual('✗ brain://hash=abc12345/boot.md not written');
      });

      then('the class and the reason ride as the first branch', () => {
        expect(lines[1]).toEqual(
          '   ├─ ✋ ConstraintError: actor abc12345 enrolled a role no longer linked: gone',
        );
      });

      then(
        'every metadata field rides on a line of its own, a list one leaf per item, hint last',
        () => {
          expect(lines.slice(2)).toEqual([
            '   ├─ actorExid = abc12345',
            '   ├─ slugsUnlinked',
            '   │  └─ gone',
            '   └─ hint = rhx roles link --role gone',
          ]);
        },
      );
    });
  });

  given(
    '[case1.1] a ConstraintError with a multi-item list and an empty list',
    () => {
      when('[t0] reported', () => {
        const lines = asBrainDirBootFailureLines({
          failure: {
            scope: { kind: 'repo' },
            cause: new ConstraintError(
              "role 'mechanic' declares no subject 'gone'",
              {
                hint: 'rhx init --roles +mechanic::flow',
                declared: ['code.prod', 'flow'],
                unlinked: [],
              },
            ),
          },
        });

        then('each item rides its own leaf; an empty list reads []', () => {
          expect(lines).toEqual([
            '✗ brain://repo=ambient/boot.md not written',
            "   ├─ ✋ ConstraintError: role 'mechanic' declares no subject 'gone'",
            '   ├─ declared',
            '   │  ├─ code.prod',
            '   │  └─ flow',
            '   ├─ unlinked = []',
            '   └─ hint = rhx init --roles +mechanic::flow',
          ]);
        });
      });
    },
  );

  given('[case2] a MalfunctionError with no hint', () => {
    when('[t0] reported', () => {
      const lines = asBrainDirBootFailureLines({
        failure: {
          scope: { kind: 'repo' },
          cause: new MalfunctionError(
            'brain dir boot.md could not be written',
            {
              brainDir: '/repo/x',
            },
          ),
        },
      });

      then(
        'the headline, the class, then the brainDir field — no field dropped',
        () => {
          expect(lines).toEqual([
            '✗ brain://repo=ambient/boot.md not written',
            '   ├─ 💥 MalfunctionError: brain dir boot.md could not be written',
            '   └─ brainDir = /repo/x',
          ]);
        },
      );
    });
  });

  given('[case2.1] a MalfunctionError that carries a cause', () => {
    when('[t0] reported', () => {
      const lines = asBrainDirBootFailureLines({
        failure: {
          scope: { kind: 'repo' },
          cause: new MalfunctionError(
            'brain dir boot.md could not be written',
            {
              brainDir: '/repo/x',
              cause: new Error('EACCES: permission denied'),
            },
          ),
        },
      });

      then('the cause rides as its class and message, never as `{}`', () => {
        expect(lines).toEqual([
          '✗ brain://repo=ambient/boot.md not written',
          '   ├─ 💥 MalfunctionError: brain dir boot.md could not be written',
          '   ├─ brainDir = /repo/x',
          '   └─ cause = Error: EACCES: permission denied',
        ]);
      });
    });
  });

  given('[case3] a plain Error under the actors scope', () => {
    when('[t0] reported', () => {
      const lines = asBrainDirBootFailureLines({
        failure: { scope: { kind: 'actors' }, cause: new Error('EACCES') },
      });

      then(
        'the first branch still names the bare class, so it stays findable',
        () => {
          expect(lines).toEqual([
            '✗ brain://*/boot.md not written',
            '   └─ Error: EACCES',
          ]);
        },
      );
    });
  });
});
