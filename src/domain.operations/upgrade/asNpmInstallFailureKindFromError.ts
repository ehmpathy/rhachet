import { HelpfulError } from 'helpful-errors';

import {
  isNpmInstallFailureKind,
  type NpmInstallFailureKind,
} from './asNpmInstallFailureKind';

/**
 * .what = reads the CLASSIFIED cause back off a thrown install error
 *
 * .why  = the cause travels in metadata now that the install throws the shared
 *   `ConstraintError` / `MalfunctionError` vocabulary rather than a bespoke subclass —
 *   which is what makes the exit code correct (`asNpmInstallFailureError`). a caller
 *   that wants the kind must therefore read metadata, and an inline
 *   `(error as any).metadata?.kind` at a call site is decode-friction in an orchestrator
 *   (`rule.forbid.decode-friction-in-orchestrators`). one named owner instead.
 *
 * .note = degrades to `'unclassified'`, never to a guess. an error we cannot read a kind
 *   from is reported as unplaced — the same guard `asNpmInstallFailureKind` keeps, and
 *   for the same reason (`rule.forbid.failhide`). that also covers a REDACTED clone,
 *   whose metadata `HelpfulError.redact` strips by design.
 *
 * .note = 🚨 the membership test is `isNpmInstallFailureKind`, which reads the SAME list
 *   the union is derived from. this function used to hand-copy the members, and the copy
 *   drifted the first time a member was added: `timed-out` was absent from it, so a KNOWN
 *   timeout degraded to `'unclassified'` and `execUpgrade`'s header contradicted the very
 *   message printed beneath it. the shared list is what makes that unrepeatable — a new
 *   kind is covered here by construction, with no second site to remember.
 */
export const asNpmInstallFailureKindFromError = (input: {
  error: unknown;
}): NpmInstallFailureKind => {
  if (!(input.error instanceof HelpfulError)) return 'unclassified';

  const { metadata } = input.error;
  if (typeof metadata !== 'object' || metadata === null) return 'unclassified';

  const { kind } = metadata as { kind?: unknown };
  if (isNpmInstallFailureKind(kind)) return kind;

  return 'unclassified';
};
