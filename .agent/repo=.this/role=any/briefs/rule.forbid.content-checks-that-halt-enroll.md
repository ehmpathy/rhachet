# rule.forbid.content-checks-that-halt-enroll

> **no boot-time check on the content of a brief, a skill, or a role may halt a clone birth. a
> content check sets the defect aside, warns, and lets the clone be born.**

a clone that cannot be born cannot repair the defect that refused it. the human then repairs it by
hand, in a repo they may not know, to get back a clone that knew how.

## .the seam

| the check is about | examples | at birth |
|---|---|---|
| **content** — a file the clone can edit | an orphan `.md.min`, a copy of the cache boundary literal, a `boot.yml` that will not parse | set aside, 🟡 receipt, born |
| **identity** — which actor to birth | a role not linked, a focus the role does not declare, a mod stale or aimed at a native role | halt (a render past it births a different actor) |
| **malfunction** — the render's own fault | boot.md not delivered, a file vanished mid-read, the boundary placed a wrong number of times | halt (a render past it births a corrupt one) |

test: **could a clone born past this defect open the file and repair it?** yes → content → warn. no → identity or malfunction → halt.

## .how a content check warns

1. it reports a `RoleContentDefect` of one declared kind (`src/domain.objects/RoleContentDefect.ts`), returned beside the render body, never thrown
2. the render sets the defect aside in a form that harms naught: skip it, defang it, or render the role refs-only
3. the birth prints one 🟡 receipt on stderr that names each defect and its fix — a clean render prints naught. where the repo arms no stop sweep, the receipt says it is the one notice
4. the stop sweep (`roles cost --all --when hook.onStop`) holds the stop on an owned defect (exit 2), so the clone that was born repairs it; a linked defect warns through a json `systemMessage` and never holds
5. a hand `roles cost --all` names each defect on stdout and tags its spec row 🟡; it exits 0, since a report never gates

a new kind joins the `RoleContentDefectKind` union. the shared clamp fixture
(`blackbox/.test/infra/genRepoWithRoleContentDefect.ts`) keys its fixtures by every kind, so a kind with
no fixture fails the type check. two clamps read it: the birth (`enroll.content-defects.integration.test.ts`,
a stub brain) and the stop, roster, and rerender (`roles.content-defects.acceptance.test.ts`, no brain).

| when… | then… |
|---|---|
| you add a check to the boot render | sort it by the seam first |
| a content check would `throw` | 🔴 the strongest cue. return a defect instead |
| a reader BEFORE the render parses a role's spec (the focus check, the boot guard, the hook arm) | 🔴 it is on the birth path too. it reads through the one lenient reader (`getOneRoleBootSpecOrFaultFromPath`), never the strict one, so a spec that will not parse is skipped there and the render names it. the strict readers stay strict on purpose: `getOneRoleBootSpecFromRef` (a mod's merge needs the role's mode, so it halts beside the other mod refusals), `getOneBootConfigForSource` (`roles boot`), `getOneDeclaredBudgetForSpec` (publish) |
| a defect has no harmless set-aside form | it is no content check; name its class and argue the halt |
| a set-aside prints no receipt | that is a failhide; add the receipt |

## .scope

every path that renders a boot corpus for a clone, and every read that path makes before the render:
`rhx enroll` (focused or whole), `rhx init`, `rhx upgrade`, `roles link`, declared actors. `roles boot`
is a hook read, not a birth: it skips an orphan and names it on a 🟡 receipt on stderr (stdout is the
payload), and its spec and budget checks stand. publish
(`repo introspect`) is a supplier's own gate, and may refuse.

## .enforcement

- a boot-time content check that throws on the path to a clone birth = **blocker**
- a content defect set aside with no receipt = **blocker**
- a new `RoleContentDefect` kind with no clamp fixture = **blocker** (the type check catches it)

## .see also

- `rule.forbid.framework-owned-hooks` — why the stop sweep is the one hook that may hold
- `catalog.of=actor-clone-design._.md` — the actor a birth renders
