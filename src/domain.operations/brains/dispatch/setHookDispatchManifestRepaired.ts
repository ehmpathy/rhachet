import { ConstraintError } from 'helpful-errors';

import type { HookDispatchRule } from '@src/domain.objects/HookDispatchRule';
import { withAbsentAsNull } from '@src/infra/withAbsentAsNull';

import { readFileSync } from 'node:fs';
import { asHookDispatchRulesFromManifestText } from './asHookDispatchRulesFromManifestText';
import { setHookDispatchManifest } from './setHookDispatchManifest';

/**
 * .what = rewrite a manifest the sync cannot read: keep each row that parses, drop each that does not
 * .why = a dispatcher that meets a corrupt manifest refuses every call and names `rhx init --hooks`
 *   as the fix; that sync reads the same file, so it must read past a corrupt row, or the fix loops
 *
 * .note = an absent or readable manifest is left untouched, and `linesDropped` is 0
 * .note = a row kept is rewritten as a sync writes it, so a corrupt header is mended in the same pass
 */
export const setHookDispatchManifestRepaired = async (input: {
  manifestPath: string;
}): Promise<{ linesDropped: number }> => {
  // an absent manifest needs no repair
  const text = withAbsentAsNull({
    read: () => readFileSync(input.manifestPath, 'utf-8'),
  });
  if (text === null) return { linesDropped: 0 };

  // read each row on its own, so one corrupt row never costs its neighbours
  const rowsRead = asRowLinesOfManifestText({ text }).map((line) =>
    asRulesOfRowLineOrNull({ line, path: input.manifestPath }),
  );
  const linesDropped = rowsRead.filter((rules) => rules === null).length;
  if (linesDropped === 0) return { linesDropped: 0 };

  // rewrite with the rows that read
  await setHookDispatchManifest({
    path: input.manifestPath,
    rules: rowsRead.flatMap((rules) => rules ?? []),
  });
  return { linesDropped };
};

/**
 * .what = the lines of a manifest text that hold a row, in order
 * .note = the same rule the reader holds: a line that opens with `#`, or an empty line, is no row
 */
const asRowLinesOfManifestText = (input: { text: string }): string[] =>
  input.text
    .split('\n')
    .filter((line) => line.length > 0 && !line.startsWith('#'));

/**
 * .what = the rule one row line reads as, or null when the row is malformed
 * .note = only the reader's own refusal reads as null; any other fault surfaces
 */
const asRulesOfRowLineOrNull = (input: {
  line: string;
  path: string;
}): HookDispatchRule[] | null => {
  try {
    return asHookDispatchRulesFromManifestText({
      text: input.line,
      path: input.path,
    });
  } catch (error) {
    if (error instanceof ConstraintError) return null;
    throw error;
  }
};
