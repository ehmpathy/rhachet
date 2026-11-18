import { ConstraintError } from 'helpful-errors';
import { parse as parseYaml, YAMLError } from 'yaml';

/**
 * .what = parses boot.yml content into its raw, unvalidated value
 * .why = one invalid-yaml contract for every reader of a boot.yml — the boot render and the
 *        init-time budget findsert refuse the same fault with the same error
 *
 * .note = invalid yaml is the author's to repair, so it exits 2 with the path; every other
 *   throw is ours, so it passes unchanged
 */
export const parseBootYamlRaw = (input: {
  content: string;
  path: string;
}): unknown => {
  try {
    return parseYaml(input.content);
  } catch (error) {
    if (!(error instanceof YAMLError)) throw error;
    throw new ConstraintError('boot.yml has invalid yaml', {
      path: input.path,
      error: error.message,
      hint: 'fix the yaml syntax at the line the error names, then re-run',
    });
  }
};
