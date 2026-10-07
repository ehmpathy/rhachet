import { relative, resolve } from 'node:path';
import type { BootSource } from './BootSource';
import { genBootSource } from './genBootSource';

/**
 * .what = the boot source for a role inside the registry under introspect
 * .why = gate 1 measures a role package's own specs BEFORE publish, in the author's own
 *        tree. the dir is the package's own; the LABEL is the coordinate a consumer will
 *        see once the package is linked.
 *
 * 🔴 .note = the label is part of the payload, so gate 1 must emit the CONSUMER'S coordinate
 *   or it would measure a different number than the boot it gates. that is why this arm
 *   exists rather than reuse the role-default one: the two differ in exactly this field,
 *   and a shared arm would have to branch on it.
 *
 * .note = it is a pure TRANSFORMER — it touches no filesystem and raises naught. a registry
 *   walk handed it a dir it already proved, so there is no existence to re-check
 *   (`define.domain-operation-grains`).
 */
export const getOneBootSourceFromRegistryRole = (input: {
  slugRepo: string;
  slugRole: string;
  dirRole: string;

  /**
   * .what = the repo root the spec path is rendered against
   * .why = the invocation names a file the author must OPEN, so it must be a path they can
   *        paste. an absolute one is machine-specific — it differs per checkout, and it
   *        would pin a temp dir into every snapshot of this gate.
   */
  dirRepo: string;
}): BootSource => {
  const { slugRepo, slugRole, dirRole, dirRepo } = input;

  const pathToSpec = resolve(dirRole, 'boot.yml');

  return genBootSource({
    rootDir: dirRole,
    pathToSpec,
    dirBriefs: resolve(dirRole, 'briefs'),
    label: {
      base: dirRole,
      prefix: `.agent/repo=${slugRepo}/role=${slugRole}/`,
    },

    // .note = the invocation names the spec path, the file the halted author can write, and
    //   the role beside it, since a role dir matches its role name by convention alone
    invocation: `repo introspect (role=${slugRole}) — ${relative(dirRepo, pathToSpec)}`,

    // .note = the PATH form. the `--repo`/`--role` form resolves through
    //   `.agent/repo=*/role=*`, which exists only in a consumer tree after `roles link`
    coordinates: `--what ${relative(dirRepo, pathToSpec)}`,
    specIsDeclared: false, // a computed coordinate — a role may ship no boot.yml
  });
};
