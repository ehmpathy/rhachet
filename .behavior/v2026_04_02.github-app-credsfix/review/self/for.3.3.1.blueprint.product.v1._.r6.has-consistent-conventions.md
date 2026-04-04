# self-review r6: has-consistent-conventions (deeper reflection)

## pause — what am i truly asked to review?

the guide asks about name conventions and patterns. let me think more carefully.

**what could diverge from extant conventions?**
1. variable names in the new code
2. test file names
3. test structure
4. comment style
5. error message style (if any)

## 1. variable names: chunks, chunk, content

**blueprint uses**:
```ts
const chunks: string[] = [];
for await (const chunk of process.stdin) {
  chunks.push(chunk as string);
}
const content = chunks.join('');
```

**extant pattern check**:
- searched for `chunks` in codebase: found in `src/domain.operations/invoke/` for IPC
- searched for `content` in codebase: used broadly for file content
- searched for `chunk` in codebase: not found as variable name

**is chunks/chunk appropriate?** yes — it's standard Node.js stream terminology

**alternative**: could use `parts` or `segments`, but `chunks` is more precise for streams

**verdict**: acceptable — follows stream conventions

## 2. test file name: keyrack.stdin-multiline.acceptance.test.ts

**extant acceptance test names**:
- keyrack.set.acceptance.test.ts
- keyrack.get.acceptance.test.ts
- keyrack.unlock.acceptance.test.ts

**pattern**: `keyrack.{action}.acceptance.test.ts`

**blueprint proposes**: `keyrack.stdin-multiline.acceptance.test.ts`

**does this fit?** somewhat — it's `keyrack.{feature}` not `keyrack.{action}`

**alternative**: could add to extant `keyrack.set.acceptance.test.ts` instead

**question**: should we add to extant file or create new?

**research**: read extant file — it already has multiple cases for `keyrack set`

**decision**: add new case to `keyrack.set.acceptance.test.ts` instead of new file

**finding**: convention suggests we extend extant file, not create new one

## 3. blueprint update needed

the blueprint proposes a new file. convention says extend extant file.

**action**: update blueprint to add test case to `keyrack.set.acceptance.test.ts`

## summary

| item | issue? | action |
|------|--------|--------|
| variable names (chunks, chunk) | no | standard stream terms |
| comment style | no | matches extant |
| test structure | no | matches test-fns pattern |
| test file name | **yes** | extend extant file instead of new file |

**one issue found**: blueprint should extend `keyrack.set.acceptance.test.ts` rather than create `keyrack.stdin-multiline.acceptance.test.ts`

**why this matters**: keeps related tests together, follows extant pattern of multiple cases per feature
