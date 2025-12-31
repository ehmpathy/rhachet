/**
 * .what = summarizes content using brain
 * .why = rigid skill (deterministic harness, brain operations) for testing
 *
 * usage:
 *   summarize.ts --content "long verbose text" --output output.json
 */
export const schema = {
  input: {
    content: { type: 'string', description: 'the content to summarize' },
  },
  output: {
    summary: { type: 'string', description: 'the summarized content' },
  },
};

/**
 * .what = execute the summarize skill
 * .why = invoked by actorAct with brain context
 */
export const execute = async (input: {
  content: string;
  brain: { ask: (prompt: string) => Promise<string> };
}): Promise<{ summary: string }> => {
  // use brain to generate summary
  const summary = await input.brain.ask(
    `Summarize the following content in 1-2 sentences: ${input.content}`,
  );

  return { summary };
};
