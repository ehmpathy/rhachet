## any

a role dir that carries a readme and NO boot.yml.

🔴 it exists so the sweep's empty case is a real repo rather than an empty one. a repo with no
`.agent/` at all would also find zero specs, and it would prove less — that the glob matched
naught. here the role dir IS present and the spec is not, which is the shape a human actually
hits: they linked a role, or scaffolded one, and never wrote a `boot.yml`.
