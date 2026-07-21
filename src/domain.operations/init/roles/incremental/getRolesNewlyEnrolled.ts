/**
 * .what = filters linked roles down to those absent from the linked-before set
 * .why = keeps the setIncrementalRoles summary honest — a re-link of an already
 *   enrolled role is not an "addition", so it falls out here and the summary
 *   reports it as untouched, not added
 *
 * .note = candidates are the roles the add-phase linked this call (the leaf's
 *   return); linkedBefore is the set captured prior to the add-phase
 */
export const getRolesNewlyEnrolled = (input: {
  candidates: { repo: string; role: string }[];
  linkedBefore: { repo: string; role: string }[];
}): { repo: string; role: string }[] =>
  input.candidates.filter(
    (candidate) =>
      !input.linkedBefore.some(
        (linked) =>
          linked.repo === candidate.repo && linked.role === candidate.role,
      ),
  );
