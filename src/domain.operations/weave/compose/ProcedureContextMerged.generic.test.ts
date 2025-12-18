import { given, then } from 'test-fns';

import type { ProcedureContextMerged } from './ProcedureContextMerged.generic';

describe('ProcedureContextMerged', () => {
  given('a tuple with only one context', () => {
    type Single = ProcedureContextMerged<readonly [{ foo: number }]>;

    then('it should infer that context directly', () => {
      const context: Single = { foo: 123 };
      expect(context.foo).toBe(123);
    });
  });

  given('a tuple with multiple contexts', () => {
    type Merged = ProcedureContextMerged<
      readonly [{ foo: number }, { bar: string }]
    >;

    then('it should merge them into one', () => {
      const context: Merged = { foo: 1, bar: 'hello' };
      expect(context.foo).toBe(1);
      expect(context.bar).toBe('hello');
    });
  });

  given('a tuple with overlapping keys', () => {
    type Merged = ProcedureContextMerged<
      readonly [{ foo: number }, { foo: string }]
    >;

    then('the intersection should be used (number & string = never)', () => {
      // @ts-expect-error: 'foo' cannot be both number and string
      const context: Merged = { foo: 123 };
      expect(context);
    });
  });

  given('an input that is not a tuple of at least one context', () => {
    // @ts-expect-error: must be a tuple of at least one ProcedureContext
    type Invalid = ProcedureContextMerged<[]>;
    expect(true as any as Invalid);
  });
});
