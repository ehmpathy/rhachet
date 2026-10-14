import { MalfunctionError } from 'helpful-errors';

import type { BrainDirSyncSymlink } from '@src/domain.operations/boot/asBrainDirSyncReportLines';
import type {
  BrainDirBootFailure,
  BrainDirBootRender,
} from '@src/domain.operations/boot/BrainDirBootRender';
import { isCodeDefectError } from '@src/utils/isCodeDefectError';

import type { setRepoActorBrainDir } from './setRepoActorBrainDir';

/**
 * .what = the settled repo actor brain dir sync → one outcome: its render, what it did to
 *         `<repo>/.claude` and to the settings layout, or its failure under the repo scope
 * .why = both branches share one shape, so one transformer owns it; a throw is collected, never
 *        raised, so a broken repo actor sync never skips a healthy actor
 *
 * .note = `symlink` carries the link EFFECT beside its drops and moves, so the report can say
 *   `linked` only where this run actually made the link. a shape of drops+moves alone cannot tell
 *   a fresh link from one that was already there
 * .note = `settings` carries the layout effects and the grove it found, as the layout findsert
 *   returned them
 */
export const asRepoActorBrainDirOutcome = (input: {
  settled: PromiseSettledResult<
    Awaited<ReturnType<typeof setRepoActorBrainDir>>
  >;
}): {
  render: BrainDirBootRender | null;
  symlink: BrainDirSyncSymlink | null;
  settings: Awaited<ReturnType<typeof setRepoActorBrainDir>>['settings'] | null;
  failure: BrainDirBootFailure | null;
} => {
  // a fulfilled sync yields its render, what the `<repo>/.claude` link did, and the layout
  if (input.settled.status === 'fulfilled')
    return {
      render: input.settled.value.render,
      symlink: input.settled.value.symlink,
      settings: input.settled.value.settings,
      failure: null,
    };

  // a rejected sync yields a failure under the repo scope, with no link. a reason that is not
  //   an Error is wrapped, so the failure line still names a class
  const reason: unknown = input.settled.reason;

  // an allowlist: a code defect surfaces loud, never as a failure row (`rule.forbid.failhide`)
  if (isCodeDefectError({ error: reason })) throw reason;
  return {
    render: null,
    symlink: null,
    settings: null,
    failure: {
      scope: { kind: 'repo' },
      cause:
        reason instanceof Error
          ? reason
          : new MalfunctionError('repo actor brain dir sync rejected', {
              reason,
              hint: 'rerun `rhx init --hooks`; if it fails again, report this output as a rhachet bug',
            }),
    },
  };
};
