import { asCloneSerialHuman } from './asCloneSerialHuman';

/**
 * .what = the address a HUMAN reads for one clone — `@:<slug>` when it was named, else
 *   `@:<short-serial>` (the 8-hex first uuid segment, via `asCloneSerialHuman`)
 *
 * ⚠️ this is the ONE owner of that projection — every human-faced render routes through
 *   it, never an inlined `slug ?? serial` (`rule.require.short-serial-for-unslugged-clones`,
 *   `rule.forbid.decode-friction-in-orchestrators`).
 *
 * ⚠️ the `@:` sigil is INSIDE the value, not decoration a caller adds: `@:` marks the CLONE
 *   grain, as against `@` for an actor (`define.address-sigils`).
 *
 * ⚠️ .the machine boundary = this is a LOSSY, display-only projection, the twin of
 *   `IsoPriceHuman`. it must NOT reach `--output json`, the `.serials/` index, an on-disk
 *   dir name, or an error's `metadata` — every one of those is a machine channel where the
 *   full serial is canonical and an abbreviation makes the payload ambiguous.
 *
 * .note = the abbreviation is safe BY CONSTRUCTION: a prefix that matches two clones makes
 *   `getOneCloneBySerialPrefix` throw with both candidates named and a "use a longer serial
 *   prefix" fix. so the worst case is a loud refusal, never a silent wrong-clone.
 */
export const asCloneAddressHuman = (input: {
  /**
   * the clone's `--as` slug when it was named, else null. it WINS over the serial:
   * `@:<slug>` is the address the human chose and will retype.
   */
  slug: string | null;

  /**
   * the clone's serial — its primary ref, always present. taken WHOLE, never pre-cut:
   * the abbreviation is this file's decision, so this file's rows clamp it.
   */
  serial: string;
}): string => `@:${input.slug ?? asCloneSerialHuman({ serial: input.serial })}`;
