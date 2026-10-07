import { MalfunctionError } from 'helpful-errors';

import type { BootSource } from '@src/domain.operations/boot/BootSource';
import { getOneBootSource } from '@src/domain.operations/boot/getOneBootSource';

import { asBootRoleCoordinates } from './asBootRoleCoordinates';

/**
 * .what = picks the SOURCE arm a spec path belongs to — a role coordinate, or a manifest
 * .why = `roles cost --all` sweeps spec PATHS rather than coordinates, and the two arms render
 *        different bytes: a role's brief universe is its `briefs/` subdir, a manifest's is
 *        every neighbor of the spec.
 *
 * .note = the discriminator is the coordinate shape `.agent/repo=$slug/role=$name/boot.yml`
 *   and naught else. a spec anywhere else is a manifest by definition — there is no role
 *   coordinate to read it at.
 *
 * .note = BOTH arms pass `ifPresent: false`: the path was matched by a glob moments ago, so
 *   an absence is a vanish race, and it throws rather than shorten the roster
 *   (`rule.forbid.failhide`).
 */
export const getOneBootSourceFromSpecPath = (input: {
  pathToSpec: string;
  cwd: string;
}): BootSource => {
  // `strict`, because this arm asks whether the path IS a role's spec — a brief that merely
  // sits under the same role coordinate is not one
  const coordinates = asBootRoleCoordinates({
    path: input.pathToSpec,
    cwd: input.cwd,
    strict: true,
  });

  const source = coordinates
    ? getOneBootSource({
        from: { role: coordinates },
        ifPresent: false,
        cwd: input.cwd,
      })
    : getOneBootSource({
        from: { manifest: { path: input.pathToSpec } },
        ifPresent: false,
        cwd: input.cwd,
      });

  // 🔴 the narrow is TYPE-level, never a runtime doubt. `getOneBootSource` has exactly one
  //   `return null` and it is gated on `ifPresent` — so with `false` on both arms above, this
  //   branch cannot be reached. the `MalfunctionError` names the broken promise at this line.
  //
  // 🔴 a non-nullable return is what keeps the CALLER honest: it forbids an
  //   `if (!source) return null`, which drops a spec from the sweep with no word.
  return (
    source ??
    MalfunctionError.throw('a boot source was null under ifPresent: false', {
      pathToSpec: input.pathToSpec,
      why: 'getOneBootSource returns null only for an absent role dir under ifPresent: true',
    })
  );
};
