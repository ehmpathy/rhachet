/**
 * .what = the linked roles that were neither added nor removed this call
 * .why = the summary tree reports untouched roles distinctly; this is the
 *   final linked set minus the roles we just added (removes are already gone),
 *   extracted so the setIncrementalRoles orchestrator stays declarative
 */
export const getUntouchedRoles = (input: {
  linkedRoles: { repo: string; role: string }[];
  rolesAdded: { repo: string; role: string }[];
}): { repo: string; role: string }[] =>
  input.linkedRoles.filter(
    (linked) =>
      !input.rolesAdded.some(
        (added) => added.repo === linked.repo && added.role === linked.role,
      ),
  );
