import { asActorOndiskDirName } from './asActorOndiskDirName';

/**
 * .what = the max byte length of ONE enrollment.jsonl line (incl. the newline)
 * .why =
 *   - enrollment.jsonl is append-only and MANY clones of one actor may append
 *     concurrently. a POSIX O_APPEND write of <= PIPE_BUF bytes is atomic, so
 *     no two concurrent appends interleave into a corrupt line — but ONLY if
 *     every line stays within that bound
 *   - PIPE_BUF is 4096 on linux (the smallest common value), so we cap a line
 *     at 4096 bytes and truncate the one unbounded field (the caller's reason)
 *     to keep the guarantee
 *
 * .note = the cap INCLUDES the final '\n' — the writer measures line + '\n'
 */
export const ENROLLMENT_LINE_MAX_BYTES = 4096;

/**
 * .what = the on-disk schema version stamped on each enrollment.jsonl line
 * .why = a reader keys its tolerant read on this — an older/absent version is
 *   upgraded-on-read, a newer-unknown version fails loud with an upgrade hint
 */
export const ENROLLMENT_LOG_SCHEMA_VERSION = 1;

/**
 * .what = the on-disk schema version of the actor.json identity manifest
 * .why = getAllActorsOndisk keys its tolerant read on this — a field addition
 *   bumps the version but does NOT read every extant actor as corrupt; a
 *   newer-unknown version fails loud with an upgrade hint
 */
export const ACTOR_MANIFEST_SCHEMA_VERSION = 1;

/**
 * .what = the name of the repo actor dir, a direct child of `.agent/.actors`
 * .why = the repo actor holds the ambient roles, and only it (`term=ambient`). the
 *        namespace `repo` names the actor; the value `ambient` names its roles. the brain
 *        dir render, the enroll excludes and all three gitignore writers address it; one
 *        literal keeps them in agreement (D10)
 * .note = the dir name routes through `asActorOndiskDirName`, the one owner of the
 *        `actor.via.<exid>` format, so the repo actor's gitignore lines and migration can
 *        never drift from the dir every other reader derives
 */
export const REPO_ACTOR_EXID = 'repo=ambient';
export const REPO_ACTOR_DIR_NAME = asActorOndiskDirName({
  exid: REPO_ACTOR_EXID,
});

/**
 * .what = the name the repo actor dir held before `actor.via.repo=ambient`
 * .why = an extant repo still holds a dir under this name; init migrates it to
 *        `REPO_ACTOR_DIR_NAME`, and the gitignore writers drop its negation
 */
export const REPO_ACTOR_DIR_NAME_LEGACY = 'actor.via.slug=.default';

/**
 * .what = the gitignore lines that keep `.agent/.actors` out of git, except the repo
 *         actor dir, which is tracked
 * .why = three writers emit these lines — the repo `.gitignore` rewrite, the repo
 *        `.gitignore` negation, and the `.actors/.gitignore` self-ignore. a line that
 *        drifts in one writer re-ignores the repo actor dir, or un-ignores every actor
 *
 * .note = git never re-includes a path under an excluded dir, so the repo line is
 *         `.agent/.actors/*` (its children), never `.agent/.actors/` (the dir itself)
 */
export const ACTORS_GITIGNORE_LINE = {
  /**
   * the repo `.gitignore`: every direct child of the actors root
   */
  repoChildren: '.agent/.actors/*',

  /**
   * the repo `.gitignore`: the repo actor dir, re-included
   */
  repoRepoActorNegation: `!.agent/.actors/${REPO_ACTOR_DIR_NAME}/`,

  /**
   * the `.actors/.gitignore`: the repo actor dir, re-included from within
   */
  selfRepoActorNegation: `!/${REPO_ACTOR_DIR_NAME}/`,

  /**
   * the repo `.gitignore`: the legacy repo actor dir negation — dropped on sight, so the
   * legacy dir is ignored again
   */
  repoRepoActorNegationLegacy: `!.agent/.actors/${REPO_ACTOR_DIR_NAME_LEGACY}/`,

  /**
   * the `.actors/.gitignore`: the legacy negation from within — dropped on sight
   */
  selfRepoActorNegationLegacy: `!/${REPO_ACTOR_DIR_NAME_LEGACY}/`,
} as const;
