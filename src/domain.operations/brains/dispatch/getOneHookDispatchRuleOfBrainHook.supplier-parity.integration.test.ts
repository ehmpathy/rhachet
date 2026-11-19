import { MalfunctionError } from 'helpful-errors';
import { genBrainHooksAdapterForClaudeCode } from 'rhachet-brains-anthropic';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

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
    description:
      'an onBoot hook keyed on a session source (`PostCompact`), as a live role declares',
    hook: new BrainHook({
      author: 'repo=test/role=tester',
      event: 'onBoot',
      command: 'echo postcompact',
      timeout: 'PT5S',
      filter: { what: 'PostCompact' },
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
      timeout: 'PT25S',
    }),
  },
];

/**
 * .what = the claude event, matcher and timeout the installed supplier wrote one hook under
 * .note = the timeout is in the unit the supplier writes into claude settings (seconds); the
 *   actor tally reads a settings timeout and a manifest timeout as one unit, so they must agree
 */
const getPlacementBySupplier = async (input: {
  hook: BrainHook;
  slug: string;
}): Promise<{ event: string; matcher: string; timeout: number }> => {
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
          Array<{
            matcher: string;
            hooks: Array<{ command: string; timeout: number }>;
          }>
        >;
      };
      return Object.entries(settings.hooks ?? {}).flatMap(([event, entries]) =>
        entries.flatMap((entry) =>
          entry.hooks
            .filter((hook) => hook.command === input.hook.command)
            .map((hook) => ({
              event,
              matcher: entry.matcher,
              timeout: hook.timeout,
            })),
        ),
      );
    });
  if (placements.length !== 1)
    throw new MalfunctionError(
      'the supplier did not place the hook exactly once',
      {
        command: input.hook.command,
        placements: placements.length,
        hint: 'the installed rhachet-brains-anthropic changed how it writes settings; read its adapter',
      },
    );
  return placements[0]!;
};

describe('getOneHookDispatchRuleOfBrainHook, against the installed claude supplier', () => {
  HOOK_SHAPES.map((thisCase, index) =>
    given(`[case${index + 1}] ${thisCase.description}`, () => {
      when('[t0] core and the supplier each place it', () => {
        const placed = useBeforeAll(async () => ({
          supplier: await getPlacementBySupplier({
            hook: thisCase.hook,
            slug: `dispatch-supplier-parity-${index}`,
          }),
          rule: getOneHookDispatchRuleOfBrainHook({
            hook: thisCase.hook,
            repoPath: genTempDir({
              slug: `dispatch-supplier-parity-repo-${index}`,
            }),
          }),
        }));

        then(
          'it lands under the event, matcher and timeout the supplier writes',
          () => {
            expect({
              event: placed.rule.event,
              matcher: placed.rule.matcher,
              timeout: placed.rule.timeoutSeconds,
            }).toEqual(placed.supplier);
          },
        );
      });
    }),
  );
});
