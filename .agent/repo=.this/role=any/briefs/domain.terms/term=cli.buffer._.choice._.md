# domain.term: buffer

term.chosen   = buffer
term.kind     = noun
term.boundary = cli
term.synonyms.forbidden:
- box
- band
- region
- textarea
- composer

## .what

**the rows a brain-cli holds a human's UNCOMMITTED text in.** the strip at the screen's foot, bounded
above and below by a rule row, where stdin lands before a submit takes it.

it is the SURFACE the `buffered` state is read off — one of the two values `rhx clone get --what`
takes, beside `queue`.

## 🚨 .the boundary — `buffer` is the SURFACE; `buffered` is the STATE

the two are one derivation apart and part on what they name:

| word | kind | what it names |
|---|---|---|
| **`buffer`** | noun | the screen rows | the place a message can sit |
| `buffered` | adj | a verdict on one message (`term=buffered`) | the fact that it sits there |

⇒ so `--what buffer` asks *"show me those rows"*, and a `buffered` verdict answers *"the message is
in them."* one is a read target; the other is a state of the triple.

## ⚠️ .what this term SETTLES

before it, one concept carried three undeclared words across the codebase — `band`
(`getInputBand`), `box` (in prose and test names), and `region` (`countInInput`'s docblock, "the
input region"). no canonical word was declared, which is the case
`rule.forbid.domain-term-inconsistency` names.

the wisher's `buffer`, coined for the `--what` contract, is now the canonical one. the three are
recorded above as forbidden synonyms.

🟡 the extant internal names are **left in place until disturbed** — `getInputBand` still reads
`band`, and a mass rename is forbidden. a touch of those files takes the canonical word on the way
through.

## ⚠️ .the near-neighbors, and why each stays distinct

| word | its own concept |
|---|---|
| **buffer** | the rows that hold uncommitted text |
| **queue** | the rows above it, that hold SUBMITTED text a brain has not released (`term=cli.queue`) |
| **transcript** | the on-disk `<exid>.jsonl` a released turn lands in (`term=transcript`) |
| **frame** | the lines one cli EVENT renders (`term=cli.frame`) — a render unit, never a screen region |

## .refs
- `src/domain.operations/clone/cli/asCloneGetWhat.ts`                  # the `--what` tuple that publishes it
- `src/domain.operations/clone/screen/computeCloneInputState.ts`       # `getInputBand` — the slice that locates it; `countInInput` — the count taken over it
- `src/domain.operations/clone/screen/computeCloneInputContent.ts`     # the read that returns its rows

## .reason
see the ref-level cluster beside this choice:
- `term=cli.buffer._.choice.reason.md` — etymology, the five rejected peers, the inconsistency it settles
