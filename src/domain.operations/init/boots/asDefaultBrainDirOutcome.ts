import type { BrainDirSyncSymlink } from '@src/domain.operations/boot/asBrainDirSyncReportLines';
import type {
  BrainDirBootFailure,
  BrainDirBootRender,
} from '@src/domain.operations/boot/BrainDirBootRender';

import type { syncDefaultBrainDir } from './syncDefaultBrainDir';

/**
 * .what = the settled default-brain-dir sync → one outcome: its render, what it did to
 *         `<repo>/.claude`, or its failure under the default scope
 * .why = both branches share one shape, so one transformer owns it; a throw is collected, never
 *        raised, so a broken default never skips a healthy actor
 *
 * .note = `symlink` carries the link EFFECT beside its drops and moves, so the report can say
 *   `linked` only where this run actually made the link. a shape of drops+moves alone cannot tell
 *   a fresh link from one that was already there
 */
export const asDefaultBrainDirOutcome = (input: {
  settled: PromiseSettledResult<
    Awaited<ReturnType<typeof syncDefaultBrainDir>>
  >;
}): {
  render: BrainDirBootRender | null;
  symlink: BrainDirSyncSymlink | null;
  failure: BrainDirBootFailure | null;
} => {
  // a fulfilled sync yields its render and what the `<repo>/.claude` link did
  if (input.settled.status === 'fulfilled')
    return {
      render: input.settled.value.render,
      symlink: input.settled.value.symlink,
      failure: null,
    };

  // a rejected sync yields a failure under the default scope, with no link
  const reason: unknown = input.settled.reason;
  return {
    render: null,
    symlink: null,
    failure: {
      scope: { kind: 'default' },
      cause: reason instanceof Error ? reason : new Error(String(reason)),
    },
  };
};
