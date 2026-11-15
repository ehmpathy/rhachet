import { given, then, when } from 'test-fns';

import { Readable } from 'node:stream';
import { getStdinContent } from './getStdinContent';

describe('getStdinContent', () => {
  given('[case1] a stream with edge whitespace across chunks', () => {
    const genStdin = () => Readable.from([Buffer.from('  {"a":'), '1}\n']);

    when('[t0] read with trim', () => {
      then('returns the joined text, trimmed', async () => {
        const text = await getStdinContent(
          { trim: true },
          { stdin: genStdin() },
        );
        expect(text).toEqual('{"a":1}');
      });
    });

    when('[t1] read without trim', () => {
      then('returns the joined text, verbatim', async () => {
        const text = await getStdinContent(
          { trim: false },
          { stdin: genStdin() },
        );
        expect(text).toEqual('  {"a":1}\n');
      });
    });
  });

  given('[case2] an empty stream', () => {
    when('[t0] read with trim', () => {
      then('returns the empty string', async () => {
        const text = await getStdinContent(
          { trim: true },
          { stdin: Readable.from([]) },
        );
        expect(text).toEqual('');
      });
    });
  });
});
