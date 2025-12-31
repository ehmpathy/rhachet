import { genActor } from 'rhachet';
import { genBrainRepl } from 'rhachet-brain-openai';

import { scribeRole } from './role';

/**
 * .what = the scribe actor with openai/codex brain
 * .why = test fixture for sdk genActor integration tests
 */
export const scribe = genActor({
  role: scribeRole,
  brains: [
    genBrainRepl({ slug: 'openai/codex' }), // default (fast for tests)
  ],
});
