import { getError, given, then, when } from 'test-fns';

import { genMockedBrainAtom } from '@src/.test.assets/genMockedBrainAtom';
import { genMockedBrainRepl } from '@src/.test.assets/genMockedBrainRepl';

import { asBrainsFromPackageExports } from './asBrainsFromPackageExports';

describe('asBrainsFromPackageExports', () => {
  given('[case1] package exports getBrainAtomsBy* functions', () => {
    const mockAtom1 = genMockedBrainAtom({
      repo: 'anthropic',
      slug: 'anthropic/claude-opus',
    });
    const mockAtom2 = genMockedBrainAtom({
      repo: 'anthropic',
      slug: 'anthropic/claude-sonnet',
    });

    when('[t0] extraction is performed', () => {
      then('it extracts all atoms from the function', () => {
        const { atoms } = asBrainsFromPackageExports({
          exports: { getBrainAtomsByAnthropic: () => [mockAtom1, mockAtom2] },
        });
        expect(atoms).toHaveLength(2);
        expect(atoms[0]).toBe(mockAtom1);
        expect(atoms[1]).toBe(mockAtom2);
      });
    });
  });

  given('[case2] package exports getBrainReplsBy* functions', () => {
    const mockRepl1 = genMockedBrainRepl({
      repo: 'anthropic',
      slug: 'anthropic/claude-code',
    });
    const mockRepl2 = genMockedBrainRepl({
      repo: 'openai',
      slug: 'openai/codex',
    });

    when('[t0] extraction is performed', () => {
      then('it extracts repls from all matched functions', () => {
        const { repls } = asBrainsFromPackageExports({
          exports: {
            getBrainReplsByAnthropic: () => [mockRepl1],
            getBrainReplsByOpenai: () => [mockRepl2],
          },
        });
        expect(repls).toHaveLength(2);
        expect(repls[0]).toBe(mockRepl1);
        expect(repls[1]).toBe(mockRepl2);
      });
    });
  });

  given('[case3] package exports non-function values', () => {
    const mockAtom = genMockedBrainAtom({ repo: 'xai', slug: 'xai/grok-3' });

    when('[t0] extraction is performed', () => {
      then('it only processes functions', () => {
        const { atoms } = asBrainsFromPackageExports({
          exports: {
            getBrainAtomsByXai: () => [mockAtom],
            someConstant: 'not a function',
            someObject: { foo: 'bar' },
            getBrainAtomsNotAFunction: 'string value',
          },
        });
        expect(atoms).toHaveLength(1);
        expect(atoms[0]).toBe(mockAtom);
      });
    });
  });

  given('[case4] package exports functions that return non-arrays', () => {
    when('[t0] extraction is performed', () => {
      then('it safely skips non-array results', () => {
        const { atoms, repls } = asBrainsFromPackageExports({
          exports: {
            getBrainAtomsByWeird: () => 'not an array',
            getBrainAtomsByNull: () => null,
            getBrainReplsByUndefined: () => undefined,
          },
        });
        expect(atoms).toHaveLength(0);
        expect(repls).toHaveLength(0);
      });
    });
  });

  given('[case5] package exports no brain functions', () => {
    when('[t0] extraction is performed', () => {
      then('empty arrays are returned', () => {
        const { atoms, repls } = asBrainsFromPackageExports({
          exports: {
            someOtherFunction: () => 'not a brain function',
            SOME_CONSTANT: 42,
          },
        });
        expect(atoms).toHaveLength(0);
        expect(repls).toHaveLength(0);
      });
    });
  });

  given('[case6] empty exports object', () => {
    when('[t0] extraction is performed', () => {
      then('empty arrays are returned', () => {
        const { atoms, repls } = asBrainsFromPackageExports({ exports: {} });
        expect(atoms).toHaveLength(0);
        expect(repls).toHaveLength(0);
      });
    });
  });

  given('[case7] a getBrainAtomsBy* collector that throws', () => {
    // .note = fail-loud contract (rule.forbid.failhide): a collector that throws is a
    //   genuine defect, so asBrainsFromPackageExports must NOT swallow it. the package
    //   boundary catch that isolates a bad package lives in getBrainsFromPackageExports
    //   (used by getAvailableBrains), not here.
    when('[t0] extraction is performed', () => {
      then('the error propagates (fails loud, not swallowed)', () => {
        const error = getError(() =>
          asBrainsFromPackageExports({
            exports: {
              getBrainAtomsByBroken: () => {
                throw new Error('collector boom');
              },
            },
          }),
        );
        expect(error.message).toContain('collector boom');
      });
    });
  });
});
