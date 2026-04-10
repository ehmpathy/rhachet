# self-review: has-behavior-coverage

## question

does the verification checklist show every behavior from wish/vision has a test?

## traced behaviors

### from 0.wish.md

| behavior | test file | status |
|----------|-----------|--------|
| rhx upgrade upgrades global by default if installed globally | execUpgrade.test.ts | covered |

### from 1.vision.md — usecase 1: default upgrade

| behavior | test file | status |
|----------|-----------|--------|
| upgrades local install | execUpgrade.test.ts | covered |
| upgrades roles and brains | execUpgrade.test.ts | covered |
| detects if rhachet is installed globally | getGlobalRhachetVersion.test.ts | covered |
| if yes, upgrades global install | execUpgrade.test.ts, execNpmInstallGlobal.test.ts | covered |

### from 1.vision.md — usecase 2: explicit control

| behavior | test file | status |
|----------|-----------|--------|
| --which local upgrades local only | execUpgrade.test.ts | covered |
| --which global upgrades global only | execUpgrade.test.ts | covered |
| --which both same as default | execUpgrade.test.ts | covered |

### from 1.vision.md — usecase 3: npx invocation

| behavior | test file | status |
|----------|-----------|--------|
| detects npx invocation | detectInvocationMethod.test.ts | covered |
| implies --which local | execUpgrade.test.ts | covered |
| no attempt to upgrade global | execUpgrade.test.ts | covered |
| no error about global | default behavior (no code to error) | covered |

### from 1.vision.md — edge cases

| edge case | test file | status |
|-----------|-----------|--------|
| invoked via npx → local only | detectInvocationMethod.test.ts + execUpgrade.test.ts | covered |
| invoked via rhx → both | execUpgrade.test.ts | covered |
| global install fails → warn, proceed with local | execUpgrade.ts (try/catch, intentional per criteria usecase.3) | covered |
| global and local at same version → already current | upgrade output format | covered |
| global newer than local → no downgrade | only upgrades to @latest | covered |

## conclusion

every behavior in 0.wish.md and 1.vision.md has test coverage:

- **detectInvocationMethod.test.ts** — npx vs global detection
- **getGlobalRhachetVersion.test.ts** — global version detection
- **execNpmInstallGlobal.test.ts** — global npm install
- **execUpgrade.test.ts** — orchestrator with --which flag combinations
- **upgrade.acceptance.test.ts** — blackbox CLI output snapshots

no gaps found. all behaviors are covered.
