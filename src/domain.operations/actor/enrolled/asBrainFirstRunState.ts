/**
 * .what = the next `<brainDir>/.claude.json`: the prior, plus the first-run keys it
 *         lacks — onboard and theme from the human, the api keys the human already
 *         approved, and trust for this repo — or null when no key is absent
 * .why = a relocated clone reads its first-run state from its own config dir; with
 *        none, it meets the trust and api-key prompts with no keyboard behind it (D11)
 *
 * .note = only keys the human already accepted are copied; every other field is kept
 * 🔴 .note = trust is the one key NOT gated on the human's own entry, on purpose: the enroll IS
 *   the consent. a human who runs `rhx enroll` in a repo asks a clone to work there, so every
 *   enroll grants trust outright (under the repo path and, in a worktree, its main checkout),
 *   which subsumes an inherit from the repo actor. the wisher chose this blanket grant over a
 *   gate on the repo actor's trust (vision, "does a new actor trust the repo?", answered
 *   2026-09-28: "the blanket grant stays"); `asBrainFirstRunState.test` [case4] pins it
 */
export const asBrainFirstRunState = (input: {
  prior: Record<string, unknown>;
  human: Record<string, unknown>;
  repoPath: string;
  repoPathMain: string | null;
}): Record<string, unknown> | null => {
  const { prior, human } = input;

  // onboard + theme: copied from the human only where absent
  const onboard =
    prior['hasCompletedOnboarding'] === undefined &&
    human['hasCompletedOnboarding'] !== undefined
      ? { hasCompletedOnboarding: human['hasCompletedOnboarding'] }
      : {};
  const theme =
    prior['theme'] === undefined && human['theme'] !== undefined
      ? { theme: human['theme'] }
      : {};

  // api keys: the union of approvals, prior first
  const approvedPrior = asStringList(
    asRecord(prior['customApiKeyResponses'])['approved'],
  );
  const approvedHuman = asStringList(
    asRecord(human['customApiKeyResponses'])['approved'],
  );
  const approvedAbsent = approvedHuman.filter(
    (key) => !approvedPrior.includes(key),
  );
  const apiKeys =
    approvedAbsent.length > 0
      ? {
          customApiKeyResponses: {
            ...asRecord(prior['customApiKeyResponses']),
            approved: [...approvedPrior, ...approvedAbsent],
          },
        }
      : {};

  // trust: this repo, accepted by the human's enroll — under the repo path AND its main
  //   checkout, since claude keys trust by the main checkout when the repo is a worktree
  const projectsPrior = asRecord(prior['projects']);
  const trustPaths = [
    ...new Set([input.repoPath, input.repoPathMain ?? input.repoPath]),
  ];
  const trustPathsAbsent = trustPaths.filter(
    (path) => asRecord(projectsPrior[path])['hasTrustDialogAccepted'] !== true,
  );
  const trust =
    trustPathsAbsent.length === 0
      ? {}
      : {
          projects: {
            ...projectsPrior,
            ...Object.fromEntries(
              trustPathsAbsent.map((path) => [
                path,
                {
                  ...asRecord(projectsPrior[path]),
                  hasTrustDialogAccepted: true,
                },
              ]),
            ),
          },
        };

  // no absent key → no write
  const additions = { ...onboard, ...theme, ...apiKeys, ...trust };
  if (Object.keys(additions).length === 0) return null;
  return { ...prior, ...additions };
};

/**
 * .what = a value as a plain record, or {} when it is not one
 */
const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : {};

/**
 * .what = a value as a list of strings, or [] when it is not one
 */
const asStringList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
