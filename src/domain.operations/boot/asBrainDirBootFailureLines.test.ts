import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { asBrainDirBootFailureLines } from './asBrainDirBootFailureLines';

describe('asBrainDirBootFailureLines', () => {
  given('[case1] a ConstraintError with metadata and a hint', () => {
    when('[t0] reported', () => {
      const lines = asBrainDirBootFailureLines({
        failure: {
          scope: { kind: 'actor', actorHash: 'abc12345' },
          cause: new ConstraintError(
            'actor abc12345 enrolled a role no longer linked: gone',
            {
              hint: 'rhx roles link --role gone',
              actorHash: 'abc12345',
              slugsUnlinked: ['gone'],
            },
          ),
        },
      });

      then('the headline names the scope, the class and the reason', () => {
        expect(lines[0]).toEqual(
          '✗ boot.md (actor abc12345) not written: ✋ ConstraintError: actor abc12345 enrolled a role no longer linked: gone',
        );
      });

      then('every metadata field rides on a line of its own, hint last', () => {
        expect(lines.slice(1)).toEqual([
          '   ├─ actorHash: abc12345',
          '   ├─ slugsUnlinked: ["gone"]',
          '   └─ hint: rhx roles link --role gone',
        ]);
      });
    });
  });

  given('[case2] a MalfunctionError with no hint', () => {
    when('[t0] reported', () => {
      const lines = asBrainDirBootFailureLines({
        failure: {
          scope: { kind: 'default' },
          cause: new MalfunctionError(
            'brain dir boot.md could not be written',
            {
              brainDir: '/repo/x',
            },
          ),
        },
      });

      then('the headline, then the brainDir field — no field dropped', () => {
        expect(lines).toEqual([
          '✗ boot.md (default) not written: 💥 MalfunctionError: brain dir boot.md could not be written',
          '   └─ brainDir: /repo/x',
        ]);
      });
    });
  });

  given('[case2.1] a MalfunctionError that carries a cause', () => {
    when('[t0] reported', () => {
      const lines = asBrainDirBootFailureLines({
        failure: {
          scope: { kind: 'default' },
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
          '✗ boot.md (default) not written: 💥 MalfunctionError: brain dir boot.md could not be written',
          '   ├─ brainDir: /repo/x',
          '   └─ cause: Error: EACCES: permission denied',
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
        'the headline still names the bare class, so it stays findable',
        () => {
          expect(lines).toEqual([
            '✗ boot.md (actors) not written: Error: EACCES',
          ]);
        },
      );
    });
  });
});
