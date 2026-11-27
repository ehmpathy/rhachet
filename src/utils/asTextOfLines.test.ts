import { given, then, when } from 'test-fns';

import { asTextOfLines } from './asTextOfLines';

describe('asTextOfLines', () => {
  given('[case1] no lines', () => {
    when('[t0] they are joined', () => {
      then('the text is empty, so an absent block adds no bytes', () => {
        expect(asTextOfLines({ lines: [] })).toEqual('');
      });
    });
  });

  given('[case2] lines, one of them blank', () => {
    when('[t0] they are joined', () => {
      then('each line, the blank one too, ends in one newline', () => {
        expect(asTextOfLines({ lines: ['a', '', 'b'] })).toEqual('a\n\nb\n');
      });
    });
  });
});
