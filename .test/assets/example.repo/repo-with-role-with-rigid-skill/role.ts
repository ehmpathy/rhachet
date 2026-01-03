import { z } from 'zod';

import { Role } from '@src/domain.objects/Role';

/**
 * .what = tester role for repo-with-role-with-rigid-skill fixture
 * .why = provides importable role for integration tests
 *
 * .note = uses Role.typed() to preserve literal skill names for type-safe invocation
 */
export const testerRole = Role.typed({
  slug: 'tester',
  name: 'Tester',
  purpose: 'test role for integration tests',
  readme: { uri: '.agent/repo=.this/role=tester/readme.md' },
  traits: [],
  skills: {
    rigid: {
      'echo.review': {
        input: z.object({ content: z.string() }),
        output: z.object({ echoed: z.string(), reviewed: z.boolean() }),
      },
    },
    dirs: { uri: '.agent/repo=.this/role=tester/skills' },
    refs: [],
  },
  briefs: { dirs: { uri: '.agent/repo=.this/role=tester/briefs' } },
});
