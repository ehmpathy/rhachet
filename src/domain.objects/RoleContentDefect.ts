import type { RoleLinkRef } from './RoleLinkRef';

/**
 * .what = one content defect a role render set aside, by its kind and the file that holds it
 * .why = a content check never halts a clone birth (`rule.forbid.content-checks-that-halt-enroll`);
 *        it reports a defect of one declared kind, and the caller warns. the kinds are a closed
 *        set, so a clamp keyed by kind fails to compile when a new check lands unclamped
 *
 * .note = each kind has one set-aside form:
 *   - `orphan-min` — a `.md.min` with no `.md` source; skipped (it was never a ref)
 *   - `boundary-literal` — a said file holds the cache boundary literal; the literal is defanged
 *   - `spec-unparsed` — the role's `boot.yml` will not parse; the role renders refs-only
 */
export interface RoleContentDefect {
  kind: RoleContentDefectKind;
  ref: RoleLinkRef;
  pathToFile: string;
  /**
   * .what = the parse error's message, for `spec-unparsed`; null for the other kinds
   * .why = a human repairs the yaml where the parser gave up, at or after the fault
   */
  detail: string | null;
}

/**
 * .what = the closed set of content defect kinds, in declared order
 * .why = one tuple derives the union and the stop memo's version, so a new kind both fails the
 *        type check where no fixture or note names it, and rotates every memoized verdict
 */
export const ROLE_CONTENT_DEFECT_KINDS = [
  'orphan-min',
  'boundary-literal',
  'spec-unparsed',
] as const;

/**
 * .what = one content defect kind
 * .why = the clamp and every note table key a record by this union
 */
export type RoleContentDefectKind = (typeof ROLE_CONTENT_DEFECT_KINDS)[number];
