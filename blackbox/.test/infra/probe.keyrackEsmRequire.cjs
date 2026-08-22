// .what = real-node probe for the built keyrack esm-require fix (ehmpathy/rhachet#468)
// .why  = the #468 defect lives ONLY in the tsc-built dist: a top-level
//         `import * as age from 'age-encryption'` down-levels to `require('age-encryption')`,
//         and age-encryption (+ @octokit/auth-app) are pure-esm (type: module). when a cjs
//         consumer (a downstream jest, or a brain package's compiled cjs) require()s the built
//         keyrack graph, that eager require of a pure-esm package throws
//         `Must use import to load ES Module`. a @swc/jest test may keep import() native and
//         mask the bug, so the honest witness is a real node child that require()s the BUILT dist.
//
//         the teeth are ENVIRONMENT-INDEPENDENT: a modern node can require() an esm package, so
//         "does a direct require throw" is a flaky, node-version-bound signal. instead the probe
//         hooks Module._load to record EVERY specifier require()d as the built vaultAdapterOsSecure
//         evaluates — the module whose static imports pull in BOTH pure-esm adapters
//         (ageRecipientCrypto + mechAdapterGithubApp). the fix's essence: neither pure-esm package
//         is required at eval. pre-fix, both appear in the load list (RED); post-fix (lazy), neither
//         does (GREEN) — true regardless of whether this node can require() esm.
//
//         plus a real functional call per pure-esm landmine via genuine import(), so each
//         lazy-loaded shape is proven to WORK — not merely proven absent from the eval graph
//         (absence is necessary but not sufficient; see rule.forbid.eager-esm-imports-in-prod):
//           - age-encryption: a full generate -> encrypt -> decrypt -> multi-recipient ->
//             wrong-identity roundtrip via the built ageRecipientCrypto.
//           - @octokit/auth-app: a real deliverForGet call that reaches the key-parse error.
//           - @noble/curves + @noble/hashes + @scure/base (the ssh-crypto landmines): a real
//             sshPubkeyToAgeRecipient (ed25519.utils.toMontgomery + bech32.encodeFromBytes) and
//             sshPrikeyToAgeIdentity (sha512 + bech32.encodeFromBytes) conversion, so the real
//             ESM named-export shape these adapters read is exercised outside jest — the jest unit
//             tests only prove the require()-under-jest branch, NOT the real-node import() branch
//             the downstream consumer actually takes.
//
// argv[2] = absolute path to the built dist vaultAdapterOsSecure.js
// argv[3] = absolute path to the built dist ageRecipientCrypto.js
// argv[4] = absolute path to the built dist mechAdapterGithubApp.js
// argv[5] = absolute path to the built dist sshPubkeyToAgeRecipient.js
// argv[6] = absolute path to the built dist sshPrikeyToAgeIdentity.js
// argv[7] = absolute path to a fixture ssh ed25519 public key file
// argv[8] = absolute path to a fixture ssh ed25519 (unencrypted) private key file
// argv[9] = absolute path to the built dist getOneLazyEsmModuleLoader.js (for the load-failure path)

// emulate a real-node CONSUMER, not a jest worker. spawnSync inherits the parent jest's env, which
// carries JEST_WORKER_ID; importEsmOrRequire keys its load strategy off that flag. delete it here so
// the built keyrack adapters take the genuine import() path — exactly the downstream real-node CJS
// require('rhachet') environment #468 targets — NOT jest's require() branch. without this, the child
// would take the jest branch and require() a pure-esm package in real node (which throws), so this
// delete is what makes the probe an honest witness for the prod load-path.
delete process.env.JEST_WORKER_ID;

const Module = require('node:module');
const { dirname } = require('node:path');
const {
  isEsmLandmineRequest,
  asPackageName,
} = require('./detectEsmLandmine.cjs');

const vaultDistPath = process.argv[2];
const ageDistPath = process.argv[3];
const mechGithubAppDistPath = process.argv[4];
const sshPubkeyDistPath = process.argv[5];
const sshPrikeyDistPath = process.argv[6];
const fixturePubkeyPath = process.argv[7];
const fixturePrikeyPath = process.argv[8];
const loaderDistPath = process.argv[9];

// mask a volatile (random) body but keep the deterministic format anchors around it, so a snapshot
// pins the CONTRACT SHAPE (prefix, armor header/footer) a caller sees — without the random bytes that
// would make the snapshot non-deterministic. an age keypair + ciphertext are random per run; the ssh
// fixture conversions are NOT (fixed input keys => fixed output), so those are snapped verbatim (see
// the report below).
const maskBodyKeepPrefix = (value, prefix) =>
  value.startsWith(prefix) ? `${prefix}<masked-body>` : `<unexpected:${value}>`;
const maskArmorBody = (armored) => {
  const lines = armored.split('\n');
  const header = lines[0];
  const footer =
    lines[lines.length - 1] === '' ? lines[lines.length - 2] : lines[lines.length - 1];
  return `${header}\n<masked-armor-body>\n${footer}`;
};

const main = async () => {
  // record every specifier require()d as the vault module-eval runs, PLUS the module that require()d
  // it. a hook on Module._load captures the whole eval graph, so a pre-fix static
  // `require('age-encryption')` is caught here even though a modern node would load it without a
  // throw. the parent's path is kept so the detector maps each specifier from the SAME origin node's
  // real require() uses — a deep transitive dep maps to the exact copy + export-condition the real
  // load hit, so a dual-published subpath dep (dist-cjs main, unexported deep subpath) is not
  // false-flagged from an unrelated origin dir.
  const specifiersLoadedAtEval = [];
  const loadOriginal = Module._load;
  Module._load = function loadRecorded(request, parent, isMain) {
    specifiersLoadedAtEval.push({
      request,
      parentPath: parent && parent.filename ? parent.filename : null,
    });
    return loadOriginal.call(this, request, parent, isMain);
  };

  // green: require the built vault adapter under cjs. its static imports evaluate BOTH
  // ageRecipientCrypto (age-encryption) and mechAdapterGithubApp (@octokit/auth-app). post-fix,
  // both are lazy — the eval touches neither pure-esm package and the require loads clean.
  let requireVaultThrew = false;
  let requireVaultError = null;
  try {
    require(vaultDistPath);
  } catch (error) {
    requireVaultThrew = true;
    requireVaultError = error instanceof Error ? error.message : String(error);
  } finally {
    Module._load = loadOriginal;
  }

  // teeth: EVERY specifier require()d at eval whose real CJS require() would hit a pure-esm module
  // (the shared subpath-precise, environment-independent detector — no hardcoded package list). a
  // non-empty list names a landmine: an eager pure-esm require in the keyrack eval graph, INCLUDING
  // one no prior audit named (a NEW dep is caught with no list to sync). pre-fix this holds the
  // eager ones (age-encryption, @octokit/auth-app, @noble/*, @scure/base); post-fix it is empty.
  // environment-independent: it maps the request + reads file type statically, never a require
  // throw (a modern node can require() esm, so a throw is node-version-bound). the report emits the
  // deduped PACKAGE NAMES flagged, so a failure says WHICH package leaked.
  const esmLandminesLoadedAtEval = [
    ...new Set(
      specifiersLoadedAtEval
        .filter(({ request, parentPath }) =>
          isEsmLandmineRequest(request, [
            parentPath ? dirname(parentPath) : vaultDistPath,
            __dirname,
          ]),
        )
        .map(({ request }) => asPackageName(request)),
    ),
  ];

  // crypto: real crypto through the built adapter proves the lazy-loaded age module exposes the
  // shape the adapter reads (Encrypter/Decrypter/armor/generateIdentity/identityToRecipient). in a
  // real node child importEsmSafe's genuine import() loads age-encryption as esm — this exercises
  // the real lazy path a keyrack crypto call takes. this block also preserves the behavioral crypto
  // coverage the deleted jest unit test carried (key-format, armored output, multi-recipient,
  // wrong-identity rejection), which jest can no longer host once age loads via a genuine import().
  let pairFormatOk = false;
  let armoredOk = false;
  let roundtripOk = false;
  let multiRecipientOk = false;
  let wrongIdentityThrew = false;
  let cryptoError = null;
  // masked contract shapes for the snapshot (random body masked, format anchors kept)
  let ageKeyShapeMasked = null;
  let armoredShapeMasked = null;
  try {
    const {
      generateAgeKeyPair,
      encryptToRecipients,
      decryptWithIdentity,
    } = require(ageDistPath);

    // generate: identity + recipient in the age key formats
    const pair = await generateAgeKeyPair();
    pairFormatOk =
      /^AGE-SECRET-KEY-/.test(pair.identity) && /^age1/.test(pair.recipient);
    ageKeyShapeMasked = {
      identity: maskBodyKeepPrefix(pair.identity, 'AGE-SECRET-KEY-1'),
      recipient: maskBodyKeepPrefix(pair.recipient, 'age1'),
    };

    // encrypt: armored output, with a newline + unicode payload (folds the unicode roundtrip case)
    const secret = 'keyrack-realnode-probe\nwith newlines\nand unicode: 🐢';
    const ciphertext = await encryptToRecipients({
      plaintext: secret,
      recipients: [{ mech: 'age', pubkey: pair.recipient }],
    });
    armoredOk =
      ciphertext.startsWith('-----BEGIN AGE ENCRYPTED FILE-----') &&
      ciphertext.includes('-----END AGE ENCRYPTED FILE-----');
    armoredShapeMasked = maskArmorBody(ciphertext);

    // decrypt: roundtrip returns the exact original secret
    const back = await decryptWithIdentity({
      ciphertext,
      identity: pair.identity,
    });
    roundtripOk = back === secret;

    // multi-recipient: both identities can decrypt one ciphertext
    const pairTwo = await generateAgeKeyPair();
    const shared = 'shared-secret';
    const ciphertextShared = await encryptToRecipients({
      plaintext: shared,
      recipients: [
        { mech: 'age', pubkey: pair.recipient },
        { mech: 'age', pubkey: pairTwo.recipient },
      ],
    });
    const backOne = await decryptWithIdentity({
      ciphertext: ciphertextShared,
      identity: pair.identity,
    });
    const backTwo = await decryptWithIdentity({
      ciphertext: ciphertextShared,
      identity: pairTwo.identity,
    });
    multiRecipientOk = backOne === shared && backTwo === shared;

    // wrong-identity: a decrypt with an unrelated identity must throw
    const pairThree = await generateAgeKeyPair();
    try {
      await decryptWithIdentity({
        ciphertext,
        identity: pairThree.identity,
      });
      wrongIdentityThrew = false;
    } catch {
      wrongIdentityThrew = true;
    }
  } catch (error) {
    cryptoError = error instanceof Error ? error.message : String(error);
  }

  // octokit: the SECOND landmine's lazy load, exercised through the REAL adapter path. rather than
  // poke the loader in isolation, drive the built mechAdapterGithubApp.deliverForGet with a
  // syntactically-valid creds json whose privateKey is a bogus (non-rsa) string. deliverForGet
  // parses the creds, then lazily loads @octokit/auth-app (getOneCreateAppAuth), calls
  // createAppAuth(...), then auth({type:'installation'}) — which throws on the bad key and is
  // converted to a ConstraintError about the .pem. reaching that key ConstraintError PROVES the
  // lazy @octokit load succeeded in real node (a load failure would surface a MalfunctionError
  // 'failed to load the @octokit/auth-app module' instead). no real creds or network needed.
  let octokitLoadOk = false;
  let octokitLoadError = null;
  // the caller-visible bad-pem failure SHAPE: the adapter's own deterministic ConstraintError
  // headline + hint that a keyrack consumer reads when the stored .pem is invalid. pinned in a
  // snapshot so a drift of that message/hint surfaces in a diff (r2 nit1) — the volatile library
  // key-parse text lives in metadata.reason and is excluded from the shape.
  let octokitKeyErrorShape = null;
  try {
    const { mechAdapterGithubApp } = require(mechGithubAppDistPath);
    await mechAdapterGithubApp.deliverForGet({
      source: JSON.stringify({
        appId: '1',
        privateKey: 'not-a-real-rsa-private-key',
        installationId: '1',
      }),
    });
    // deliverForGet must throw on the bogus key; arrival here means it did not fail as expected
    octokitLoadError = 'deliverForGet did not throw on a bogus private key';
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // a MalfunctionError that names the module-load failure means the lazy @octokit import did NOT
    // load. any other throw (the key ConstraintError) means the module loaded and the adapter
    // reached the auth() key-parse — proof the pure-esm @octokit shape loaded in real node.
    const octokitLoadFailed = /failed to load the @octokit\/auth-app module/i.test(
      message,
    );
    octokitLoadOk = !octokitLoadFailed;
    if (octokitLoadFailed) octokitLoadError = message;
    // the module DID load (the throw is the adapter's key ConstraintError, not a load fault) —
    // capture its deterministic caller-visible shape (headline before the metadata block + hint)
    if (!octokitLoadFailed)
      octokitKeyErrorShape = {
        messageHeadline: message.split('\n\n')[0],
        hint: error && error.metadata ? error.metadata.hint : undefined,
      };
  }

  // ssh crypto: the THIRD landmine (@noble/curves + @noble/hashes + @scure/base), exercised through
  // the REAL adapters via genuine import() — not merely proven absent from the eval graph. the jest
  // unit tests only prove the require()-under-jest branch (the branch #468 does NOT target); this
  // real-node child takes the import() branch the downstream consumer actually hits. two calls cover
  // all three ssh landmines functionally:
  //   - sshPubkeyToAgeRecipient reads @noble/curves' ed25519.utils.toMontgomery (edwards->montgomery)
  //     and @scure/base's bech32.encodeFromBytes (age recipient encode).
  //   - sshPrikeyToAgeIdentity (unencrypted fixture -> in-process path) reads @noble/hashes' sha512
  //     and @scure/base's bech32.encodeFromBytes (age identity encode).
  // a real age1.../AGE-SECRET-KEY-... result proves the loaded esm named-export shape works, so a
  // divergence between the real import() shape and jest's swc-downlevel require() shape is caught here.
  const { readFileSync } = require('node:fs');
  let sshRecipientOk = false;
  let sshIdentityOk = false;
  let sshCryptoError = null;
  // the DETERMINISTIC contract outputs (fixed fixture keys => fixed age strings), snapped verbatim —
  // unlike the random age keypair/ciphertext, these can be pinned byte-for-byte, so any drift in the
  // real-node esm crypto shape (a @noble/@scure upgrade that alters the derivation) surfaces in a diff.
  let sshRecipient = null;
  let sshIdentity = null;
  try {
    const { sshPubkeyToAgeRecipient } = require(sshPubkeyDistPath);
    const { sshPrikeyToAgeIdentity } = require(sshPrikeyDistPath);

    // ed25519 ssh pubkey -> x25519 -> bech32 age recipient (@noble/curves + @scure/base)
    const pubkey = readFileSync(fixturePubkeyPath, 'utf8').trim();
    const recipient = await sshPubkeyToAgeRecipient({ pubkey });
    sshRecipient = recipient;
    sshRecipientOk = /^age1[a-z0-9]+$/.test(recipient);

    // ed25519 ssh prikey seed -> sha512 -> bech32 age identity (@noble/hashes + @scure/base)
    const identity = await sshPrikeyToAgeIdentity({ keyPath: fixturePrikeyPath });
    sshIdentity = identity;
    sshIdentityOk = /^AGE-SECRET-KEY-1[A-Z0-9]+$/.test(identity);
  } catch (error) {
    sshCryptoError = error instanceof Error ? error.message : String(error);
  }

  // load-failure NEGATIVE path (vision edge e6) in REAL NODE: drive the built shared loader with a
  // genuinely-absent specifier so a real import() rejects and the loader wraps it in the fail-loud
  // MalfunctionError a caller sees. this is the negative twin of the positive crypto/ssh paths — it
  // proves the fix fails LOUD (not silent) when a pure-esm dep is truly missing, in the real-node
  // runtime the downstream consumer uses (JEST_WORKER_ID deleted at top => the hint takes its
  // real-node branch, not the jest branch). the message + hint are deterministic; the underlying node
  // reason carries an absolute path, so the report captures only whether the reason names the
  // specifier (a boolean), never the raw path.
  let loadFailureShape = null;
  let loadFailureReasonNamesSpecifier = false;
  const absentSpecifier = 'this-esm-package-is-absent-for-468-probe';
  try {
    const { getOneLazyEsmModuleLoader } = require(loaderDistPath);
    const loadAbsent = getOneLazyEsmModuleLoader({
      specifier: absentSpecifier,
      purpose: 'a real-node load-failure probe',
    });
    await loadAbsent();
    loadFailureShape = { unexpected: 'the absent specifier loaded without a throw' };
  } catch (error) {
    const reason =
      error && error.metadata ? error.metadata.reason : undefined;
    const fullMessage =
      error && error.message ? error.message : String(error);
    // a HelpfulError's .message serializes its FULL metadata (hint + reason) after a blank line, and
    // the node reason carries an absolute path — non-portable across machines/CI. capture ONLY the
    // deterministic first-line headline (before the metadata block), so the snapshot stays portable.
    // the node reason carries a volatile absolute path AND a node-version-variant prefix, so it is
    // MASKED to a stable placeholder rather than carved out (rule.require.contract-snapshot-
    // exhaustiveness: mask-then-snap). the mask pins that a reason field surfaces in the shape (its
    // order beside message+hint); that it NAMES the absent specifier is asserted deterministically
    // via loadFailureReasonNamesSpecifier below.
    loadFailureShape = {
      messageHeadline: fullMessage.split('\n\n')[0],
      hint: error && error.metadata ? error.metadata.hint : undefined,
      reason: typeof reason === 'string' ? '<node-esm-load-error>' : reason,
    };
    loadFailureReasonNamesSpecifier =
      typeof reason === 'string' && reason.includes(absentSpecifier);
  }

  const report = {
    requireVaultThrew,
    requireVaultError,
    esmLandminesLoadedAtEval,
    pairFormatOk,
    armoredOk,
    roundtripOk,
    multiRecipientOk,
    wrongIdentityThrew,
    cryptoError,
    octokitLoadOk,
    octokitLoadError,
    octokitKeyErrorShape,
    sshRecipientOk,
    sshIdentityOk,
    sshCryptoError,
    // contract-shape snapshots (r2/r4): deterministic verbatim + masked-body + the fail-loud shape
    sshRecipient,
    sshIdentity,
    ageKeyShapeMasked,
    armoredShapeMasked,
    loadFailureShape,
    loadFailureReasonNamesSpecifier,
  };
  process.stdout.write(`REPORT_START${JSON.stringify(report)}REPORT_END`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
