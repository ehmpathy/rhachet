#!/usr/bin/env bash
######################################################################
# .what = probe whether a bash subshell runs its parent's EXIT trap
#
# .why  = a dispatcher that cleans per-call files from an EXIT trap must
#         know which children run that trap too: a child that does deletes
#         the files its siblings still read
#
# usage:
#   rhx bash.trap.inherit.probe
#
# guarantee:
#   - prints one line per subshell shape: how many processes ran the parent EXIT trap
#   - writes only under a fresh mktemp dir, removed at the end
######################################################################
set -euo pipefail

dir="$(mktemp -d)"
trap 'rm -rf "$dir"' EXIT

# each case: a parent with an EXIT trap that marks the pid it ran in, then one subshell shape
probe() {
  local label="$1" body="$2"
  bash -c "trap 'echo \"\$BASHPID\" >> \"$dir/$label\"' EXIT; $body" > /dev/null 2>&1 || true
  local runs=0
  [[ -f "$dir/$label" ]] && runs=$(wc -l < "$dir/$label")
  echo "   ├─ $label = the exit trap ran in $runs process(es) (1 = parent only)"
}

echo "heres the read..."
echo ""
echo "🧮 bash.trap.inherit.probe (bash ${BASH_VERSION})"
probe 'bg-subshell-ends' '( true ) & wait'
probe 'bg-subshell-exit0' '( exit 0 ) & wait'
probe 'bg-subshell-term-trap-exit' '( trap "exit 0" TERM; sleep 2 & wait ) & p=$!; sleep 0.3; kill -TERM $p; wait $p'
probe 'bg-subshell-killed-by-term' '( sleep 2 ) & p=$!; sleep 0.3; kill -TERM $p; wait $p'
probe 'fg-subshell-ends' '( true )'

# the dispatcher's shape: the parent traps TERM too, and kills the child the moment it forks,
#   before the child can set a TERM trap of its own
early=0
for _ in $(seq 1 200); do
  rm -f "$dir/early"
  bash -c "trap 'echo x >> \"$dir/early\"' EXIT; trap 'exit 143' TERM; ( trap 'exit 0' TERM; sleep 2 & wait ) & p=\$!; kill -TERM \$p; wait \$p" > /dev/null 2>&1 || true
  [[ -f "$dir/early" ]] && (( $(wc -l < "$dir/early") > 1 )) && early=$((early + 1))
done
echo "   ├─ bg-subshell-term-at-fork = the parent exit trap ran in the child in ${early} of 200 runs"
echo "   └─ done"
