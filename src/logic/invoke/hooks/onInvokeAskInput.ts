import type { InvokeOpts } from '../../../domain/objects';
import type { InvokeHooks } from '../../../domain/objects/InvokeHooks';

/**
 * .what = hooks to call onInvokeAskInput
 */
export const onInvokeAskInput = (input: {
  opts: InvokeOpts<{ ask: string; config: string }>;
  hooks: InvokeHooks;
}): InvokeOpts<{ ask: string; config: string }> => {
  // call each of the opts translators, one at a time
  let after = input.opts;
  for (const translate of input.hooks.onInvokeAskInput)
    after = translate(after);

  // then return the final translation
  return after;
};
