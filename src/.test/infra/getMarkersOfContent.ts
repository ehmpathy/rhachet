import type { LiveBrainMarker } from '@src/.test/infra/liveBrainRegistry';

/**
 * .what = the name of each marker a module's content holds
 * .why = a marker is how a scan knows a file can reach a live brain
 * .note = each match uses a fresh regex without the `g` and `y` flags: with either, `.test`
 *   keeps a `lastIndex` across files, so a registry a peer repo supplies could miss a file
 */
export const getMarkersOfContent = (input: {
  content: string;
  markers: LiveBrainMarker[];
}): string[] =>
  input.markers
    .filter((marker) =>
      new RegExp(marker.pattern.source, marker.pattern.flags.replace(/[gy]/g, '')).test(
        input.content,
      ),
    )
    .map((marker) => marker.name);
