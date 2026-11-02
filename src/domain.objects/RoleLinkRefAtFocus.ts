import type { RoleLinkRef } from './RoleLinkRef';

/**
 * .what = a linked role, with the subjects an actor is focused on
 * .why = hooks follow the role; briefs follow the focus. a brain dir's render reads the role
 *   from the ref and the subjects from the focus, so the two travel together
 *
 * .note = `subjects: null` means the whole role — every subject, as a bare enroll boots it
 */
export interface RoleLinkRefAtFocus extends RoleLinkRef {
  subjects: string[] | null;
}
