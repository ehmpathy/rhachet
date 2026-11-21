import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { Readable } from 'node:stream';
import { getOneKeyrackSetSourcePiped } from './getOneKeyrackSetSourcePiped';

const BLOB_FAKE = '{"appId":"1","installationId":"2","privateKey":"fake"}';

describe('getOneKeyrackSetSourcePiped', () => {
  given('[case1] no --source flag', () => {
    when('[t0] read', () => {
      then('returns null, so the vault runs its guided setup', async () => {
        const source = await getOneKeyrackSetSourcePiped(
          { flag: null, isStdinTty: true },
          { stdin: Readable.from([]) },
        );
        expect(source).toBeNull();
      });
    });
  });

  given('[case2] --source @stdin with a piped blob', () => {
    when('[t0] read', () => {
      then('returns the blob, its final newline stripped', async () => {
        const source = await getOneKeyrackSetSourcePiped(
          { flag: '@stdin', isStdinTty: false },
          { stdin: Readable.from([`${BLOB_FAKE}\n`]) },
        );
        expect(source).toEqual(BLOB_FAKE);
      });
    });

    when(
      '[t1] read a value with edge whitespace beyond one final newline',
      () => {
        then(
          'keeps every byte save the one final newline (parity with the piped replica prompt)',
          async () => {
            const source = await getOneKeyrackSetSourcePiped(
              { flag: '@stdin', isStdinTty: false },
              { stdin: Readable.from(['  token-fake  \n\n']) },
            );
            expect(source).toEqual('  token-fake  \n');
          },
        );
      },
    );
  });

  given('[case3] --source with a literal value, not @stdin', () => {
    when('[t0] read', () => {
      then('refuses, and never echoes the value', async () => {
        const error = await getError(
          getOneKeyrackSetSourcePiped(
            {
              flag: 'ghs_literal_value',
              isStdinTty: false,
            },
            { stdin: Readable.from([]) },
          ),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('--source accepts only @stdin');
        expect(JSON.stringify(error)).not.toContain('ghs_literal_value');
        expect(error.message).not.toContain('ghs_literal_value');
      });
    });
  });

  given('[case4] --source @stdin at a terminal', () => {
    when('[t0] read', () => {
      then('refuses rather than waits', async () => {
        const error = await getError(
          getOneKeyrackSetSourcePiped(
            { flag: '@stdin', isStdinTty: true },
            { stdin: Readable.from([]) },
          ),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('found a terminal, not a pipe');
      });
    });
  });

  given('[case5] --source @stdin with an empty pipe', () => {
    when('[t0] read', () => {
      then('refuses and names the upstream read', async () => {
        const error = await getError(
          getOneKeyrackSetSourcePiped(
            { flag: '@stdin', isStdinTty: false },
            { stdin: Readable.from(['  \n']) },
          ),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('received an empty value');
      });
    });
  });
});
