import { flattie } from 'flattie';
import { BadRequestError } from 'helpful-errors';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import type { Serializable } from 'serde-fns';

import type { Template } from '@src/domain.objects/Template';

/**
 * .what = hydrates a template file with given variables
 * .why = reusable interpolation engine for Template<T>.use(...)
 */
export const useTemplate = async <
  TVariables extends Serializable = any,
>(input: {
  ref: Template<TVariables>['ref'];
  variables: TVariables;
}): Promise<string> => {
  const { ref, variables } = input;

  const artifact = genArtifactGitFile(ref);
  const file = await artifact.get();
  const content =
    file?.content ??
    BadRequestError.throw('template artifact does not exist', { ref });

  const flattened = flattie(variables);

  return content.replace(
    /\$\.rhachet\{([a-zA-Z0-9._]+)\}/g,
    (_, key) =>
      flattened[key] ??
      BadRequestError.throw(
        `missing variable for $.rhachet{${key}} in template`,
        {
          desired: key,
          template: ref,
          provided: Object.keys(flattened),
        },
      ),
  );
};
