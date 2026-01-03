import { z } from 'zod';

import type { Role } from 'rhachet';

/**
 * .what = defines the scribe role for the collocated pattern fixture
 * .why = test fixture for sdk genActor integration tests
 */
export const scribeRole: Role = {
  slug: 'scribe',
  name: 'Scribe',
  purpose: 'summarizes and counts content',
  readme: { uri: '.agent/repo=.this/role=scribe/readme.md' },
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
};
