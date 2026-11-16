/**
 * .what = the age past which a leftover test repo dir is cleared by the notice's command
 * .why = a dir a live run still uses was touched within that run; a day keeps every live run's
 *   dir, from this checkout or a peer's, out of the delete
 */
const DIR_AGE_MIN_MINUTES = 24 * 60;

/**
 * .what = the notice a run prints when earlier runs left residue on this box, or null
 * .why = the pile is old, and no run of this checkout adds to it; the notice says so, so it is
 *   not read as a fix that failed. it names a cure for each kind that touches only what it names
 *
 * .note = the two counts have two scopes. the dirs carry no checkout id, so their count is
 *   box-wide: a peer checkout that predates rhachet#748 still adds to it. the stubs are matched by the
 *   path in their argv, so their count is this checkout's alone
 * .note = the dirs get a copy-paste delete, bound by age so no live run loses its dir. the stubs get
 *   no kill: a cmdline match reaches every process on the box (`rule.forbid.unscoped-process-kills`)
 */
export const asResidueNotice = (input: {
  dirs: number;
  stubs: number;
  tmpRoot: string;
}): string | null => {
  // a clean box prints naught
  if (input.dirs === 0 && input.stubs === 0) return null;

  // one branch per kind found: a head, then its cure as a chain below it
  const branchDirs = {
    head: `${input.dirs} rhachet-test-* test repo dirs in ${input.tmpRoot}, left by runs from before the cleanup of rhachet#748`,
    chain: [
      'to clear those a day old or more, run once',
      `find ${input.tmpRoot} -maxdepth 1 -name 'rhachet-test-*' -mmin +${DIR_AGE_MIN_MINUTES} -exec rm -rf {} +`,
    ],
  };
  const branchStubs = {
    head: `${input.stubs} stubBrainCli.cjs processes of this checkout (the fake brain tests spawn), started before today`,
    chain: ['a reboot clears them'],
  };
  const branches = [
    ...(input.dirs > 0 ? [branchDirs] : []),
    ...(input.stubs > 0 ? [branchStubs] : []),
  ];

  // draw the tree; the last branch closes it
  const lines = branches.flatMap((branch, index) =>
    asBranchLines({ ...branch, isLast: index === branches.length - 1 }),
  );
  return [
    'ℹ leftovers from earlier runs on this box, which no run of this checkout adds to',
    ...lines.map((line) => `   ${line}`),
    '',
  ].join('\n');
};

/**
 * .what = draws one top-level branch: its head, then each link of its chain one level deeper
 * .why = a branch that is not last keeps a `│` rail beside its chain, so the next head stays joined
 */
const asBranchLines = (input: {
  head: string;
  chain: string[];
  isLast: boolean;
}): string[] => {
  const rail = input.isLast ? '   ' : '│  ';
  const head = `${input.isLast ? '└─' : '├─'} ${input.head}`;
  const chain = input.chain.map(
    (link, depth) => `${rail}${'   '.repeat(depth)}└─ ${link}`,
  );
  return [head, ...chain];
};
