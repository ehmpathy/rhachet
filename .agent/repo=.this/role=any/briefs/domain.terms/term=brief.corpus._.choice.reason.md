# domain.term.choice.reason: corpus

## .etymology

latin *corpus*, "body" — in linguistics, **a body of text treated as one object for analysis**.
that is exactly the sense wanted: N brief files stop to be N files and become one text a brain
reads.

### why the concept needs a noun

a render streamed to stdout needs no noun — you do not name what you immediately print. a render
that is **stored, hashed, and compared** is an object, and an object needs a word. the brief corpus
is the second kind: it is written to `boot.md`, digested, and diffed.

⇒ `corpus` names that object. it is **not** a synonym that displaces an incumbent: elsewhere in
`src/` the word appears only as generic english prose, never as a domain object.

## .the rejected peers

| candidate | why not |
|---|---|
| **`manifest`** | 🔴 the one that must be forbidden rather than merely passed over — it is an **itemized extant term** for the `boot.yml` DECLARATION. to reuse it for the render collapses declare-vs-rendered, which is the exact distinction this term exists to hold |
| `bundle` | build-tool jargon; implies a package of files, where the corpus is one flat text |
| `blob` | implies opaque bytes; a corpus is legible text a human reviews in a diff |
| `payload` | transport jargon — it names an object's role in a hop, not what the object is. the corpus outlives any one transport — the same text rides a system-prompt flag or a `CLAUDE.md` file |
| `body` | too generic, and **already in use as a parameter name** — `asActorCorpusDigest(body)`. as a domain term it would overload |

## .evidence

- **discovery**: the boot experience decomposes along `corpus × moment × feel`, so `corpus` is one
  of three orthogonal dimensions of the space. a term that names an axis carries weight by
  construction
- **the boundary is `brief`**: *"corpus, of what?"* → of **briefs**. one word, so
  `rule.require.boundary-qualified-terms` is satisfied rather than deferred. it leaves room for a
  peer corpus on another subject to take its own qualified slot

## .invariants

- a corpus is **derived**, never authored — it has no source of truth of its own; its inputs are
  `{ brain, roles }` and the brief files those roles name
- ⇒ a corpus is therefore **safe to overwrite**, which is why its writer is `setActorBriefCorpus`
  (upsert) and never a `findsert`. a findsert would freeze the first render forever
- a corpus belongs to an **actor** or a **role**, never to a clone — all clones of an actor share
  one corpus by reference (`rule.forbid.per-clone-config`)

## .disputes

none raised.
