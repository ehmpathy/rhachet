import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { computeBrainCliInput } from './computeBrainCliInput';

describe('computeBrainCliInput', () => {
  given('[case1] the bare form — no brain given', () => {
    when('[t0] a default exists', () => {
      then('the default brain is used', () => {
        expect(
          computeBrainCliInput({
            positional: null,
            flag: null,
            default: 'claude',
          }),
        ).toEqual('claude');
      });
    });

    when('[t1] no default exists', () => {
      then('it fails loud with a ConstraintError', async () => {
        const error = await getError(() =>
          computeBrainCliInput({
            positional: null,
            flag: null,
            default: null,
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
      });
    });
  });

  given('[case2] one brain named', () => {
    when('[t0] via the --brain flag', () => {
      then('that brain is used', () => {
        expect(
          computeBrainCliInput({
            positional: null,
            flag: 'codex',
            default: 'claude',
          }),
        ).toEqual('codex');
      });
    });

    when('[t1] via the positional', () => {
      then('that brain is used (extant form)', () => {
        expect(
          computeBrainCliInput({
            positional: 'codex',
            flag: null,
            default: 'claude',
          }),
        ).toEqual('codex');
      });
    });
  });

  given('[case3] both flag and positional given', () => {
    when('[t0] they AGREE', () => {
      then('the redundant-but-consistent input is tolerated', () => {
        expect(
          computeBrainCliInput({
            positional: 'claude',
            flag: 'claude',
            default: null,
          }),
        ).toEqual('claude');
      });
    });

    when('[t1] they DISAGREE', () => {
      then('it fails loud and names both values in conflict', async () => {
        const error = await getError(() =>
          computeBrainCliInput({
            positional: 'codex',
            flag: 'claude',
            default: null,
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('codex');
        expect(error.message).toContain('claude');
      });
    });
  });
});
