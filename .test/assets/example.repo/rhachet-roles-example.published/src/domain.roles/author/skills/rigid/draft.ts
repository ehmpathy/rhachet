import type { z } from 'zod';

/**
 * .what = drafts prose about a topic using brain
 * .why = rigid skill (deterministic harness, brain operations) for testing
 *
 * usage:
 *   draft.ts --topic "surfer turtles" --output output.json
 */
export const schema = {
  input: {
    topic: { type: 'string', description: 'the topic to write about' },
  },
  output: {
    prose: { type: 'string', description: 'the drafted prose' },
  },
};

/**
 * .what = execute the draft skill
 * .why = invoked by actorAct with brain context
 */
export const execute = async (input: {
  topic: string;
  brain: { ask: (prompt: string) => Promise<string> };
}): Promise<{ prose: string }> => {
  // use brain to generate prose
  const prose = await input.brain.ask(
    `Write a short paragraph about: ${input.topic}. Focus on sunshine, ocean waves, and surfing turtles.`,
  );

  return { prose };
};
