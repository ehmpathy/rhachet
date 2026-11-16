import { getError, given, then, when } from 'test-fns';

import { getOnePsTable } from './getOnePsTable';

describe('getOnePsTable', () => {
  given('[case1] a ps call the host accepts', () => {
    when('[t0] the table is read', () => {
      then('it lists this process by pid', async () => {
        const table = await getOnePsTable({ args: ['-eo', 'pid='] });
        const pids = table.split('\n').map((line) => line.trim());
        expect(pids).toContain(String(process.pid));
      });
    });
  });

  given('[case2] a ps call the host refuses', () => {
    when('[t0] the table is read', () => {
      then('it fails loud with a hint, never an empty table', async () => {
        const error = await getError(getOnePsTable({ args: ['--no-such-flag-xyz'] }));
        expect(error.message).toContain('ps failed, so the process table could not be read');
        expect((error as { metadata?: { hint?: string } }).metadata?.hint).toContain(
          'ps is on PATH',
        );
      });
    });
  });
});
