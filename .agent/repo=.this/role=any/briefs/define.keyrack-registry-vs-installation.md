# define: keyrack-infra registry records REGISTRATION, not INSTALLATION

## .what

`$org/keyrack-infra/registry/github-apps.json` records where a github app has been
**registered** — a per-org discovery cache, seeded by whoever ran `keyrack set` in that org.

GitHub records where an app is **installed**.

**these are unrelated facts.** registration lags installation by design, and the normal shape is
**one central registry** (in `ehmpathy`) while the apps themselves are installed across many
orgs.

## .why it matters

**absence from the registry is NOT evidence that an installation is absent.** a `findsert` cache
is incomplete by definition — it holds only what someone happened to seed. to read absence as a
fact is a false negative that **fails closed** and blocks legitimate work.

this is the decisive argument for how cross-org installation lookup must work:

> only GitHub can answer "is this app installed in `$org`?" — via `GET /orgs/{org}/installation`
> with **app-JWT** auth (the app authenticates as itself; no org-admin, no `gh` login for the
> target org).
>
> a registry read would answer "not installed" for orgs where the app **is** installed.

## .the two lookups, and what each is for

| source | answers | auth | completeness |
|--------|---------|------|--------------|
| `keyrack-infra` registry | "which apps has someone registered here?" | repo read | **partial** — silent on un-seeded orgs |
| `GET /orgs/{org}/installation` | "is this app installed in this org?" | app JWT | **authoritative** |
| `GET /orgs/{org}/installations` (plural) | "which apps are installed in this org?" | **org-admin** | authoritative but gated — 403 for members ([`getGhOrgInstalls.ts`](../../../../src/domain.operations/keyrack/infra/gh/getGhOrgInstalls.ts)) |

the plural/admin endpoint is precisely why the registry fallback was built. the **singular**,
app-JWT endpoint sidesteps the admin gate entirely for the "does this one app reach this one
org?" question.

## .the general lesson

when you meet a registry, cache, or index in this repo, **ask what it is an index OF before you
treat absence as a fact.** a cache of *what was registered* cannot answer *what exists*.

## .citations

> "the apps are registered in ehmpathy only. that's fine. but they're installed across lots of
> orgs. both seaturtle and ahbode will need this"

source: human, 2026-08-02 — a correction to a false inference made in the
`--scope github://org=` vision (`.behavior/v2026_07_31.feat-keyrack-unlock-scope`), where
absence from `ahbode`'s registry was misread to mean the app was not installed in ahbode.
