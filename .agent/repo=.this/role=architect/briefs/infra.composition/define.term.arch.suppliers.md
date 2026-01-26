# suppliers

## .what

suppliers supply resources which fulfill domain-specific behavior and leverage rhachet for isomorphic and uniform dispatch.

similar to what terraform calls "providers", suppliers provide resources that adhere to the rhachet contract. the rhachet framework dispatches caller invocations across the supplied resources that are configured (implicitly via dependencies, or explicitly via config).

## .types

### role suppliers

role suppliers supply roles for use with rhachet.

they supply:
- **RoleRegistries** (a.k.a. RoleRepos) — sets of roles that can be enrolled and dispatched

each Role can declare `Role.hooks.{ onDispatch, onBrain }`:
- **Role.hooks.onDispatch** — middleware over rhachet dispatch actions (e.g., transform skill inputs, observe skill outputs)
- **Role.hooks.onBrain** — middleware over brain actions (e.g., onBoot, onTool, onStop), applied via BrainHooksAdapters

examples:
- `rhachet-roles-ehmpathy` — supplies mechanic, designer, etc
- `rhachet-roles-bhuild` — supplies behaver, etc

### brain suppliers

brain suppliers supply brains for use with rhachet.

they supply:
- **BrainRegistries** (a.k.a. BrainRepos) — sets of BrainRepls and BrainAtoms that can be used for thought
- **BrainHooksAdapters** — adapters that translate `Role.hooks.onBrain` declarations into the contract of whatever brain is in use

the BrainHooksAdapters enable `Role.hooks.onBrain` to work across different brain repls. for example, a role can declare `onBoot` hooks once, and the adapter translates them to `SessionStart` for claude-code or equivalent for other brains.

examples:
- `rhachet-brains-anthropic` — supplies claude-code brain repl, claude api brain atom, and claude-code hooks adapter

## .discovery

suppliers are discovered:
- **implicitly** — via package.json dependencies that match naming convention (e.g., `rhachet-roles-*`, `rhachet-brains-*`)
- **explicitly** — via config declaration in rhachet.use.ts or yaml (future)

## .contract

each supplier type has a specific contract:
- role suppliers export `getRoleRegistry()` — returns roles, each with optional `Role.hooks.{ onDispatch, onBrain }`
- brain suppliers export `getBrainRegistries()` and optionally `getBrainHooks({ slug })` for hook adapters

the rhachet framework calls these exports to discover and compose the supplied resources.

## .why

suppliers enable:
- **modularity** — roles and brains are packaged separately from rhachet core
- **extensibility** — new suppliers can be added without changing rhachet
- **composability** — multiple suppliers can be combined in a single project
- **isolation** — supplier-specific details are encapsulated behind contracts
