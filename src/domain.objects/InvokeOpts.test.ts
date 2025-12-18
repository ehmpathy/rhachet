/* eslint-disable @typescript-eslint/no-unused-vars */
import type { InvokeOpts } from './InvokeOpts';

describe('InvokeOpts', () => {
  it('should allow guaranteed presence of TMinimum string values', () => {
    type TMinimum = { skill: string };

    // ✅ allowed: exact minimum present with correct string type
    const opts1: InvokeOpts<TMinimum> = { skill: 'writer' };
    const use1: string = opts1.skill;
    const use1alt: string | number | undefined = opts1.role;
    expect(use1).toBe('writer');

    // ❌ not allowed: must have the keys required in TMinimum at a minimum
    // @ts-expect-error -- 'skill' must be declared
    const opts2: InvokeOpts<TMinimum> = { other: 'x', another: undefined };

    // ❌ not allowed: wrong type for required minimum key
    // @ts-expect-error -- 'skill' must be a string per TMinimum
    const opts3: InvokeOpts<TMinimum> = { skill: 123 };

    // ❌ not allowed: non-string extras in the record branch
    // @ts-expect-error -- extra props in the record branch must be string | undefined
    const opts4: InvokeOpts<TMinimum> = { other: 42 };
  });

  it('should allow guaranteed presence of TMinimum numeric values', () => {
    type TMinimum = { attempts: number };

    // ✅ allowed: exact minimum present with correct numeric type
    const opts1: InvokeOpts<TMinimum> = { attempts: 2 };
    const use1: number = opts1.attempts;
    expect(use1).toBe(2);

    // ❌ not allowed: must include the keys required in TMinimum at a minimum
    // @ts-expect-error -- missing required key 'attempts'
    const opts2: InvokeOpts<TMinimum> = { something: 'else' };

    // ✅ allowed: minimum present + extra string props
    const opts3: InvokeOpts<TMinimum> = { attempts: 3, something: 'x' };
    const use2: number = opts3.attempts;
    const use2alt: string | number | undefined = opts3.something;
    expect(use2).toBe(3);

    // ❌ not allowed: wrong type for required minimum key
    // @ts-expect-error -- 'attempts' must be a number per TMinimum
    const opts4: InvokeOpts<TMinimum> = { attempts: '2' };

    // ❌ not allowed: non-string extras in the record branch
    // @ts-expect-error -- extra props in the record branch must be string | undefined
    const opts5: InvokeOpts<TMinimum> = { other: 42 };
  });
});
