# F18 — the unlock's errored row stays one `tip` leaf

- **fork** — split an errored row's tip into sub-branches (the fault, the retry, the hint), or keep the
  one `tip:` leaf every vault's errored row already renders
- **taken** — keep the one leaf. `asKeyrackErroredKeyTip` writes the tip for every vault (aws.params,
  os.secure, 1password, aws.config); its shape is extant on main, and the awsParams acceptance snap pins
  it. a split would reshape every vault's errored row, a contract change past #656's nano bound. this
  pr changes only what the leaf says for an aws export fault: the fault, then `— retry: <cmd>`, then
  `; if it recurs: <hint>` (F14), each part short
- **rework** — clean. the render lives in one transformer and its callers read only the string; a split
  is a change there and a resnap of the errored-row snaps
- **confidence 75%, low because** — the leaf now carries three parts for a malfunction, and a reader may
  scan a branch faster than a sentence
- **verdict** — held at one leaf in this pr; a treestruct for errored rows is for the wisher
