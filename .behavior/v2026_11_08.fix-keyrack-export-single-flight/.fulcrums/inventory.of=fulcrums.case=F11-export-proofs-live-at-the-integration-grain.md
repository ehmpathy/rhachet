# F11 — each export surface is proven at the grain that can reach it

- **fork** — prove every export surface through `rhx keyrack unlock`, with a blackbox mock cli that can
  fail, hang, and outlast a bound; or prove each surface where it is born (the integration grain, a
  real exec, real disk and real mutex behind a fake `aws` on PATH) and through the cli wherever the
  mock can reach it
- **taken** — both grains, split by reach:
  - the cli grain (`keyrack.vault.awsIamSso.acceptance.test.ts`): the mock cli takes
    `MOCK_AWS_EXPORT_MODE`, `_SLEEP`, `_EXPIRATION` and `_CALLS`, so a cold and a warm unlock, a burst,
    the cli-fault row, the cache-path-fault row, the grant at a `+HH:MM` expiry, the near-expiry
    re-export, the config-keyed re-export, the re-login replace, and the relock drop (bare, `--key`,
    `--env`) each run through `rhx keyrack unlock` ([case18], [case20]–[case23]); each row is snapped
  - the integration grain (`genAwsProfileExport.integration.test.ts`) alone owns what has no cli seam:
    the hang guard and the dead holder's lease (cases 4 and 9), whose bounds are constants the cli
    cannot shorten; it also snaps every error message the op throws
- **rework** — clean. a bounds seam on the cli (the dream on findsert error branches tracks its kin)
  would move cases 4 and 9 up a grain; no prod code moves
- **confidence 85%, low because** — cases 4 and 9 reach a human only through the shared errored-row
  render, whose composition the cli-fault row ([case21][t1]) proves for the same `hintAfterRetry` path
- **verdict** — settled by the split; cases 4 and 9 stay at the integration grain
