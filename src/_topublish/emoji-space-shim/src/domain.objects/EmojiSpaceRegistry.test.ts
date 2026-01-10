import { given, then, when } from 'test-fns';

import { EMOJI_SPACE_REGISTRY } from './EmojiSpaceRegistry';

describe('EmojiSpaceRegistry', () => {
  given('the emoji space registry', () => {
    when('checked for beaver emoji 🦫', () => {
      then('vscode consumes 1 space', () => {
        expect(EMOJI_SPACE_REGISTRY['🦫']?.vscode).toEqual(1);
      });

      then('default consumes 0 spaces', () => {
        expect(EMOJI_SPACE_REGISTRY['🦫']?.default).toEqual(0);
      });
    });

    when('checked for rock emoji 🪨', () => {
      then('vscode consumes 1 space', () => {
        expect(EMOJI_SPACE_REGISTRY['🪨']?.vscode).toEqual(1);
      });

      then('default consumes 0 spaces', () => {
        expect(EMOJI_SPACE_REGISTRY['🪨']?.default).toEqual(0);
      });
    });

    when('checked for cloud with bolt emoji 🌩️', () => {
      then('vscode consumes 1 space', () => {
        expect(EMOJI_SPACE_REGISTRY['🌩️']?.vscode).toEqual(1);
      });

      then('default consumes 1 space', () => {
        expect(EMOJI_SPACE_REGISTRY['🌩️']?.default).toEqual(1);
      });
    });

    when('checked for thunder cloud emoji ⛈️', () => {
      then('vscode consumes 1 space', () => {
        expect(EMOJI_SPACE_REGISTRY['⛈️']?.vscode).toEqual(1);
      });

      then('default consumes 1 space', () => {
        expect(EMOJI_SPACE_REGISTRY['⛈️']?.default).toEqual(1);
      });
    });
  });
});
