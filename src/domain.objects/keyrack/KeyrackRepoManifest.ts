import { DomainLiteral } from 'domain-objects';

import type { KeyrackKeySpec } from './KeyrackKeySpec';

/**
 * .what = declares which keys a repo requires, scoped by org and env
 * .why = enables repos to specify credential requirements per env without storage details
 *
 * location: @gitroot/.agent/keyrack.yml
 */
export interface KeyrackRepoManifest {
  /**
   * .what = the default org — the first member of the allowlist
   * .why = a bare read, `@this`, and every declared key slug fall under it, so a repo with
   *        one org reads exactly as it did before the allowlist existed
   * .note = a member view (`asKeyrackRepoManifestUnderOrg`) sets `org` to the member it
   *         re-slugs under, so there `org !== orgs[0]`. code that needs the declared default
   *         reads `orgs[0]`
   * .example = 'ehmpathy', 'ahbode'
   */
  org: string;

  /**
   * .what = every org this repo may address — the allowlist; `orgs[0]` is the declared default
   * .why = a repo whose fleet spans orgs names each one here, and `--org <member>` reaches
   *        it. an org absent from this list is refused at every gate
   * .note = `org:` in the file may be a scalar (a one-member list) or a list
   * .example = ['ahbode', 'bhanya']
   */
  orgs: string[];

  /**
   * .what = declared env names derived from env.* sections (except env.all)
   * .why = enables --env validation and error messages that list available envs
   * .example = ['prod', 'prep']
   */
  envs: string[];

  /**
   * .what = map of key slug ($org.$env.$key) to key spec
   * .why = enables lookup by slug for grant operations
   */
  keys: Record<string, KeyrackKeySpec>;

  /**
   * .what = paths to extended keyrack manifests
   * .why = enables debug and error context for extends chain
   */
  extends?: string[];
}

export class KeyrackRepoManifest
  extends DomainLiteral<KeyrackRepoManifest>
  implements KeyrackRepoManifest {}
