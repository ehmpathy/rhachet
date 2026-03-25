# self-review r2: has-edgecase-coverage

## question: are edge cases covered?

---

## what could go wrong?

| failure mode | playtest coverage | test id |
|--------------|-------------------|---------|
| op cli not installed | yes | edge 3.1 |
| invalid exid format | yes | edge 3.2 |
| daemon key lost after relock | yes | edge 3.3 |
| 1password item deleted | no | not practical for byhand test |
| 1password requires re-auth | implicit | covered by unlock step |

### why "1password item deleted" is not covered

this edge case would require:
1. set a 1password key
2. delete the item in 1password
3. attempt unlock

this is destructive and impractical for a byhand playtest. automated acceptance tests cover this via mock or isolated test items.

---

## what inputs are unusual but valid?

| unusual input | coverage | test id |
|---------------|----------|---------|
| key name with special chars | not tested | could add |
| exid with spaces in path | not tested | could add |
| long key names | not tested | could add |

**assessment:** these are minor edge cases. the playtest covers the core flows. unusual inputs are better covered by automated tests.

---

## are boundaries tested?

| boundary | coverage | test id |
|----------|----------|---------|
| first key set to daemon | yes | 1.1 |
| first key set to 1password | yes | 2.1 |
| key retrieval after set | yes | 1.2, 2.3 |
| key loss after relock | yes | edge 3.3 |
| roundtrip validation failure | yes | edge 3.2 |

---

## edge cases in playtest

the playtest includes 3 explicit edge cases:

1. **edge 3.1: op cli not installed** — covers constraint error path
2. **edge 3.2: invalid exid** — covers validation failure
3. **edge 3.3: daemon key after relock** — covers ephemeral key loss

---

## assessment

| criteria | status | rationale |
|----------|--------|-----------|
| what could go wrong? | covered | 3 failure modes in playtest |
| unusual inputs | acceptable gap | automated tests cover this better |
| boundaries tested | covered | first set, retrieval, loss all tested |

---

## conclusion

edge cases are covered for byhand verification. minor gaps (unusual inputs) are acceptable — automated tests provide that coverage.

holds.
