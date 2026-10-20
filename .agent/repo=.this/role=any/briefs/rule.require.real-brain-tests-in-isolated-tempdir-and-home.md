# rule.require.real-brain-tests-in-isolated-tempdir-and-home

> **a test that spawns a real brain-cli runs it in a `genTempDir` repo, with `HOME` set to an isolated
> temp home (`genIsolatedClaudeHome`). never the host's `~`, never the worktree, never the runner's own
> claude env.**

## .why

- **the host's config is not the subject.** a real claude reads `~/.claude/settings.json`,
  `~/.claude.json`, `CLAUDE.md`, and the cwd's `.claude/`. under the host home, a test measures whatever
  the human's box holds that day, and two boxes disagree on the same commit
- **the test must not write the host.** a real claude writes trust, settings, and transcripts. under the
  host home, a test's `/model` or "don't ask again" lands in the human's own settings
- **the runner may itself be a claude session.** its `CLAUDE*` env (`CLAUDE_CONFIG_DIR`,
  `CLAUDE_CODE_CHILD_SESSION`, …) leaks into the spawn and changes what the brain does — measured
  2026-10-15: an inherited child-session marker turned the probe's transcripts off
- **settings tests need it most.** a test about which layer claude reads (grove vs repo) is meaningless
  when the grove is the human's real `~/.claude/settings.json`

## .how

```ts
const { home, binPath } = genIsolatedClaudeHome({ slug: 'my-journey' }); // temp HOME, creds linked
const repo = await genTestTempRepo({ fixture: 'with-roles-full' });       // or genTempDir
const envClaudeDropped = Object.fromEntries(
  Object.keys(process.env).filter((key) => /^CLAUDE/.test(key)).map((key) => [key, undefined]),
);
spawnPtyCliBackground({ bin: binPath, args, cwd: repo.path,
  env: { ...envClaudeDropped, HOME: home, PWD: repo.path } });
```

- the credential is the one file shared: `genIsolatedClaudeHome` symlinks the host's
  `.credentials.json` into the temp home, so the brain authenticates with no copy of the secret
- trust and first-run state are written into the temp home's `.claude.json`, never the host's

## .enforcement

- a real brain-cli spawned with the host `HOME` = **blocker**
- a real brain-cli spawned with the worktree (or any non-temp dir) as its cwd = **blocker**
- a real brain-cli spawned with the runner's `CLAUDE*` env inherited = **blocker**
- a test that writes the host's `~/.claude.json` or `~/.claude/` = **blocker**

🟡 extant suites that predate this rule (the `*.realbrain.*` clone suites use the host home and
`setRealClaudeFirstRunAccepted`, which writes the host `~/.claude.json`) are fixed forward when touched.

## .see also

- `rule.allow.acceptance-spawns-real-brain-cli` — that a real brain may be spawned at all
- `rule.require.test-claude-cli-against-haiku` — which model
- `blackbox/.test/infra/genIsolatedClaudeHome.ts` — the temp home
- `blackbox/.test/infra/spawnRhachetCliBackground.ts` — `spawnPtyCliBackground`
