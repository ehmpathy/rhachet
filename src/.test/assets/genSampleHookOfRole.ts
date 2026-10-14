/**
 * .what = a claude SessionStart hook entry authored by one fixture role
 * .why = the actor settings tests build settings files of per-role hooks; one shape, shared,
 *   so a change to the hook shape lands once (rule.require.shared-test-fixtures)
 */
export const genSampleHookOfRole = (input: { role: string }) => ({
  matcher: '*',
  hooks: [
    {
      type: 'command',
      command: `echo ${input.role}`,
      author: `repo=fixture/role=${input.role}`,
    },
  ],
});

/**
 * .what = a settings file (as json text) that holds one SessionStart hook per role
 */
export const genSampleSettingsOfRoles = (input: { roles: string[] }): string =>
  JSON.stringify({
    hooks: {
      SessionStart: input.roles.map((role) => genSampleHookOfRole({ role })),
    },
  });
