import type { Artifact } from 'rhachet-artifact';
import type { GitFile } from 'rhachet-artifact-git';

/**
 * .what = converts briefs artifacts to concatenated prompt text
 * .why = utility for plugin authors to easily compose briefs into system prompts
 *
 * .note = generalized from bootRoleResources logic;
 *   bootRoleResources should be refactored to use this shared utility,
 *   ensuring consistent briefs handling across boot and brain.imagine
 */
export const castBriefsToPrompt = async (input: {
  briefs: Artifact<typeof GitFile>[];
}): Promise<string> => {
  // resolve all artifacts to get their content
  const contents = await Promise.all(
    input.briefs.map(async (brief) => {
      const file = await brief.get();
      return file?.content;
    }),
  );

  return contents.filter(Boolean).join('\n\n');
};
