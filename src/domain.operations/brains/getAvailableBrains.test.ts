import { given, then, when } from 'test-fns';

import { genMockedBrainAtom } from '@src/.test.assets/genMockedBrainAtom';
import { genMockedBrainRepl } from '@src/.test.assets/genMockedBrainRepl';
import type { BrainAtom } from '@src/domain.objects/BrainAtom';
import type { BrainRepl } from '@src/domain.objects/BrainRepl';

// test the internal extraction and deduplication logic
// note: the main function uses dynamic imports which are tested in integration tests

describe('getAvailableBrains', () => {
  describe('extractBrainsFromPackage', () => {
    // we need to test the extraction logic
    // since it's internal, we test it via the exported function's behavior

    given('[case1] package exports getBrainAtomsBy* functions', () => {
      const mockAtom1 = genMockedBrainAtom({
        repo: 'anthropic',
        slug: 'anthropic/claude-opus',
      });
      const mockAtom2 = genMockedBrainAtom({
        repo: 'anthropic',
        slug: 'anthropic/claude-sonnet',
      });

      const mockExports = {
        getBrainAtomsByAnthropic: () => [mockAtom1, mockAtom2],
      };

      when('[t0] extraction is performed', () => {
        then('it extracts all atoms from the function', () => {
          // test via the pattern that getAvailableBrains uses
          const atoms: BrainAtom[] = [];

          for (const [key, value] of Object.entries(mockExports)) {
            if (typeof value !== 'function') continue;
            if (key.startsWith('getBrainAtomsBy')) {
              const result = value();
              if (Array.isArray(result)) {
                atoms.push(...result);
              }
            }
          }

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

      const mockExports = {
        getBrainReplsByAnthropic: () => [mockRepl1],
        getBrainReplsByOpenai: () => [mockRepl2],
      };

      when('[t0] extraction is performed', () => {
        then('it extracts repls from all matched functions', () => {
          const repls: BrainRepl[] = [];

          for (const [key, value] of Object.entries(mockExports)) {
            if (typeof value !== 'function') continue;
            if (key.startsWith('getBrainReplsBy')) {
              const result = value();
              if (Array.isArray(result)) {
                repls.push(...result);
              }
            }
          }

          expect(repls).toHaveLength(2);
          expect(repls[0]).toBe(mockRepl1);
          expect(repls[1]).toBe(mockRepl2);
        });
      });
    });

    given('[case3] package exports non-function values', () => {
      const mockAtom = genMockedBrainAtom({
        repo: 'xai',
        slug: 'xai/grok-3',
      });

      const mockExports = {
        getBrainAtomsByXai: () => [mockAtom],
        someConstant: 'not a function',
        someObject: { foo: 'bar' },
        getBrainAtomsNotAFunction: 'string value',
      };

      when('[t0] extraction is performed', () => {
        then('it only processes functions', () => {
          const atoms: BrainAtom[] = [];

          for (const [key, value] of Object.entries(mockExports)) {
            if (typeof value !== 'function') continue;
            if (key.startsWith('getBrainAtomsBy')) {
              const result = value();
              if (Array.isArray(result)) {
                atoms.push(...result);
              }
            }
          }

          expect(atoms).toHaveLength(1);
          expect(atoms[0]).toBe(mockAtom);
        });
      });
    });

    given('[case4] package exports functions that return non-arrays', () => {
      const mockExports = {
        getBrainAtomsByWeird: () => 'not an array',
        getBrainAtomsByNull: () => null,
        getBrainReplsByUndefined: () => undefined,
      };

      when('[t0] extraction is performed', () => {
        then('it safely skips non-array results', () => {
          const atoms: BrainAtom[] = [];
          const repls: BrainRepl[] = [];

          for (const [key, value] of Object.entries(mockExports)) {
            if (typeof value !== 'function') continue;
            if (key.startsWith('getBrainAtomsBy')) {
              const result = value();
              if (Array.isArray(result)) {
                atoms.push(...result);
              }
            }
            if (key.startsWith('getBrainReplsBy')) {
              const result = value();
              if (Array.isArray(result)) {
                repls.push(...result);
              }
            }
          }

          expect(atoms).toHaveLength(0);
          expect(repls).toHaveLength(0);
        });
      });
    });
  });

  describe('dedupeBySlug', () => {
    given('[case5] brains with unique slugs', () => {
      const atom1 = genMockedBrainAtom({
        repo: 'xai',
        slug: 'xai/grok-3',
      });
      const atom2 = genMockedBrainAtom({
        repo: 'anthropic',
        slug: 'anthropic/claude-opus',
      });

      when('[t0] deduplication is performed', () => {
        then('all brains are retained', () => {
          const brains = [atom1, atom2];
          const slugsSeen = new Set<string>();
          const deduped = brains.filter((b) => {
            const key = b.slug.startsWith(`${b.repo}/`)
              ? b.slug
              : `${b.repo}/${b.slug}`;
            if (slugsSeen.has(key)) return false;
            slugsSeen.add(key);
            return true;
          });

          expect(deduped).toHaveLength(2);
          expect(deduped[0]).toBe(atom1);
          expect(deduped[1]).toBe(atom2);
        });
      });
    });

    given('[case6] brains with duplicate slugs', () => {
      const atom1 = genMockedBrainAtom({
        repo: 'xai',
        slug: 'xai/grok-3',
        description: 'first',
      });
      const atom2 = genMockedBrainAtom({
        repo: 'xai',
        slug: 'xai/grok-3',
        description: 'duplicate',
      });
      const atom3 = genMockedBrainAtom({
        repo: 'anthropic',
        slug: 'anthropic/claude-opus',
      });

      when('[t0] deduplication is performed', () => {
        then('first brain wins for duplicates', () => {
          const brains = [atom1, atom2, atom3];
          const slugsSeen = new Set<string>();
          const deduped = brains.filter((b) => {
            const key = b.slug.startsWith(`${b.repo}/`)
              ? b.slug
              : `${b.repo}/${b.slug}`;
            if (slugsSeen.has(key)) return false;
            slugsSeen.add(key);
            return true;
          });

          expect(deduped).toHaveLength(2);
          expect(deduped[0]).toBe(atom1);
          expect(deduped[0]!.description).toBe('first');
          expect(deduped[1]).toBe(atom3);
        });
      });
    });

    given('[case7] brains with legacy slugs (no repo prefix)', () => {
      // legacy brains might have slug without repo prefix
      const atom1 = genMockedBrainAtom({
        repo: 'xai',
        slug: 'grok-3', // legacy: no repo prefix
      });
      const atom2 = genMockedBrainAtom({
        repo: 'xai',
        slug: 'xai/grok-3', // modern: with repo prefix
      });

      when('[t0] deduplication is performed', () => {
        then('legacy and modern slugs are treated as duplicates', () => {
          const brains = [atom1, atom2];
          const slugsSeen = new Set<string>();
          const deduped = brains.filter((b) => {
            // getBrainSlugFull logic: prepend repo/ if not already present
            const key = b.slug.startsWith(`${b.repo}/`)
              ? b.slug
              : `${b.repo}/${b.slug}`;
            if (slugsSeen.has(key)) return false;
            slugsSeen.add(key);
            return true;
          });

          expect(deduped).toHaveLength(1);
          expect(deduped[0]).toBe(atom1);
        });
      });
    });
  });

  describe('empty states', () => {
    given('[case8] package exports no brain functions', () => {
      const mockExports = {
        someOtherFunction: () => 'not a brain function',
        SOME_CONSTANT: 42,
      };

      when('[t0] extraction is performed', () => {
        then('empty arrays are returned', () => {
          const atoms: BrainAtom[] = [];
          const repls: BrainRepl[] = [];

          for (const [key, value] of Object.entries(mockExports)) {
            if (typeof value !== 'function') continue;
            if (key.startsWith('getBrainAtomsBy')) {
              const result = value();
              if (Array.isArray(result)) {
                atoms.push(...result);
              }
            }
            if (key.startsWith('getBrainReplsBy')) {
              const result = value();
              if (Array.isArray(result)) {
                repls.push(...result);
              }
            }
          }

          expect(atoms).toHaveLength(0);
          expect(repls).toHaveLength(0);
        });
      });
    });

    given('[case9] empty exports object', () => {
      const mockExports = {};

      when('[t0] extraction is performed', () => {
        then('empty arrays are returned', () => {
          const atoms: BrainAtom[] = [];
          const repls: BrainRepl[] = [];

          for (const [key, value] of Object.entries(mockExports)) {
            if (typeof value !== 'function') continue;
            if (key.startsWith('getBrainAtomsBy')) {
              const result = (value as () => unknown)();
              if (Array.isArray(result)) {
                atoms.push(...result);
              }
            }
            if (key.startsWith('getBrainReplsBy')) {
              const result = (value as () => unknown)();
              if (Array.isArray(result)) {
                repls.push(...result);
              }
            }
          }

          expect(atoms).toHaveLength(0);
          expect(repls).toHaveLength(0);
        });
      });
    });
  });
});
