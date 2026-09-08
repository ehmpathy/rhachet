/**
 * .what = does any one of these markers match this text?
 * .why  = shared by three classifier sites, so the quantifier has one owner. the marker
 *   LISTS stay in their own bounded contexts (`rule.require.bounded-contexts`).
 *
 * ⚠️ `String.search`, never `RegExp.test` — `test` advances a `/g` marker's `lastIndex`,
 *   and the markers are module-level constants, so state would leak across classifiers.
 *   `search` ignores `g` and touches no `lastIndex`. clamped by `[case3]`.
 */
export const matchesAnyMarker = (input: {
  markers: RegExp[];
  text: string;
}): boolean => input.markers.some((marker) => input.text.search(marker) !== -1);
