import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * .what = is this repo LINKED — does it carry the `.agent/` directory that
 *   `rhx init --roles` / `rhx roles link` creates as the on-disk mark of linkage?
 *   named for the domain concept (linkage) over the mechanism it inspects, so it
 *   reads beside `isCloneLive` as a plain domain predicate.
 * .why =
 *   - a READ command (`actor list` / `clone list`) on a repo with no actors has two
 *     distinct causes: the repo is LINKED but none are enrolled yet, or the repo was
 *     NEVER linked. the empty-state hint must differ — a linked-empty repo says
 *     "enroll one", a never-linked repo must say "link roles first", else it points
 *     the human at `rhx enroll`, which would ITSELF fail on an unlinked repo (the
 *     same unlinked fail-loud enroll already enforces, per usecase.1)
 *   - `.agent/` is the single on-disk fact that separates the two: linking creates
 *     it; a never-linked repo has none. a linked repo with actors already has it, so
 *     an enrolled repo is never mislabeled
 */
export const isRepoLinked = (input: { repoPath: string }): boolean =>
  existsSync(join(input.repoPath, '.agent'));
