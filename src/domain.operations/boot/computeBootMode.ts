import { BadRequestError } from 'helpful-errors';

/**
 * .what = detects boot.yml mode from raw parsed object
 * .why = fail fast on mixed mode, route to correct schema
 *
 * .note = mode detection rules:
 *   - simple mode: has briefs or skills top-level keys
 *   - subject mode: has always or subject.* keys
 *   - none mode: empty object or no relevant keys
 *   - mixed mode: has both patterns (error)
 */
export const computeBootMode = (input: {
  raw: Record<string, unknown>;
}): 'simple' | 'subject' | 'none' => {
  const keys = Object.keys(input.raw);

  // detect simple mode keys (top-level briefs or skills)
  const hasSimpleKeys = keys.some((k) => k === 'briefs' || k === 'skills');

  // detect subject mode keys (always or subject.*)
  const hasSubjectKeys = keys.some(
    (k) => k === 'always' || k.startsWith('subject.'),
  );

  // fail fast on mixed mode
  if (hasSimpleKeys && hasSubjectKeys) {
    throw new BadRequestError(
      'mixed mode not allowed — use either top-level briefs/skills OR always/subject, not both',
      { keys },
    );
  }

  // return detected mode
  if (hasSubjectKeys) return 'subject';
  if (hasSimpleKeys) return 'simple';
  return 'none';
};
