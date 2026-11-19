import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { BrainHook } from '@src/domain.objects/BrainHook';

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getOneHookDispatchRuleOfBrainHook } from './getOneHookDispatchRuleOfBrainHook';

/**
 * .what = the resolver against a repo whose skill file exists, so a command that would find it
 *   resolves to a file unless the read is uncertain
 * .why = a run flag in any form commander reads (`--role=x`, `-rx`) may be read by rhx rather than
 *   the skill; such a command must run as declared (`foreign`), never as the file rhx might skip
 *   (r011 i007 blocker.2)
 */
describe('getOneHookDispatchRuleOfBrainHook (with a real skill file)', () => {
  given('[case1] a repo with the bash skill `guard`', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = genTempDir({ slug: 'dispatch-rule-run-flags' });
      mkdirSync(join(repoPath, '.agent/repo=test/role=tester/skills'), {
        recursive: true,
      });
      writeFileSync(
        join(repoPath, '.agent/repo=test/role=tester/skills/guard.sh'),
        '#!/usr/bin/env bash\necho guard\n',
      );
      return { repoPath };
    });

    const kindOf = (command: string) =>
      getOneHookDispatchRuleOfBrainHook({
        hook: new BrainHook({
          author: 'repo=test/role=tester',
          event: 'onTool',
          command,
          timeout: 'PT5S',
          filter: { what: 'Bash' },
        }),
        repoPath: scene.repoPath,
      }).kind;

    const CASES = [
      {
        description: 'a skill call with its own flags resolves to the file',
        command: './node_modules/.bin/rhx guard --mode hook',
        expected: 'rhx-skill',
      },
      {
        description:
          'a skill arg with `=` that names no run flag resolves to the file',
        command: './node_modules/.bin/rhx guard --mode=hook',
        expected: 'rhx-skill',
      },
      {
        description: 'a long run flag with its value glued on runs as declared',
        command: './node_modules/.bin/rhx guard --role=tester',
        expected: 'foreign',
      },
      {
        description:
          'a short run flag with its value glued on runs as declared',
        command: './node_modules/.bin/rhx guard -rtester',
        expected: 'foreign',
      },
      {
        description:
          'a rhachet run with a glued run flag past the lead runs as declared',
        command:
          './node_modules/.bin/rhachet run --skill guard --mode hook --repo=test',
        expected: 'foreign',
      },
    ] as const;

    CASES.map((thisCase, index) =>
      when(`[t${index}] ${thisCase.description}`, () => {
        then(`the rule kind is ${thisCase.expected}`, () => {
          expect(kindOf(thisCase.command)).toEqual(thisCase.expected);
        });
      }),
    );
  });
});
