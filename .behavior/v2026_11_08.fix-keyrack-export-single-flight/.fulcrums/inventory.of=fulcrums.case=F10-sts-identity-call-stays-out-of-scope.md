# F10 — the per-unlock `aws sts get-caller-identity` gets a hang guard and a safe quote, not a cache

- **fork** — fold the sts call into the single-flight cache too, or harden it in place and leave its
  per-unlock cost
- **taken** — harden in place: it now runs under a two-minute hang guard (a kill fails loud as a
  MalfunctionError, never as an expired session that sends the human to a re-login), with the
  profile as one single-quoted shell word. no cache: the sts call is the wrong-user detector
  (`[case19]`), and a cached identity would mask a re-login as another user. the per-unlock cost
  rests, caught as `dreams/v2026_11_08.fix.keyrack-aws-sts-identity-runs-per-unlock.md`,
  whose cure is a different read of the username (the validated sso token, or a typed sdk client)
- **rework** — clean. the read swap touches one function; no caller of this pr's op moves. but it is no
  local edit: the repo holds no sts sdk client (`package.json` has only `@aws-sdk/client-sso` and
  `@aws-sdk/credential-provider-sso`), so the swap adds a prod dependency and moves how the wrong-user
  detector reads its identity — a behavior call past the wish's nano bound
- **confidence 80%, low because** — the wish's outcome line says the jest env "never times out on the
  export"; the sts spawns still cost cpu at load 70, and a wisher may read "never times out" wider
- **verdict** — the hang guard and quote done in this pr; the read swap is for the wisher
