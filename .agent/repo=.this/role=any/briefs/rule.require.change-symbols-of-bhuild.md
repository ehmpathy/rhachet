# rule.require.change-symbols-of-bhuild

> **a change is marked with the bhuild bracket symbols. never coin a new glyph for create, update,
> retain, delete, reuse, or eject.**

```
[+] create    [~] update    [○] retain    [-] delete    [←] reuse    [→] eject
```

the legend is bhuild's: its blueprint and evaluation stones declare it for filediffs, codepaths and
tests (`ehmpathy/rhachet-roles-bhuild`, `src/domain.operations/behavior/init/templates/3.3.1.blueprint.product.stone`,
foreign). declastruct speaks the same legend. it is the general convention, so a reader who has
read one blueprint already knows it.

## .why

- **one legend, every surface.** a diff tree, a stdout row, a status line and a brief all mark a
  change the same way, so no reader decodes a second key
- **a coined glyph is a synonym.** 🩹 for "edited" beside `[~]` for "updated" is two marks for one
  concept — the glyph form of `rule.forbid.domain-term-synonyms`
- **brackets scan as a column.** each symbol is three wide, so a list of marked rows aligns

## .the map

| the change | the symbol |
|---|---|
| an artifact made where none was — a file, a codepath, an added brief | `[+]` |
| an artifact changed in place — an update, a shadow, a modded role | `[~]` |
| an artifact kept as is, named so a reader knows it was weighed | `[○]` |
| an artifact removed — a delete, a `not` | `[-]` |
| an artifact taken from elsewhere | `[←]` |
| an artifact pulled out so others can reuse it | `[→]` |

| when… | then… |
|---|---|
| you would mark a change in stdout, a doc, or a tree | 🔴 reach for the legend first |
| you would pick an emoji to mean "edited", "added", "removed" | that is a coinage. use `[~]`, `[+]`, `[-]` |
| a change has no row in the map | it may earn a symbol. add it to bhuild's legend first, then use it here |
| a domain names the op its own way — shadow, add, not | keep the domain word, mark it with the legend: `[~] shadow` · `[+] add` · `[-] not` |

## .the boundary

| a violation | not a violation |
|---|---|
| a new glyph for a create/update/retain/delete/reuse/eject | a domain glyph that marks no change — a role mascot, an artifact header |
| a bare `~` or `+` with no brackets, where the legend applies | a `~` in a path, a `+` in math, a `-` in a flag |

## .enforcement

- a coined mark for a change the legend covers = **blocker**
- a bare, unbracketed symbol where the legend applies = **nitpick**

## .see also

- `rule.forbid.domain-term-synonyms` (bhrain/learner) — the word form of this rule
- `im_an.obsessive_learner.for.domain.glyphs` (bhrain/learner) — one concept, one glyph
- `rule.prefer.emoji-language` — emoji for the vibe; the legend for the change
