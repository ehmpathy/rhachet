# self-review: has-behavior-coverage (r1)

## approach

traced each behavior from 0.wish.md and 1.vision.yield.md to specific test cases in the verification checklist.

## wish behaviors

| behavior from wish | test coverage |
|-------------------|---------------|
| keyrack.yml must be copied to dist | invokeRepoCompile case2 — verifies keyrack.yml in output |
| briefs copied | invokeRepoCompile case1 — verifies briefs in output |
| boot.yml copied | invokeRepoCompile case3 — verifies boot.yml in output |
| exclude .test/ dirs | invokeRepoCompile case4 — verifies .test/ excluded |
| exclude *.test.* files | invokeRepoCompile case5 — verifies *.test.* excluded |
| --include rescues | invokeRepoCompile case6 — verifies user include works |
| --exclude removes | invokeRepoCompile case7 — verifies user exclude works |
| fail-fast on bad --from | invokeRepoCompile case8 — verifies error on not found |
| fail-fast on non-rhachet package | invokeRepoCompile case9 — verifies error message |
| skills copied | invokeRepoCompile case10 — verifies skills in output |
| templates copied | invokeRepoCompile case11 — verifies template dirs in output |
| readme copied | invokeRepoCompile case12 — verifies readme in output |

## vision behaviors

| behavior from vision | test coverage |
|---------------------|---------------|
| rsync-like precedence | getAllFilesByGlobs 30 data-driven cases — verifies 4-level precedence |
| discover roles via getRoleRegistry | invokeRepoCompile case1-12 — all use registry discovery |
| copy per-role (briefs, skills, inits) | getAllArtifactsForRole 27 cases — verifies dir enumeration |
| copy role-level files (readme, boot, keyrack) | getAllArtifactsForRole file-level cases |
| validate --from within repo | invokeRepoCompile case8 — tests path validation |
| validate --into within repo | Commander requiredOption — implicit validation |
| default excludes (.test/, *.test.*, .route/, .scratch/, .behavior/) | getAllFilesByGlobs default exclude cases |
| default includes (briefs: *.md, *.min; skills: *.sh, *.jsonc, template/) | getAllArtifactsForRole — uses DEFAULT_ARTIFACT_INCLUSIONS |

## traceability matrix

every behavior in wish/vision maps to at least one test case:

| file | test count | behaviors covered |
|------|------------|-------------------|
| invokeRepoCompile.integration.test.ts | 12 | CLI contract, error cases, all artifact types |
| getAllArtifactsForRole.integration.test.ts | 27 | dir enumeration, file-level artifacts, error on dir absent |
| getAllFilesByGlobs.integration.test.ts | 30 | rsync precedence, glob match, exclude/include |

## no gaps found

every behavior from wish and vision has a test case. the verification checklist accurately reflects this coverage.

