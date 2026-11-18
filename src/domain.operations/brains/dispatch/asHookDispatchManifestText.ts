import type { HookDispatchRule } from '@src/domain.objects/HookDispatchRule';

/**
 * .what = the separators of a manifest row: \x1f between fields, \x1e between args
 * .why = bash reads a row with one `read` and no fork; a non-whitespace separator keeps an
 *   empty field in its place, where a tab would collapse into its neighbour
 */
export const HOOK_DISPATCH_MANIFEST_SEP = {
  field: '\x1f',
  arg: '\x1e',
} as const;

/**
 * .what = the first line of every manifest; the dispatcher skips a line that opens with `#`
 */
export const HOOK_DISPATCH_MANIFEST_HEAD =
  '# rhachet hooks.dispatch manifest v1 — written by `rhx init --hooks`; fields split by \\x1f';

/**
 * .what = the manifest text for a list of rules, one row per rule, in order
 * .why = the hook dispatcher reads this file once per claude event
 *
 * .note = field order: event · matcher · timeout · author · kind · path · frame · args · command · when
 */
export const asHookDispatchManifestText = (input: {
  rules: HookDispatchRule[];
}): string =>
  [
    HOOK_DISPATCH_MANIFEST_HEAD,
    ...input.rules.map((rule) =>
      [
        rule.event,
        rule.matcher,
        String(rule.timeoutSeconds),
        rule.author,
        rule.kind,
        rule.path,
        rule.frame,
        rule.args.join(HOOK_DISPATCH_MANIFEST_SEP.arg),
        rule.command,
        rule.when ?? '',
      ].join(HOOK_DISPATCH_MANIFEST_SEP.field),
    ),
    '',
  ].join('\n');
