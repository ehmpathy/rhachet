import { InvokeOpts } from '.';

export interface InvokeHooks {
  onInvokeAskInput: Array<
    (
      input: InvokeOpts<{ ask: string; config: string }>,
    ) => InvokeOpts<{ ask: string; config: string }>
  >;
}
