# ref: macOS code-signed ACLs (deep dive)

## .what

deep dive on how macOS Keychain uses code signatures to enforce per-item access control — the mechanism that enables same-user process isolation.

---

## .the problem it solves

on unix systems, any process that runs as user X can access resources owned by user X. this includes:
- files with 0600 permissions
- unix sockets
- shared memory

so if a secret manager stores credentials accessible via a socket, any process that runs as the same user can read all secrets.

macOS Keychain solves this via **code-signed ACLs**: each keychain item has an access control list that specifies which *applications* (identified by cryptographic signature) can access it — not just which *users*.

---

## .code signatures explained

### what is a code signature?

a code signature is a cryptographic proof that:
1. the code was created by a specific developer (identity)
2. the code has not been modified since it was signed (integrity)

```
┌─────────────────────────────────────────────────────┐
│ application binary                                  │
├─────────────────────────────────────────────────────┤
│ code signature blob                                 │
│   ├── hash of every page of code                    │
│   ├── developer certificate (who signed it)        │
│   ├── certificate chain (back to Apple root CA)    │
│   └── entitlements (what the app is allowed to do) │
└─────────────────────────────────────────────────────┘
```

### how code sign works

1. **developer obtains certificate** from Apple (requires Apple Developer account)
2. **developer signs the app** with `codesign` tool:
   ```bash
   codesign --sign "Developer ID Application: Acme Corp" MyApp.app
   ```
3. **signature includes**:
   - hash of every 4KB page of the executable
   - developer's certificate (public key + identity)
   - chain of trust back to Apple's root certificate authority
   - entitlements (capabilities the app requests)

4. **notarization** (optional but required for distribution):
   - developer uploads app to Apple
   - Apple scans for malware
   - Apple issues a "ticket" that proves the app was checked
   - ticket is stapled to the app or fetched online at runtime

### why forge of a signature is hard

to forge a valid code signature, an attacker would need to:

| attack vector | why it fails |
|---------------|--------------|
| modify binary after sign | hash mismatch — signature verification fails |
| sign with fake certificate | certificate not issued by Apple CA — chain verification fails |
| steal developer's sign key | requires access to their private key (hardware token or Keychain) |
| create fake Apple root CA | impossible — root CA is embedded in macOS and hardware |

the security relies on:
- **asymmetric cryptography**: only the private key can create valid signatures
- **certificate chain**: every cert must chain back to Apple's root CA
- **runtime verification**: kernel checks signatures when code loads

---

## .keychain ACLs explained

### anatomy of a keychain item ACL

each keychain item has an access control list (ACL) that specifies:

```
keychain item: "GitHub Personal Access Token"
├── ACL entries:
│   ├── /Applications/Terminal.app
│   │     └── must be signed by: Apple Inc (ABCDEF1234)
│   ├── /usr/bin/git
│   │     └── must be signed by: Apple Inc (ABCDEF1234)
│   └── /Applications/MyApp.app
│         └── must be signed by: Acme Corp (XYZ9876543)
├── access policy:
│   └── "confirm before allow" | "allow after first unlock" | "always require password"
└── biometric policy (optional):
    └── "require Touch ID" | "require Face ID"
```

### how ACL enforcement works

when an app requests a keychain item:

```
1. App calls SecItemCopyMatching() for "GitHub Token"
                    │
                    ▼
2. Security framework asks kernel: "what is this process's code signature?"
                    │
                    ▼
3. Kernel returns code directory hash (CDHASH) of the caller binary
                    │
                    ▼
4. Security framework checks:
   a. is this CDHASH in the item's ACL?
   b. is the signature still valid? (binary not modified)
   c. does the certificate chain verify back to a trusted root?
                    │
                    ▼
5. If all checks pass AND access policy allows:
   └── return the secret

   If CDHASH not in ACL:
   └── prompt user: "MyApp wants to access GitHub Token. Allow?"

   If signature invalid:
   └── deny access (no prompt, just fail)
```

### the code directory hash (CDHASH)

the CDHASH is a cryptographic fingerprint of an application:

```bash
# view an app's CDHASH
codesign -dvvv /Applications/Terminal.app 2>&1 | grep CDHash
# CDHash=abc123def456...
```

the CDHASH includes:
- hash of all code pages
- hash of the Info.plist
- hash of entitlements
- hash of resources

if ANY byte of the app changes, the CDHASH changes. this is what makes code-signed ACLs resistant to tamper.

---

## .why this is secure

### attack scenarios and defenses

| attack | defense |
|--------|---------|
| malware runs as same user | malware's CDHASH not in ACL → access denied or user prompted |
| malware modifies Terminal.app | signature becomes invalid → kernel refuses to run it |
| malware injects code into Terminal | process's CDHASH changes → ACL check fails |
| malware creates fake "Terminal.app" | different CDHASH than real Terminal → not in ACL |
| malware intercepts Keychain API calls | API is in kernel/system framework → can't be intercepted without SIP disable |
| user is tricked into allow access | user sees prompt with app name → social engineer attack (human factor) |

### layers of defense

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Code signature verification                        │
│   - kernel verifies signature at load time                  │
│   - modified binaries won't run at all                      │
├─────────────────────────────────────────────────────────────┤
│ Layer 2: CDHASH-based ACL                                   │
│   - only specific signed apps can access each item          │
│   - path is not enough — signature must match               │
├─────────────────────────────────────────────────────────────┤
│ Layer 3: User confirmation prompts                          │
│   - unrecognized apps trigger visible prompt                │
│   - user must explicitly approve access                     │
├─────────────────────────────────────────────────────────────┤
│ Layer 4: Biometric (optional)                               │
│   - Touch ID / Face ID required per-access                  │
│   - even if malware tricks user, biometric is hard to fake  │
├─────────────────────────────────────────────────────────────┤
│ Layer 5: System Integrity Protection (SIP)                  │
│   - prevents modification of system binaries                │
│   - prevents injection into system processes                │
│   - prevents disable of security features                   │
└─────────────────────────────────────────────────────────────┘
```

### the "partition list" (access groups)

modern macOS uses "partition lists" to further restrict access:

```
keychain item ACL:
  partition list:
    - apple:            # Apple-signed apps only
    - apple-tool:       # Apple command-line tools
    - teamid:ABCD1234:  # apps signed by specific team
```

this prevents a compromised third-party app from access to items that should only be accessed by Apple's own tools.

---

## .runtime verification

### kernel-level enforcement

code signature verification happens in the kernel (XNU), not in userspace:

```
┌──────────────────────────────────────────────────┐
│ Userspace                                        │
│   ├── App requests keychain item                 │
│   └── Security.framework calls kernel            │
├──────────────────────────────────────────────────┤
│ Kernel (XNU)                                     │
│   ├── mac_vnode_check_signature()                │
│   │     └── verifies code signature on disk      │
│   ├── cs_blob validation                         │
│   │     └── checks signature blob in memory      │
│   └── returns CDHASH to Security.framework       │
├──────────────────────────────────────────────────┤
│ Hardware (Secure Enclave)                        │
│   └── stores biometric data, device keys         │
│   └── biometric verification happens here        │
└──────────────────────────────────────────────────┘
```

malware cannot intercept or fake these checks because:
- kernel code is protected by SIP
- Secure Enclave is a separate processor with its own firmware
- signature verification uses hardware-backed keys

### page-level verification

macOS verifies signatures at the **page level** (4KB chunks):

1. when an app first loads, only the first few pages are verified
2. as the app executes and touches more pages, each page is verified on-demand
3. if any page fails verification, the process is killed immediately

this means an attacker cannot:
- modify a page after initial load (verification happens on access)
- inject code into a run process (new pages won't verify)
- use binary patch (any modification invalidates the hash)

---

## .limitations

### what code-signed ACLs don't protect against

| scenario | why ACLs don't help |
|----------|---------------------|
| user clicks "Allow" on prompt | social engineer attack — human must make good decisions |
| app is in ACL but compromised | if attacker controls an allowed app, they have access |
| user disables SIP | all bets are off — kernel protections disabled |
| hardware attack (physical access) | Secure Enclave protects against some, not all |
| zero-day in kernel | if kernel is compromised, all userspace protections fail |

### developer friction

- apps must be signed with valid Apple developer certificate ($99/year)
- apps must be notarized (uploaded to Apple for scan)
- unsigned apps are blocked by Gatekeeper by default
- ACL management requires user interaction (first-access prompts)

---

## .comparison to linux

| aspect | macOS | linux |
|--------|-------|-------|
| code signature verification | kernel-enforced, mandatory | optional (some distros use IMA/EVM) |
| per-item ACLs | yes, in Keychain | no, GNOME secret service has no per-item ACLs |
| user prompts for unrecognized apps | yes, built-in | no (would require custom implementation) |
| certificate infrastructure | Apple CA, mandatory for distribution | varies, no unified system |
| same-user isolation | yes, via CDHASH | no, relies on sandbox (Flatpak, containers) |

---

## .key insight

> macOS Keychain achieves same-user process isolation by move of the trust anchor from **filesystem permissions** (which user owns the process) to **cryptographic identity** (which developer signed the code).
>
> this is only possible because:
> 1. Apple controls the entire certificate chain
> 2. the kernel enforces signature verification
> 3. hardware (Secure Enclave) protects against software-only attacks
>
> linux lacks this unified infrastructure, so tools like GNOME secret service accept that same-user processes have equivalent trust.

---

## .sources

- [Apple Platform Security Guide: Code Sign](https://support.apple.com/guide/security/app-code-signing-process-sec7c917bf14/web)
- [Apple Developer: Code Sign Guide](https://developer.apple.com/library/archive/documentation/Security/Conceptual/CodeSigningGuide/Introduction/Introduction.html)
- [Keychain Services: Access Control](https://developer.apple.com/documentation/security/keychain_services/keychain_items/restricting_keychain_item_accessibility)
- [WWDC 2019: All About Notarization](https://developer.apple.com/videos/play/wwdc2019/703/)
- [Apple Security Research: Code Sign](https://security.apple.com/blog/towards-the-next-generation-of-xnu-memory-safety/)
