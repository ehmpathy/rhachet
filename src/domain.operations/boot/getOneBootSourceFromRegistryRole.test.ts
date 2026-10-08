import { given, then, when } from 'test-fns';

import { getOneBootSourceFromRegistryRole } from './getOneBootSourceFromRegistryRole';

/**
 * .what = clamps the registry-role arm's own guarantees
 * .why = this arm is a pure transformer — it reads no filesystem — so it is the one arm that
 *        can be clamped at the UNIT grain (`rule.forbid.unit.remote-boundaries`). its two
 *        peers touch `existsSync`/`statSync` and are clamped at integration.
 *
 * .note = gate 1 emits the CONSUMER'S coordinate rather than the package's own path.
 *   this arm holds that guarantee alone; its two filesystem-touching peers clamp at
 *   integration instead of unit.
 */
describe('getOneBootSourceFromRegistryRole', () => {
  const INPUT = {
    slugRepo: 'ehmpathy',
    slugRole: 'mechanic',
    dirRole: '/pkg/src/domain.roles/mechanic',
    dirRepo: '/pkg',
  };

  given('[case1] a role inside a registry under introspect', () => {
    when('[t0] the source is built', () => {
      // the label is part of the emitted payload, and carries the consumer's coordinate
      then(
        'the label carries the CONSUMER coordinate, not the package path',
        () => {
          const source = getOneBootSourceFromRegistryRole(INPUT);

          expect(source.label.prefix).toEqual(
            '.agent/repo=ehmpathy/role=mechanic/',
          );
          expect(source.label.base).toEqual(INPUT.dirRole);
        },
      );

      // the PATH form: `--repo`/`--role` look up `.agent/repo=*/role=*`, which a
      // package's own tree never holds
      then(
        'it offers the `--what <spec path>` coordinate, repo-relative',
        () => {
          expect(getOneBootSourceFromRegistryRole(INPUT).coordinates).toEqual(
            '--what src/domain.roles/mechanic/boot.yml',
          );
        },
      );

      // a role may ship no boot.yml, and that means say-all rather than a vanish
      then('the spec is NOT declared — the coordinate is computed', () => {
        expect(getOneBootSourceFromRegistryRole(INPUT).specIsDeclared).toEqual(
          false,
        );
      });

      // a registry role's brief universe is its `briefs/` subdir, exactly as a linked
      // role's is
      then(
        'the brief universe is the `briefs/` subdir, never the whole dir',
        () => {
          const source = getOneBootSourceFromRegistryRole(INPUT);

          expect(source.dirBriefs).toEqual(`${INPUT.dirRole}/briefs`);
          expect(source.dirSkills).toEqual(`${INPUT.dirRole}/skills`);
        },
      );

      then(
        'the invocation names `repo introspect`, and the role it walked',
        () => {
          const source = getOneBootSourceFromRegistryRole(INPUT);

          expect(source.invocation).toContain('repo introspect');
          expect(source.invocation).toContain('role=mechanic');
        },
      );

      // the invocation names the spec path, since it is the one the halted party can write
      then('🔴 the invocation names the SPEC PATH, not the role alone', () => {
        expect(getOneBootSourceFromRegistryRole(INPUT).invocation).toEqual(
          'repo introspect (role=mechanic) — src/domain.roles/mechanic/boot.yml',
        );
      });

      // asserted negatively too: an absolute path is machine-specific, and differs
      // per checkout
      then('the path is repo-relative — it carries no absolute prefix', () => {
        const source = getOneBootSourceFromRegistryRole(INPUT);

        expect(source.invocation).not.toContain(`${INPUT.dirRepo}/src`);
        expect(source.invocation).toContain(
          'src/domain.roles/mechanic/boot.yml',
        );
      });
    });
  });
});
