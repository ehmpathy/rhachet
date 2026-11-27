## the ask

`genTempDir` returns the **symlink** handle at `@gitroot/.temp/genTempDir.symlink/{name}`, never the
physical path at `/tmp/test-fns/{repo}/.temp/{name}`:

```ts
// src/domain.operations/genTempDir/genTempDir.ts
// return link path for observability
return path.join(tempInfra.pathSymlink, dirName);
```

that handle sits **inside the downstream git repo**. so any test that needs a cwd which is **not
inside any git repo** cannot use `genTempDir` — a walk up from the handle finds the caller's own
`.git`.

## why it matters

this is the one case that forces a caller back to a bare `mkdtempSync(join(tmpdir(), …))` — exactly
the hand-roll `genTempDir` exists to replace, and one that leaks, since it inherits none of
`genTempDir`'s containment or prune.

two live instances in `ehmpathy/rhachet`:

- `src/infra/git/getGitRepoRootOrNull.integration.test.ts` — clamps that a non-repo cwd yields `null`
  rather than a throw. its own comment names the blocker:
  > *the non-repo dir is made under os.tmpdir() (NOT genTempDir, which is repo-scoped and therefore
  > always inside this git repo — useless for a "not a git repo" probe)*
- `blackbox/.test/infra/genTestTempDirNonRepo.ts` — a whole helper that exists only to serve this
  case, a duplicate of what `genTempDir` would otherwise provide

the need is legitimate and it recurs: a CLI must tolerate a non-repo cwd, and that guarantee needs a
test that runs from one.

note the **physical** location already satisfies the requirement — `/tmp/test-fns/{repo}/.temp/{name}`
is outside any git repo. only the returned handle does not. so the capability exists; it is merely
not reachable through the contract.

## suggested shape

let the caller ask for the physical path. a shape like:

```ts
genTempDir({ slug: 'non-repo-probe', deref: true });
// => /tmp/test-fns/{repo}/.temp/{name}   (outside any git repo)
```

the symlink stays the default, since observability is its point. `deref` (or whatever name fits the
glossary) opts into the physical path for the cases that need it.

worth a jsdoc note either way: that the returned path is repo-internal by design, and what to reach
for when it must not be.

## context

filed from `ehmpathy/rhachet` behavior `v2026_08_30.fix-test-tempdir-leak` (see ehmpathy/rhachet#488),
whose goal is to route **every** temp-dir site through `genTempDir` with no exceptions. this is the
one case that currently cannot be routed. rhachet defers its non-repo sites until this lands.

pairs with the twin dispatch on the absent global autoprune.
