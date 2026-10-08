# F76 — does a `.this` role with no `boot.yml` still boot into the brain dirs?

- **raised** = 2026-10-06, after the route closed
- **rework** = clean
- **status** = ANSWERED — by the wisher (`S21`)
- **confidence** = **100%**

## .the fork, stated fairly

| | **every `.this` dir boots** | **the spec is the opt-in** (taken) |
|---|---|---|
| a dir with no `boot.yml` | boots, every brief said | does not boot; `roles boot --repo .this --role $slug` still reaches it |
| a dir with a payload-less `boot.yml` | boots, every brief said | boots, every brief said |
| a scratch or half-built role | leaks into every session | stays out until its author declares it |

## .the call, and why

**the spec is the opt-in**, as the budget in it is the opt-in to the gate (`F75`). a role that wants
residence says so in one file.

## .rework

clean — one filter in `getAllLinkedRoleRefs` on native slugs. the removal guard is unchanged.
