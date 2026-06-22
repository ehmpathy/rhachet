# self-review: has-questioned-requirements

## requirement 1: "SessionStart hooks are ineligible for cache"

**who said this?** a peer bot, flagged as unverified

**evidence?** verified via claude code docs. hooks stdout lands after dynamic content (cwd, env, git status). prefix cache requires identical prefix bytes.

**what if we didn't do this?** continue full price for briefs every turn. but...

**issue found**: the claim conflates two benefits:
- **cross-session cache**: sessions share cached prefix (only if same repo + same boot content)
- **within-session cache**: each turn benefits from cached prefix (this works regardless)

the peer bot emphasized cross-session savings across "20 parallel sessions." but if those are different repos, the prefix differs anyway (different CLAUDE.md, different rules/). 

**fix applied**: updated vision day-in-the-life section to clarify:
- within-session cache is the primary win (every turn after the first)
- cross-session cache only applies to sessions in the SAME repo with the SAME boot content
- changed "20 sessions across different repos" narrative to focus on within-session benefit

---

## requirement 2: "60k tokens at $0.90 full / $0.09 cached"

**who said this?** peer bot calculation

**evidence?** math checks out for Opus 4.5 at $15/1M input:
- 60k tokens × $15/1M = $0.90 (full)
- 60k tokens × $1.50/1M = $0.09 (cached at 10% rate)

**what if we didn't do this?** n/a - this is just price math

**why it holds**: the math is verifiable against public anthropic API docs. Opus 4.5 input tokens are $15/1M uncached, $1.50/1M cached. the 10x savings ratio is accurate. no change needed.

---

## requirement 3: "Support scoped configs via CLAUDE_CONFIG_DIR"

**who said this?** implied by wish for different role combos per config

**evidence?** NOT VERIFIED. the vision assumes `CLAUDE_CONFIG_DIR` controls which rules/ directory claude reads from.

**what if we didn't?** all enrolled sessions would share the same boot.md

**issue found**: this is an assumption without verification. claude code might not support custom config directories, or might handle them differently than assumed.

**fix**: moved to "must research externally" section. added explicit note that scoped config behavior is unverified.

---

## requirement 4: "Generate boot.md at enroll/init time"

**who said this?** natural consequence of the solution

**evidence?** makes sense—enroll already generates settings.json

**what if we didn't?** could generate at session start via hook. but then we're back to hooks, and boot content would be dynamic again (if role set varies).

**simpler way?** could require manual creation of boot.md. but that defeats automation.

**why it holds**: generation at enroll time is the right pattern because:
1. enroll already generates settings.json—boot.md is a natural companion artifact
2. the role set is known at enroll time, so content can be pre-computed
3. alternatives (generate at session start, manual creation) either revert to dynamic hooks or break automation
4. fits enroll's documented role as "prepare this config for use"

---

## requirement 5: "Keep hooks for dynamic content"

**who said this?** my assumption in the vision

**evidence?** some SessionStart hooks are truly dynamic (route.drive, behavior guards)

**what if we didn't?** lose ability to inject dynamic context

**issue found**: the vision doesn't address which hooks stay and which go. the current SessionStart hook that echoes briefs must be REMOVED (or neutered), not just supplemented with boot.md. otherwise we'd have duplicate content.

**fix applied**: updated vision usecases table to clarify:
- brief-echo hook (`rhachet roles boot`) is REPLACED by boot.md generation, not supplemented
- added explicit note: "other hooks (route.drive, behavior guards, etc.) remain"
- changed "writes hooks + generates boot.md" to "removes brief-echo hook, generates boot.md"

---

## requirement 6: "60k tokens fits in rules/"

**who said this?** implicit assumption

**evidence?** docs say CLAUDE.md has 200-line limit. rules/ files have no documented limit.

**what if we didn't address this?** might hit undocumented limits

**issue found**: 60k tokens ≈ 3000+ lines. if rules/ has same 200-line limit as CLAUDE.md, boot.md wouldn't work.

**fix**: already in "must research externally" but elevated priority. this is a blocker if limits exist.

---

## requirement 7: "boot.md in .claude/rules/"

**who said this?** proposed solution

**evidence?** rules/ is documented as auto-loaded instruction location

**simpler way?** could use CLAUDE.md directly. but CLAUDE.md is typically user-authored project instructions, not generated content.

**why it holds**: rules/ is the right location because:
1. rules/ is documented as auto-loaded instruction location in claude code
2. rules/ files land in positions 1-7 (cacheable zone) per prompt assembly order
3. keeps user-authored CLAUDE.md clean—generated content doesn't pollute project docs
4. allows multiple .md files in rules/ for modular organization
5. CLAUDE.md is typically gitignored; rules/ can be gitignored or tracked per team preference

---

## requirement 8: "this problem is worth solving"

**who said this?** implicit—we assumed the problem is real and significant

**evidence?** the wish says "we heard reports" from a "peer bot" with claims to "take with grains of salt; unverified." we verified the TECHNICAL claim (hooks land after dynamic content), but...

**what if we didn't do this?** keep current architecture. accept cache misses.

**issue found**: we haven't verified the BUSINESS claim. the wish says "$200/day" spending, but:
- is that accurate?
- how much of that is briefs vs conversation?
- what's the actual cache hit rate today?

**simpler ways?**
1. reduce brief size from 60k to 10k tokens (minification, lazy load)
2. use `.min` briefs more aggressively
3. load briefs on-demand via tool calls instead of upfront

**why it still holds**: even if the exact numbers are wrong, the principle is sound—static content in the cacheable zone is cheaper than dynamic content. the implementation cost is low (enroll generates one more file), and the benefit scales with usage.

**action**: added "measure current cache hit rate" to must-research list. if cache is already hitting well, this is lower priority.

---

## requirement 9: "we need scoped configs at all"

**who said this?** the wish mentions `-drive = all default roles except driver`

**evidence?** the current enroll system supports per-config role sets via settings.json

**what if we didn't?** single boot.md with all roles. simpler, but heavier sessions.

**issue found**: the wish asks for scoped configs, but is this essential? could we:
- load all roles everywhere and rely on each role being small?
- use lazy loading (refs instead of says) to reduce upfront size?

**why it still holds**: the wish explicitly requests `-drive` mode that excludes driver. this is a real use case—driver roles have different briefs than non-driver roles. supporting this is necessary, not nice-to-have.

---

## requirement 10: "use rules/ instead of CLAUDE.md"

**who said this?** proposed solution in the vision

**evidence?** rules/ is documented, CLAUDE.md is documented. both land in cacheable zone.

**simpler way?** just append to CLAUDE.md. one file, no rules/ directory needed.

**what if we used CLAUDE.md instead?**
- pros: simpler, no rules/ directory, one file to manage
- cons: CLAUDE.md is typically user-authored, mixes generated + manual content, 200-line limit noted in docs

**why rules/ holds**: 
1. separation of concerns—generated content in rules/, user content in CLAUDE.md
2. rules/ can have multiple files—if we later split briefs by role, each can be its own file
3. the 200-line limit applies to CLAUDE.md per docs; rules/ may not have this limit

but wait—if rules/ ALSO has a 200-line limit, this whole approach fails. this is the blocker identified in requirement 6.

**action**: research rules/ size limits BEFORE committing to this approach.

---

## summary

| requirement | status | action |
|-------------|--------|--------|
| hooks ineligible for cache | holds | verified via prompt assembly order |
| cost math ($0.90 → $0.09) | holds | verified against anthropic API docs |
| scoped configs via CLAUDE_CONFIG_DIR | **unverified** | research needed |
| generate at enroll time | holds | correct pattern |
| keep hooks for dynamic | holds, with fix | clarify which hooks stay vs go |
| 60k tokens fits in rules/ | **unverified** | research needed - **potential blocker** |
| boot.md in rules/ | holds | correct location, but depends on #6 |
| problem is worth solving | holds, with caveat | measure current cache rate first |
| scoped configs needed | holds | wish explicitly requests `-drive` mode |
| use rules/ over CLAUDE.md | holds, but risky | depends on rules/ size limits |

**key clarifications made**:
1. cross-session cache only within same repo + same boot content
2. brief-echo hook is REPLACED, not supplemented
3. scoped config behavior is assumed, not verified
4. rules/ size limit is unknown and could be a **blocker**
5. business case ($200/day savings) is assumed, not measured

**blockers to verify before proceeding**:
1. verify rules/ file size limits (if 200-line limit applies, entire approach fails)
2. measure current cache hit rate (if already high, lower priority)
3. verify CLAUDE_CONFIG_DIR behavior for scoped configs
