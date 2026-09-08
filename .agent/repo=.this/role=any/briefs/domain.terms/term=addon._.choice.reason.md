# domain.term.choice.reason: addon

## .etymology

node's own word. the runtime calls a compiled `.node` file a **native addon**, and its loader
error says so verbatim: `Failed to load native module: pty.node`. we adopt upstream's noun rather
than coin beside it — the emitter already named it.

`addon` over `native module` for one reason that decides a contract: **the two must not collapse.**

| word | what it names | can it be absent alone? |
|---|---|---|
| **module** | the js package (`node-pty`) | yes — MODULE_NOT_FOUND |
| **addon** | the compiled `.node` inside it | yes — the package is PRESENT, the binary is not |

that second row is the wish's whole defect. the field report read as "node-pty is absent"; the
consumer clamp proved the package was **present but unbuilt** — node-pty's own `lib/utils.js` was
reached and ran. one word for both would have made that distinction unsayable, and it is the
distinction the cure turns on.

rejected:

| word | why not |
|---|---|
| `binary` | ambiguous with our own `bin/*.bc` and with the cli binary. `rhx` is a binary; so is `pty.node`; they are unrelated |
| `native module` | two words, and it overloads `module` — see the table above |
| `lib` | node-pty's own dir name, so it names a location rather than the artifact |
| `prebuilt` | an ADJECTIVE about provenance, never the artifact. an addon compiled on the host is an addon too |

## .prebuild is a narrower kin, not a synonym

`prebuild` stays a legitimate distinct term: it is **an addon shipped in the tarball rather than
compiled at install time**. so every prebuild is an addon; not every addon is a prebuild. the
platform-support decision reads exactly that way — `getPtyPlatformSupport` answers "does upstream
ship a PREBUILD for this host", never "is there an addon".

## .evidence

- **it is not one filename, and that fact has already produced three defects.**
  `asPtyAddonFileName` is its single owner: `pty.node` on posix, `conpty.node` on win32 —
  node-pty loads `loadNativeModule('pty')` from `lib/index.js` and `loadNativeModule('conpty')`
  from `lib/windowsPtyAgent.js`. a probe hardcoded to `pty.node` reads FALSE on windows even
  where the addon is present and healthy.
- **the absent-vs-unbuilt split is measured.** the hermetic consumer clamp reproduced the field
  error verbatim at `1.1.0` — `Cannot find module './prebuilds/linux-x64//pty.node'` — with the
  package installed. absent MODULE, absent ADDON, and unbuilt addon are three states, and the
  report classes them differently.
- **the term reaches a test asset.** `stubPtyAddonAbsent.cjs` is named for the CONDITION it
  fakes (the addon will not load), never for its mechanism (a `Module._load` patch), so a reader
  learns what it proves from its name.

## .invariants

- an addon's filename is read from `asPtyAddonFileName`, never written as a literal
- "the module is absent" and "the addon is absent" are distinct claims; neither implies the other
- `prebuild` narrows `addon` (shipped, not compiled); it never substitutes for it
