import { Serializable } from 'serde-fns';

/**
 * .what = options declared to specify an invocation
 * .why =
 *   - skills are generic and can take any shape of inputs
 *   - our responsibility is to forward the caller's full intent, with the careful transfer of the full options they declared
 * .note =
 *   - we do allow the requirement of a _minimum_ set of options
 *   - for example, `ask` invocations will always require the skill to be specified at a minimum
 */
export type InvokeOpts<
  TMinimum extends Record<string, Serializable> | undefined = undefined,
> = TMinimum & Record<string, string | number | undefined>;
