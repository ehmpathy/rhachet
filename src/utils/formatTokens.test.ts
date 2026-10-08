import { given, then, when } from 'test-fns';

import { formatTokens } from './formatTokens';

describe('formatTokens', () => {
  given('[case1] a count above one thousand', () => {
    when('[t0] formatted', () => {
      then('it carries thousands separators', () => {
        expect(formatTokens({ tokens: 1000 })).toBe('1,000');
        expect(formatTokens({ tokens: 12345 })).toBe('12,345');
        expect(formatTokens({ tokens: 1234567 })).toBe('1,234,567');
      });
    });
  });

  given('[case2] a count below one thousand', () => {
    when('[t0] formatted', () => {
      then('it carries no separator', () => {
        expect(formatTokens({ tokens: 100 })).toBe('100');
        expect(formatTokens({ tokens: 999 })).toBe('999');
      });
    });
  });

  given('[case3] a zero count', () => {
    when('[t0] formatted', () => {
      // .why = the budget readout renders a payload count on every rung, and a boot whose
      //   whole payload is empty still prints one. a formatter that yielded '' there would
      //   leave a blank where a number belongs
      then('it renders the digit, never an empty string', () => {
        expect(formatTokens({ tokens: 0 })).toBe('0');
      });
    });
  });
});
