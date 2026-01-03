import { z } from 'zod';

import { Role } from '@src/domain.objects/Role';

/**
 * .what = author role for rhachet-roles-example.published fixture
 * .why = provides importable role for integration tests
 */
export const authorRole = new Role({
  slug: 'author',
  name: 'Author',
  purpose: 'writes prose about the sunshine ocean surfer turtles',
  readme: { uri: '.agent/repo=.this/role=author/readme.md' },
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
    dirs: { uri: '.agent/repo=.this/role=author/skills' },
    refs: [],
  },
  briefs: { dirs: { uri: '.agent/repo=.this/role=author/briefs' } },
});
