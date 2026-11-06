# F1 — the common pattern is `**/!(brain)/.claude/CLAUDE.md`

- fork: `**/!(brain)/.claude/CLAUDE.md` · `/{*,*/*}/.claude/CLAUDE.md` (depth-bound home) · `~/.claude/CLAUDE.md`
- taken: the extglob. `~` is never expanded by claude (measured, 2.1.308), so it is a no-op. a
  depth-bound glob misses a deep HOME (test temp homes, `/var/lib/x`). the extglob matches any home
  and spares every actor door, since each door sits under `brain/`
- rework: clean — one constant in `getClaudeMdExcludesList.ts`, its tests, one snapshot line
- confidence low because: it also excludes any ancestor `.claude/CLAUDE.md` that is no actor door,
  and a home dir whose name starts with `brain` (`brain`, `brainy`, `brains`) slips through —
  picomatch's negated extglob is prefix-scoped (measured, unit matrix); both judged harmless
- the `brain*` gap's reach: an enrolled clone sets `CLAUDE_CONFIG_DIR` to its brain dir, so its
  user memory is its own door, never the home file, on any home name (journey `[t3]`: the enrolled
  clone quotes no user sentinel). the gap bites only a launch that reads the actor's settings with
  no config dir (`claude -p --settings …`), which no enroll takes
- reviewer ask (r9, 5.1): an acceptance case or a runtime notice for a `brain*` home. held for the
  council: a pattern that also excludes `brain*` homes needs a second entry, which the wish's "ONE
  pattern" bounds — the wisher's call, disputed rather than argued down
- reviewer ask (r11, 5.1): a second glob, `**/brain?*/.claude/CLAUDE.md`, to close the prefix homes
  (`/home/brainy`). it would; a home named exactly `brain` stays open either way. the same bound
  holds: a second entry is the wisher's call. a clean rework — one line in the list, rows moved
  from KEPT to EXCLUDED in the matrix. `HOME=/` is pinned as excluded
- reviewer ask (r11, 5.1, i005): a hash actor's file is gitignored, so it could keep the exact home
  literal beside the glob. the wish says ONE pattern; read as committed-only, the rework is clean —
  `getClaudeMdExcludesList` returns `{ portable, local }`, the repo actor writes `portable`, every
  other actor writes both. the wisher's call
- versions (r10, 5.1, i006): the enroll floor is 2.1.277. its binary, read with
  `rhx claude.cli.strings`, builds the matcher as `picomatch(patterns, {dot:true})` over the absolute
  path, User/Project/Local only — the shape measured live on 2.1.308 (vision probe) and on 2.1.292
  (the journey's pinned cli, `[t3.0]`). so every version enroll admits honors the glob
- symlinks (r10, 5.1, i006): in 2.1.277 and 2.1.292 the exclude test runs on the path as claude
  names it, before any symlink lookup (`if(r.has(h)||s>=…)return;if(<exclude>(e,n,g))return;`
  precedes the link read). a linked `~/.claude/CLAUDE.md`, `~/.claude`, or `$HOME` is matched at its
  link path, which ends in `.claude/CLAUDE.md`. the real-path twin claude adds serves an absolute
  pattern with a linked prefix, which a glob needs not
- where: `src/domain.operations/enroll/getClaudeMdExcludesList.ts`
- verdict: —
