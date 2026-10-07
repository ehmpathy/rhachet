import { statSync } from 'node:fs';
import type { BootSource } from './BootSource';
import { parseRoleBootYaml } from './parseRoleBootYaml';
import { readOneBootSpecFile } from './readOneBootSpecFile';

/**
 * .what = the parsed boot spec of a source, or null where a computed spec is absent
 * .why = the spec read is the one fs boundary `genBootPayload` crosses before it plans, so it
 *        is named apart from the render orchestration
 *
 * 🔴 .note = the presence guard is for a COMPUTED spec alone. an absent role `boot.yml`
 *   is a legitimate say-all, so its read sits behind the check. a DECLARED spec was proved to
 *   be a file by `getOneBootSource` (requirement 5), so it is read UNCONDITIONALLY — to
 *   re-check it here would turn a vanish into a silent say-all fallback, which is the quiet
 *   downgrade of an explicit contract (`rule.forbid.hidden-side-effects`)
 *
 * .note = the probe is `statSync` with `throwIfNoEntry: false`, never `existsSync`: it reads
 *   only `ENOENT`/`ENOTDIR` as absent, so an unreadable spec raises rather than downgrade a
 *   curated boot to say-all (`define.statsync-and-lstatsync-suppress-different-errnos`)
 *
 * .note = the read is classified — the probe and the read are a check-then-read pair, and a
 *   spec that vanishes in the window between them is a caller race rather than a malfunction.
 *   `readOneBootSpecFile` carries that one classifier
 */
export const getOneBootConfigForSource = (input: {
  source: BootSource;
}): ReturnType<typeof parseRoleBootYaml> | null => {
  const { source } = input;
  if (
    !source.specIsDeclared &&
    !statSync(source.pathToSpec, { throwIfNoEntry: false })
  )
    return null;
  return parseRoleBootYaml({
    content: readOneBootSpecFile({ pathToSpec: source.pathToSpec }),
    path: source.pathToSpec,
  });
};
