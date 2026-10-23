# F10 — the focus rides as a token in `RoleSlug`, not as a `RoleFocus` domain literal

- **the fork:** (a) keep `role::subject` as a token inside `RoleSlug`, and strip it at each
  exact-match site with `asRoleFocusParts`; (b) parse once at the cli boundary into a
  `RoleFocus { role, subjects }` literal, so a hook filter's input type cannot hold a focus
- **taken:** (a), for this pr. the token is what `actor.json`, the identity hash and the
  `prepare:rhachet` replay already persist, so (a) adds no persisted shape and no migration. every
  exact-match site strips the focus, and each has a test that goes red on an unstripped token
  (the hook filter, the unenrolled-hook guard, the re-derive, the link check, the bare-delta check,
  init's link and keyrack paths)
- **why (b) is better and still deferred:** (b) makes the hooks invariant hold by the type system
  rather than by each site's diligence, and it collapses the repeated `{ role, subjects }` bags and
  the twin `isSameFocus`. it is also dirty: it re-types `RoleDelta`, `ActorOndisk.roles` and the
  hook filters, which the clone, actor and upgrade domains read far beyond this wish, plus each
  persisted read and write of a roleset
- **this round closed what (b) would have prevented:** two names for one role
  (`ehmpathy/mechanic::flow`, `mechanic::lean`) now union in `asRoleFocusMap` by the shared
  `isRoleSpecifierMatch`, and typed subject order no longer reaches the render
- **a third option, raised at i005:** (c) derive one `RoleFocusResolved { ref, subjects, spec,
  alwaysShed, elsewhere }` per command, at one choke point, in declaration order; persist tokens
  as today. no retype of `RoleDelta` or `ActorOndisk`, and it removes the three reads of one boot
  spec and the three "ambient = linked + record" compositions. (c) is the preferred shape of the
  dream. the stronger reason to keep tokens: every role sink (both hook filters, and since i005
  the keyrack discovery) strips the focus itself, so no sink depends on its caller
- **rework:** dirty — the re-type ripples through contracts this pr does not otherwise touch
- **confidence:** 60%. the arch lane is right that diligence is the weaker guard; the bet is that
  the tested sites hold until a dedicated pr lands (b)
- **where:** i004 r011 blocker.1 · `.dream/2026_10_22.refactor.a-focus-parses-once-into-a-domain-literal.dream.md`
- **verdict:** —
