import { genBrainHooksAdapterForClaudeCode } from 'rhachet-brains-anthropic';
import { genTempDir } from 'test-fns';

import { BrainHook } from '@src/domain.objects/BrainHook';

import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getOneHookDispatchRuleOfBrainHook } from './getOneHookDispatchRuleOfBrainHook';

/**
 * .what = every hook shape whose placement core derives on its own, one per row
 * .why = core builds each manifest rule's event and matcher itself, where the installed claude
 *   supplier once placed each hook. the two must agree, or a role hook fires under another event
 *   than it did before the dispatcher. this suite goes red the day the supplier places a shape
 *   differently (e.g. `when: 'after'` under PostToolUse), so core follows it in the same change
 */
const HOOK_SHAPES: Array<{ description: string; hook: BrainHook }> = [
  {
    description: 'an onBoot hook',
    hook: new BrainHook({
      author: 'repo=test/role=tester',
      event: 'onBoot',
      command: 'echo boot',
      timeout: 'PT5S',
    }),
  },
  {
    description: 'an onTool hook with a matcher',
    hook: new BrainHook({
      author: 'repo=test/role=tester',
      event: 'onTool',
      command: 'echo tool',
      timeout: 'PT5S',
      filter: { what: 'Bash' },
    }),
  },
  {
    description: "an onTool hook declared `when: 'after'`",
    hook: new BrainHook({
      author: 'repo=test/role=tester',
      event: 'onTool',
      command: 'echo after',
      timeout: 'PT5S',
      filter: { what: 'Write', when: 'after' },
    }),
  },
  {
    description: 'an onTalk hook',
    hook: new BrainHook({
      author: 'repo=test/role=tester',
      event: 'onTalk',
      command: 'echo talk',
      timeout: 'PT5S',
    }),
  },
  {
    description: 'an onStop hook',
    hook: new BrainHook({
      author: 'repo=test/role=tester',
      event: 'onStop',
      command: 'echo stop',
      timeout: 'PT5S',
    }),
  },
];

/**
 * .what = the claude event and matcher the installed supplier wrote one hook under
 */
const getPlacementBySupplier = async (input: {
  hook: BrainHook;
  slug: string;
}): Promise<{ event: string; matcher: string }> => {
  const repoPath = genTempDir({ slug: input.slug });
  mkdirSync(join(repoPath, '.claude'), { recursive: true });
  const adapter = genBrainHooksAdapterForClaudeCode({ repoPath });
  await adapter.dao.set.upsert({ hook: input.hook });
  const placements = readdirSync(join(repoPath, '.claude'))
    .filter((name) => name.endsWith('.json'))
    .flatMap((name) => {
      const settings = JSON.parse(
        readFileSync(join(repoPath, '.claude', name), 'utf-8'),
      ) as {
        hooks?: Record<
          string,
          Array<{ matcher: string; hooks: Array<{ command: string }> }>
        >;
      };
      return Object.entries(settings.hooks ?? {}).flatMap(([event, entries]) =>
        entries
          .filter((entry) =>
            entry.hooks.some((hook) => hook.command === input.hook.command),
          )
          .map((entry) => ({ event, matcher: entry.matcher })),
      );
    });
  if (placements.length !== 1)
    throw new Error(
      `expected one placement of ${input.hook.command}, found ${placements.length}`,
    );
  return placements[0]!;
};

describe('getOneHookDispatchRuleOfBrainHook, against the installed claude supplier', () => {
  HOOK_SHAPES.map((thisCase, index) =>
    test(`${thisCase.description} lands under the event and matcher the supplier writes`, async () => {
      const supplier = await getPlacementBySupplier({
        hook: thisCase.hook,
        slug: `dispatch-supplier-parity-${index}`,
      });
      const rule = getOneHookDispatchRuleOfBrainHook({
        hook: thisCase.hook,
        repoPath: genTempDir({
          slug: `dispatch-supplier-parity-repo-${index}`,
        }),
      });
      expect({ event: rule.event, matcher: rule.matcher }).toEqual(supplier);
    }),
  );
});
