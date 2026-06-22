# self-review: has-questioned-questions

## triage of open questions

### question 1: does claude code support custom config paths?

**current status**: need to verify `CLAUDE_CONFIG_DIR` behavior

**can this be answered via logic?** no — implementation detail

**can this be answered via extant docs/code?** possibly — claude code docs or source

**triage**: [research] — requires external doc lookup or experimentation

---

### question 2: what's the max recommended size for rules/ files?

**current status**: docs say 200 lines for CLAUDE.md, unclear for rules/

**can this be answered via logic?** no — anthropic implementation detail

**can this be answered via extant docs/code?** possibly — claude code docs

**triage**: [research] — **potential blocker**. if rules/ has 200-line limit, entire approach fails.

---

### question 3: can we measure cache hit rate programmatically?

**current status**: need to verify `/cost` or debug log

**can this be answered via logic?** no — api/cli detail

**can this be answered via extant docs/code?** yes — the wish already describes options:
- `/cost` command in session
- `CLAUDE_DEBUG=1` for api response details
- anthropic console dashboard

**triage**: [answered] — multiple measurement options exist. use `/cost` for quick check, dashboard for aggregate.

**why this answer holds**: the wish itself documents these options with specific commands. the anthropic console dashboard is a known public interface. `/cost` is a documented claude code command. even if one method fails, we have fallbacks. this is not a blocker.

**issue found**: none. question was well-framed, answer is verifiable.

---

### question 4: should boot.md be gitignored?

**current status**: it's generated, but team might want to review

**can this be answered via logic?** yes — consider tradeoffs:
- gitignore: keeps repo clean, but team can't review briefs
- tracked: team can review, but generated file in git history

**triage**: [answered] — recommend `.gitignore` default with option to track. rationale:
1. boot.md is generated from source-of-truth (role manifests)
2. role manifests are already tracked
3. generated files don't belong in version history
4. teams can opt-in to track if desired

**why this answer holds**: following established conventions for generated files (like node_modules, dist/). the source of truth is role manifests; boot.md is a derived artifact. tracking both creates redundancy and potential drift.

**counterargument considered**: what if compliance requires audit trail of agent instructions? answer: role manifests (the source) provide that audit trail. boot.md is just a concatenation.

**issue found**: none. standard generated-file hygiene applies.

---

### question 5 (new): what's the boot order for cache optimization?

**current status**: user insight — published roles should boot before repo=.this roles

**can this be answered via logic?** yes — prefix cache matches from the start. stable content first = longer cache prefix.

**triage**: [answered] — added to vision under "boot order optimization"

**why this answer holds**: prefix cache matches byte-for-byte from the start. if published roles (stable) come first and local roles (volatile) come second, then:
- when local changes: published prefix remains cached
- when published changes: entire cache invalidates anyway (expected for version updates)

this is optimal because local changes are frequent (daily), published changes are rare (version bumps).

**issue found and fixed**: the original vision didn't address boot order at all. added explicit section based on user insight. this is now a design requirement, not just an optimization.

---

### question 6 (new): how do we handle the 60k token size?

**current status**: assumed, needs measurement

**can this be answered via extant code?** yes — run `rhx roles boot` and count tokens

**triage**: [research] — measure actual brief size before final design. if much smaller than 60k, savings estimates need adjustment. if much larger, rules/ limits are more critical.

---

## updated question triage

| question | status | notes |
|----------|--------|-------|
| CLAUDE_CONFIG_DIR behavior | [research] | doc lookup or experiment |
| rules/ size limits | [research] | **blocker** if limit exists |
| cache hit rate measurement | [answered] | /cost, debug log, dashboard |
| boot.md gitignore | [answered] | recommend gitignore, allow opt-in |
| boot order for cache | [answered] | published roles before repo=.this |
| actual brief size | [research] | measure with rhx roles boot |

## questions for wisher — reconsidered

| question | original reason | on reflection |
|----------|-----------------|---------------|
| 20 sessions / $200 day pattern | validates business case | **demoted** — even at 10% of claimed savings, 90% cost reduction is valuable. business case doesn't depend on exact numbers. |
| keep hooks for dynamic content | determines scope of change | **still needed** — this affects architecture. all-in-on-boot vs hybrid approach. |
| scoped config name convention | bikeshed, but need decision | **demoted** — can default to `boot.enroll.$hash.md` and let users rename. not a blocker. |

**wisher questions reduced to 1**: do we keep hooks for dynamic content, or go all-in on boot.md?

## research questions — priority ranked

| question | priority | rationale |
|----------|----------|-----------|
| rules/ size limits | **P0 blocker** | if 200-line limit applies, entire approach fails. must verify FIRST. |
| CLAUDE_CONFIG_DIR behavior | P1 | scoped configs are a wish requirement. must verify before implementation. |
| actual brief token count | P2 | affects sizing but doesn't block approach. can adjust estimates. |

## next action

research phase should verify in order:
1. **rules/ size limits** — blocker, verify first
2. **CLAUDE_CONFIG_DIR behavior** — required for scoped configs
3. **actual brief token count** — informational, adjust estimates
