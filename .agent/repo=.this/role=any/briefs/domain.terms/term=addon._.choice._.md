# domain.term: addon

term.chosen   = addon
term.kind     = noun
term.synonyms.forbidden:
- binary
- native module
- nativemodule
- lib
- prebuilt

## .what
a compiled, platform-specific artifact a node process loads at runtime — here, node-pty's pty.

## .refs
- src/domain.operations/clone/pty/getPtyModuleOrNull.ts        # isPtyAddonLoadError, PTY_ADDON_LOAD_MARKERS
- src/.test/assets/asPtyAddonFileName.ts                       # the one owner of its filename
- src/.test/assets/stubPtyAddonAbsent.cjs                      # the fault-injection preload
- src/domain.operations/clone/pty/getPtyPlatformSupport.ts     # which hosts ship one

## .reason
see the ref-level cluster beside this choice:
- `term=addon._.choice.reason.md` — etymology, the module-vs-addon split, evidence
