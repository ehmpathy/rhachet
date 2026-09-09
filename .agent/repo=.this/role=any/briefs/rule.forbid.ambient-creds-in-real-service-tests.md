# rule.forbid.ambient-creds-in-real-service-tests

## .what

a test that dials a real external service must pass its credentials **explicitly** to the child
process. never mutate `process.env` and rely on an operation to inherit it.

if the operation under test reads the **ambient** env and has no injection seam, do not call it
from a real-service test at all — drive the same argv through an explicit `env` instead.

## .why

`process.env` is **shared, global, and racy**. a test that sets it in a `beforeAll` is one hook
order away from a live production credential in a call it meant to run unauthenticated.

on a developer box, keyrack sources real tokens into `process.env` at jest setup
(`jest.integration.env.ts`). so the *default* state of a real-service test is **fully
authorized**. an override that fails does not fall back to "no access" — it falls back to
**"full access."** that is the opposite of a safe default (`rule.require.safe-by-default`).

⚠️ **the failure is silent and successful.** the operation returns 0, the write lands, and the
only red is an assertion that expected a refusal. by then the side effect is already on a shared
system.

## .the incident

a real-service test for the `github.secrets` vault meant to prove github still refuses an
unauthorized secret write. it was shaped like this:

```ts
given('[case1] real github is dialed with an invalid credential', () => {
  beforeAll(() => {
    Object.assign(process.env, asEnvWithInvalidGithubCreds());  // 👎 ambient, and racy
  });

  when('[t0] ghSecretSet runs against the real service', () => {
    const error = useBeforeAll(async () =>
      getError(async () => ghSecretSet({ name: 'KEYRACK_WIREHOP_PROBE', repo: 'ehmpathy/rhachet', secret: '…' })),
    );
    // …
  });
});
```

`useBeforeAll`'s setup ran **before** the `given`-level `beforeAll`. so `ghSecretSet` ran with the
box's live keyrack token and **wrote a real secret to `ehmpathy/rhachet`**. the test reported
`NoErrorThrownError` — which is the *only* reason the write was noticed at all.

the secret was removed, and the removal **verified by a re-list** rather than assumed. but the
write reached a shared repo, and a differently-shaped assertion would have hidden it.

## .the fix — structural, never ordered

```ts
// 👍 the credential travels WITH the call; no hook order can affect it
const result = spawnSync('gh', ['secret', 'set', name, '--repo', repo], {
  input: 'never-written',
  encoding: 'utf-8',            // node api key
  env: asEnvWithInvalidGithubCreds(),   // explicit
});
```

with an explicit `env`, a botched override **reds a row** and can never write. the worst case
degrades to a test failure rather than a side effect.

⚠️ the operation's own wrapper logic (error class, hint, argv shape) stays covered by the unit
twin, which needs no network. the real-service test's job is the **service's** response, not the
wrapper's.

## .the test

before a test dials a real service, ask:

| question | if no |
|---|---|
| does the credential travel with the call (`env:` / an injected client)? | make it explicit |
| if the override silently failed, what happens? | it must FAIL, never SUCCEED |
| does the operation read ambient env with no seam? | do not call it — drive the argv directly |
| is the payload a mutation? | prefer a read; if a write, it must be unauthorized by construction |

## .the deeper form

this is `rule.require.safe-by-default` applied to test credentials: **the easy path must be the
unauthorized one.** a test that must remember to de-authorize itself will eventually forget.

and it is `rule.require.hermetic-tests` too — a test whose outcome depends on which credentials
the box happens to hold is not hermetic, whatever it asserts.

## .enforcement

- a real-service test that mutates `process.env` to de-authorize itself = **blocker**
- a real-service test whose failed override degrades to *authorized* rather than *refused* = **blocker**
- a call to an ambient-env operation with a mutation payload, from a test = **blocker**
- an unintended write to a shared system, discovered and not reported in the yield = **blocker**
  (`rule.forbid.failhide`, applied to the report)

## .see also

- `rule.require.hermetic-tests` — the general form: a test must not depend on box state
- `rule.require.safe-by-default` (ergonomist) — the easy path must be the safe one
- `rule.require.external-contract-integration-tests` (behaver) — the rule that demands the real dial
- `rule.forbid.integration.mocks` — why the real dial is required in the first place
