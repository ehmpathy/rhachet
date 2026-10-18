# F2 — a member org on a sweep re-slugs the declared keys

**the fork** — on a sweep (`unlock`, `status`, `list`, `get --for repo`) `--org` is a FILTER over slugs built from `manifest.org`. under a list, `--org aether` would filter `ahbode.*` and yield zero rows. (a) leave the filter as-is — a member sweep is empty · (b) a member value re-slugs the declared keys under that member, then sweeps · (c) a bare sweep covers every member.

**taken** — (b). (a) gives one flag two answers by verb: a member works keyed, reads empty swept (`rule.forbid.surprises`). (c) breaks case=1: a bare `unlock` would prompt for, and `fill`-strict on, orgs the human never named. (b) keeps the bare sweep single-org — the invariant `invokeKeyrack.ts:656` says the `@this` default rests on — and gives a named member its full set.

**rework** — clean. one branch where the filter org is a non-default member; specs carry by declaration.

**confidence** — 75%. the wish names only keyed reads; the sweep sense is inferred.

**where** — `case=4`.

**verdict** — open.
