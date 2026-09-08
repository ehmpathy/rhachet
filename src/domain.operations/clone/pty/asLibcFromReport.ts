/**
 * .what = which libc a host links, as read off a node diagnostic report
 *
 * .why  = `unreadable` is a FIRST-CLASS answer, never a synonym for musl. the prebuilt pty
 *   addon is built against glibc, so this word decides the ERROR CLASS an absent addon
 *   reports — and to collapse an unreadable probe into "musl" would tell a glibc human
 *   "pass --no-socket" about an install we broke, which is a cure that runs clean and
 *   repairs naught (the defect class `rule.require.errors-name-the-fix` bans)
 *
 * ⚠️ `unreadable`, not `unknown` — a probe RAN here and returned naught. `unknown` is the
 *   downstream word, which `PtyPlatformSupport` keeps. see `term=unreadable._.choice._.md`.
 */
export type Libc = 'glibc' | 'musl' | 'unreadable';

/**
 * .what = casts a node diagnostic report into the libc its host links
 *
 * .why  = node names a runtime glibc version only where glibc is linked, so the field's
 *   presence is the signal. but its ABSENCE carries two senses — "this host is musl" and
 *   "this report told us naught" — and only the first is a fact about the host
 *
 * .how  = a WITNESS field separates them. `nodejsVersion` is the cheapest field a genuine
 *   report always carries: node knows its own version with no syscall, no libc, and no
 *   platform dependency, so the field is present on musl and glibc alike. so a report
 *   that lacks the witness is not a musl report — it is not a report we can read at all
 *
 *   | witness | glibc marker | verdict |
 *   |---------|--------------|---------|
 *   | absent  | either       | unreadable — the report failed us, so we know naught |
 *   | present | present      | glibc   |
 *   | present | absent       | musl — a populated report that genuinely lacks it |
 *
 * .note = pure, and it takes the report as an INPUT rather than a read, so every row
 *   above is reachable from a unit test on any machine — the `unreadable` row above all,
 *   which no host we can run on would produce
 *
 * .note = the `as` cast is an EXTERNAL-BOUNDARY exception under `rule.forbid.as-cast`.
 *   node declares `process.report.getReport(): object`, so its own type erases every
 *   field of a report it fully documents. the cast is narrowed to the two optional fields
 *   read, and every hop is guarded (`?.`) so a shape drift yields `unreadable`, never a
 *   throw. removal path: it goes the moment `@types/node` types the report shape
 */
export const asLibcFromReport = (input: { report: unknown }): Libc => {
  const header = (
    input.report as
      | { header?: { nodejsVersion?: string; glibcVersionRuntime?: string } }
      | undefined
  )?.header;

  // the witness: a report that cannot name node's own version is not one we can read,
  // so its silence about glibc is silence in full — never evidence of musl
  if (typeof header?.nodejsVersion !== 'string') return 'unreadable';

  return typeof header.glibcVersionRuntime === 'string' ? 'glibc' : 'musl';
};
