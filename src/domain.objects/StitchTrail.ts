import { DomainLiteral } from 'domain-objects';

/**
 * .what = a trail marker of a stitch
 */
export interface StitchTrailMarker {
  stitchUuid: string;
  stitcherSlug: string;
}
export class StitchTrailMarker
  extends DomainLiteral<StitchTrailMarker>
  implements StitchTrailMarker {}

/**
 * .what = a trail of references to stitches that were set
 */
export type StitchTrail = StitchTrailMarker[];

/**
 * .what = a grokable description of the trail
 */
export type StitchTrailDesc = string;

/**
 * .what = converts a stitch trail into a human-readable description
 * .why = used for logging and debugging
 * .format = joined list of stitcher slugs, e.g., "@root(3126498) > @pick-color(1234567) > @match-paint(7351395)"
 */
export const asStitchTrailDesc = (input: {
  trail: StitchTrail;
}): StitchTrailDesc => {
  return input.trail
    .map(
      (marker) => `@${marker.stitcherSlug}(${marker.stitchUuid.slice(0, 7)})`,
    )
    .join(' > ');
};
