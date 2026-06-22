# self-review: has-questioned-assumptions

## assumption 1: prompt assembly order is stable

**what do we assume?** claude code's prompt assembly order (positions 1-23) will remain stable.

**evidence?** dbreunig's blog post documents current order. no anthropic guarantees.

**what if the opposite were true?** if anthropic changes prompt assembly, rules/ content could move after dynamic content, negates our cache strategy.

**did the wisher say this?** no. we inferred stability from current behavior.

**why it holds, with caveat**: prompt assembly order is an implementation detail, but it's unlikely to change dramatically since it would break current CLAUDE.md workflows. anthropic has strong backwards-compat incentives. however, we should document this as a dependency.

**action**: added note in vision that this depends on claude code prompt assembly order stability.

---

## assumption 2: cache is shared across sessions with identical prefix

**what do we assume?** anthropic's cache key is based on content hash, not session ID.

**evidence?** anthropic docs describe prefix-based cache. no mention of per-session isolation.

**what if the opposite were true?** if cache is per-session, cross-session savings disappear. within-session savings remain.

**did the wisher say this?** yes, the peer bot claimed cross-session cache works.

**why it holds**: the vision already clarified that within-session cache is the primary win. cross-session is bonus. if cache is per-session, we still benefit within each session.

---

## assumption 3: rules/ files don't have size limits

**what do we assume?** rules/ can hold 60k tokens (3000+ lines) without truncation.

**evidence?** no explicit documentation. CLAUDE.md has 200-line limit. rules/ limit unknown.

**what if the opposite were true?** entire approach fails. boot.md would be truncated, briefs incomplete.

**did the wisher say this?** no. we assumed rules/ = CLAUDE.md behavior.

**this is a blocker**: flagged in previous review. must verify before implementation.

---

## assumption 4: 60k tokens is the actual brief size

**what do we assume?** current hook output is ~60k tokens.

**evidence?** mentioned in wish, but not measured.

**what if the opposite were true?** if briefs are 10k tokens, savings are proportionally smaller but still valid. if briefs are 200k tokens, rules/ limit becomes even more critical.

**did the wisher say this?** yes, peer bot claimed 60k.

**action**: measure actual brief size via `rhx roles boot --role mechanic | wc -c` and token estimation.

---

## assumption 5: enroll is the right time to generate boot.md

**what do we assume?** boot.md should be generated at enroll time.

**evidence?** enroll already generates settings.json. natural pairing.

**what if init were better?** init links roles; could also generate boot.md. but init doesn't know about scoped configs.

**what if session start were better?** returns us to hooks, negates cache benefit.

**why enroll holds**: enroll is the moment when the full role set is known AND the config scope is known. init doesn't have config scope; session start is too late.

---

## assumption 6: users will re-enroll when roles change

**what do we assume?** users will remember to run `rhx enroll` after modifying linked roles.

**evidence?** hope, not evidence. users forget.

**what if the opposite were true?** boot.md becomes stale. session loads old briefs. confusion.

**did the wisher say this?** no. this is our failure mode.

**action**: vision already mentions "freshness check" hook that compares boot.md hash vs current roles. this mitigation is essential, not optional.

---

## assumption 7: other hooks won't interfere with cache

**what do we assume?** removing the brief-echo hook while keeping other hooks (route.drive, guards) won't break cache.

**evidence?** if other hooks output dynamic content, that content lands at position 23 too.

**what if the opposite were true?** other dynamic hook output could still break cache prefix... but wait, hook output is AFTER the cache boundary. so hook output doesn't affect prefix cache at all. it affects whether hook OUTPUT is cached, not whether RULES content is cached.

**why it holds**: we're not trying to cache hook output. we're trying to cache rules/ content. other hooks can remain dynamic; they don't affect rules/ cache.

---

## assumption 8: backwards compatibility is maintained

**what do we assume?** this change is backwards compatible with current rhachet users.

**evidence?** enroll generates an additional file. doesn't remove files. settings.json still works.

**what if the opposite were true?** users who don't re-enroll would have old settings.json without boot.md. sessions would load no briefs (since hook removed but boot.md absent).

**this is a migration issue**: first enroll after upgrade must generate boot.md. if user has old settings.json from pre-upgrade, they need to re-enroll.

**action**: add migration note—users must re-enroll after upgrading to brain-boot-adapter version.

---

## assumption 9: CLAUDE_CONFIG_DIR controls rules/ path

**what do we assume?** `CLAUDE_CONFIG_DIR=/path/.claude claude` causes claude to read rules/ from that path.

**evidence?** none verified. inferred from naming convention.

**what if the opposite were true?** scoped configs don't work as envisioned. all sessions share one boot.md.

**did the wisher say this?** implied but not verified.

**this is unverified**: flagged in previous review. research needed.

---

## assumption 10: boot.md name convention is correct

**what do we assume?** `boot.md` or `boot.enroll.$hash.md` is the right name.

**evidence?** we made it up. no convention yet.

**what if a different name were better?** e.g., `briefs.md`, `roles.md`, `rhachet.md`

**why boot.md holds**: "boot" aligns with "brain boots adapter" terminology. clear that this is startup content. but naming is bikeshed territory—works for now.

---

## summary

| assumption | status | action |
|------------|--------|--------|
| prompt assembly order stable | holds, with caveat | document dependency |
| cache shared across sessions | holds | already clarified primary = within-session |
| rules/ no size limits | **unverified blocker** | must research |
| 60k tokens actual size | assumed | measure |
| enroll is right time | holds | correct pattern |
| users will re-enroll | risky | freshness check hook essential |
| other hooks don't interfere | holds | hooks don't affect rules/ cache |
| backwards compatible | mostly | migration note needed |
| CLAUDE_CONFIG_DIR controls rules/ | **unverified** | research needed |
| boot.md name | holds | reasonable default |

**hidden assumptions surfaced**:
1. anthropic prompt assembly order stability (undocumented dependency)
2. users will re-enroll (risky—freshness check is essential mitigation)
3. backwards compat requires migration (re-enroll after upgrade)
