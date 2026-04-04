# self-review: behavior-declaration-coverage (r4)

## vision requirements

from vision:
> the slug **is** the source of truth for org. when the manifest says `rhight.prod.USPTO_ODP_API_KEY`, that's where it should be stored and retrieved.

**status:** implemented. `asKeyrackKeyOrg({ slug })` extracts org from slug.

from vision (usecase):
> when user runs `rhx keyrack fill --env prod` in ahbode/svc-verifications:
> | key | declared in | stored under | looked up under |
> |-----|-------------|--------------|-----------------|
> | AWS_PROFILE | ahbode (root) | ahbode.prod.AWS_PROFILE | ahbode.prod.AWS_PROFILE |
> | USPTO_ODP_API_KEY | rhight (extended) | rhight.prod.USPTO_ODP_API_KEY | rhight.prod.USPTO_ODP_API_KEY |

**status:** implemented. integration test [case8] verifies both scenarios:
- `ahbode.prod.DB_PASSWORD` stored under ahbode
- `rhight.prod.USPTO_ODP_API_KEY` stored under rhight

## blueprint components

from blueprint filediff tree:
1. `[+] asKeyrackKeyOrg.ts` — done
2. `[+] asKeyrackKeyOrg.test.ts` — done
3. `[~] fillKeyrackKeys.ts` line 257 change — done (now line 258)
4. `[~] fillKeyrackKeys.integration.test.ts` [case8] — done

from blueprint contracts:
- `asKeyrackKeyOrg` signature: `(input: { slug: string }): string` — matches
- jsdoc: `.what` and `.why` — present
- internal change: `org: asKeyrackKeyOrg({ slug })` — done

from blueprint test coverage:
- integration test verifies USPTO_ODP_API_KEY under rhight org — done
- integration test verifies DB_PASSWORD under ahbode org — done

## gaps found

none. all requirements from vision and blueprint are implemented.

## conclusion

all behavior declaration requirements are covered:
- vision outcome: slug is source of truth for org — implemented
- vision usecase: cross-org extends — tested
- blueprint components: all 4 implemented
- blueprint contracts: all signatures match
