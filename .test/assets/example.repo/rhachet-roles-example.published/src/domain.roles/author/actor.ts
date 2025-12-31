import { genActor } from 'rhachet';
import { genBrainRepl } from 'rhachet-brain-openai';

import { authorRole } from './role';

/**
 * .what = the author actor with openai/codex brain
 * .why = test fixture for sdk genActor integration tests
 */
export const author = genActor({
  role: authorRole,
  brains: [
    genBrainRepl({ slug: 'openai/codex' }), // default (fast for tests)
  ],
});
