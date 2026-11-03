# F8 — a modded role is materialized as per-file links

- **fork**: how the mod reaches readers — (a) each reader merges `.mods` into the role at read time, (b) the role's `briefs/` and `skills/` become per-file links, with shadows and additions linked into `.mods` and `not`s absent
- **taken**: (b). a skill sources its peer files from its own dir (`git.commit.sponsor.sh:29-37`), so a shadow run from `.mods` would find none of them — no read-time merge can fix where bash looks. (b) also makes `run --skill` see one file per name, and every reader mod-blind
- **rework**: dirty once built — the link layout and every render path's re-materialize depend on it
- **confidence**: 70% — a new mod file is not live until a re-materialize; and per-file links are a second layout beside per-dir links
- **risk**: high — a stale link set boots the un-modded role, or a shadow skill that cannot find its peers, with no error at boot; that is a behavior harm a clone meets silently. and once built, the layout is under every render path
- **where**: `1.vision.yield.md` `### the merged view`; case 9
- **verdict**: —
