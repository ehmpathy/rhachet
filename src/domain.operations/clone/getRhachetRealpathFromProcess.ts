import { realpathSync } from 'node:fs';

/**
 * .what = whether an error is a fault the filesystem raised
 * .why  = the allowlist `rule.forbid.failhide` demands, drawn by shape so an errno no
 *   enumeration anticipated still yields `null` rather than a rethrow
 *
 * ⚠️ `errno`, never `code` — node stamps a string `code` on its whole `ERR_*` family
 *   too, so a `code` read grades a DEFECT an fs fault and swallows it. `[case1c]`.
 * ⚠️ no `instanceof Error` — it is realm-fragile, so a fault from a `node:fs` in
 *   another realm (a vm harness, a worker) failed it and rethrew. `[case1c]`.
 */
const isFsFault = (error: unknown): boolean =>
  typeof (error as NodeJS.ErrnoException | null | undefined)?.errno ===
  'number';

/**
 * .what = the true on-disk path of the rhachet module this process loaded, with
 *   every symlink followed
 *
 * .why  = it is the ONE read that parts a damaged install from a stale store — the
 *   distinction `#475` records as its costliest. the report hands the human this path
 *   rather than a command to produce one.
 *
 * .note = it exists so `asCloneSocketOmissionReasonError` stays pure, as its two
 *   `*FromProcess` peers do.
 *
 * ⚠️ returns `string | null`, never throws on an fs fault — it is read INLINE while the
 *   classified report is built, so a throw here would destroy that report and surface a
 *   raw stack instead. the hosts where it throws are the hosts the report fires on.
 *   `null` renders as a stated "could not be read" (`rule.forbid.failhide`); a sentinel
 *   string would read as a path a human might go hunt for.
 * ⚠️ `__filename` is CJS, and only the jit path reaches this file — `bin/run` sends
 *   every verb but `run` / `roles boot|cost` to `run.jit`.
 */
export const getRhachetRealpathFromProcess = (input?: {
  read?: () => string;
}): string | null => {
  const read = input?.read ?? ((): string => realpathSync(__filename));
  try {
    return read();
  } catch (error) {
    // a defect is never a diagnosis. only a filesystem fault yields `null`
    if (!isFsFault(error)) throw error;

    // the diagnostic could not be taken. that must never cost the caller its
    // classified report — so the absence is handed back as data, and the report
    // states it (see the why above)
    return null;
  }
};
