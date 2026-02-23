# rule.forbid.rhachet-use-ts

## .what

`rhachet.use.ts` is deprecated. do not use it in test assets or new code.

## .why

rhachet.use.ts was the legacy entrypoint for consumer repos to declare which roles to use. it has been replaced by convention-based lookups:
- `roles link` discovers roles from installed `rhachet-roles-*` packages
- `.agent/` directory holds linked role resources

no active usecases remain for rhachet.use.ts.

## .do not confuse

| file | context | purpose |
|------|---------|---------|
| `rhachet.use.ts` | consumer repos (deprecated) | declared which roles to use |
| `rhachet.repo.yml` | supplier repos (current) | publishes role registry via `repo introspect` |

these are different files for different purposes:
- **rhachet.use.ts** — was for consumers, now deprecated
- **rhachet.repo.yml** — is for suppliers, still used

## .scope

- test assets in `blackbox/.test/assets/`
- new fixture creation
- consumer repo configuration

## .test fixtures

consumer repo fixtures use `.agent/` directory only:

```
with-role-keyrack/
  .agent/
    keyrack.yml
    repo=test-repo/
      role=tester/
        readme.md
        keyrack.yml
        briefs/
        skills/
```

no rhachet.use.ts — convention lookups handle role discovery.

## .role supplier repos

role suppliers (rhachet-roles-* packages) use `repo introspect` to generate `rhachet.repo.yml`:

```bash
npx rhachet repo introspect
```

`roles link` reads from `rhachet.repo.yml` in installed packages.

## .enforcement

- new rhachet.use.ts files = blocker
- rhachet.repo.yml in consumer test fixtures = blocker (that's for suppliers)
