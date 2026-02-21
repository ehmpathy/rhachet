# ref: LSM install process comparison

## .what

what does the install/setup process look like for each LSM option?

extends: `extant-lsm-options.ref.md`

---

## .AppArmor (recommended for v1.5)

### prerequisites

```bash
# check if AppArmor is available
aa-status  # shows current status, or "command not found"

# typical output on Ubuntu:
# apparmor module is loaded.
# 47 profiles are loaded.
```

most Ubuntu/Debian systems ship with AppArmor enabled by default.

### install keyrack profile

**step 1: ship profile with keyrack**

```bash
# keyrack package includes:
# /usr/share/keyrack/apparmor/keyrack-socket
```

profile content:
```
# /usr/share/keyrack/apparmor/keyrack-socket

#include <tunables/global>

profile keyrack-socket-access flags=(attach_disconnected) {
  #include <abstractions/base>

  # programs allowed to access keyrack socket
  # user adds their own paths here or via keyrack CLI
  /usr/bin/git rw /run/user/*/keyrack/keyrack.sock,
  /usr/bin/ssh rw /run/user/*/keyrack/keyrack.sock,
  /usr/bin/node rw /run/user/*/keyrack/keyrack.sock,
}
```

**step 2: user installs profile (one-time, requires sudo)**

```bash
# option A: manual install
sudo cp /usr/share/keyrack/apparmor/keyrack-socket /etc/apparmor.d/
sudo apparmor_parser -r /etc/apparmor.d/keyrack-socket

# option B: keyrack CLI helper
rhx keyrack install apparmor
# prompts for sudo, copies profile, reloads
```

**step 3: verify**

```bash
aa-status | grep keyrack
# keyrack-socket-access (enforce)
```

### update ACL (add new program)

```bash
# edit profile
sudo nano /etc/apparmor.d/keyrack-socket
# add: /usr/local/bin/myapp rw /run/user/*/keyrack/keyrack.sock,

# reload
sudo apparmor_parser -r /etc/apparmor.d/keyrack-socket
```

or via CLI helper:
```bash
rhx keyrack acl add --path /usr/local/bin/myapp
# prompts for sudo, edits profile, reloads
```

### uninstall

```bash
sudo rm /etc/apparmor.d/keyrack-socket
sudo systemctl reload apparmor
```

### user experience summary

| step | requires sudo | frequency |
|------|---------------|-----------|
| install profile | yes | once |
| add program to ACL | yes | rare |
| remove program from ACL | yes | rare |
| uninstall | yes | once |

**friction**: low. one sudo at install time. rare sudo for ACL changes.

---

## .SELinux

### prerequisites

```bash
# check if SELinux is available and enforced
getenforce
# Enforced, Permissive, or Disabled

sestatus
# shows detailed status
```

RHEL/Fedora/CentOS ship with SELinux. Ubuntu/Debian typically don't.

### install keyrack policy

**step 1: create policy module**

```bash
# keyrack ships:
# /usr/share/keyrack/selinux/keyrack.te   (type enforcement)
# /usr/share/keyrack/selinux/keyrack.fc   (file contexts)
# /usr/share/keyrack/selinux/keyrack.if   (interface)
```

keyrack.te:
```
policy_module(keyrack, 1.0)

type keyrack_socket_t;
files_type(keyrack_socket_t)

type keyrack_daemon_t;
type keyrack_daemon_exec_t;
init_daemon_domain(keyrack_daemon_t, keyrack_daemon_exec_t)

# daemon can create socket
allow keyrack_daemon_t keyrack_socket_t:unix_stream_socket { create listen accept };

# git can connect
allow git_t keyrack_socket_t:unix_stream_socket connectto;
```

keyrack.fc:
```
/run/user/[0-9]+/keyrack/keyrack\.sock  gen_context(system_u:object_r:keyrack_socket_t,s0)
```

**step 2: compile and install policy (requires root)**

```bash
# compile
cd /usr/share/keyrack/selinux
make -f /usr/share/selinux/devel/Makefile keyrack.pp

# install
sudo semodule -i keyrack.pp

# apply file contexts
sudo restorecon -Rv /run/user/*/keyrack/
```

or via CLI helper:
```bash
rhx keyrack install selinux
# compiles policy, prompts for sudo, installs, restorecon
```

**step 3: verify**

```bash
semodule -l | grep keyrack
# keyrack 1.0

ls -Z /run/user/1000/keyrack/keyrack.sock
# system_u:object_r:keyrack_socket_t:s0
```

### update ACL (add new program)

this is the painful part — SELinux ACL changes require policy recompile:

```bash
# edit keyrack.te
sudo nano /usr/share/keyrack/selinux/keyrack.te
# add: allow myapp_t keyrack_socket_t:unix_stream_socket connectto;

# recompile
cd /usr/share/keyrack/selinux
make -f /usr/share/selinux/devel/Makefile keyrack.pp

# reinstall
sudo semodule -i keyrack.pp
```

**note**: the program must already have an SELinux domain (myapp_t). if it doesn't, you also need to create type enforcement for it.

### uninstall

```bash
sudo semodule -r keyrack
```

### user experience summary

| step | requires sudo | frequency | complexity |
|------|---------------|-----------|------------|
| install policy | yes | once | high |
| add program to ACL | yes | rare | high (policy edit + recompile) |
| ensure program has domain | yes | per-program | high (may need new policy) |
| uninstall | yes | once | low |

**friction**: high. requires SELinux knowledge. every ACL change needs policy recompile.

---

## .SELinux + IMA

### prerequisites

all of SELinux prerequisites, plus:

```bash
# check if IMA is enabled
cat /sys/kernel/security/ima/policy
# shows current IMA policy

# check for IMA-signed binaries
getfattr -n security.ima /usr/bin/git
# shows IMA signature if present
```

most systems don't have IMA enabled by default. requires kernel config + signed binaries.

### install

**step 1: enable IMA in kernel (requires reboot)**

```bash
# add to kernel command line (grub)
ima_policy=tcb ima_appraise=enforce
```

**step 2: sign all binaries you want to run**

```bash
# generate IMA key (once)
openssl genrsa -out /etc/keys/privkey.pem 2048
openssl req -new -x509 -key /etc/keys/privkey.pem -out /etc/keys/x509.pem

# sign each binary
evmctl ima_sign -k /etc/keys/privkey.pem /usr/bin/git
evmctl ima_sign -k /etc/keys/privkey.pem /usr/bin/ssh
# ... every binary on the system
```

**step 3: install SELinux policy (same as above)**

**step 4: configure IMA policy**

```bash
# /etc/ima/ima-policy
dont_measure fsmagic=0x9fa0
measure func=BPRM_CHECK
appraise func=BPRM_CHECK appraise_type=imasig
```

### update ACL

same as SELinux, plus:

```bash
# sign the new binary
evmctl ima_sign -k /etc/keys/privkey.pem /usr/local/bin/myapp

# add to SELinux policy (recompile)
# ...
```

### user experience summary

| step | requires | frequency | complexity |
|------|----------|-----------|------------|
| enable IMA kernel | reboot | once | high |
| generate IMA key | root | once | medium |
| sign every binary | root | per-binary | very high |
| install SELinux policy | root | once | high |
| add program to ACL | root + sign + policy | rare | very high |

**friction**: extreme. not practical for typical users. only for high-security environments with dedicated ops.

---

## .eBPF-LSM

### prerequisites

```bash
# check kernel version
uname -r
# needs 5.7+ for BPF_LSM, 5.11+ for bpf_ima_inode_hash

# check if BPF LSM is enabled
cat /sys/kernel/security/lsm
# should include "bpf" in the list

# check if IMA is available (for hash)
cat /sys/kernel/security/ima/policy
```

### install

**step 1: keyrack daemon loads BPF at startup (no user action)**

```typescript
// inside keyrack daemon
if (isEbpfLsmSupported()) {
  await loadKeyrackLsm({ socketPath, allowedHashes });
}
```

the daemon needs CAP_BPF capability:

```bash
# option A: run daemon as root (not recommended)
sudo rhx keyrack daemon start

# option B: grant CAP_BPF to keyrack binary
sudo setcap cap_bpf,cap_perfmon+ep /usr/bin/rhx

# option C: BPF token delegation (linux 6.9+)
# admin creates token, grants to keyrack user
```

**step 2: verify**

```bash
bpftool prog list | grep keyrack
# shows loaded BPF program

bpftool map dump name allowed_hashes
# shows ACL entries
```

### update ACL (add new program)

no root required after initial setup:

```bash
# keyrack CLI updates BPF map directly
rhx keyrack acl add --hash abc123def456...

# or by path (keyrack computes hash)
rhx keyrack acl add --path /usr/local/bin/myapp
```

under the hood:
```bash
bpftool map update name allowed_hashes key hex $HASH value hex 01
```

### user experience summary

| step | requires | frequency | complexity |
|------|----------|-----------|------------|
| initial setup | CAP_BPF grant (once) | once | medium |
| daemon start | auto (no action) | per-session | none |
| add program to ACL | no root | anytime | low |
| remove from ACL | no root | anytime | low |

**friction**: medium at install (capability grant), then zero ongoing friction.

---

## .comparison: install friction

| approach | install | ACL update | ongoing ops |
|----------|---------|------------|-------------|
| socket 0600 only | none | n/a | none |
| AppArmor | sudo (once) | sudo (rare) | low |
| SELinux | sudo + policy write | sudo + policy recompile | medium |
| SELinux + IMA | kernel config + sign all binaries | sudo + sign + policy | extreme |
| eBPF-LSM | CAP_BPF grant (once) | no root | none |

---

## .recommendation

### for most users: AppArmor

- ships on Ubuntu/Debian by default
- one-time sudo to install profile
- rare sudo for ACL changes
- familiar to sysadmins

### for high-security / dynamic ACL: eBPF-LSM

- one-time capability grant
- no sudo for ACL changes after setup
- strongest security (kernel-enforced, hash-based)
- requires modern kernel (5.11+)

### avoid for keyrack: SELinux / SELinux+IMA

- too much operational burden
- ACL changes require policy recompile
- IMA requires signed binaries (impractical)
- better suited for enterprise/government with dedicated security teams

---

## .install UX goal

ideal keyrack install experience:

```bash
# install keyrack
npm install -g @ehmpathy/rhachet

# first run: detect capabilities, suggest setup
rhx keyrack daemon start
#
# 🐢 keyrack daemon
#
# security options detected:
#   ✅ socket 0600 (enabled by default)
#   ⚠️  AppArmor available — run `rhx keyrack install apparmor` for defense-in-depth
#   ❌ eBPF-LSM not available (kernel 5.4 < 5.11)
#
# daemon started at /run/user/1000/keyrack/keyrack.sock
```

user can optionally enhance security:

```bash
rhx keyrack install apparmor
# prompts for sudo, installs profile, confirms success
```

no mandatory root. no mandatory kernel config. security layers are opt-in enhancements.
