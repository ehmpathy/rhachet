import { ConstraintError } from 'helpful-errors';

import { isBootSectionKey } from '@src/domain.operations/boot/isBootSectionKey';

/**
 * .what = detects boot.yml mode from raw parsed object
 * .why = fail fast on mixed mode, route to correct schema
 *
 * .note = mode detection rules:
 *   - simple mode: has briefs or skills top-level keys
 *   - subject mode: has always or subject.* keys
 *   - none mode: empty object or no relevant keys
 *   - mixed mode: has both patterns (error)
 *
 * .note = `budget` is a MODIFIER, never a mode. it caps whatever payload the mode
 *         selects, so it is excluded from mode detection — otherwise a budget beside
 *         `briefs:` would read as a second pattern and trip the mixed-mode guard.
 */
export const computeBootMode = (input: {
  raw: Record<string, unknown>;
}): 'simple' | 'subject' | 'none' => {
  const keys = Object.keys(input.raw);

  // detect simple mode keys (top-level briefs or skills)
  const hasSimpleKeys = keys.some((k) => k === 'briefs' || k === 'skills');

  // detect subject mode keys (always or subject.*)
  const hasSubjectKeys = keys.some(isBootSectionKey);

  // fail fast on mixed mode
  if (hasSimpleKeys && hasSubjectKeys) {
    throw new ConstraintError(
      'mixed mode not allowed — use either top-level briefs/skills OR always/subject, not both',
      { keys },
    );
  }

  // refuse a budget with no payload to cap — it would otherwise resolve to "no boot.yml"
  // and the declared cap would be silently discarded
  if (!hasSimpleKeys && !hasSubjectKeys && keys.includes('budget')) {
    throw new ConstraintError(
      'boot.yml declares a budget but no payload to cap — add briefs/skills, or always/subject',
      { keys },
    );
  }

  // return detected mode
  if (hasSubjectKeys) return 'subject';
  if (hasSimpleKeys) return 'simple';
  return 'none';
};
