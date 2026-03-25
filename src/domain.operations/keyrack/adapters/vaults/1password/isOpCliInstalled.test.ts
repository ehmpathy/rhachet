import { given, then, when } from 'test-fns';

import { isOpCliInstalled } from './isOpCliInstalled';

describe('isOpCliInstalled', () => {
  given('[case1] op cli availability check', () => {
    when('[t0] isOpCliInstalled called', () => {
      then('returns a boolean', async () => {
        const result = await isOpCliInstalled();
        expect(typeof result).toBe('boolean');
      });
    });

    when('[t1] isOpCliInstalled called multiple times', () => {
      then('returns consistent results', async () => {
        const result1 = await isOpCliInstalled();
        const result2 = await isOpCliInstalled();
        expect(result1).toBe(result2);
      });
    });
  });
});
