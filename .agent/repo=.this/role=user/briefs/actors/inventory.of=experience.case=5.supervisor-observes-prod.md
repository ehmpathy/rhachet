# experience: the supervisor beaver learns to watch prod 🦫🔭

part of the [experience inventory](./inventory.of=experience._.md).

you run `@bhuild/supervisor` — a supervisor beaver shipped by the `bhuild` supplier that keeps the build
crew on track. prod just got noisy, and you want that same supervisor to ALSO watch prod, right now — no
new actor to formalize in `actors.yml` first. so you **extend it ad-hoc** with an `+observer` role from
the `ghlitch` supplier:

```bash
rhx clone @bhuild/supervisor +ghlitch/observer --say 'keep the build crew on track, AND watch prod — surface anomalies as they appear'
```

that one command composes a new actor on the fly. because it was composed **ad-hoc** — no slug in
`actors.yml` — it is a **derived actor** identified by delta-hash:
`actor.via.slug=bhuild.supervisor._.delta=$hash`. (the delta-hash form is exactly what you see when an
actor is extended on the fly; a formalized `actors.yml` slug like `@longboarder` gets a name instead.)

what makes it notable — ad-hoc actor extension:

- **extend on the fly** — no `actors.yml` edit; `@bhuild/supervisor +ghlitch/observer` composes a new
  actor in one command, right when the need appears
- **compose across suppliers** — the base is a `bhuild` actor, the added role is `ghlitch`'s, both
  fully-qualified (`@bhuild/supervisor`, `+ghlitch/observer`) so each source is unambiguous
- **the delta-hash identity** — the ad-hoc actor is hash-identified (`bhuild.supervisor._.delta=$hash`),
  deterministic: a repeat of the same extension addresses the same derived actor, so its clones stay in
  sync. the base still tethers — update `@bhuild/supervisor` and this extension inherits it,
  `+observer` still on top.
- **two roles at once** — one clone now supervises the build crew AND watches prod; its brain is
  enrolled in both roles, no context switch

🦫 when the combo proves its worth, give it a slug in `actors.yml` and it earns a name — until then,
ad-hoc + delta-hash carries it.
