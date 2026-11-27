import { asErrorHeadline } from './asErrorHeadline';
import { asRoleModFaultFix } from './asRoleModFaultFix';

/**
 * .what = the notice atop the section of a role whose mod is skipped
 * .why = the clone must know its role boots as published, which fault skipped the mod, and the
 *        fix, so it can cure the mod or tell its human (the wish: pester until cured)
 *
 * .note = the problem line keeps its `✋ ConstraintError:` class word, so the reader knows who
 *   must act (rule.require.qualified-error-headers)
 * .note = the `mod =` line names the mod dir: a skipped mod boots no file, so the notice is the
 *   one place a reader learns where the paths the fault and its fix name sit
 * .note = `role` is the role's slug, the key its mod dir is named by
 */
export const asRoleModSkippedNoticeLines = (input: {
  role: string;
  error: Error;
}): string[] => {
  const fix = asRoleModFaultFix({ error: input.error });
  return [
    `<mod.skipped of="${input.role}">`,
    `role ${input.role} boots as published in this repo — its mod is skipped until it is cured`,
    `mod = .agent/repo=.mods/role=${input.role}/`,
    asErrorHeadline({ error: input.error }),
    ...(fix ? [`fix = ${fix}`] : []),
    '</mod.skipped>',
    '',
  ];
};
