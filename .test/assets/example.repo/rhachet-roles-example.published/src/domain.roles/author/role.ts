import { z } from 'zod';

import type { Role } from 'rhachet';

/**
 * .what = defines the author role for the published pattern fixture
 * .why = test fixture for sdk genActor integration tests
 */
export const authorRole: Role = {
  slug: 'author',
  name: 'Author',
  purpose: 'writes prose about the sunshine ocean surfer turtles',
  readme: { uri: 'src/domain.roles/author/readme.md' },
  traits: [],
  skills: {
    solid: {
      wordcount: {
        input: z.object({ text: z.string() }),
        output: z.object({ count: z.number() }),
      },
    },
    rigid: {
      draft: {
        input: z.object({ topic: z.string() }),
        output: z.object({ prose: z.string() }),
      },
    },
    dirs: { uri: 'src/domain.roles/author/skills' },
    refs: [],
  },
  briefs: { dirs: { uri: 'src/domain.roles/author/briefs' } },
};
