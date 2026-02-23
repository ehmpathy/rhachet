# rule.require.fixture-gitignore-negation

## .what

test fixtures that need `node_modules/` tracked must use a local `.gitignore` with negation pattern in the fixture root directory.

## .why

- **locality** — fixture's track needs declared alongside the fixture
- **isolation** — no pollution of root `.gitignore` with fixture-specific patterns
- **discoverability** — a `.gitignore` in fixture signals special track rules

## .pattern

```
blackbox/.test/assets/my-fixture/
  .gitignore              # negation pattern here
  node_modules/           # now trackable
    rhachet-roles-foo/
      rhachet.repo.yml    # gets committed
  package.json
```

**.gitignore content:**
```gitignore
# track node_modules for this test fixture
!node_modules/
```

## .how it works

git processes `.gitignore` files hierarchically:
1. root `.gitignore` has `node_modules` — ignores all node_modules
2. fixture `.gitignore` has `!node_modules/` — negates for this directory
3. files inside `node_modules/` become trackable

## .antipattern

patterns added to root `.gitignore`:

```gitignore
# 👎 bad — pollutes root with fixture-specific patterns
node_modules
!blackbox/.test/**/node_modules
!blackbox/.test/**/node_modules/**
```

this approach:
- scatters fixture concerns across the repo
- requires root update when new fixtures added
- makes it unclear which fixtures have special track rules

## .when

use this pattern when:
- fixture simulates an installed `rhachet-roles-*` package
- fixture needs `node_modules/` contents committed for CI
- fixture has a `package.json` with file: dependencies

## .enforcement

- fixture with untracked `node_modules/` that CI needs = blocker
- root `.gitignore` with fixture-specific negation patterns = nitpick
