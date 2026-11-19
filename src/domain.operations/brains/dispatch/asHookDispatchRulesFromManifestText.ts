import { ConstraintError } from 'helpful-errors';

import {
  HookDispatchRule,
  type HookDispatchRuleKind,
} from '@src/domain.objects/HookDispatchRule';

import {
  HOOK_DISPATCH_MANIFEST_FIELDS,
  HOOK_DISPATCH_MANIFEST_SEP,
} from './asHookDispatchManifestText';

const KINDS: HookDispatchRuleKind[] = [
  'rhx-skill',
  'rhx-init',
  'shell',
  'exec',
  'foreign',
];

/**
 * .what = the rules a manifest text holds, in row order
 * .why = the sync diffs declared hooks against the manifest, as it once diffed against settings
 *
 * .note = a line that opens with `#`, or an empty line, is no row
 */
export const asHookDispatchRulesFromManifestText = (input: {
  text: string;
  path: string;
}): HookDispatchRule[] =>
  input.text
    .split('\n')
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .map((line) => {
      // each field read by its name in the one declared order
      const fields = line.split(HOOK_DISPATCH_MANIFEST_SEP.field);
      const fieldOf = (
        name: (typeof HOOK_DISPATCH_MANIFEST_FIELDS)[number],
      ): string | undefined =>
        fields[HOOK_DISPATCH_MANIFEST_FIELDS.indexOf(name)];
      const event = fieldOf('event');
      const matcher = fieldOf('matcher');
      const timeout = fieldOf('timeout');
      const author = fieldOf('author');
      const kind = fieldOf('kind');
      const path = fieldOf('path');
      const frame = fieldOf('frame');
      const args = fieldOf('args');
      const command = fieldOf('command');
      const when = fieldOf('when');

      // a row with the wrong shape is a corrupt file; name it and its fix. a timeout is whole
      //   seconds, at least 1, as the writer emits it: a 0 would read as no timeout to the watchdog
      const whenRead = asWhenOfField({ field: when });
      if (
        fields.length !== HOOK_DISPATCH_MANIFEST_FIELDS.length ||
        !isHookDispatchRuleKind(kind) ||
        whenRead === undefined ||
        !/^[1-9]\d*$/.test(timeout ?? '')
      )
        throw new ConstraintError('hook dispatch manifest row is malformed', {
          path: input.path,
          line,
          hint: 'run `npx rhx init --hooks` to rewrite the manifest',
        });

      return new HookDispatchRule({
        event: event!,
        matcher: matcher!,
        timeoutSeconds: Number(timeout),
        author: author!,
        kind,
        path: path!,
        frame: frame!,
        args: args ? args.split(HOOK_DISPATCH_MANIFEST_SEP.arg) : [],
        command: command!,
        when: whenRead,
      });
    });

/**
 * .what = whether a manifest field names a rule kind
 */
const isHookDispatchRuleKind = (
  value: string | undefined,
): value is HookDispatchRuleKind => KINDS.some((kind) => kind === value);

/**
 * .what = a manifest `when` field as a rule reads it; undefined when the field holds no valid value
 */
const asWhenOfField = (input: {
  field: string | undefined;
}): HookDispatchRule['when'] | undefined => {
  if (!input.field) return null;
  if (input.field === 'before' || input.field === 'after') return input.field;
  return undefined;
};
