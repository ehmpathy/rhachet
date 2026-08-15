# radio dispatch — queued

## route

- **via:** os.fileops (radio/gh.issues blocked for now — enqueue as a file, promote to gh.issues later)
- **into:** rhachet-roles-ghlitch
- **role:** hardener (the role to rename)
- **kind:** refactor → rename
- **status:** QUEUED
- **origin:** ehmpathy/rhachet `enroll-with-interface` 1.vision drive (2026-08-07)

## title

rename the `hardener` role to `guardian`

## description

### the ask

rename the ghlitch security role from **`hardener`** to **`guardian`** — the full role slug, its
directory (`role=hardener` → `role=guardian`), briefs, skills, registry entry, and readme mentions.

### the why

`guardian` reads truer to the role's purpose than `hardener`. the role "reviews for security
vulnerabilities and hardens systems — audits code, identifies weaknesses, fortifies defenses"
(rhachet-roles-ghlitch readme). that is a **guardian**: one who watches over and defends. `hardener`
names one mechanism, whereas `guardian` names the actor and its intent — it composes into an actor
identity cleanly (`@ghlitch/guardian`), which is how it is referenced downstream.

the ehmpathy/rhachet `enroll-with-interface` behavior already documents a worked experience that
enrolls `@ghlitch/guardian` as a redteamer (the "redteam fan-out" experience inventory case). that doc
assumes the `guardian` slug; this rename makes it real.

### scope

- `role=hardener/` → `role=guardian/` (dir + all contents)
- role slug in the registry / readme (🛡️ hardener → 🛡️ guardian)
- any brief/skill that names `hardener` internally
- keep the 🛡️ shield emblem — the cat still wields the shield; only the role word changes

### evidence

- rhachet-roles-ghlitch readme → "### 🛡️ hardener … used to review for security vulnerabilities and
  harden systems — audits code, identifies weaknesses, and fortifies defenses."
- downstream reference: ehmpathy/rhachet
  `.agent/repo=.this/role=user/briefs/actors/inventory.of=experience.case=2.redteam-fan-out.md`
  (`@ghlitch/guardian`).
