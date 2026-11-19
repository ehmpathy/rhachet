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
 * .what = the fields of a manifest row, in order
 * .why = the writer, the parser and `bin/hooks.dispatch.sh` must agree on this order; it is
 *   declared once here, and `constants.manifest-parity.integration.test.ts` holds the bash
 *   `read` list to it
 */
export const HOOK_DISPATCH_MANIFEST_FIELDS = [
  'event',
  'matcher',
  'timeout',
  'author',
  'kind',
  'path',
  'frame',
  'args',
  'command',
  'when',
] as const;

/**
 * .what = the manifest version; the dispatcher refuses a header of any other
 */
export const HOOK_DISPATCH_MANIFEST_VERSION = 'v1';

/**
 * .what = the first line of every manifest; the dispatcher skips a line that opens with `#`
 */
export const HOOK_DISPATCH_MANIFEST_HEAD = `# rhachet hooks.dispatch manifest ${HOOK_DISPATCH_MANIFEST_VERSION} — written by \`rhx init --hooks\`; fields split by \\x1f`;

/**
 * .what = the manifest text for a list of rules, one row per rule, in order
 * .why = the hook dispatcher reads this file once per claude event
 *
 * .note = each row follows a `#` line that names it in plain text (event, matcher, timeout,
 *   author, command), so a `cat` reads the manifest; the dispatcher and the parser skip it
 */
export const asHookDispatchManifestText = (input: {
  rules: HookDispatchRule[];
}): string =>
  [
    HOOK_DISPATCH_MANIFEST_HEAD,
    ...input.rules.flatMap((rule) => {
      const fieldsOfRule: Record<
        (typeof HOOK_DISPATCH_MANIFEST_FIELDS)[number],
        string
      > = {
        event: rule.event,
        matcher: rule.matcher,
        timeout: String(rule.timeoutSeconds),
        author: rule.author,
        kind: rule.kind,
        path: rule.path,
        frame: rule.frame,
        args: rule.args.join(HOOK_DISPATCH_MANIFEST_SEP.arg),
        command: rule.command,
        when: rule.when ?? '',
      };
      return [
        asManifestRowLabel({ rule }),
        HOOK_DISPATCH_MANIFEST_FIELDS.map((field) => fieldsOfRule[field]).join(
          HOOK_DISPATCH_MANIFEST_SEP.field,
        ),
      ];
    }),
    '',
  ].join('\n');

/**
 * .what = the plain-text `#` line that names a row, one line, for a human who reads the file
 */
const asManifestRowLabel = (input: { rule: HookDispatchRule }): string =>
  `# ${[
    input.rule.event,
    input.rule.matcher || '*',
    `${input.rule.timeoutSeconds}s`,
    input.rule.author,
    input.rule.command,
  ]
    .join(' · ')
    .replace(/[\r\n]+/g, ' ')}`;
