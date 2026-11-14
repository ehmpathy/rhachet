type RunTarget = {
  skill: string | null;
  init: string | null;
  repo: string | null;
  role: string | null;
};

/**
 * .what = names which key of the target a flag sets, or null where the flag is not run's own
 * .why = after the skill or init name, only the long `--repo` / `--role` are run's
 */
const asRunTargetKeyOfFlag = (input: {
  flag: string;
  isNamed: boolean;
}): keyof RunTarget | null => {
  if (input.flag === '--repo') return 'repo';
  if (input.flag === '--role') return 'role';
  if (input.isNamed) return null;
  if (input.flag === '--skill' || input.flag === '-s') return 'skill';
  if (input.flag === '--init' || input.flag === '-i') return 'init';
  if (input.flag === '-r') return 'role';
  return null;
};

/**
 * .what = reads which skill or init `run` targets, and its repo/role filters, from the args
 *         after `run`
 * .why = a skill's own short flags (`rmsafe -r`, a skill's `-s`) must reach the skill. a short
 *        alias counts as run's own only before the skill or init name; after the name it is the
 *        skill's. the long `--repo` / `--role` count anywhere, as they always have
 *
 * .note = `--flag=value` and `--flag value` are both read
 */
export const asRunTargetFromArgs = (input: {
  args: string[];
  target?: RunTarget;
}): RunTarget => {
  const target = input.target ?? {
    skill: null,
    init: null,
    repo: null,
    role: null,
  };
  const [token, ...rest] = input.args;
  if (token === undefined) return target;

  // split an inline value off a long flag
  const [flag, valueInline] = token.startsWith('--')
    ? (token.split(/=(.*)/s) as [string, string | undefined])
    : [token, undefined];
  const key = asRunTargetKeyOfFlag({
    flag,
    isNamed: target.skill !== null || target.init !== null,
  });
  if (key === null) return asRunTargetFromArgs({ args: rest, target });

  // the value is inline, or the next token
  if (valueInline !== undefined)
    return asRunTargetFromArgs({
      args: rest,
      target: { ...target, [key]: valueInline },
    });
  const [valueNext, ...restAfterValue] = rest;
  if (valueNext === undefined) return target;
  return asRunTargetFromArgs({
    args: restAfterValue,
    target: { ...target, [key]: valueNext },
  });
};
