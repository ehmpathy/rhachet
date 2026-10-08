import type { BootSayResource } from './getAllBootSayResources';

/**
 * .what = the total character count of every `say` resource a boot renders
 * .why = the `<stats>` block's `chars` row, which an unbudgeted boot prints and requirement 4
 *        holds byte-identical.
 *
 * ⚠️ .note = this counts SAY CONTENT ONLY, and is therefore NOT the quantity a budget gates.
 *   the gate counts the full emitted render — both `<stats>` blocks, every ref line, the
 *   `<also>` block, and all XML chrome (`calcBootPayloadTokens`). the two scopes differ by
 *   ~2.7x on this repo's own payload, so never substitute one for the other.
 */
export const calcBootSayChars = (input: {
  resources: BootSayResource[];
}): number =>
  input.resources.reduce((sum, resource) => sum + resource.content.length, 0);
