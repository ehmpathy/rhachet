/**
 * .what = cast github-app ids + pem into the stored source credential json blob
 * .why = keyrack stores the mechanism source as a json blob; a named cast keeps the
 *        shape (and the roundtrip `mech` tag) in one testable place
 *
 * .note = the `mech` tag lets deliverForGet detect which adapter owns the source
 */
export const asGithubAppSource = (input: {
  appId: string;
  installationId: string;
  privateKey: string;
}): string =>
  JSON.stringify({
    appId: input.appId,
    installationId: input.installationId,
    privateKey: input.privateKey,
    mech: 'EPHEMERAL_VIA_GITHUB_APP',
  });
