/**
 * .what = where one boot's resources come from, and how they are addressed
 * .why = `--what` and a role default are two SOURCES for one renderer. this object is the
 *        whole difference between them, so the renderer downstream of it has no source
 *        branch at all — there is exactly one renderer, by construction.
 */
export interface BootSource {
  /**
   * the dir every glob is relative to, and the dir the resource universe is scanned from
   *
   * .note = one value serves both, deliberately. a manifest's globs are relative to its own
   *   directory, exactly as a role's are relative to the role dir.
   */
  rootDir: string;

  /**
   * the boot spec to parse
   */
  pathToSpec: string;

  /**
   * the readme to say in full, when one sits at the root
   */
  pathToReadme: string;

  /**
   * the dir that carries brief candidates, or null when the whole `rootDir` does
   *
   * .note = null is the ROUTE-DIR case. a route dir has no `briefs/` subdir and globs files
   *   that sit directly beside the spec — so a `briefs/` requirement would render it empty.
   *
   * 🔴 .note = the two role arms ALWAYS set `<rootDir>/briefs` — a role's brief universe is its
   *   `briefs/` subdir by contract, present or not. the manifest arm decides by LAYOUT:
   *   `<rootDir>/briefs` where that dir exists, null where it does not. so a role spec whose
   *   role HAS a `briefs/` dir yields one universe via `--what` and via `--repo/--role` alike.
   *
   * ⚠️ .note = a role dir with NO `briefs/` subdir is the one layout where the arms part: the
   *   role arm yields no brief candidates, the manifest arm yields every neighbor of the spec.
   *   a role's neighbors (`keyrack.yml`, `inits/`) are not briefs;
   *   `getOneBootSourceFromRole.integration.test.ts` pins it.
   */
  dirBriefs: string | null;

  /**
   * the dir that carries skill candidates
   */
  dirSkills: string;

  /**
   * how a resource path is labelled in the emitted payload
   *
   * .note = `prefix + relative(base, path)`. a role keeps its synthetic
   *   `.agent/repo=…/role=…/` coordinates; a manifest has no such coordinates, so it
   *   takes an empty prefix over the repo root, which yields a real, openable path.
   */
  label: { base: string; prefix: string };

  /**
   * the command a caller would re-run to reach this boot
   *
   * .note = it heads the budget readout, so the halt names the invocation that produced it
   *   rather than a generic one. it lives here because a readout built from a branch on
   *   source would be a second renderer by another name.
   */
  invocation: string;

  /**
   * the flags that ADDRESS this boot, with no subcommand attached
   *
   * 🔴 .why = several subcommands read one source — `roles boot` renders it, `roles cost`
   *   measures it — so a readout that heads itself with `invocation` names a command the
   *   reader did not type. the coordinates are the half both share; each readout supplies
   *   its own verb.
   *
   * .note = every source has one. even a registry role that `repo introspect` measures is
   *   addressable — by the `--what <path>` to its spec.
   */
  coordinates: string;

  /**
   * whether the caller NAMED this spec, rather than it living at a computed coordinate
   *
   * 🔴 .note = it decides what an ABSENT spec means, and the two answers are opposite. a
   *   computed spec may legitimately be absent — an absent role `boot.yml` means say-all,
   *   unconditionally. a DECLARED one was proved to be a file by the manifest arm, so an
   *   absence downstream is a vanish race rather than a fallback.
   *
   * .note = it is its own field, independent of `dirBriefs`, so the spec contract and the
   *   resource universe vary apart.
   */
  specIsDeclared: boolean;
}
