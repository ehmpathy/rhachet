# S4 — corpora: the role corpus is static, the adhoc corpus is dynamic

## .holds

- the role corpus binds at enroll. it is static and goes to `boot.md`.
- the adhoc (route) corpus binds as the route advances. it stays on the adhoc hook, appended to the conversation.
- the adhoc corpus takes the budget gate (candidate A), built on the peer branch `beav/feat-boot-manifest-and-budget`.
- past the cap, the adhoc hook emits a manifest header first, so every brief path survives truncation.
- a per-file emit is a dream.

## .said

> those role boots are bound at clone enrollment, so those fit naturally into the static prefix. the behavior or adhoc boot yamls change as the route progresses on purpose though, so those are more dynamic
>
> to ensure they dont bust the cache - but also dont get truncated by hooks. thats a core question
>
> behaviors easily go over 10k; let's start with A for now though. that way, folks can write thinner behavior yields
>
> start with a header that just enumerates the boot manifest (refs all) and then says what was asked for too … the most important is the role boots, the adhoc boots can be better supported separately
