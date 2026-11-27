#!/usr/bin/env bash
######################################################################
# .what = cut a pnpm patch of a published rhachet release that carries
#         this tree's build
#
# .why  = a fix a director tree needs before the next release ships as a
#         pnpm patch (patchedDependencies). the patch is the diff of the
#         published package against that package with this tree's dist
#         and text bins laid over it
#
# usage:
#   rhx pnpm.patch.cut --into <path.patch> [--version <x.y.z>]
#
# options:
#   --into     where to write the patch (required)
#   --version  the published release to patch (default: package.json version)
#   --prove    install the patched release into a scratch consumer, then
#              prove a stop holds on a stray mod file through the bun route
#
# guarantee:
#   - reads dist/ as built; refuses if dist/.build.stamp is absent (exit 2)
#   - lays dist/ and the tracked text bins (rhx, run, run.jit,
#     hooks.dispatch.sh) over the published package
#   - routes bin/run.bun to run.jit: the bun .bc binaries embed code at
#     compile time, and a text patch cannot carry a rebuilt binary, so
#     the published .bc would run the unpatched code
#   - writes a git-format diff with a/ and b/ prefixes, the shape
#     pnpm patchedDependencies applies
#   - touches no tracked file but the --into path; scratch lives in .temp/
######################################################################

set -euo pipefail

# parse args; the dispatcher's own flags arrive in argv too
INTO=""
VERSION=""
PROVE="false"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --into) INTO="$2"; shift 2 ;;
    --version) VERSION="$2"; shift 2 ;;
    --prove) PROVE="true"; shift ;;
    --repo|--role|--skill) shift 2 ;;
    -h|--help)
      echo "usage: rhx pnpm.patch.cut --into <path.patch> [--version <x.y.z>]"
      exit 0
      ;;
    *)
      echo "✋ ConstraintError: unknown arg: $1" >&2
      echo "   └─ usage: rhx pnpm.patch.cut --into <path.patch> [--version <x.y.z>]" >&2
      exit 2
      ;;
  esac
done

# the patch needs a home
if [[ -z "$INTO" ]]; then
  echo "✋ ConstraintError: --into is required" >&2
  echo "   └─ fix: rhx pnpm.patch.cut --into patches/rhachet@<version>.patch" >&2
  exit 2
fi

# the patch carries the build, so a build must exist
GITROOT="$(git rev-parse --show-toplevel)"
if [[ ! -f "$GITROOT/dist/.build.stamp" ]]; then
  echo "✋ ConstraintError: no build to patch with (dist/.build.stamp absent)" >&2
  echo "   └─ fix: npm run build, then rerun" >&2
  exit 2
fi

# the release to patch defaults to the one this tree declares
if [[ -z "$VERSION" ]]; then
  VERSION="$(node -p "require('$GITROOT/package.json').version")"
fi

# scratch: pkg = a git repo whose one commit is the published package, so a diff of its
#   tree names each file by its path in the package, the shape pnpm applies
SCRATCH="$GITROOT/.temp/pnpm.patch.cut/$VERSION"
PKG="$SCRATCH/pkg"
rm -rf "$SCRATCH"
mkdir -p "$PKG"

# fetch and unpack the published release, then commit it as the base
TARBALL_URL="$(pnpm view "rhachet@$VERSION" dist.tarball)"
curl -fsSL "$TARBALL_URL" -o "$SCRATCH/release.tgz"
tar -xzf "$SCRATCH/release.tgz" -C "$PKG" --strip-components=1
rm -f "$PKG/dist/.build.stamp"
git -C "$PKG" init -q
git -C "$PKG" add -A -f
git -C "$PKG" -c user.name=pnpm.patch.cut -c user.email=pnpm.patch.cut@example.com commit -q -m "rhachet@$VERSION as published"

# lay this build over the base
rm -rf "$PKG/dist"
cp -R "$GITROOT/dist" "$PKG/dist"
rm -f "$PKG/dist/.build.stamp"
for BIN in rhx run run.jit hooks.dispatch.sh; do
  cp "$GITROOT/bin/$BIN" "$PKG/bin/$BIN"
done

# route the bun fast path through jit, since the .bc binaries hold the published code
cat > "$PKG/bin/run.bun" <<'RUNBUN'
#!/usr/bin/env bash
######################################################################
# .what = bun dispatcher for rhachet CLI, routed through jit by a patch
# .why = a pnpm patch cannot carry the rebuilt .bc binaries, which embed
#        code at compile time; jit reads the patched dist/ instead
######################################################################

# the dir this file lives in (follows symlinks)
DIR_SELF="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

exec "$DIR_SELF/run.jit" "$@"
RUNBUN

# the diff of the base against the build laid over it
mkdir -p "$(dirname "$INTO")"
INTO_ABS="$(cd "$(dirname "$INTO")" && pwd)/$(basename "$INTO")"
git -C "$PKG" add -A -f
git -C "$PKG" diff --cached --no-color --src-prefix=a/ --dst-prefix=b/ > "$INTO_ABS"

# prove, on ask: install the patched release into a scratch consumer, then hold a stop
#   over a stray mod file through the bun route, which reaches the patched dist only via jit
PROOF="skipped (pass --prove)"
if [[ "$PROVE" == "true" ]]; then
  CONSUMER="$SCRATCH/consumer"
  FIXTURE="$SCRATCH/fixture"
  mkdir -p "$CONSUMER/patches" "$FIXTURE/.agent/repo=.mods"
  cp "$INTO_ABS" "$CONSUMER/patches/rhachet@$VERSION.patch"
  cat > "$CONSUMER/package.json" <<JSON
{
  "name": "pnpm-patch-proof",
  "private": true,
  "dependencies": { "rhachet": "$VERSION" },
  "pnpm": { "patchedDependencies": { "rhachet@$VERSION": "patches/rhachet@$VERSION.patch" } }
}
JSON
  # a failed install is the patch failed to apply: show pnpm's own words, on stderr
  pnpm install --dir "$CONSUMER" --ignore-workspace --reporter=append-only 1>&2
  git -C "$FIXTURE" init -q
  echo "a note a human left" > "$FIXTURE/.agent/repo=.mods/notes.md"
  set +e
  SWEEP_STDERR="$(cd "$FIXTURE" && "$CONSUMER/node_modules/.bin/rhachet" roles cost --all --when hook.onStop 2>&1 1>/dev/null)"
  SWEEP_EXIT=$?
  set -e
  if [[ "$SWEEP_EXIT" -ne 2 ]] || [[ "$SWEEP_STDERR" != *"1 mod fault, held"* ]] || [[ "$SWEEP_STDERR" != *"notes.md"* ]]; then
    echo "💥 MalfunctionError: the patched release did not hold the stop on a stray mod file" >&2
    echo "   ├─ exit = $SWEEP_EXIT (expected 2)" >&2
    echo "   └─ stderr" >&2
    echo "$SWEEP_STDERR" | sed 's/^/      │  /' >&2
    exit 1
  fi
  PROOF="applied; the stop held on a stray mod file, exit 2, through the jit route"
fi

# report
FILES="$(grep -c '^diff --git ' "$INTO_ABS" || true)"
echo "🐢 righteous"
echo ""
echo "🧮 pnpm.patch.cut --into $INTO --version $VERSION"
echo "   ├─ release = rhachet@$VERSION"
echo "   ├─ files   = $FILES"
echo "   ├─ patch   = $INTO"
echo "   ├─ proof   = $PROOF"
echo "   └─ apply, in the tree that needs it"
echo "      ├─ copy the patch to patches/rhachet@$VERSION.patch"
echo "      ├─ add to package.json: \"pnpm\": { \"patchedDependencies\": { \"rhachet@$VERSION\": \"patches/rhachet@$VERSION.patch\" } }"
echo "      └─ pnpm install"
