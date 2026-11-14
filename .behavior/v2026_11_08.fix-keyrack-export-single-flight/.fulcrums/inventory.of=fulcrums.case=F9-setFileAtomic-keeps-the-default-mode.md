# F9 — setFileAtomic keeps node's default file mode

- **fork** — (a) `setFileAtomic` keeps `mode` optional, with node's default (0666 less the umask);
  the one secret caller passes `0o600`; (b) default to `0o600`; (c) require `mode` at every call
- **taken** — (a). about twenty callers write repo files a human and git read at the default mode
  (`package.json`, `boot.md`, brain dir settings, keyrack manifests, clone identity). (b) would make
  them owner-only. (c) ripples into every caller. the wish is nano. the secret caller sets `0o600`
  explicitly, and [case5][t0] asserts it
- **rework** — clean for (c): add the arg at each call site. dirty for (b): it changes the mode of
  every repo file rhachet writes
- **confidence 88%, low because** — a future secret write that forgets `mode` would land at 0644
  with no error
- **where** — `src/infra/setFileAtomic.ts`; `genAwsProfileExport.setAwsProfileExportCached`
- **verdict** — best-guessed; open for the wisher
