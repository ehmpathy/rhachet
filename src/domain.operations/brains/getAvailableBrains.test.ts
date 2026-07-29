import { given, then, useBeforeAll, when } from 'test-fns';

import { genMockedBrainAtom } from '@src/.test.assets/genMockedBrainAtom';
import { genMockedBrainRepl } from '@src/.test.assets/genMockedBrainRepl';
import { ContextCli } from '@src/domain.objects/ContextCli';
import { importPackageExports } from '@src/infra/importEsmSafe/importPackageExports';

import * as discoverModule from './discoverBrainPackages';

// mock discovery + the shared load leaf; the real asBrainsFromPackageExports (extract) and
// asBrainsDeduped (dedupe) run, so this exercises the actual orchestration composition
jest.mock('./discoverBrainPackages');
jest.mock('@src/infra/importEsmSafe/importPackageExports');

import { getAvailableBrains } from './getAvailableBrains';

const mockImportPackageExports = importPackageExports as jest.Mock;

/**
 * .what = fast (jest-speed) unit test of getAvailableBrains's own orchestration
 * .why  = the loop / aggregate / dedupe composition was previously exercised ONLY by the heavy
 *         real-node acceptance suite (needs a built dist + subprocess spawn). with a mock of
 *         the one shared load leaf (importPackageExports) — the same module-level DI seam the
 *         peer sites use — this proves the loop aggregates across packages, dedupes by slug,
 *         and survives a bad package (acc#3) at jest speed, so a regression in the composition
 *         is caught in fast CI instead of only the slow acceptance run. (ehmpathy/rhachet#429)
 * .note = the { ok:true } branch still calls the REAL getBrainsFromPackageExports +
 *         asBrainsDeduped (not mocked), so the composition under test is genuine, not a shadow.
 *         a fixed ContextCli is passed so no real git-root resolution runs; the no-context
 *         default branch is covered by the real-node acceptance suites (which call it bare).
 */
describe('getAvailableBrains', () => {
  const context = new ContextCli({ cwd: '/test-repo', gitroot: '/test-repo' });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  given('[case1] two healthy packages each with brains', () => {
    when('[t0] discovery loads both', () => {
      const scene = useBeforeAll(async () => {
        jest
          .spyOn(discoverModule, 'discoverBrainPackages')
          .mockResolvedValue(['rhachet-brains-alpha', 'rhachet-brains-beta']);

        const atomAlpha = genMockedBrainAtom({
          repo: 'alpha',
          slug: 'alpha/opus',
        });
        const replBeta = genMockedBrainRepl({
          repo: 'beta',
          slug: 'beta/sonnet',
        });

        mockImportPackageExports.mockImplementation(
          async ({ packageName }: { packageName: string }) => {
            if (packageName === 'rhachet-brains-alpha')
              return {
                ok: true,
                module: { getBrainAtomsByAlpha: () => [atomAlpha] },
              };
            return {
              ok: true,
              module: { getBrainReplsByBeta: () => [replBeta] },
            };
          },
        );

        return getAvailableBrains({}, context);
      });

      then('atoms aggregate across packages', () => {
        expect(scene.atoms).toHaveLength(1);
        expect(scene.atoms[0]?.slug).toEqual('alpha/opus');
      });

      then('repls aggregate across packages', () => {
        expect(scene.repls).toHaveLength(1);
        expect(scene.repls[0]?.slug).toEqual('beta/sonnet');
      });
    });
  });

  given('[case2] two packages with the same brain slug', () => {
    when('[t0] discovery loads both', () => {
      const scene = useBeforeAll(async () => {
        jest
          .spyOn(discoverModule, 'discoverBrainPackages')
          .mockResolvedValue(['rhachet-brains-first', 'rhachet-brains-second']);

        const atomFirst = genMockedBrainAtom({
          repo: 'dupe',
          slug: 'dupe/opus',
        });
        const atomSecond = genMockedBrainAtom({
          repo: 'dupe',
          slug: 'dupe/opus',
        });

        mockImportPackageExports.mockImplementation(
          async ({ packageName }: { packageName: string }) => {
            if (packageName === 'rhachet-brains-first')
              return {
                ok: true,
                module: { getBrainAtomsByFirst: () => [atomFirst] },
              };
            return {
              ok: true,
              module: { getBrainAtomsBySecond: () => [atomSecond] },
            };
          },
        );

        return getAvailableBrains({}, context);
      });

      then('the duplicate slug is deduped (first wins)', () => {
        expect(scene.atoms).toHaveLength(1);
        expect(scene.atoms[0]?.repo).toEqual('dupe');
      });
    });
  });

  given('[case3] one bad package beside one healthy package', () => {
    when('[t0] one package fails to load and one loads', () => {
      // .why = acc#3 loop survival, at jest speed — the loop must CONTINUE past a package
      //        that returns { ok: false } and still aggregate the healthy package's brains.
      const scene = useBeforeAll(async () => {
        jest
          .spyOn(discoverModule, 'discoverBrainPackages')
          .mockResolvedValue(['rhachet-brains-bad', 'rhachet-brains-good']);

        const atomGood = genMockedBrainAtom({
          repo: 'good',
          slug: 'good/opus',
        });

        mockImportPackageExports.mockImplementation(
          async ({ packageName }: { packageName: string }) => {
            if (packageName === 'rhachet-brains-bad')
              return {
                ok: false,
                error: new Error(
                  'Cannot use import statement outside a module',
                ),
              };
            return {
              ok: true,
              module: { getBrainAtomsByGood: () => [atomGood] },
            };
          },
        );

        return getAvailableBrains({}, context);
      });

      then('the healthy package brains still populate', () => {
        expect(scene.atoms).toHaveLength(1);
        expect(scene.atoms[0]?.slug).toEqual('good/opus');
      });
    });
  });
});
