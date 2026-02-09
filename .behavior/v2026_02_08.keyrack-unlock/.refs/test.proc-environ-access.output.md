=== /proc/$PID/environ access test ===

kernel: 6.9.3-76060903-generic
distro: Pop!_OS 22.04 LTS
ptrace_scope: 1
current user: vlad
current pid: 2997539

target pid: 2997548
target owner: vlad
target permissions: -r-------- 1 vlad vlad 0 Feb  8 13:53 /proc/2997548/environ

--- test 1: read /proc/2997548/environ ---
result: READABLE (exit 0)

--- test 2: extract KEYRACK_TEST_SECRET from /proc/2997548/environ ---
result: SECRET EXTRACTED
value: KEYRACK_TEST_SECRET=s3cr3t_hunter2_d0ntl34k

--- test 3: enumerate /proc/*/environ for KEYRACK_TEST_SECRET ---
  found in pid=2997548: KEYRACK_TEST_SECRET=s3cr3t_hunter2_d0ntl34k
total processes with secret: 1

=== done ===
