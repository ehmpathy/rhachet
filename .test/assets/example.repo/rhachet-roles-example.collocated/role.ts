import { z } from 'zod';

import { Role } from '@src/domain.objects/Role';

/**
 * .what = scribe role for rhachet-roles-example.collocated fixture
 * .why = provides importable role for integration tests
 */
export const scribeRole = new Role({
  slug: 'scribe',
  name: 'Scribe',
  purpose: 'summarizes and counts content',
  readme: 'a scribe who condenses verbose text into concise summaries',
  traits: [],
  skills: {
    solid: {
      linecount: {
        input: z.object({ text: z.string() }),
        output: z.object({ lines: z.number() }),
      },
    },
    rigid: {
      summarize: {
        input: z.object({ content: z.string() }),
        output: z.object({ summary: z.string() }),
      },
    },
    dirs: { uri: '.agent/repo=.this/role=scribe/skills' },
    refs: [],
  },
  briefs: { dirs: { uri: '.agent/repo=.this/role=scribe/briefs' } },
});
