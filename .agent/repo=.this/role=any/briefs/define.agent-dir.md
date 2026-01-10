# .agent/ directory

humans have brains. robots have brains. who would have thought they'd need the same briefs and skills to work well?

the `.agent/` directory is that shared source of truth. robots get their briefs and skills from here. so can humans.

browse the same briefs they get booted with. invoke the same skills they dispatch. edit and iterate — changes take effect immediately.

**zero magic. full transparency.**

```
.agent/
  repo=.this/              # roles native to this repo
    role=any/
      readme.md            # ← you can read this
      briefs/              # ← robots get booted with these
      skills/              # ← robots dispatch from these
  repo=ehmpathy/           # roles linked from rhachet-roles-ehmpathy
    role=mechanic/  →      # symlink to node_modules/...
```

## .core idea

**humans and robots share the same source of truth.**

- browse `.agent/` to see what briefs robots get enrolled with
- invoke skills from `.agent/` — same ones robots dispatch
- edit briefs directly — changes take effect immediately

no hidden config. no magic resolution. no "where does this come from?" the answer is always `.agent/`.

## .scope

applies to **cli consumers** — robots and humans who invoke rhachet via command line.

does **not** apply to **sdk consumers** — they import roles directly from packages; no discovery needed.

## .benefits

### transparency

you see exactly what robots see:
- which briefs shape their thought
- which skills they can invoke
- which roles are available

### parity

humans can use what robots use:
- `npx rhachet run --skill say-hello` — same skill, same execution
- browse briefs to understand what robots know
- iterate on briefs and skills, test immediately

### speed

direct filesystem access — no package resolution at runtime:

| command       | path | startup |
| ------------- | ---- | ------- |
| `run --skill` | bun  | ~35ms   |
| `roles boot`  | bun  | ~70ms   |
| `roles link`  | jit  | ~300ms+ |

pay the link cost once at init time, enjoy fast execution everafter.

### experimentation

edit roles directly, changes take effect immediately. no rebuild, no reinstall, no cache invalidation.

## .structure

```
.agent/
  repo={slug}/           # role repo namespace
    role={slug}/         # role namespace
      readme.md          # role documentation
      briefs/            # curated knowledge (*.md)
      skills/            # executable capabilities (*.sh, *.ts)
      inits/             # initialization scripts (optional)
```

| namespace    | source | purpose                                   |
| ------------ | ------ | ----------------------------------------- |
| `repo=.this` | native | roles native to this repo                 |
| `repo=$slug` | linked | roles from `rhachet-roles-$slug` packages |

## .how roles get there

### native roles

create directly in `.agent/repo=.this/`. zero dependencies. instant experimentation.

#### default: `role=any`

`repo=.this/role=any/` is created whenever rhachet is linked in a repo. it applies to anyone who works in the repo — human or robot. use it for repo-wide briefs and skills.

#### custom: `role=$name`

create custom roles for scoped briefs and skills:

| role           | purpose                                           |
| -------------- | ------------------------------------------------- |
| `role=human`   | briefs & skills applicable only to humans         |
| `role=robot`   | briefs & skills applicable only to robots         |
| `role=dbadmin` | briefs & skills for database administration scope |

custom roles are opt-in — irrelevant by default, enrolled when needed.

```
.agent/repo=.this/
  role=any/        # default, applies to everyone
  role=human/      # human-specific
  role=robot/      # robot-specific
  role=dbadmin/    # scoped to db work
```

### linked roles

run `npx rhachet init --roles $role`:

1. discovers role in installed `rhachet-roles-*` packages
2. creates symlinks into `.agent/repo=$slug/role=$role/`
3. cli sources from `.agent/` like any other role

linked roles behave identically to collocated roles — same discovery, same dispatch, same transparency.

## .key insight

the `.agent/` pattern enables:
- **what you see is what you get** — no hidden resolution
- **human-robot parity** — same briefs, same skills, same paths
- **instant iteration** — edit and test without rebuild

this is why rhachet can be fast (bun binaries read directly from filesystem) and transparent (you can always inspect what robots will get).

## .refs

- `bin.dispatcher.pattern.md` — how bun/jit dispatcher leverages `.agent/`
