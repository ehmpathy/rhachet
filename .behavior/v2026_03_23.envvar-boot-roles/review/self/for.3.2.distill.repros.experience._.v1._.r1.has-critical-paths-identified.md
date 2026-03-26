# self review: has-critical-paths-identified

## stone reviewed

3.2.distill.repros.experience._.v1

## review criteria

did I identify the critical paths?

---

## critical paths identified

| critical path | description | why critical |
|---------------|-------------|--------------|
| replace roles | `--roles mechanic` boots with mechanic only | core usecase: focused clone |
| subtract role | `--roles -driver` removes driver from defaults | noise reduction for specific tasks |
| passthrough | `--resume` reaches brain | users must combine --roles with other flags |
| typo hint | typo shows suggestion | user recovers from mistake quickly |

---

## verification: pit of success per critical path

### 1. replace roles (`--roles mechanic`)

| dimension | assessment |
|-----------|------------|
| narrower inputs | ✓ role names constrained to linked roles |
| convenient | ✓ single role = just the name, no special syntax |
| expressive | ✓ can list multiple roles with comma |
| failsafes | ✓ defaults preserved when --roles omitted |
| failfasts | ✓ unknown role fails immediately with suggestion |
| idempotency | ✓ same input = same config output |

**holds**: input is natural (role name), output is deterministic.

### 2. subtract role (`--roles -driver`)

| dimension | assessment |
|-----------|------------|
| narrower inputs | ✓ `-` prefix only valid for subtract |
| convenient | ✓ `-driver` more natural than a list of all-but-driver |
| expressive | ✓ can combine with `+` for fine control |
| failsafes | ✓ subtract of absent role = no-op (idempotent) |
| failfasts | ✓ unknown role fails immediately with suggestion |
| idempotency | ✓ same input = same config output |

**holds**: delta syntax is intuitive, no-op for absent is pit-of-success.

### 3. passthrough (`--resume` reaches brain)

| dimension | assessment |
|-----------|------------|
| narrower inputs | n/a — passthrough accepts any flag |
| convenient | ✓ flags after `--roles` just work |
| expressive | ✓ all brain flags are supported |
| failsafes | ✓ unknown flags passed through (brain decides) |
| failfasts | ✓ our flags fail fast, brain flags pass through |
| idempotency | ✓ same input = same passthrough |

**holds**: passthrough is transparent — user doesn't think about it.

### 4. typo hint

| dimension | assessment |
|-----------|------------|
| narrower inputs | n/a — typo is user error |
| convenient | ✓ suggestion saves user from re-lookup |
| expressive | n/a — error case |
| failsafes | ✓ does not boot with wrong role |
| failfasts | ✓ fails immediately with actionable message |
| idempotency | n/a — error case |

**holds**: error message is actionable — user knows what to fix.

---

## what if critical paths failed?

| critical path | failure mode | consequence |
|---------------|--------------|-------------|
| replace roles | wrong roles load | user sees irrelevant briefs, confusion |
| subtract role | driver still loads | user sees noise they tried to remove |
| passthrough | --resume lost | user can't resume prior session |
| typo hint | no suggestion | user must guess correct name |

all consequences are significant. critical paths are correctly identified.

---

## absent critical paths?

considered:
- **no .agent/ error**: not critical (happens once, user runs init)
- **empty --roles error**: not critical (rare edge case)
- **conflict error**: not critical (rare edge case)

these are error cases, not happy paths. they have clear errors but aren't "critical paths" that most users take.

---

## verdict

✓ critical paths are correctly identified
✓ each has clear "why critical"
✓ pit of success verified for each
✓ failure consequences understood

no changes needed.
