# F12 — a reach link elsewhere stays a refusal

## .the fork
`<repo>/.claude` that links to a dir other than the repo actor's brain dir (a dotfiles dir, say)
is refused today by `setRepoBrainDirSymlink`: exit 2, a hint to remove the link, no write. a brain
dir that links out, by contrast, now skips with a warn and exit 0. two answers:
- A: keep the refusal, as it predates this wish
- B: skip it with a `⚠️` warn like a brain dir, and exit 0

## .taken
A. the refusal writes naught outside the repo, so the wish's safety holds. the two shapes differ in
who owns the link: a brain dir under `.agent/.actors` is rhachet's, so a skip leaves it for the
human to repoint; `<repo>/.claude` is the one door claude reads, so while it points elsewhere no
role boot reaches any clone. a skip with exit 0 would let `pnpm install` pass with every clone
unguarded. the refusal names both targets and the fix.

## .rework
clean — the refusal is one throw in `setRepoBrainDirSymlink`; a skip is a
`BrainDirOutsideRepoError` there plus its warn. no contract moves.

## .confidence
85%. the hint tells the human to remove a link they made on purpose; the wisher may prefer a
softer hint, or a skip.

## .where
`src/domain.operations/init/boots/setRepoBrainDirSymlink.ts` ·
`blackbox/cli/init.hooks.outside-repo.acceptance.test.ts` case8 · `1.vision.experience.case=_.md`
