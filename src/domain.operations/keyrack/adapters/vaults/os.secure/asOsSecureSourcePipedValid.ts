import { ConstraintError } from 'helpful-errors';

import type {
  KeyrackGrantMechanism,
  KeyrackGrantMechanismAdapter,
} from '@src/domain.objects/keyrack';

/**
 * .what = check a piped source credential against its mech; return it when valid
 * .why = `keyrack set --source @stdin` skips the guided setup, so the mech's format check is
 *        the one gate a malformed blob meets before it lands on disk
 *
 * .note = the refusal names the mech's reasons and never the value: a credential is never
 *         echoed into a log or a terminal
 * .note = the mech is already one os.secure supports (replica or github-app, each a plain stored
 *         value): the vault's own mech check runs first and refuses the rest (aws sso, etc)
 * .note = a null source (no pipe) passes through as null, so the set reads one line either way
 * .note = the empty refusal repeats the cli's (`getOneKeyrackSetSourcePiped`) on purpose: the cli
 *         guard covers only the cli, and a caller via the sdk reaches the vault with no cli in
 *         front, so the vault holds its own floor
 */
export const asOsSecureSourcePipedValid = <
  TSource extends string | null,
>(input: {
  source: TSource;
  mech: KeyrackGrantMechanism;
  slug: string;
  mechAdapter: KeyrackGrantMechanismAdapter;
}): TSource => {
  // no piped source: none to check
  if (input.source === null) return input.source;

  // refuse an empty source
  if (input.source.trim() === '')
    throw new ConstraintError('--source @stdin received an empty value', {
      slug: input.slug,
      hint: 'pipe the source credential into stdin, e.g. `<upstream read> | rhx keyrack set ... --source @stdin`',
    });

  // refuse a source the mech judges malformed
  const verdict = input.mechAdapter.validate({ source: input.source });
  if (!verdict.valid)
    throw new ConstraintError(
      '--source @stdin is not a valid source for its mech',
      {
        slug: input.slug,
        mech: input.mech,
        reasons: verdict.reasons ?? [],
        hint: 'check the upstream read; the blob was not stored',
      },
    );

  return input.source;
};
