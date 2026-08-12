import { DomainLiteral } from 'domain-objects';

/**
 * .what = the external reach a credential opens, named by the external system's own id
 * .why = a key is cut per reach, so reach is an identity axis beside
 *        owner / org / env / name — never a modifier applied to one key
 *
 * .note = `exid`, not `label` — an exid is the name the EXTERNAL system knows, and this
 *         value ROUTES the mint: the github-app mech reads it to pick which installation
 *         to mint against. a label names for display; an exid addresses
 * .note = the exid is OPAQUE to every vault and to the daemon. it qualifies the key name
 *         the way another `.` segment would, so a store simply looks in a different spot
 *         for the value. no vault parses it, and no vault needs to
 * .note = ONE mech interprets it: EPHEMERAL_VIA_GITHUB_APP must mint FOR a
 *         reach, so it requires the `github://org=$org` convention and parses the org
 *         out. every other mech carries the exid through untouched
 * .note = reach is DESTINATION; `KeyrackKeyGrant.org` is PROVENANCE. a key declared by
 *         ahbode that opens ehmpathy keeps `org: ahbode` and carries its own reach exid.
 *         two words, one sense each
 * .note = a key with no reach opens the reach its own org implies — which is every
 *         key that exists today
 *
 * .example = { exid: 'beav@ehmpathy.com' }        ← a claude account juggle
 * .example = { exid: 'github://org=ehmpathy' }    ← the github-app mint convention
 */
export interface KeyrackKeyReach {
  /**
   * .what = the external id that names which copy of the key this is
   * .why = a human names their own reaches by the external system's own handle;
   *        keyrack partitions by that handle and one mech routes its mint by it
   */
  exid: string;
}

export class KeyrackKeyReach
  extends DomainLiteral<KeyrackKeyReach>
  implements KeyrackKeyReach {}
