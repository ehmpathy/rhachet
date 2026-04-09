# self-review r5: has-pruned-yagni

## what i reviewed

i questioned each component in the blueprint with harder YAGNI questions:

1. could we deliver the wish with fewer files?
2. are any components "nice to have" rather than "must have"?
3. did we add test coverage beyond what's needed?
4. could we defer any component to a later iteration?

---

## harder questions per component

### BrainHookEvent.ts — add 'onTalk' to union

**was this explicitly requested?** yes — wish says "support onTalk hook"

**is this minimum viable?** yes — single line change to type union

**could we defer?** no — TypeScript will reject any code that uses 'onTalk' without this

**verdict:** required

---

### RoleHooksOnBrain.ts — add onTalk property + nested

**was this explicitly requested?** yes — vision req 1 "declare onTalk in Role.build"

**is this minimum viable?** yes — two lines: interface property + nested entry

**could we defer?** no — developers can't declare onTalk hooks without this interface change

**could we skip the nested entry?** no — without nested, arrays won't hydrate as RoleHookOnBrain instances. verified in r3 review.

**verdict:** required

---

### syncOneRoleHooksIntoOneBrainRepl.ts — add onTalk extraction

**was this explicitly requested?** yes — vision req 3 "auto-sync on link"

**is this minimum viable?** yes — one for-loop, parallel to extant pattern

**could we defer?** no — without extraction, onTalk hooks would be silently ignored when sync runs

**alternative considered:** could we use dynamic iteration instead of hardcoded loops?
- r3 review answered: "to refactor would be scope creep"
- extant code uses hardcoded loops
- follow extant pattern

**verdict:** required

---

### translateHook.ts — EVENT_MAP entry

**was this explicitly requested?** yes — vision req 2 "map to UserPromptSubmit"

**is this minimum viable?** yes — single line in EVENT_MAP object

**does reverse lookup need explicit code?** no — Object.entries lookup handles it automatically. verified in r3 and r4 reviews.

**verdict:** required

---

### config.dao.ts (anthropic) — UserPromptSubmit schema

**was this explicitly requested?** implicit — TypeScript schema must match events we write

**is this minimum viable?** yes — single property in hooks interface

**could we skip?** no — TypeScript would reject writes to UserPromptSubmit bucket

**verdict:** required

---

### genBrainHooksAdapterForClaudeCode.ts — del event map

**was this explicitly requested?** criteria usecase.2 "unlink removes hook"

**is this minimum viable?** yes — extend ternary by one case

**why wasn't this in initial blueprint?** r4 review found it was absent. the research didn't find this hardcoded map because it's a ternary chain, not a type union or object map.

**could we defer?** no — without this, unlink would try to delete onTalk hooks from the Stop bucket. hooks would orphan.

**verdict:** required (found via review, not prescribed initially)

---

### opencode config.dao.ts — regex + chat.message

**was this explicitly requested?** yes — vision wisher decision: "opencode scope: yes"

**is this minimum viable?** yes — add `|onTalk` to regex, add one if-branch for chat.message

**could we defer?** only if wisher changes scope decision. the vision records "yes" as the answer.

**why support opencode at all?** the wisher was asked and answered yes. this is not our decision to prune.

**verdict:** required per wisher decision

---

### tests

**are these minimum viable?** let me check each:

| test | purpose | could skip? |
|------|---------|-------------|
| translateHookToClaudeCode + onTalk | verify forward map | no — core path |
| translateHookFromClaudeCode + onTalk | verify reverse map | no — needed for read |
| extractDeclaredHooks + onTalk | verify extraction | no — core path |
| parsePluginFileName + onTalk | verify regex | no — needed for opencode |
| generatePluginContent + onTalk | verify chat.message | no — needed for opencode |

**verdict:** all tests trace to components. no extra tests were added.

---

## could we deliver with fewer files?

current count: 8 files to modify

**could we merge any?**
- translateHook.ts and config.dao.ts are different layers (transformer vs schema)
- opencode config.dao.ts is a separate package
- tests are collocated with their subjects

**verdict:** no — each file serves a distinct purpose in its layer

---

## features we did NOT add

| feature | why not |
|---------|---------|
| filter.what for onTalk | vision: "no filter support — single event" |
| PostUserPromptSubmit | vision: "no onTalkAfter — mirrors onTool" |
| dynamic event iteration | scope: "to refactor would be scope creep" |
| EVENT_MAP export | option 1 chosen for consistency with extant |
| additional hook events | wish only requested onTalk |

---

## verdict

**no YAGNI violations found.**

every component is either:
1. explicitly requested in vision/criteria
2. required to satisfy an explicit request
3. confirmed by wisher decision (opencode scope)

the genBrainHooksAdapterForClaudeCode.ts change was not in initial blueprint but was found via r4 review — it's required to prevent orphaned hooks on unlink.

the blueprint is minimal: 8 files, all single-line or single-block changes.
