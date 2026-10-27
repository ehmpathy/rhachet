import { ConstraintError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { BrainDirOutsideRepoError } from '@src/domain.operations/actor/enrolled/BrainDirOutsideRepoError';

import { asActorSettlementsSplit } from './asActorSettlementsSplit';

const faultA = new ConstraintError(
  'actor settings could not be written (EACCES)',
);
const faultB = new ConstraintError(
  'actor settings could not be written (EROFS)',
);
const skip = new BrainDirOutsideRepoError('refused a write outside the repo', {
  path: '.agent/.actors/actor.via.hash=cccc/brain/.claude',
  landsAt: '/elsewhere',
  hint: 'point that dir, or the link above it, back inside the repo, then rerun `rhx init --hooks`',
});
const target = {
  path: '/repo/x/settings.json',
  landsAt: '/home/.claude/settings.json',
};

const SETTLEMENTS = [
  {
    row: { actorExid: 'hash=aaaa', outcome: { error: faultA }, details: [] },
    fault: faultA,
    skip: null,
    targetReadonly: null,
  },
  {
    row: { actorExid: 'hash=bbbb', outcome: { changes: '+1' }, details: [] },
    fault: null,
    skip: null,
    targetReadonly: target,
  },
  {
    row: {
      actorExid: 'hash=cccc',
      outcome: { skipped: 'outside the repo' },
      details: [],
    },
    fault: null,
    skip,
    targetReadonly: null,
  },
  {
    row: { actorExid: 'hash=dddd', outcome: { error: faultB }, details: [] },
    fault: faultB,
    skip: null,
    targetReadonly: null,
  },
];

describe('asActorSettlementsSplit', () => {
  given(
    '[case1] an actor pass with faults, a skip and a read-only home file',
    () => {
      when('[t0] it is split', () => {
        const split = asActorSettlementsSplit({ settlements: SETTLEMENTS });

        then(
          'every pushed error has a printed row that carries that same error',
          () => {
            // the clamp: an error with no row would be a silent exit 1 (the wish)
            expect(split.errors).toHaveLength(2);
            split.errors.forEach(({ source, error }) => {
              const row = split.rows.find(
                (candidate) => `sync:actor=${candidate.actorExid}` === source,
              );
              expect(row?.outcome).toEqual({ error });
            });
          },
        );

        then('every actor keeps its row, in order', () => {
          expect(split.rows.map((row) => row.actorExid)).toEqual([
            'hash=aaaa',
            'hash=bbbb',
            'hash=cccc',
            'hash=dddd',
          ]);
        });

        then(
          'the skip and the read-only home file ride out on their own lists',
          () => {
            expect(split.skips).toEqual([skip]);
            expect(split.targetsReadonly).toEqual([target]);
          },
        );
      });
    },
  );

  given('[case2] no actors', () => {
    when('[t0] it is split', () => {
      then('every list is empty', () => {
        expect(asActorSettlementsSplit({ settlements: [] })).toEqual({
          rows: [],
          errors: [],
          skips: [],
          targetsReadonly: [],
        });
      });
    });
  });
});
