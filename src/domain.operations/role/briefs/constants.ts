/**
 * .what = the brief subtrees no source intends to boot or to cost
 * .why = it was hand-written as `['.scratch', '.archive']` at two sites, so a third entry
 *        added to one would silently leave the other to count a subtree the first had
 *        dropped — and the two would then disagree on what the role even contains
 *        (`rule.forbid.magic-values`)
 *
 * .note = `.scratch` is work in progress and `.archive` is deprecated. neither is content
 *   a role means to carry, so both are subtracted from EVERY source's universe — see
 *   `getAllBriefCandidateFiles`, which takes this list as its `blocklist` input.
 */
export const BRIEF_DIR_BLOCKLIST = ['.scratch', '.archive'];

/**
 * .what = the dir names a boot's file walk never enters
 * .why = a manifest boots from any dir, so its walk may sit above a package graph or a
 *        build output. these trees hold no boot resource and have no size bound
 */
export const BOOT_WALK_DIRS_SKIPPED = ['node_modules', '.git', 'dist'];
