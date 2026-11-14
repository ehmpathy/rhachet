# F23 — the non-sso refusal names os.direct as the second cure

- **fork** — the `keyrack set --vault aws.config` refusal at a profile with no sso config names (a)
  only an sso profile as the cure, or (b) an sso profile, or the profile name stored in os.direct
- **taken** — (b). `keyrack get` of an aws.config key hands out the profile NAME, never creds (the sdk
  reads the creds from that profile itself); an os.direct key under `PERMANENT_VIA_REPLICA` hands out the
  same name string. so a static profile in os.direct gives the caller the same value aws.config would.
  this box already runs that way: ehmpath's `AWS_PROFILE` sits in os.direct, as the 5.3 dogfood records
- **rework** — clean. one hint string in `vaultAdapterAwsConfig.ts` and the `[case22]` snap
- **confidence 85%, low because** — no acceptance step runs the hinted `keyrack set --vault os.direct`;
  os.direct's set reads the secret from a prompt, which this suite drives only through the pty harness
  whose flake [case16] already shows
- **where** — `vaultAdapterAwsConfig.ts` (the non-sso ConstraintError hint); acceptance `[case22][t0]`
- **verdict** — best-guessed (b); open for the wisher
