#!/usr/bin/env bash
######################################################################
# .what = probe how a bun-compiled binary finds and loads a package of
#         the repo it runs in: createRequire, a node_modules walk, and a
#         runtime import() of the file found
#
# .why  = `roles cost` runs as a bun binary. a node run finds a package
#         of the caller repo via createRequire; a bun binary may not.
#         this shows which lookup works there, apart from any rhachet code
#
# usage:
#   rhx bun.compiled.lookup.probe
#   rhx bun.compiled.lookup.probe --dep-spec 'file:./node_modules/probe-pkg'
#   rhx bun.compiled.lookup.probe --at blackbox/.test/assets/with-mods --pkg rhachet-roles-test
#
# options:
#   --dep-spec   the spec the made repo's package.json declares for the package
#   --at         probe a repo dir that exists (a copy of it), not a made one
#   --pkg        the package to look up in the --at repo
#
# guarantee:
#   - writes only to a temp dir it removes; an --at repo is copied, never touched
#   - prints one line per method: ok, or the error it threw
#   - exit 0 = probed, 2 = bad input or bun absent
######################################################################
set -euo pipefail

DEP_SPEC="1.0.0"
AT=""
PKG="probe-pkg"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dep-spec) DEP_SPEC="$2"; shift 2 ;;
    --at) AT="$2"; shift 2 ;;
    --pkg) PKG="$2"; shift 2 ;;
    --help|-h) awk 'NR > 2 && /^#/ { sub(/^# ?/, ""); print } /^set -euo/ { exit }' "${BASH_SOURCE[0]}" | grep -v '^#*$' || :; exit 0 ;;
    --skill|--repo|--role) shift 2 ;;
    *) echo "✋ ConstraintError: unknown arg '$1'; see --help" >&2; exit 2 ;;
  esac
done
[[ -z "$AT" || -d "$AT" ]] || { echo "✋ ConstraintError: --at must name a dir" >&2; echo "   └─ at = $AT" >&2; exit 2; }

# the repo's own bun, as the build uses it, else one on the path
GITROOT=$(git rev-parse --show-toplevel)
[[ -x "$GITROOT/node_modules/.bin/bun" ]] && PATH="$GITROOT/node_modules/.bin:$PATH"
command -v bun > /dev/null || { echo "✋ ConstraintError: bun is required" >&2; echo "   └─ hint: pnpm install, which installs the repo's bun" >&2; exit 2; }

DIR=$(mktemp -d)
trap 'rm -rf "$DIR"' EXIT
mkdir -p "$DIR/build"

# the repo: a copy of --at, else one package whose entry is a commonjs file with one export
if [[ -n "$AT" ]]; then
  cp -R "$AT" "$DIR/repo"
else
  mkdir -p "$DIR/repo/node_modules/probe-pkg"
  printf '{ "name": "repo", "dependencies": { "probe-pkg": "%s" } }\n' "$DEP_SPEC" > "$DIR/repo/package.json"
  printf '{ "name": "probe-pkg", "version": "1.0.0", "main": "index.js" }\n' > "$DIR/repo/node_modules/probe-pkg/package.json"
  printf 'exports.getRoleRegistry = () => ({ roles: ["probe"] });\n' > "$DIR/repo/node_modules/probe-pkg/index.js"
fi

# the probe: each lookup in turn, then an import() of the file the walk found
cat > "$DIR/build/probe.ts" << 'PROBE'
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const pkg = process.env.PROBE_PKG ?? 'probe-pkg';
const fromPackageJson = join(process.cwd(), 'package.json');
const report = (method: string, outcome: string) => console.log(`${method} = ${outcome}`);
const asFailure = (error: unknown) => {
  const { name, message, code } = error as { name?: unknown; message?: unknown; code?: unknown };
  return `failed ${String(name)} code=${String(code)} — ${String(message)}`;
};

try {
  const found = createRequire(fromPackageJson).resolve(pkg);
  report('createRequire', `ok ${found}`);
} catch (error) {
  report('createRequire', asFailure(error));
}

try {
  const found = require.resolve(pkg, { paths: [process.cwd()] });
  report('require.paths', `ok ${found}`);
} catch (error) {
  report('require.paths', asFailure(error));
}

const dirPkg = join(process.cwd(), 'node_modules', pkg);
const main = JSON.parse(readFileSync(join(dirPkg, 'package.json'), 'utf-8')).main ?? 'index.js';
const entry = join(dirPkg, main);
report('walk', existsSync(entry) ? `ok ${entry}` : `absent ${entry}`);

const importAtRuntime = new Function('s', 'return import(s)') as (s: string) => Promise<Record<string, unknown>>;
importAtRuntime(pathToFileURL(entry).href)
  .then((mod) => {
    const fn = (mod.getRoleRegistry ?? (mod.default as Record<string, unknown>)?.getRoleRegistry) as () => unknown;
    report('import.fileurl', `ok ${typeof fn === 'function' ? 'getRoleRegistry found' : 'no getRoleRegistry'}`);
  })
  .catch((error: Error) => report('import.fileurl', asFailure(error)));
PROBE

( cd "$DIR/build" && bun build ./probe.ts --compile --outfile ./probe.bc > /dev/null )
echo "🔭 bun $(bun --version), compiled, pkg = $PKG"
( cd "$DIR/repo" && PROBE_PKG="$PKG" "$DIR/build/probe.bc" )
