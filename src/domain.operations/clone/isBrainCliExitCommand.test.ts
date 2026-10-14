import { given, then } from 'test-fns';

import { isBrainCliExitCommand } from './isBrainCliExitCommand';

describe('isBrainCliExitCommand', () => {
  given('[case1] the two exit commands', () => {
    then('`/exit` and `/quit` are exit commands', () => {
      expect(isBrainCliExitCommand({ message: '/exit' })).toBe(true);
      expect(isBrainCliExitCommand({ message: '/quit' })).toBe(true);
    });

    then('a stray space or newline around one is still an exit', () => {
      expect(isBrainCliExitCommand({ message: ' /exit\n' })).toBe(true);
    });
  });

  given('[case2] a message that is not an exit', () => {
    then('another client command is not an exit', () => {
      expect(isBrainCliExitCommand({ message: '/model haiku' })).toBe(false);
    });

    then('a prompt that names the command is not an exit', () => {
      expect(isBrainCliExitCommand({ message: 'please /exit now' })).toBe(
        false,
      );
    });

    then('an exit with an argument is not the bare exit', () => {
      expect(isBrainCliExitCommand({ message: '/exit now' })).toBe(false);
    });
  });
});
