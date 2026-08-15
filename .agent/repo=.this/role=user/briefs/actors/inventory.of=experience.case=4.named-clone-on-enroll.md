# experience: name the clone on enroll — the actor stays anonymous 🐢

part of the [experience inventory](./inventory.of=experience._.md).

you do **not** need an `actors.yml` entry to earn a friendly handle you can reach later. plain
`rhx enroll` is **hash-only** — it spawns an **anonymous** actor (`actor.via.hash`) — but its one
assignment flag, `--as @:<slug>`, names the **clone**. so the clone gets a slug you can `say`/`get` by,
while the actor behind it stays anonymous. name the clone, not the actor:

```bash
# enroll a mechanic clone and name it @:driver — the actor is still anonymous (via hash)
rhx enroll claude --roles mechanic --as @:driver
#                                   └ names the CLONE @:driver; the actor = actor.via.hash=9c1e…
```

`@:driver` opens as usual — the human sees claude, works, walks away. later, a cron (or the human, from a
different shell) reaches that same clone by its friendly handle, no keyboard needed:

```bash
rhx clone say @:driver --what 'commit your WIP before you log off'
rhx clone get @:driver --tail 40
```

the handle and the serial address the **same** clone — reach it by either:

```bash
rhx clone list
#   └─ serial=7f3a…  as=@:driver  brain=claude  roles=mechanic  state=LIVE
rhx clone get @:7f3a…          # by serial — same clone as @:driver
```

now the edge that makes this click — **two grains, two names:**

- **the clone earns a slug; the actor does not.** `--as @:driver` is the clone's handle. the actor behind
  it has **no** slug — it is `actor.via.hash=$hash`, keyed by `genEnrollmentHash({brain, roles})`. enroll
  never reads `actors.yml`, so it mints no `@<slug>` actor. a friendly *clone* name does not promote the
  actor out of the hash namespace.
- **`@:` is the clone; `@` is the actor.** `--as` always takes the `@:` clone form (the `@:` prefix is
  mandatory — see [`define.address-sigils.md`](./define.address-sigils.md)). there is no enroll flag that
  writes an `@` actor; the slug/`actors.yml` surface belongs to `rhx clone`.
- **why name the clone at all?** without `--as`, the clone still exists — it just gets an auto-serial
  (`@:7f3a…`) you must look up in `rhx clone list`. `--as @:driver` gives a **stable, memorable** handle a
  cron or comms handler can hardcode, so the reach flow reads clean.
- **same roles → same anonymous actor.** enroll `claude --roles mechanic` twice, name the clones `@:driver`
  and `@:reviewer`: both clones share the one `actor.via.hash=9c1e…` config (same hash), so they stay in
  sync — two named clones, one anonymous recipe. a different roleset (`-driver`) hashes apart into a
  distinct anonymous actor, no clobber.

cowabunga — a named clone to reach, no manifest required 🐢🌊
