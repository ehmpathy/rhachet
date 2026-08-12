# rule.require.github-app-org-lookup-via-keyrack-infra

## .what

**every** github-app installation lookup, for **every** org, goes through `keyrack-infra` —
via `getKeyrackInfraCandidateApps({ org })`. no other discovery path may exist.

this holds regardless of *which* org is asked about:

- the key's own org (derived from the slug) — today's path
- a **different** org, named by a reach (`github://org=$org`) — the same path, different arg

the org is an **argument** to one lookup, never a fork to a second one.

## .why

**non-admins must be able to use github apps.** that is the whole reason `keyrack-infra`
exists, and it is a hard requirement, not a convenience.

the github api endpoint that lists an org's installations —
`GET /orgs/{org}/installations` (plural) — **requires org-admin**. a member gets `403`
([`getGhOrgInstalls.ts`](../../../../src/domain.operations/keyrack/infra/gh/getGhOrgInstalls.ts)).
so an admin-only lookup would lock every non-admin out of every github-app credential.

`getKeyrackInfraCandidateApps` is the admin-free answer, and it already encodes the whole
policy ([`getKeyrackInfraCandidateApps.ts`](../../../../src/domain.operations/keyrack/infra/getKeyrackInfraCandidateApps.ts)):

| caller | what they get |
|--------|---------------|
| member (`403` on the admin endpoint) | the member-readable **registry** — the admin-free source |
| member + empty registry | a `ConstraintError` that names the fix: *ask an admin to add a github app* |
| admin | registry **∪** freshly-discovered installs, deduped by slug — so a brand-new app is discoverable even when the registry already holds others |

that gate is the invariant. any lookup that bypasses it re-introduces the admin requirement
for whoever takes the bypass.

## .the hazard this forbids

an **app JWT** (minted from `appId` + the pem) can call
`GET /orgs/{org}/installation` (**singular**) and get an installation id for any org, with no
org-admin and no `gh` login at all. it is technically correct and genuinely tempting — it looks
like a shortcut that "just works" for the cross-org case.

**do not take it.** it would give the github-app mech **two** discovery paths with different
auth models, different sources of truth, and different answers:

| | `keyrack-infra` (required) | app JWT (forbidden) |
|---|---|---|
| source of truth | the org's registry, curated | github's live install state |
| auth | the caller's `gh` read | the app's own pem |
| admin needed | no | no |
| **respects the registry** | **yes** | **no** |

the divergence is the defect. an app registered in `keyrack-infra` but not yet installed — or
installed but deliberately unregistered — would yield a different answer per path. two answers
to one question is `rule.forbid.ambiguous-labels` at the mechanism level, and it silently erodes
the registry's authority: the registry stops being *the* source and becomes *a* source.

it also splits the failure mode. today a non-admin who hits an unregistered app gets a
`ConstraintError` that names the fix. via app JWT they would get a silent success against an
app nobody registered — and the "ask an admin to register it" flow would rot from disuse.

## .the test

> "am i about to learn a github app's `installationId` for some org?"

- **via `getKeyrackInfraCandidateApps({ org })`** → correct, whatever the org is
- **any other way** → violation

## .how

the org is a parameter. that is the entire accommodation cross-org needs:

```ts
// 👍 good — one lookup, org as an argument
const org = reach ? reach.org : asKeyrackKeyOrg({ slug });
const candidates = getKeyrackInfraCandidateApps({ org }, ctxGh);
```

```ts
// 👎 bad — a second discovery path for the cross-org case
const jwt = await createAppAuth({ appId, privateKey })({ type: 'app' });
const install = await fetch(`https://api.github.com/orgs/${org}/installation`, …);
```

## .the consequence, stated plainly

a human who sets a cross-org github-app credential needs **`gh` read access to the target
org's `keyrack-infra`**.

that is correct, not a burden. a human who wants `ahbode → ehmpathy` reach is by definition a
human who works with **both** orgs — the reach set is a property of the person at the machine,
not of the repo. and the requirement is *legible*: a `404` on `keyrack-infra` already names both
remedies (init it, or ask for read access), because github hides the difference between an
absent repo and an unreadable one.

the alternative — a pem that opens any org's door with no local authorization trail — is worse
on exactly the axis keyrack exists to protect.

## .enforcement

- a github-app installation lookup that bypasses `getKeyrackInfraCandidateApps` = **blocker**
- an app-JWT call to `GET /orgs/{org}/installation` for discovery = **blocker**
- a second, org-conditional discovery branch (one path for "my org", another for "another
  org") = **blocker**

## .see also

- [`define.keyrack-registry-vs-installation`](../../role=any/briefs/define.keyrack-registry-vs-installation.md) —
  registration ≠ installation; the registry is a curated cache, and that is deliberate
- [`getKeyrackInfraCandidateApps`](../../../../src/domain.operations/keyrack/infra/getKeyrackInfraCandidateApps.ts) —
  the one lookup, with the member/admin policy in it
- [`genGithubAppSource`](../../../../src/domain.operations/keyrack/adapters/mechanisms/genGithubAppSource.ts) —
  the caller that derives the org and hands it in
- `term=reach._.choice.reason.md` — the per-mech reach contract this rule instantiates for
  the github mech
