import { genTempDir, given, then, when } from 'test-fns';

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { getOneCloneSlugReconciled } from './getOneCloneSlugReconciled';
import { setCloneSlugIndex } from './setCloneSlugIndex';

const genActorsRoot = (slug: string): string => {
  const actorsRoot = join(genTempDir({ slug }), '.actors');
  mkdirSync(actorsRoot, { recursive: true });
  return actorsRoot;
};

describe('getOneCloneSlugReconciled.integration', () => {
  given('[case1] an unnamed clone (null identity slug)', () => {
    when('[t0] the slug is reconciled', () => {
      then('it stays null — no name to reconcile', () => {
        const actorsRoot = genActorsRoot('reconcile-null');
        expect(
          getOneCloneSlugReconciled({
            actorsRoot,
            serial: 's1',
            identitySlug: null,
          }),
        ).toBeNull();
      });
    });
  });

  given('[case2] a clone whose index still points at its own serial', () => {
    when('[t0] the slug is reconciled', () => {
      then('the slug is shown (this clone owns the name)', () => {
        const actorsRoot = genActorsRoot('reconcile-owned');
        setCloneSlugIndex({
          actorsRoot,
          slug: 'driver',
          actorHash: 'aaa',
          serial: 's1',
        });
        expect(
          getOneCloneSlugReconciled({
            actorsRoot,
            serial: 's1',
            identitySlug: 'driver',
          }),
        ).toEqual('driver');
      });
    });
  });

  given('[case3] a clone whose slug was rebound away to another serial', () => {
    when('[t0] the OLD clone reconciles its slug', () => {
      then('it shows no slug — an orphan after the rebind', () => {
        const actorsRoot = genActorsRoot('reconcile-orphan');
        setCloneSlugIndex({
          actorsRoot,
          slug: 'driver',
          actorHash: 'aaa',
          serial: 's1',
        });
        setCloneSlugIndex({
          actorsRoot,
          slug: 'driver',
          actorHash: 'aaa',
          serial: 's2',
        });
        expect(
          getOneCloneSlugReconciled({
            actorsRoot,
            serial: 's1',
            identitySlug: 'driver',
          }),
        ).toBeNull();
      });
    });
  });

  given('[case4] a clone whose index entry is gone entirely', () => {
    when('[t0] the slug is reconciled', () => {
      then('it shows no slug — the name is unowned', () => {
        const actorsRoot = genActorsRoot('reconcile-gone');
        expect(
          getOneCloneSlugReconciled({
            actorsRoot,
            serial: 's1',
            identitySlug: 'driver',
          }),
        ).toBeNull();
      });
    });
  });
});
