import { given, then, when } from 'test-fns';

import { BOOT_STATS_ZERO } from '@src/domain.operations/boot/BootStats';
import type {
  BrainDirBootFailure,
  BrainDirBootRender,
} from '@src/domain.operations/boot/BrainDirBootRender';

import { asBrainDirSyncResult } from './asBrainDirSyncResult';

const renderA: BrainDirBootRender = {
  scope: { kind: 'actor', actorHash: 'aaaaaaaa' },
  bootMdPath:
    '/repo/.agent/.actors/actor.via.hash=aaaaaaaa/brain/.claude/boot.md',
  stats: BOOT_STATS_ZERO,
  agentsMdReset: false,
  bootMdCreated: false,
};
const renderC: BrainDirBootRender = {
  scope: { kind: 'actor', actorHash: 'cccccccc' },
  bootMdPath:
    '/repo/.agent/.actors/actor.via.hash=cccccccc/brain/.claude/boot.md',
  stats: BOOT_STATS_ZERO,
  agentsMdReset: true,
  bootMdCreated: false,
};
const failureB: BrainDirBootFailure = {
  scope: { kind: 'actor', actorHash: 'bbbbbbbb' },
  cause: new Error('EACCES'),
};

describe('asBrainDirSyncResult', () => {
  given(
    '[case1] a render, a failure, a skip and a render, in actor order',
    () => {
      when('[t0] the outcomes are split', () => {
        then(
          'the renders and the failures each keep actor order, and the skip is dropped',
          () => {
            const result = asBrainDirSyncResult({
              outcomes: [
                { render: renderA, failure: null },
                { render: null, failure: failureB },
                { render: null, failure: null },
                { render: renderC, failure: null },
              ],
            });
            expect(result).toEqual({
              renders: [renderA, renderC],
              failures: [failureB],
            });
          },
        );
      });
    },
  );

  given('[case2] no outcomes', () => {
    when('[t0] the outcomes are split', () => {
      then('both lists are empty', () => {
        expect(asBrainDirSyncResult({ outcomes: [] })).toEqual({
          renders: [],
          failures: [],
        });
      });
    });
  });
});
