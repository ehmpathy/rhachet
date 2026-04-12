# self-review: has-consistent-mechanisms (r3)

## deeper search

searched for extant glob/file utilities:
```
grep: picomatch|micromatch|minimatch → only getAllFilesByGlobs.ts
grep: fast-glob|glob\( → 5 files
```

found extant utilities:
1. `filterPathsByGlob` — filters known paths by globs
2. `filterByGlob` — generic filter with getMatchPath
3. `discoverRoleKeyracks` — discovers keyracks via glob pattern
4. `getAllFilesFromDir` — recursive file enumeration

## mechanism-by-mechanism analysis

### getAllFilesByGlobs vs filterPathsByGlob

| aspect | filterPathsByGlob | getAllFilesByGlobs |
|--------|-------------------|-------------------|
| input | known list of paths + globs | globs only |
| operation | filter known paths | discover files |
| precedence | no | rsync-style 4-level |
| use case | curate boot resources | compile artifacts |

**why not reuse filterPathsByGlob?**
- filterPathsByGlob expects paths as input — requires prior enumeration
- getAllFilesByGlobs discovers files directly via glob
- the precedence logic (user exclude > user include > default exclude > include) is unique to compile

**verdict**: different purposes. filterPathsByGlob filters, getAllFilesByGlobs discovers with precedence.

### getAllFilesByGlobs vs discoverRoleKeyracks

| aspect | discoverRoleKeyracks | getAllFilesByGlobs |
|--------|---------------------|-------------------|
| scope | single fixed pattern | multiple patterns |
| filter | by role name | by precedence rules |
| output | relative paths | absolute paths |

**why not reuse discoverRoleKeyracks?**
- discoverRoleKeyracks is specialized for keyrack.yml discovery
- getAllFilesByGlobs handles arbitrary patterns with configurable precedence

**verdict**: discoverRoleKeyracks is domain-specific. getAllFilesByGlobs is general infrastructure.

### getAllFilesByGlobs vs getAllFilesFromDir

| aspect | getAllFilesFromDir | getAllFilesByGlobs |
|--------|-------------------|-------------------|
| discovery | recursive readdir | glob patterns |
| filter | none | rsync-style precedence |
| dotfiles | follows symlinks | handled via dot: true |

**why not reuse getAllFilesFromDir?**
- getAllFilesFromDir returns all files — no pattern match
- would require post-hoc filter, a duplicate of the precedence logic

**verdict**: getAllFilesFromDir is for enumeration. getAllFilesByGlobs is for pattern-based selection.

## conclusion

each extant utility serves a specific purpose:
- **filterPathsByGlob**: filter known paths
- **filterByGlob**: generic filter with accessor
- **discoverRoleKeyracks**: specialized keyrack discovery
- **getAllFilesFromDir**: full enumeration

**getAllFilesByGlobs** fills a gap: glob-based discovery with rsync-style precedence.

no duplication. the new mechanism serves a distinct purpose not covered by extant utilities.
