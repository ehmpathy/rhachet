import { asLibcFromReport, type Libc } from './asLibcFromReport';

/**
 * .what = whether an error is one node's own report subsystem raised
 * .why  = the allowlist `rule.forbid.failhide` demands, drawn by shape so a code no
 *   enumeration anticipated still yields `unreadable` rather than a rethrow
 *
 * 🚨 `code`, and NOT `errno` — the INVERSE of the field its peer
 *   `getRhachetRealpathFromProcess` reads, and deliberately so. that peer guards a
 *   SYSCALL, so its fault family carries a numeric `errno` and node's `ERR_*` family is
 *   the defect half. this guards no syscall at all: `getReport()` raises no errno, and
 *   the only faults it CAN raise are node's own. so here the `ERR_*` family is the fault
 *   half, and an uncoded throw is the defect half.
 *
 * ⚠️ `startsWith('ERR_')`, never `typeof code === 'string'` alone — an injected reader,
 *   or a library in the call path, can stamp a bare string `code` on a defect of its own.
 *   the prefix is what parts node's raised faults from every other coded error.
 */
const isProcessReportFault = (error: unknown): boolean => {
  const code = (error as { code?: unknown } | null | undefined)?.code;
  return typeof code === 'string' && code.startsWith('ERR_');
};

/**
 * .what = reads which libc the machine this process runs on links
 *
 * ⚠️ `process.report` is optional-chained, never assumed — a runtime that ships no report
 *   hands `undefined` to the cast, which reads it as `unreadable`. an absent report is
 *   silence, never evidence of musl.
 *
 * ⚠️ this returns `unreadable`, never `unknown` — `Libc` holds no such member. `unknown`
 *   is a SUPPORT verdict one layer later, in `getPtyPlatformSupport`.
 *
 * 🚨 a node-raised THROW from the probe degrades to `unreadable`, and that is the whole
 *   reason the try/catch is here rather than an optional chain alone. `getReport()`
 *   synthesizes a full diagnostic report — it walks the heap, the loaded libraries, and
 *   the environment — so it is an external call that CAN fault, and this read runs INLINE
 *   while `asCloneSocketOmissionReasonError` composes the report a human is about to read.
 *   a fault here would destroy that report and put a raw stack on screen in its place: the
 *   probe would have deleted the very message it exists to enrich.
 *
 *   ⚠️ so the degrade is not a swallow, on two counts. `unreadable` is a DECLARED member
 *   of `Libc` and `getPtyPlatformSupport` renders it as its own verdict, so the absence is
 *   reported to the human rather than hidden from them. and the catch carries an
 *   ALLOWLIST — a DEFECT is rethrown in full, so our own bug can never present as a host
 *   condition (`rule.forbid.failhide`). this is the same guarded-null shape its peer
 *   `getRhachetRealpathFromProcess` takes, for the same reason and at the same call site.
 *
 * .note = `read` is injectable for the clamp alone. `getReport()` cannot be made to fault
 *   on demand, so the allowlist's two halves are unprovable without it.
 */
export const getLibcFromProcess = (input?: { read?: () => unknown }): Libc => {
  const read = input?.read ?? ((): unknown => process.report?.getReport());
  const report = ((): unknown => {
    try {
      return read();
    } catch (error) {
      // a defect is never a diagnosis. only a node-raised report fault degrades
      if (!isProcessReportFault(error)) throw error;

      // the probe ran and established no answer. that must never cost the caller its
      // classified report — so the absence is handed back as data (see the why above)
      return undefined;
    }
  })();
  return asLibcFromReport({ report });
};
