# self-review r11: has-behavior-declaration-adherance
## summary

third adherance review. r10 verified all major requirements. this review cross-checks edge behaviors.
## adherance verification

### edge: template directories preserved

vision line 61: skills include template/** and templates/** patterns

blueprint line 101-102: globs array includes both template patterns.

why it holds: template directories match via glob, not extension. contents copied regardless of file type.
### edge: .min files for briefs

vision line 60: briefs include **.min alongside **.md

blueprint line 89: globs array includes both extensions.

why it holds: .min files are condensed briefs. both extensions handled identically.
### edge: role-level files case sensitivity

vision lines 63-65: readme.md, boot.yml, keyrack.yml

blueprint lines 120-128: checks for lowercase filenames exactly.

why it holds: lowercase filenames match vision exactly. case-sensitive filesystems will reject README.md.
### edge: multiple registered dirs per artifact type

vision line 49: for each roles directory... apply globs

blueprint lines 83-91: iterates extractDirUris then applies globs per dir.

why it holds: roles can register multiple briefs dirs. each dir processed independently.
### edge: absent optional dirs

blueprint lines 85-87, 96-98, 110-112: throws BadRequestError if dir not found.

why it holds: registered dirs must exist. if role declares dir, it must be present.
### edge: custom include wins over default exclusion

criteria matrix 2.2 line 45: present include + absent exclude + default match = included

blueprint lines 178-186: include checked before defaultExclusions.

why it holds: user can rescue files from default exclusion via --include.
### edge: empty include/exclude arrays

blueprint lines 174-176, 178-180: uses optional chaining pattern.

why it holds: undefined or empty arrays short-circuit via optional chaining.
## conclusion

no deviations found in edge case handling:
- template directories: glob-based, extension-agnostic (correct)
- .min briefs: same treatment as .md (correct)
- case sensitivity: lowercase matches vision (correct)
- multiple dirs: per-dir iteration (correct)
- absent dirs: fail-fast with clear error (correct)
- custom include: wins over default exclusion (correct)
- empty arrays: handled via optional chaining (correct)