# F1 — the off-ec2 blob lives in the box's os.secure

- **fork** — os.secure (age-encrypted to the box's ssh identity) · os.envvar (plaintext blob in the process env, no code change) · 1password via service account
- **taken** — os.secure. it already supports `EPHEMERAL_VIA_GITHUB_APP`, unlocks headless with the ssh identity every unlock already needs, and its minted token is daemon-cached
- **rework** — clean. the mint path is vault-agnostic; a switch to os.envvar drops the set flag work, a switch to 1password swaps the vault arg
- **confidence** — 85%. the issue itself names os.secure as an example; the residue is whether the commander prefers zero code (os.envvar)
- **where** — `1.vision.yield.md` q1
- **verdict** — lean stands as best guess per S1; the commander rules at the pr
