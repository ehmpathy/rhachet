/**
 * .what = the `scripts` entries of a parsed fixture package.json, as a record of strings
 * .why = the one owner of the `scripts` shape, so the fixture reader and writer agree on it
 *
 * .note = an absent or non-object `scripts` reads as empty; a non-string entry is dropped,
 *   since no fixture case writes one and none can run it
 */
export const asFixtureScripts = (input: {
  pkg: Record<string, unknown>;
}): Record<string, string> => {
  const scripts = input.pkg.scripts;
  if (!scripts || typeof scripts !== 'object' || Array.isArray(scripts))
    return {};
  return Object.fromEntries(
    Object.entries(scripts).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
};
