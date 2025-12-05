import { UnexpectedCodePathError } from 'helpful-errors';
import type { Artifact } from 'rhachet-artifact';
import { type GitFile, getGitRepoRoot } from 'rhachet-artifact-git';

/**
 * .what = reads the artifacts given and returns a string for use in a template val
 * .why  = makes it easy to execute this common usecase
 */
export const getTemplateValFromArtifacts = async (input: {
  artifacts: Artifact<typeof GitFile>[];
}): Promise<string> => {
  const root = await getGitRepoRoot({ from: process.cwd() });

  return (
    await Promise.all(
      input.artifacts.map(async (ref) => {
        const content =
          (await ref.get())?.content ??
          UnexpectedCodePathError.throw('artifact does not exist', {
            ref,
          });
        return [
          '',
          '    ```ts',
          `    // ${ref.ref.uri.replace(root, '@gitroot')}`,
          ...content.split('\n').map((line) => `    ${line}`), // indents by 4 chars
          '    ```',
        ].join('\n');
      }),
    )
  ).join('\n\n');
};
