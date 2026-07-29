import { given, then, when } from 'test-fns';

import { asFlatModuleExports } from './asFlatModuleExports';

/**
 * .what = unit proof for asFlatModuleExports (ehmpathy/rhachet#429)
 * .why  = a real import() of a commonjs package returns named exports either at the
 *         top level (cjs-module-lexer detected them) or ONLY under `.default` (the
 *         lexer missed a runtime __exportStar). this transformer flattens both shapes
 *         to one, so callers that walk Object.entries(exports) find named exports
 *         regardless. it is pure — no import() — so it runs under jest as a unit test,
 *         unlike the real-import capability (see importEsmSafe blocker articulation).
 */
describe('asFlatModuleExports', () => {
  given('[case1] a namespace with a top-level named export', () => {
    when('[t0] flattened', () => {
      const result = asFlatModuleExports({
        namespace: { getBrainAtomsByX: () => [1] },
      });

      then('the top-level named export is preserved', () => {
        expect(Object.keys(result)).toContain('getBrainAtomsByX');
        expect(typeof result.getBrainAtomsByX).toBe('function');
      });
    });
  });

  given(
    '[case2] a namespace with named exports nested under an object default',
    () => {
      when('[t0] flattened', () => {
        const result = asFlatModuleExports({
          namespace: {
            default: { getBrainAtomsByHidden: () => [2] },
          },
        });

        then('the .default-nested export is hoisted to the top level', () => {
          expect(Object.keys(result)).toContain('getBrainAtomsByHidden');
          expect(typeof result.getBrainAtomsByHidden).toBe('function');
        });
      });
    },
  );

  given('[case3] a top-level key that also appears under default', () => {
    when('[t0] flattened', () => {
      const result = asFlatModuleExports({
        namespace: {
          shared: 'top',
          default: { shared: 'nested' },
        },
      });

      then('the top-level key wins on conflict (no double-count)', () => {
        expect(result.shared).toBe('top');
      });
    });
  });

  given('[case4] a function default (a real esm default export)', () => {
    when('[t0] flattened', () => {
      const realDefault = () => 'i am the default';
      const result = asFlatModuleExports({
        namespace: { default: realDefault },
      });

      then(
        'the function default is left untouched under its default key',
        () => {
          expect(result.default).toBe(realDefault);
        },
      );
    });
  });

  given('[case5] a namespace with no default', () => {
    when('[t0] flattened', () => {
      const result = asFlatModuleExports({
        namespace: { getBrainReplsByY: () => [3] },
      });

      then('the namespace passes through with its named export intact', () => {
        expect(Object.keys(result)).toContain('getBrainReplsByY');
        expect(result.default).toBeUndefined();
      });
    });
  });
});
