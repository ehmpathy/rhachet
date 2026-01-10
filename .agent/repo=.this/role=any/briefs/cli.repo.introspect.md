# rhachet repo introspect

## .what

generates `rhachet.repo.yml` manifest for the current rhachet-roles-* package.

## .when

run this command inside a `rhachet-roles-*` package (e.g., `rhachet-roles-ehmpathy`) to generate its manifest file.

## .how

```sh
# generate rhachet.repo.yml in current directory
npx rhachet repo introspect

# output to stdout instead
npx rhachet repo introspect --output -
```

## .requirements

1. must be run inside a package with name that starts with `rhachet-roles-`
2. package.json must have a `main` field with an entry point
3. entry point must export `getRoleRegistry()` function
4. no node_modules required - loads directly from package.main entry point

## .note

this command has nothing to do with `rhachet.use.ts`. that file is for repos that CONSUME roles packages. this command is for repos that ARE roles packages.

## .output

generates `rhachet.repo.yml` with:
- registry slug and readme path
- roles array with each role's:
  - slug, name, purpose
  - readme, briefs, skills paths
  - traits

## .example

```yaml
slug: ehmpathy
readme: readme.md
roles:
  - slug: mechanic
    name: Mechanic
    purpose: fix things
    readme: roles/mechanic/readme.md
    briefs:
      dirs: roles/mechanic/briefs
    skills:
      dirs: roles/mechanic/skills
      refs: []
    traits: []
```
