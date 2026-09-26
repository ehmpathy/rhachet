# F46 — where the colorless-jest flag lands

- status     = **TAKEN**, 88%
- rework     = **clean** — one token per command, reversible in one edit
- raised     = 2026-09-25, from a wisher ask mid-stone-5.3

## .the fork, stated fairly

the wisher asked that acceptance tests "run colorless", then extended it to integration. a
measurement found TWO separate sources of escape bytes, not one:

| source | what it emits | who owns the lever |
|---|---|---|
| the clone's pty mirror, dumped into a failure | CSI **cursor motion** + color | this repo's blackbox infra |
| jest's own reporter, into every `.log/.../*.stderr.log` | SGR color | `package.json` npm commands **or** the `git.repo.test` skill |

the first has one home and no fork. the second forks:

- **(a) `package.json`** — add `--no-colors` to each of the four `test:*` npm commands
- **(b) the `git.repo.test` skill** — set `NO_COLOR` only on the path that pipes to a log file

## .taken, and why at the time

**(a)**, for one reason that decided it: **(b) lives in another repo.** the skill ships from
`rhachet-roles-ehmpathy` and reaches this tree through a link, so (b) is not a change this branch
can make at all — it is a re-seed to a peer tree, and the wisher asked for the fix here and now.

the measurement that made (a) worth doing: the unit log at `2026-09-25T05-27-35Z` carried SGR on
**56 lines**; the same suite after the flag carried **0**.

## 🔴 .the cost this take accepts

`--no-colors` binds every consumer of the npm command, so a human who runs `npm run test:unit`
**directly in a terminal** now loses jest's color too.

⚠️ the reason that is tolerable rather than free: under `rhx git.repo.test` — the paved path, and
the one every rule here points at — jest's raw output never reaches a terminal at all. the skill
prints its own treestruct and hands the human a log **path**; the jest bytes only ever land in a
file. so the loss falls exclusively on the unpaved direct-`npm` invocation.

⇒ **(b) is strictly better on this axis** — it could keep color for a tty and drop it for a pipe,
which is what jest would do by itself if a pty were not in the middle. (a) cannot make that
distinction, because an npm command has no view of its own stdout.

## .why 88% and not higher

the placement is right for *this* tree and wrong for the *ecosystem*: the real home for a
"colorless when piped" rule is the skill that does the pipe, and that home is one repo away. so
this is a correct local act that leaves a better global fix unbuilt — caught as a re-seed dream
rather than left as a silent gap.

## .where it lands

- `package.json` — `test:unit`, `test:integration`, `test:acceptance:locally`, `test:acceptance`
- `blackbox/.test/infra/asLegibleScreen.ts` — the pty half, which no flag could have covered
- `dreams/v2026_09_25.reseed.colorless-jest-belongs-in-the-git-repo-test-skill.md`

## .see also

- `rule.always.fix-forward-under-scouts-honor` — safe + clean, so it was taken rather than deferred
- `rule.always.catch-dreams-for-followups` — the cross-repo half owes a re-seed dream
