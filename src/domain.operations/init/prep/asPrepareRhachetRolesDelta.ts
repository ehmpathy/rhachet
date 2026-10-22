import type { RoleSpecifier } from '@src/domain.objects/RoleSpecifier';
import { asRolesUpsertedByDelta } from '@src/domain.operations/roles/deltas/asRolesUpsertedByDelta';
import { getRoleDeltaTokens } from '@src/domain.operations/roles/deltas/getRoleDeltaTokens';

/**
 * .what = apply a role delta to an extant `prepare:rhachet` command
 * .why = an incremental `rhx init --roles -xyz` must drop `xyz` from the command a
 *        fresh install replays, or the next install links the removed role right back
 *        (inventory.of=requirements.case=1). additions append, so a `--prep` beside an
 *        incremental delta extends the extant set rather than replace it
 *
 * .note = only the `--roles` value run is touched; the build prefix, `--hooks`, and any
 *   other token keep their place verbatim, whitespace and all. the rewritten run itself is
 *   single-spaced
 * .note = the run is read in every form `rhx init` reads (`getRoleDeltaTokens`): space
 *   (`--roles a b`), comma (`--roles a,b`) and inline (`--roles=a,b`). a changed run is
 *   written back in the form it was found in
 * .note = a removal matches a role by slug, and by repo when both sides name one —
 *   the rule `getRoleDeltas` uses, so `-mechanic` drops `ehmpathy/mechanic` too
 * .note = when the delta empties the run, the `--roles` flag leaves with it, so the
 *   command never ends in a bare `--roles`
 * .note = a delta that changes no role returns the command verbatim, whitespace and all
 * .note = pure transformer — no i/o, deterministic
 */
export const asPrepareRhachetRolesDelta = (input: {
  command: string;
  additions: RoleSpecifier[];
  removals: RoleSpecifier[];
}): string => {
  // each token with its offsets, so the text around the run can be sliced verbatim
  const spans = [...input.command.matchAll(/\S+/g)].map((match) => ({
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
  }));
  const tokens = spans.map((span) => input.command.slice(span.start, span.end));

  // locate the `--roles` value run: the tokens after the flag (plus an inline
  // `--roles=` value), up to the next flag or shell separator
  const flagIndex = tokens.findIndex(
    (token) => token === '--roles' || token.startsWith('--roles='),
  );
  const flagToken = tokens[flagIndex] ?? null;
  const valueInline = flagToken?.startsWith('--roles=')
    ? flagToken.slice('--roles='.length)
    : null;
  const runStart = flagIndex === -1 ? tokens.length : flagIndex + 1;
  const runLength = tokens
    .slice(runStart)
    .findIndex((token) => isRunTerminator({ token }));
  const runEnd = runLength === -1 ? tokens.length : runStart + runLength;
  const runValues = [
    ...(valueInline === null ? [] : [valueInline]),
    ...(flagIndex === -1 ? [] : tokens.slice(runStart, runEnd)),
  ];
  const rolesExtant = getRoleDeltaTokens({ raw: runValues });

  // upsert the run by the delta: one entry per role (fulcrum F6)
  const rolesNext = asRolesUpsertedByDelta({
    rolesHeld: rolesExtant,
    additions: input.additions,
    removals: input.removals,
  });

  // no role moved → the command as the human wrote it
  const isUnchanged =
    rolesNext.length === rolesExtant.length &&
    rolesNext.every((role, index) => role === rolesExtant[index]);
  if (isUnchanged) return input.command;

  // splice the run back in, in the form it was found in; an empty run takes its
  // `--roles` flag with it. the text before the flag and after the run is sliced from the
  // command, so its whitespace survives as written
  const isCommaForm = runValues.some((value) => value.includes(','));
  const rolesPart = (() => {
    if (rolesNext.length === 0) return '';
    if (valueInline !== null) return `--roles=${rolesNext.join(',')}`;
    if (isCommaForm) return `--roles ${rolesNext.join(',')}`;
    return ['--roles', ...rolesNext].join(' ');
  })();

  // no `--roles` flag → the roles join the end of the init command's own segment, so a
  // chained entry (`rhx init --hooks && echo done`) patches the init, never what follows
  if (flagIndex === -1) {
    const initIndex = tokens.findIndex(
      (token, index) =>
        token === 'init' && isRhachetBin({ token: tokens[index - 1] ?? '' }),
    );
    const segmentEnd = (() => {
      if (initIndex === -1) return tokens.length;
      const after = tokens
        .slice(initIndex)
        .findIndex((token) => isShellSeparator({ token }));
      return after === -1 ? tokens.length : initIndex + after;
    })();
    const anchor = spans[segmentEnd - 1]?.end ?? 0;
    const head = input.command.slice(0, anchor);
    const gap = head.length > 0 ? ' ' : '';
    return `${head}${gap}${rolesPart}${input.command.slice(anchor)}`;
  }

  // a `--roles` flag → replace the flag through the run's last token
  const runLast = spans[runEnd - 1] ?? spans[flagIndex];
  const tail = input.command.slice(runLast?.end ?? input.command.length);
  const head = input.command.slice(0, spans[flagIndex]?.start ?? 0);
  if (rolesPart.length === 0) return `${head.trimEnd()}${tail}`;
  return `${head}${rolesPart}${tail}`;
};

/**
 * .what = whether a token closes the `--roles` value run
 * .why = the run is the roles alone; a flag or a shell separator starts what follows
 */
const isRunTerminator = (input: { token: string }): boolean =>
  input.token.startsWith('--') || isShellSeparator(input);

/**
 * .what = whether a token chains one shell command to the next
 */
const isShellSeparator = (input: { token: string }): boolean =>
  input.token === '&&' || input.token === '||' || input.token === ';';

/**
 * .what = whether a token invokes the rhachet cli (`rhachet`, `rhx`, or a path to either)
 */
const isRhachetBin = (input: { token: string }): boolean => {
  const name = input.token.split('/').at(-1) ?? '';
  return name === 'rhachet' || name === 'rhx';
};
