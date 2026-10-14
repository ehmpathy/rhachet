import type { RoleSlug } from './RoleSlug';

/**
 * .what = the context of which roles a repo holds
 * .why = the ambient roles are a fact about the repo, not an input to one operation —
 *        a roleset set-equal to them lands in the repo actor, any other in a hash actor
 */
export interface ContextOfRepoRoles {
  repo: {
    ambient: {
      /**
       * .what = the repo's ambient roles — the roles every bare enroll inherits
       */
      roles: RoleSlug[];
    };
  };
}
