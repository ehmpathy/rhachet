import { ConstraintError, getError, MalfunctionError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import type { CloneSayRecord } from './asCloneSayRecord';
import { throwCloneSayFailure } from './throwCloneSayFailure';

const record: CloneSayRecord = {
  delivered: false,
  verdict: 'withheld',
  reason: 'input-region-dirty',
  probe: 'capable',
  serial: 'srl-abc',
  slug: 'beav-1',
};

describe('throwCloneSayFailure', () => {
  given('[case1] a constraint-class failure report', () => {
    when('[t0] the failure is thrown', () => {
      then('it throws a ConstraintError (exit 2)', () => {
        const error = getError(() => {
          throwCloneSayFailure({
            report: {
              channel: 'failure',
              klass: 'constraint',
              message: 'the input box holds uncommitted text',
              hint: 'wait, or re-send with --force',
            },
            record,
          });
        });
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('uncommitted text');
      });

      then('the record + hint ride the metadata', () => {
        const error = getError(() => {
          throwCloneSayFailure({
            report: {
              channel: 'failure',
              klass: 'constraint',
              message: 'x',
              hint: 'the-fix',
            },
            record,
          });
        });
        expect((error as ConstraintError).metadata).toMatchObject({
          verdict: 'withheld',
          reason: 'input-region-dirty',
          hint: 'the-fix',
        });
      });
    });
  });

  given('[case2] a malfunction-class failure report', () => {
    when('[t0] the failure is thrown', () => {
      then('it throws a MalfunctionError (exit 1)', () => {
        const error = getError(() => {
          throwCloneSayFailure({
            report: {
              channel: 'failure',
              klass: 'malfunction',
              message: 'no rise held anywhere',
              hint: 'verify the clone before a retry',
            },
            record: {
              ...record,
              verdict: 'absent',
              reason: 'no-rise-observed',
            },
          });
        });
        expect(error).toBeInstanceOf(MalfunctionError);
        expect(error.message).toContain('no rise held');
      });
    });
  });
});
