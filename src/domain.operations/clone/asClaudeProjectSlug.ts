/**
 * .what = encode an absolute cwd into claude-code's on-disk project-dir slug
 * .why =
 *   - claude-code writes each session transcript under
 *     `<config>/projects/<cwd-slug>/<session-id>.jsonl`, where the slug is the cwd
 *     with every non-alphanumeric char turned to `-`. to DISCOVER a clone's own
 *     transcripts we must reproduce that exact encode step, so the history link
 *     finds the right project dir
 *   - claude owns this format, so this transformer is a CLAUDE adapter: a second
 *     brain that persists transcripts differently gets its own encoder off the same
 *     per-brain seam (getBrainTranscriptDir)
 *
 * .note = e.g. `/home/u/git/a.b/_w/x-y` maps to `-home-u-git-a-b--w-x-y` (the
 *   first `/`, the `.`, and the `_` all become `-`; an extant `-` stays `-`)
 */
export const asClaudeProjectSlug = (input: { cwd: string }): string =>
  input.cwd.replace(/[^a-zA-Z0-9]/g, '-');
