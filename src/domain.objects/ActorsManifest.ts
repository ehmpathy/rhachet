import { DomainLiteral } from 'domain-objects';

import { ActorDeclared } from './ActorDeclared';

/**
 * .what = a repo's `.agent/actors.yml` — its declared actors, and which one is the repo actor
 * .why = one readable file names the repo's actors by slug, so `rhachet init` links their
 *        roles and a bare enroll reaches the repo actor, with no `--roles` list to keep
 *
 * .note = `ambient` is required and names its actor by name (`'@<slug>'`): the repo actor is
 *         never inferred, not even from a sole entry (F12, S9)
 * .note = a role package's published actors share the `actor` shape but carry no `ambient`
 *         — the repo actor is the consumer's choice (F9); that form is not this object
 */
export interface ActorsManifest {
  /**
   * .what = the repo actor — the one that holds the ambient roles (`term=ambient`)
   * .example = '@builder'
   */
  ambient: string;

  /**
   * .what = the declared actors
   */
  actor: ActorDeclared[];
}

export class ActorsManifest
  extends DomainLiteral<ActorsManifest>
  implements ActorsManifest
{
  public static nested = { actor: ActorDeclared };
}
