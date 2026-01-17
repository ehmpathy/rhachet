import type { InvokeOpts } from '@src/domain.objects';
import type { RoleHooksOnDispatch } from '@src/domain.objects/RoleHooksOnDispatch';

/**
 * .what = hooks to call onInvokeAskInput
 */
export const onInvokeAskInput = (input: {
  opts: InvokeOpts<{ ask: string; config: string }>;
  hooks: RoleHooksOnDispatch;
}): InvokeOpts<{ ask: string; config: string }> => {
  // call each of the opts translators, one at a time
  let after = input.opts;
  for (const translate of input.hooks.onInvokeAskInput)
    after = translate(after);

  // then return the final translation
  return after;
};
