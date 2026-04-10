# self-review: has-questioned-assumptions

## assumption 1: global installs are common

**what we assumed:** users who type `rhx` typically have it installed globally

**evidence for:** the wish exists — someone experienced this pain. wisher types `rhx` and wanted it upgraded.

**evidence against:** npx is popular. many developers prefer `npx rhachet` to avoid global pollution.

**what if opposite were true?** if most users use npx, the global upgrade logic is wasted code. but the conditional "if installed globally" means we only pay the cost when relevant.

**did wisher say this?** no. wisher said "if installed globally" — they're aware it's conditional.

**verdict:** assumption is safe. the "if" clause protects us. we don't assume ALL users have global, just that SOME do (and the wisher is one of them).

**why it holds:** the conditional "if installed globally" is the key protection. we're not asserting that global installs are the majority — we're asserting they exist and deserve first-class support. the npx user loses no functionality (global upgrade is skipped silently). the global user gains automatic upgrade. this is pareto-positive: some users gain, no users lose.

---

## assumption 2: npm global detection is reliable

**what we assumed:** we can detect global install via `npm list -g rhachet` or similar

**evidence for:** npm has standard global prefix discovery (`npm prefix -g`)

**evidence against:**
- nvm: multiple node versions = multiple global prefixes
- volta: manages global differently
- homebrew: installs to /usr/local, not npm prefix
- pnpm: different global location

**what if opposite were true?** detection would be flaky. users would get inconsistent behavior.

**did wisher say this?** no. wisher assumed we could detect. this is a technical gap.

**verdict:** issue found. we can only reliably detect npm global installs. other package managers (volta, homebrew) should be out of scope for MVP.

**fix:** clarified in vision that we detect npm global only. other package managers are future scope.

---

## assumption 3: users want global and local in sync

**what we assumed:** version drift is bad; consistency is good

**evidence for:** wisher's pain point IS version drift. the wish explicitly targets this.

**evidence against:** some users intentionally pin older versions for compatibility. they may want project A on v1.38 and project B on v1.39.

**what if opposite were true?** global upgrade would overwrite their intentional choice.

**did wisher say this?** wisher said "by default" — implies escape hatch is acceptable.

**verdict:** assumption holds for default case. users who want isolation can use `--no-global`.

**why it holds:** the wish explicitly calls out version drift as the pain. wisher WANTS sync. the "by default" phrasing acknowledges that some users may not want it — hence the escape hatch. this is the standard pattern: good default + escape hatch for edge cases.

---

## assumption 4: upgrade order should be global first, then local

**what we assumed:** upgrade global before local (line 54 in vision: "upgrades global install first")

**evidence for:** none stated. i made this up.

**evidence against:**
- if global upgrade fails halfway, user is in inconsistent state
- local upgrade is the core behavior — should succeed even if global fails

**what if opposite were true?** local first means extant behavior completes, then global is additive.

**did wisher say this?** no. wisher said "also upgrade global" — order not specified.

**verdict:** issue found. local first is safer. global upgrade should be additive, not a blocker.

**fix:** changed order in vision to: local first, then global (if installed).

---

## assumption 5: --self flag now means global+local

**what we assumed:** --self should upgrade both global and local (implicit)

**evidence for:** wish says "by default" which applies to default behavior (no flags)

**evidence against:** `--self` has extant definition: "upgrade rhachet in this project". change would break extant users.

**what if opposite were true?** `--self` stays local-only, default behavior adds global.

**did wisher say this?** wisher said "by default" — applies to default, not to `--self`.

**verdict:** issue found. `--self` should retain its extant definition (local only). global upgrade is added to DEFAULT behavior only.

**fix:** clarified in vision that `--self` remains local-only. global upgrade is part of default behavior, not tied to `--self`.

---

## assumption 6: users have one global install

**what we assumed:** there's one global rhachet to upgrade

**evidence for:** most npm setups have one global prefix

**evidence against:** nvm users have one global per node version. the "global" is ambiguous.

**what if opposite were true?** we'd need to detect WHICH global to upgrade. complexity explodes.

**did wisher say this?** wisher said "if installed globally" (singular).

**verdict:** assumption holds. nvm edge case is out of scope. we upgrade the global that corresponds to the current node/npm in PATH.

**why it holds:** the wisher used singular "if installed globally" — they're thinking of one global, not many. nvm users who switch node versions are power users who understand they have separate global namespaces. for them, "the global" means "the global for my current node version" — which is exactly what we upgrade. this matches their mental model.

---

## assumption 7: network cost is acceptable

**what we assumed:** two fetches (global + local) is fine

**evidence for:** convenience > speed for occasional upgrade command

**evidence against:** slow networks, metered connections, CI environments

**what if opposite were true?** users would be frustrated by slow upgrades

**did wisher say this?** no. implied by the "longer upgrade time" con we accepted.

**verdict:** assumption holds. upgrade is infrequent enough that 2x network is acceptable. could optimize later with package cache.

**why it holds:** upgrade is a conscious, deliberate action — users run it when they want updates, not on every command. if someone runs `rhx upgrade`, they expect it to take a moment. 2x network is still under 30 seconds total. CI environments that care about speed can use `--no-global`. the tradeoff (slower upgrade for simpler mental model) is worth it.

---

## summary

| assumption | verdict | action |
|------------|---------|--------|
| global installs are common | holds | conditional protects us |
| npm detection is reliable | partially holds | scope to npm only |
| sync is desired | holds | escape hatch exists |
| global first order | issue | changed to local first |
| --self now means global+local | issue | --self stays local-only |
| one global install | holds | use current PATH's npm |
| network cost acceptable | holds | infrequent operation |

## updates to vision

1. clarified: npm global only (volta/homebrew out of scope)
2. changed: order is local first, then global (safer)
3. clarified: `--self` stays local-only; global is default behavior addition
