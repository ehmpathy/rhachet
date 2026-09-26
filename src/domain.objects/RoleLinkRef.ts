/**
 * .what = a reference to one role linked under `.agent/`, by its repo and role slug
 * .why = the shape every boot, link, and upgrade path passes around to name a linked
 *   role. it lives here, beside the other domain objects, rather than under the one
 *   operation that first produced it — `boot/`, `init/boots/`, `init/roles/link/` and
 *   `upgrade/` all speak it, so a home under any single one of them reads as an accident
 *   of which feature touched it first
 */
export interface RoleLinkRef {
  repo: string;
  role: string;
}
