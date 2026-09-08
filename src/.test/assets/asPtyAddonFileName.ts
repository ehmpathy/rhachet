/**
 * .what = the addon filename node-pty loads for a given platform
 *
 * .why  = it is NOT one name, and the belief that it is has already produced three
 *   defects in this repo — a probe, a clamp, and a doc comment, each of which assumed
 *   `pty.node` and each of which was wrong on win32. upstream loads two addons:
 *   - `node-pty/lib/index.js`           → `loadNativeModule('pty')`    on non-win32
 *   - `node-pty/lib/windowsPtyAgent.js` → `loadNativeModule('conpty')` on win32
 *
 *   ⚠️ cited by SYMBOL, never by line. these are call sites in a DEPENDENCY under an active
 *   bump, so a line span expires at the next upstream refactor with no test to redden when
 *   it does — and this file is the single owner of the fact, which makes a decaying citation
 *   here the most expensive kind. `loadNativeModule` is greppable and survives the bump.
 *
 *   so a probe hardcoded to `pty.node` reads FALSE on windows even when the prebuild is
 *   present and healthy — the win32 dirs ship `conpty.node` and no `pty.node` at all.
 *   a test written that way would go green at BOTH the broken and the fixed version,
 *   which makes the win32 row of acceptance #5 unverifiable by the very test meant to
 *   verify it.
 *
 * .why here = `rule.require.shared-test-fixtures` extracts at **2+** test files, not at
 *   the generic rule-of-three. a fact this easy to get wrong earns one owner outright,
 *   so there is exactly one place to correct if upstream ever renames either addon.
 */
export const asPtyAddonFileName = (platform: string): string =>
  platform === 'win32' ? 'conpty.node' : 'pty.node';
