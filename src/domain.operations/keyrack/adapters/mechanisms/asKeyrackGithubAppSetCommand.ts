/**
 * .what = the one `rhx keyrack set` command that files a github-app blob, for any vault, reach,
 *         and form
 * .why = the mint-fault cure on each vault and the aws.params no-identity hint all name a set
 *        command; one source keeps the flags (owner, reach, mech) from drift between them
 *
 * .note = `owner` null means the default owner, so no `--owner` flag; a caller that does not
 *         know the owner or slug passes a placeholder (`<owner>`, `<full slug>`)
 * .note = `reach` null means the reachless key; a reach key's cure must name it, since `get`
 *         reads the file cut for that reach and a reachless set would leave it stale
 * .note = form `pipe` reads the blob from stdin: `readSide` null means its origin is unknown
 *         here, so a placeholder stands in, and `host` non-null runs the set on that box over
 *         ssh. form `guided` runs the extant tty + gh setup and reads neither
 */
export const asKeyrackGithubAppSetCommand = (input: {
  vault: 'os.secure' | 'aws.params';
  owner: string | null;
  slug: string;
  reach: string | null;
  form:
    | { kind: 'pipe'; readSide: string | null; host: string | null }
    | { kind: 'guided' };
}): string => {
  // the flags every form shares
  const ownerFlag = input.owner === null ? '' : ` --owner ${input.owner}`;
  const reachFlag = input.reach === null ? '' : ` --reach ${input.reach}`;
  const set = `rhx keyrack set${ownerFlag} --key ${input.slug}${reachFlag} --vault ${input.vault} --mech EPHEMERAL_VIA_GITHUB_APP`;

  // the guided form needs no pipe
  if (input.form.kind === 'guided') return set;

  // the pipe form reads the blob from stdin, optionally on another box
  const via = input.form.host === null ? '' : `ssh ${input.form.host} `;
  const read = input.form.readSide ?? '<the current blob>';
  return `${read} | ${via}${set} --source @stdin`;
};
