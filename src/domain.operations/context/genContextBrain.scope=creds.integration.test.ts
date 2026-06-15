import { given, then, useThen, when } from 'test-fns';
import { z } from 'zod';

import { genMockedBrainOutput } from '@src/.test.assets/genMockedBrainOutput';
import { genSampleBrainSpec } from '@src/.test.assets/genSampleBrainSpec';
import type { BrainAtom } from '@src/domain.objects/BrainAtom';
import type { BrainRepl } from '@src/domain.objects/BrainRepl';
import type { BrainSuppliesCreds } from '@src/domain.objects/BrainSuppliesCreds';

import { genContextBrain } from './genContextBrain';

const outputSchema = z.object({ content: z.string() });

/**
 * .what = helper to check property with dots in key name
 * .why = jest toHaveProperty treats dots as nested path; we need literal key
 */
const hasKey = (obj: unknown, key: string): boolean =>
  typeof obj === 'object' && obj !== null && key in obj;

/**
 * .what = creates a test atom that captures context passed to ask()
 * .why = enables verification that creds flow through to brain
 */
const genAtomThatCapturesContext = (input: {
  repo: string;
  slug: string;
  onAsk: (context: unknown) => void;
}): BrainAtom => ({
  repo: input.repo,
  slug: input.slug,
  description: 'test atom that captures context',
  spec: genSampleBrainSpec(),
  ask: async (askInput, context?) => {
    input.onAsk(context);
    return genMockedBrainOutput({
      output: askInput.schema.output.parse({ content: '__response__' }),
      brainChoice: 'atom',
    });
  },
});

/**
 * .what = creates a test repl that captures context passed to ask() and act()
 * .why = enables verification that creds flow through both paths
 */
const genReplThatCapturesContext = (input: {
  repo: string;
  slug: string;
  onAsk?: (context: unknown) => void;
  onAct?: (context: unknown) => void;
}): BrainRepl => ({
  repo: input.repo,
  slug: input.slug,
  description: 'test repl that captures context',
  spec: genSampleBrainSpec(),
  ask: async (askInput, context?) => {
    input.onAsk?.(context);
    return genMockedBrainOutput({
      output: askInput.schema.output.parse({ content: '__response__' }),
      brainChoice: 'repl',
    });
  },
  act: async (actInput, context?) => {
    input.onAct?.(context);
    return genMockedBrainOutput({
      output: actInput.schema.output.parse({ content: '__response__' }),
      brainChoice: 'repl',
    });
  },
});

describe('genContextBrain.scope=creds', () => {
  describe('creds flow to brain.choice', () => {
    given('[case1] atom choice with keyrack creds', () => {
      const creds: BrainSuppliesCreds<any> = {
        keyrack: { owner: 'ehmpath', env: 'test' },
      };
      let capturedContext: unknown;
      const testAtom = genAtomThatCapturesContext({
        repo: '__test_repo__',
        slug: '__test_atom__',
        onAsk: (ctx) => {
          capturedContext = ctx;
        },
      });

      when('[t0] brain.choice.ask is called', () => {
        useThen('ask completes', async () => {
          const context = genContextBrain({
            brains: { atoms: [testAtom], repls: [] },
            choice: '__test_repo__/__test_atom__',
            creds,
          });
          await context.brain.choice!.ask({
            role: {},
            prompt: 'test',
            schema: { output: outputSchema },
          });
        });

        then('creds are passed to the brain', () => {
          expect(capturedContext).toBeDefined();
          expect(hasKey(capturedContext, 'brain.supplier.__test_repo__')).toBe(
            true,
          );
          const supplierContext = (capturedContext as any)[
            'brain.supplier.__test_repo__'
          ];
          expect(supplierContext).toEqual({ creds });
        });
      });
    });

    given('[case2] repl choice with keyrack creds', () => {
      const creds: BrainSuppliesCreds<any> = {
        keyrack: { owner: 'ehmpath', env: 'prep' },
      };
      let capturedContext: unknown;
      const testRepl = genReplThatCapturesContext({
        repo: '__test_repl_repo__',
        slug: '__test_repl__',
        onAsk: (ctx) => {
          capturedContext = ctx;
        },
      });

      when('[t0] brain.choice.ask is called', () => {
        useThen('ask completes', async () => {
          const context = genContextBrain({
            brains: { atoms: [], repls: [testRepl] },
            choice: { repl: '__test_repl_repo__/__test_repl__' },
            creds,
          });
          await context.brain.choice!.ask({
            role: {},
            prompt: 'test',
            schema: { output: outputSchema },
          });
        });

        then('creds are passed to the brain', () => {
          expect(capturedContext).toBeDefined();
          expect(
            hasKey(capturedContext, 'brain.supplier.__test_repl_repo__'),
          ).toBe(true);
          const supplierContext = (capturedContext as any)[
            'brain.supplier.__test_repl_repo__'
          ];
          expect(supplierContext).toEqual({ creds });
        });
      });
    });
  });

  describe('creds flow to delegated paths', () => {
    given('[case3] brain.atom.ask path', () => {
      const creds: BrainSuppliesCreds<any> = {
        keyrack: { owner: 'ehmpath', env: 'test' },
      };
      let capturedContext: unknown;
      const testAtom = genAtomThatCapturesContext({
        repo: '__delegated_atom_repo__',
        slug: '__delegated_atom__',
        onAsk: (ctx) => {
          capturedContext = ctx;
        },
      });

      when('[t0] brain.atom.ask is called', () => {
        useThen('ask completes', async () => {
          const context = genContextBrain({
            brains: { atoms: [testAtom], repls: [] },
            creds,
          });
          await context.brain.atom.ask({
            brain: testAtom,
            role: {},
            prompt: 'test',
            schema: { output: outputSchema },
          });
        });

        then('creds are passed to the brain', () => {
          expect(capturedContext).toBeDefined();
          expect(
            hasKey(capturedContext, 'brain.supplier.__delegated_atom_repo__'),
          ).toBe(true);
          const supplierContext = (capturedContext as any)[
            'brain.supplier.__delegated_atom_repo__'
          ];
          expect(supplierContext).toEqual({ creds });
        });
      });
    });

    given('[case4] brain.repl.ask path', () => {
      const creds: BrainSuppliesCreds<any> = {
        keyrack: { owner: 'ehmpath', env: 'test' },
      };
      let capturedContext: unknown;
      const testRepl = genReplThatCapturesContext({
        repo: '__delegated_repl_repo__',
        slug: '__delegated_repl__',
        onAsk: (ctx) => {
          capturedContext = ctx;
        },
      });

      when('[t0] brain.repl.ask is called', () => {
        useThen('ask completes', async () => {
          const context = genContextBrain({
            brains: { atoms: [], repls: [testRepl] },
            creds,
          });
          await context.brain.repl.ask({
            brain: testRepl,
            role: {},
            prompt: 'test',
            schema: { output: outputSchema },
          });
        });

        then('creds are passed to the brain', () => {
          expect(capturedContext).toBeDefined();
          expect(
            hasKey(capturedContext, 'brain.supplier.__delegated_repl_repo__'),
          ).toBe(true);
          const supplierContext = (capturedContext as any)[
            'brain.supplier.__delegated_repl_repo__'
          ];
          expect(supplierContext).toEqual({ creds });
        });
      });
    });

    given('[case5] brain.repl.act path', () => {
      const creds: BrainSuppliesCreds<any> = {
        keyrack: { owner: 'ehmpath', env: 'test' },
      };
      let capturedContext: unknown;
      const testRepl = genReplThatCapturesContext({
        repo: '__delegated_repl_repo__',
        slug: '__delegated_repl__',
        onAct: (ctx) => {
          capturedContext = ctx;
        },
      });

      when('[t0] brain.repl.act is called', () => {
        useThen('act completes', async () => {
          const context = genContextBrain({
            brains: { atoms: [], repls: [testRepl] },
            creds,
          });
          await context.brain.repl.act({
            brain: testRepl,
            role: {},
            prompt: 'test',
            schema: { output: outputSchema },
          });
        });

        then('creds are passed to the brain', () => {
          expect(capturedContext).toBeDefined();
          expect(
            hasKey(capturedContext, 'brain.supplier.__delegated_repl_repo__'),
          ).toBe(true);
          const supplierContext = (capturedContext as any)[
            'brain.supplier.__delegated_repl_repo__'
          ];
          expect(supplierContext).toEqual({ creds });
        });
      });
    });
  });

  describe('creds with getter function', () => {
    given('[case6] creds as async getter function', () => {
      const credsGetter = async () => ({
        FIREWORKS_API_KEY: '__test_api_key__',
      });
      const creds: BrainSuppliesCreds<any> = credsGetter;
      let capturedContext: unknown;
      const testAtom = genAtomThatCapturesContext({
        repo: 'fireworks',
        slug: '__test_atom__',
        onAsk: (ctx) => {
          capturedContext = ctx;
        },
      });

      when('[t0] brain.choice.ask is called', () => {
        useThen('ask completes', async () => {
          const context = genContextBrain({
            brains: { atoms: [testAtom], repls: [] },
            choice: 'fireworks/__test_atom__',
            creds,
          });
          await context.brain.choice!.ask({
            role: {},
            prompt: 'test',
            schema: { output: outputSchema },
          });
        });

        then('getter function is passed to the brain', () => {
          expect(capturedContext).toBeDefined();
          expect(hasKey(capturedContext, 'brain.supplier.fireworks')).toBe(
            true,
          );
          const supplierContext = (capturedContext as any)[
            'brain.supplier.fireworks'
          ];
          expect(supplierContext.creds).toBe(credsGetter);
        });
      });
    });
  });

  describe('no creds case', () => {
    given('[case7] creds is undefined', () => {
      let capturedContext: unknown;
      const testAtom = genAtomThatCapturesContext({
        repo: '__no_creds_repo__',
        slug: '__no_creds_atom__',
        onAsk: (ctx) => {
          capturedContext = ctx;
        },
      });

      when('[t0] brain.choice.ask is called without creds', () => {
        useThen('ask completes', async () => {
          const context = genContextBrain({
            brains: { atoms: [testAtom], repls: [] },
            choice: '__no_creds_repo__/__no_creds_atom__',
            // no creds provided
          });
          await context.brain.choice!.ask({
            role: {},
            prompt: 'test',
            schema: { output: outputSchema },
          });
        });

        then('empty context is passed to the brain', () => {
          expect(capturedContext).toEqual({});
        });
      });
    });
  });

  describe('contextCaller override', () => {
    given('[case8] contextCaller overrides bound creds', () => {
      const boundCreds: BrainSuppliesCreds<any> = {
        keyrack: { owner: 'ehmpath', env: 'test' },
      };
      const overrideCreds: BrainSuppliesCreds<any> = {
        keyrack: { owner: 'override', env: 'prod' },
      };
      let capturedContext: unknown;
      const testAtom = genAtomThatCapturesContext({
        repo: '__override_repo__',
        slug: '__override_atom__',
        onAsk: (ctx) => {
          capturedContext = ctx;
        },
      });

      when('[t0] brain.choice.ask is called with contextCaller', () => {
        useThen('ask completes', async () => {
          const context = genContextBrain({
            brains: { atoms: [testAtom], repls: [] },
            choice: '__override_repo__/__override_atom__',
            creds: boundCreds,
          });
          await context.brain.choice!.ask(
            {
              role: {},
              prompt: 'test',
              schema: { output: outputSchema },
            },
            // cast needed: test brains don't declare TContext so it's erased
            {
              'brain.supplier.__override_repo__': { creds: overrideCreds },
            } as any,
          );
        });

        then('contextCaller takes precedence over bound context', () => {
          expect(capturedContext).toBeDefined();
          const supplierContext = (capturedContext as any)[
            'brain.supplier.__override_repo__'
          ];
          expect(supplierContext.creds).toEqual(overrideCreds);
        });
      });
    });

    given('[case9] contextCaller extends bound context', () => {
      const boundCreds: BrainSuppliesCreds<any> = {
        keyrack: { owner: 'ehmpath', env: 'test' },
      };
      let capturedContext: unknown;
      const testAtom = genAtomThatCapturesContext({
        repo: '__extend_repo__',
        slug: '__extend_atom__',
        onAsk: (ctx) => {
          capturedContext = ctx;
        },
      });

      when('[t0] brain.choice.ask is called with additional context', () => {
        useThen('ask completes', async () => {
          const context = genContextBrain({
            brains: { atoms: [testAtom], repls: [] },
            choice: '__extend_repo__/__extend_atom__',
            creds: boundCreds,
          });
          await context.brain.choice!.ask(
            {
              role: {},
              prompt: 'test',
              schema: { output: outputSchema },
            },
            // cast needed: test brains don't declare TContext so it's erased
            {
              'custom.context.key': { value: '__custom_value__' },
            } as any,
          );
        });

        then('bound creds are preserved', () => {
          expect(
            hasKey(capturedContext, 'brain.supplier.__extend_repo__'),
          ).toBe(true);
          const supplierContext = (capturedContext as any)[
            'brain.supplier.__extend_repo__'
          ];
          expect(supplierContext.creds).toEqual(boundCreds);
        });

        then('caller context is merged in', () => {
          expect(hasKey(capturedContext, 'custom.context.key')).toBe(true);
          expect((capturedContext as any)['custom.context.key']).toEqual({
            value: '__custom_value__',
          });
        });
      });
    });
  });

  describe('cache behavior', () => {
    given('[case10] multiple calls to same supplier reuse cache', () => {
      const creds: BrainSuppliesCreds<any> = {
        keyrack: { owner: 'ehmpath', env: 'test' },
      };
      const capturedContexts: unknown[] = [];
      const testAtom1 = genAtomThatCapturesContext({
        repo: '__cache_repo__',
        slug: '__cache_atom_1__',
        onAsk: (ctx) => {
          capturedContexts.push(ctx);
        },
      });
      const testAtom2 = genAtomThatCapturesContext({
        repo: '__cache_repo__',
        slug: '__cache_atom_2__',
        onAsk: (ctx) => {
          capturedContexts.push(ctx);
        },
      });

      when('[t0] two atoms from same repo are called', () => {
        useThen('both calls complete', async () => {
          const context = genContextBrain({
            brains: { atoms: [testAtom1, testAtom2], repls: [] },
            creds,
          });
          await context.brain.atom.ask({
            brain: testAtom1,
            role: {},
            prompt: 'first call',
            schema: { output: outputSchema },
          });
          await context.brain.atom.ask({
            brain: testAtom2,
            role: {},
            prompt: 'second call',
            schema: { output: outputSchema },
          });
        });

        then('both receive same supplier context', () => {
          expect(capturedContexts).toHaveLength(2);
          const supplierContext1 = (capturedContexts[0] as any)[
            'brain.supplier.__cache_repo__'
          ];
          const supplierContext2 = (capturedContexts[1] as any)[
            'brain.supplier.__cache_repo__'
          ];
          expect(supplierContext1).toEqual(supplierContext2);
          expect(supplierContext1).toEqual({ creds });
        });
      });
    });

    given('[case11] different suppliers get independent contexts', () => {
      const creds: BrainSuppliesCreds<any> = {
        keyrack: { owner: 'ehmpath', env: 'test' },
      };
      const capturedContexts: unknown[] = [];
      const testAtomA = genAtomThatCapturesContext({
        repo: '__supplier_a__',
        slug: '__atom_a__',
        onAsk: (ctx) => {
          capturedContexts.push(ctx);
        },
      });
      const testAtomB = genAtomThatCapturesContext({
        repo: '__supplier_b__',
        slug: '__atom_b__',
        onAsk: (ctx) => {
          capturedContexts.push(ctx);
        },
      });

      when('[t0] atoms from different suppliers are called', () => {
        useThen('both calls complete', async () => {
          const context = genContextBrain({
            brains: { atoms: [testAtomA, testAtomB], repls: [] },
            creds,
          });
          await context.brain.atom.ask({
            brain: testAtomA,
            role: {},
            prompt: 'supplier A',
            schema: { output: outputSchema },
          });
          await context.brain.atom.ask({
            brain: testAtomB,
            role: {},
            prompt: 'supplier B',
            schema: { output: outputSchema },
          });
        });

        then('each receives its own supplier context', () => {
          expect(capturedContexts).toHaveLength(2);

          // supplier A context
          expect(
            hasKey(capturedContexts[0], 'brain.supplier.__supplier_a__'),
          ).toBe(true);
          expect(
            hasKey(capturedContexts[0], 'brain.supplier.__supplier_b__'),
          ).toBe(false);

          // supplier B context
          expect(
            hasKey(capturedContexts[1], 'brain.supplier.__supplier_b__'),
          ).toBe(true);
          expect(
            hasKey(capturedContexts[1], 'brain.supplier.__supplier_a__'),
          ).toBe(false);
        });
      });
    });
  });

  describe('discovery mode with creds', () => {
    given('[case12] discovery mode passes creds to discovered brains', () => {
      // .note = this test uses real discovery, so we can only verify
      // that the context creation succeeds with creds
      // actual creds flow is tested in explicit mode above

      const creds: BrainSuppliesCreds<any> = {
        keyrack: { owner: 'ehmpath', env: 'test' },
      };

      when('[t0] genContextBrain is awaited with creds', () => {
        const context = useThen('context is created', async () =>
          genContextBrain({ creds }),
        );

        then('brain context is created', () => {
          expect(context.brain).toBeDefined();
          expect(context.brain.atom).toBeDefined();
          expect(context.brain.repl).toBeDefined();
        });

        then('brain.choice is null (no choice provided)', () => {
          expect(context.brain.choice).toBeNull();
        });
      });
    });

    given('[case13] discovery mode with choice passes creds to choice', () => {
      // .note = this test would require actual installed brains that capture context
      // since we can't inject test brains in discovery mode, we verify the async path
      // explicit mode tests above prove the creds flow logic

      const creds: BrainSuppliesCreds<any> = {
        keyrack: { owner: 'ehmpath', env: 'test' },
      };

      when('[t0] discovery mode is used with creds and no choice', () => {
        const context = useThen('context is created', async () =>
          genContextBrain({ creds }),
        );

        then('delegates are available', () => {
          expect(typeof context.brain.atom.ask).toBe('function');
          expect(typeof context.brain.repl.ask).toBe('function');
          expect(typeof context.brain.repl.act).toBe('function');
        });
      });
    });
  });

  describe('explicit mode with creds', () => {
    given('[case14] explicit mode is sync', () => {
      const creds: BrainSuppliesCreds<any> = {
        keyrack: { owner: 'ehmpath', env: 'test' },
      };
      const testAtom = genAtomThatCapturesContext({
        repo: '__sync_repo__',
        slug: '__sync_atom__',
        onAsk: () => {},
      });

      when('[t0] genContextBrain is called with brains', () => {
        then('returns synchronously', () => {
          const result = genContextBrain({
            brains: { atoms: [testAtom], repls: [] },
            creds,
          });
          // result is not a promise
          expect(result).not.toBeInstanceOf(Promise);
          expect(result.brain).toBeDefined();
        });
      });
    });
  });

  describe('edge cases', () => {
    given('[case15] creds with empty keyrack owner', () => {
      const creds: BrainSuppliesCreds<any> = {
        keyrack: { owner: '', env: 'test' },
      };
      let capturedContext: unknown;
      const testAtom = genAtomThatCapturesContext({
        repo: '__empty_owner_repo__',
        slug: '__empty_owner_atom__',
        onAsk: (ctx) => {
          capturedContext = ctx;
        },
      });

      when('[t0] brain.choice.ask is called', () => {
        useThen('ask completes', async () => {
          const context = genContextBrain({
            brains: { atoms: [testAtom], repls: [] },
            choice: '__empty_owner_repo__/__empty_owner_atom__',
            creds,
          });
          await context.brain.choice!.ask({
            role: {},
            prompt: 'test',
            schema: { output: outputSchema },
          });
        });

        then('creds are still passed through', () => {
          expect(capturedContext).toBeDefined();
          const supplierContext = (capturedContext as any)[
            'brain.supplier.__empty_owner_repo__'
          ];
          expect(supplierContext.creds).toEqual(creds);
        });
      });
    });

    given('[case16] repl choice with act call', () => {
      const creds: BrainSuppliesCreds<any> = {
        keyrack: { owner: 'ehmpath', env: 'test' },
      };
      let capturedContext: unknown;
      const testRepl = genReplThatCapturesContext({
        repo: '__repl_act_repo__',
        slug: '__repl_act__',
        onAct: (ctx) => {
          capturedContext = ctx;
        },
      });

      when('[t0] brain.choice.act is called on repl choice', () => {
        useThen('act completes', async () => {
          const context = genContextBrain({
            brains: { atoms: [], repls: [testRepl] },
            choice: { repl: '__repl_act_repo__/__repl_act__' },
            creds,
          });
          // cast needed because choice type doesn't know it's a repl
          await (context.brain.choice as BrainRepl).act({
            role: {},
            prompt: 'test',
            schema: { output: outputSchema },
          });
        });

        then('creds are passed to act', () => {
          expect(capturedContext).toBeDefined();
          const supplierContext = (capturedContext as any)[
            'brain.supplier.__repl_act_repo__'
          ];
          expect(supplierContext.creds).toEqual(creds);
        });
      });
    });

    given('[case17] mixed atom and repl with same repo', () => {
      const creds: BrainSuppliesCreds<any> = {
        keyrack: { owner: 'ehmpath', env: 'test' },
      };
      const capturedContexts: { type: string; context: unknown }[] = [];
      const testAtom = genAtomThatCapturesContext({
        repo: '__shared_repo__',
        slug: '__shared_atom__',
        onAsk: (ctx) => {
          capturedContexts.push({ type: 'atom', context: ctx });
        },
      });
      const testRepl = genReplThatCapturesContext({
        repo: '__shared_repo__',
        slug: '__shared_repl__',
        onAsk: (ctx) => {
          capturedContexts.push({ type: 'repl', context: ctx });
        },
      });

      when('[t0] both atom and repl from same repo are called', () => {
        useThen('both calls complete', async () => {
          const context = genContextBrain({
            brains: { atoms: [testAtom], repls: [testRepl] },
            creds,
          });
          await context.brain.atom.ask({
            brain: testAtom,
            role: {},
            prompt: 'atom call',
            schema: { output: outputSchema },
          });
          await context.brain.repl.ask({
            brain: testRepl,
            role: {},
            prompt: 'repl call',
            schema: { output: outputSchema },
          });
        });

        then('both receive same supplier context', () => {
          expect(capturedContexts).toHaveLength(2);
          const atomSupplier = (capturedContexts[0]!.context as any)[
            'brain.supplier.__shared_repo__'
          ];
          const replSupplier = (capturedContexts[1]!.context as any)[
            'brain.supplier.__shared_repo__'
          ];
          expect(atomSupplier).toEqual(replSupplier);
          expect(atomSupplier.creds).toEqual(creds);
        });
      });
    });
  });
});
