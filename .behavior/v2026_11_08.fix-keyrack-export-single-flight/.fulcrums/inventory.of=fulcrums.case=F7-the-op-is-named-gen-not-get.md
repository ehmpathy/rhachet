# F7 — the op is named `genAwsProfileExport`, not the vision's `getOneAwsProfileExport`

- **fork** — (a) keep the vision's name `getOneAwsProfileExport`, and treat the cache file as a memo
  under a get; (b) rename to `gen`, since it finds a cached export or creates one, and its refresh
  form deletes the entry
- **taken** — (b). `rule.require.get-set-gen-verbs`: a get never mutates, and a find-or-create is a
  gen. two peer lanes (scopeleaks, decomposition) graded the get a misnomer; the refresh's delete is
  a mutation no memo view covers
- **rework** — clean. one file pair and three call sites; the contract shape is unchanged
- **confidence 85%, low because** — it departs from the name an approved vision carries
- **where** — `src/domain.operations/keyrack/adapters/mechanisms/aws.sso/genAwsProfileExport.ts`
- **verdict** — unresolved, for the wisher
