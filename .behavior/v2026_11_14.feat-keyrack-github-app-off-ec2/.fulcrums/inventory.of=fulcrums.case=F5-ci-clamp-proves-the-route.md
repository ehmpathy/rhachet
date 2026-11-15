# F5 — the ci clamp proves the mint against a canned github; a real github's acceptance is proven on the grove

- **fork** — ci proves the full mint with github's installation-token endpoint canned (a key made at test time signs a real jwt; `globalThis.fetch` answers the one POST), and a real github's acceptance of a real blob is proven by the commander run on the grove · ci mints for real against a test github app blob in the test keyrack
- **taken** — the canned endpoint. it proves the wish's literal criterion, "returns an installation token", in ci with no secret, no network, and no code seam: the child process loads `blackbox/.test/assets/fetch-canned-github.js` via `NODE_OPTIONS=--require`. what it cannot prove is that github accepts a real blob, and no ci-safe test can without a secret
- **rework** — clean. a live-mint case can be added beside the canned one
- **confidence** — 80%. the commander may still want a live mint inside ci
- **where** — `1.vision.yield.md` q5; `1.vision.experience.case=_.md` rows c1, c2, c3, c10, c11; `blackbox/cli/keyrack.githubApp.mint.acceptance.test.ts`
- **consequence** — c1 (cold) and c2 (warm) off ec2, and c10 (cold) and c11 (warm) on ec2, are proven in ci to the token (`keyrack.githubApp.mint` case1, case3). c3 (stale) is not: `expiresAt` is set to now + 55m whatever github returns, so a stale read needs a clock fake; it rests on the extant ephemeral expiry path, which this change does not touch, and its live proof is the commander run
- **the commander's options**
  - a — keep the canned mint; github's acceptance and c3 are proven live by the commander run (the lean)
  - b — add a live-mint case: a test github app blob in the test keyrack, minted per ci run. it adds a secret and a network dependency to ci
  - c — add a live refusal case with no credential: a key made at test time, app and installation id `1`, sent to real `api.github.com`, draws a real 404 that pins the status map on real octokit errors. it adds a network dependency, no secret, and proves the refusal half only
- **the premise this replaced** — an earlier lean held that no fake github could stand in without an api base-url seam. a peer probe (i005 r010) showed octokit's mint calls `globalThis.fetch`, so a `--require` preload stands in with no code change
- **verdict** — lean stands as best guess per S1; the commander rules at the pr, on both the clamp and the c3 downgrade
