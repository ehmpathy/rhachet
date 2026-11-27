# F27 — process-grain cure walks and integration reshapes wait for a host that grades them

## .the fork

i002 raised tests this host cannot grade, or that cross a process boundary the acceptance harness does not yet drive:

- r010 blocker.5: a real daemon that outlives its idle window on a lapse mark alone
- r010 blocker.6: a daemon spawned with no `aws` on PATH, then halt, prune, unlock, and renews resume
- r010 blocker.7: an expired cached sso token in the integration suite, beside the empty-cache case
- r001 nitpick.4, nitpick.5: the renew integration suite reshaped onto the shared fixture, with an explicit child `env`
- r009 nitpick.1, nitpick.2: the renew success shape and `getOneAwsSsoRoleCredentials`' error path against the real aws cli

- **a** — write each here, in this pr
- **b** — hold each, caught as one dream, and land them where a host can run and grade them

## .taken

a for the daemon-env cure walk (i002 blocker.6, i003 blocker.3): it needed no harness change. the daemon renews from the env it was spawned with, so a daemon respawned with a portal state path of its own faults alone while the cli's unlock stays live. `keyrack.status.renew.acceptance.test.ts` [t14] walks it credfree: halt, a healthy unlock that halts again, the rendered prune and unlock, renews resume.

b for the rest. the integration tier's globalSetup refuses on this host (the llm test keys are absent), so an edit to an integration suite here ships unrun and is graded first by ci, at the cost of a red rebase. the idle-window walk on a lapse mark needs the daemon's idle window shortened in a shared suite, a harness change of its own. each behavior they name is held today at unit grain (`scheduleAutoTermination` case7 for the mark, `renewDaemonGrantsDue` case4 for the halt, `getOneAwsSsoSessionProof.integration.test.ts` for the lapse read), and the renew success is held by the two live-proof receipts on #759.

r001 nitpick.5 has a second reason: the sdk gate runs in-process, so its env cannot be handed to a child; the suite sets and restores it in `beforeAll` / `afterAll`, which fails loud on a botched override.

## .the gate, asked

5.3 i001 r001 blocker.2: `rule.forbid.deferrals-short-of-a-dedicated-pr` forbids a credential gate as a reason before the human is asked to open it. asked 2026-11-21, in the report to the director: fill the four llm test keys (`OPENAI_API_KEY`, `XAI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`) in the ehmpath keyrack, env test. then the integration tier runs on this host, and the integration items above land in this pr, graded here before ci.

## .rework

clean: each is an added test or a test reshape, with no prod change.

## .confidence — 75%, why not higher

the lapse mark's daemon lifetime (blocker.5) is held at unit grain alone (`scheduleAutoTermination` case7), never by a real daemon past its idle window.

## .where

- `blackbox/cli/keyrack.status.renew.acceptance.test.ts`
- `src/domain.operations/keyrack/daemon/daemonSsoRenew.integration.test.ts`
- `src/domain.operations/keyrack/adapters/mechanisms/aws.sso/getOneAwsSsoSessionProof.integration.test.ts`
- dream: `.dream/v2026_11_21.test.keyrack-renew-process-walks-and-integration-cases.md`

## .verdict

open — to the commander at the pr.
