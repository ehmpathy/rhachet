import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { ConstraintError } from 'helpful-errors';
import { given, then, useBeforeAll, when } from 'test-fns';

import { spawnProbeBetween } from '../.test/infra/spawnProbeBetween';

/**
 * .what = real-node subprocess acceptance clamp for the keyrack esm-require fix (ehmpathy/rhachet#468)
 * .why  = the #468 defect exists ONLY in the tsc-built dist under a cjs require(): rhachet's own
 *         top-level static imports of pure-esm (type: module) packages down-level to require() of
 *         those packages, so a require() of the built keyrack graph throws `Must use import to load
 *         ES Module`. FIVE such packages sat in the keyrack eval graph: age-encryption
 *         (ageRecipientCrypto), @octokit/auth-app (mechAdapterGithubApp), and @noble/curves,
 *         @noble/hashes, @scure/base (the infra/ssh crypto files, reached via the vault adapters'
 *         ssh-key conversion). a @swc/jest test may keep import() native and mask the bug, so the
 *         honest witness is a real node child that require()s the BUILT dist. vaultAdapterOsSecure is
 *         the tight clamp site: its static imports pull in the age + @octokit adapters AND the
 *         @noble/@scure ssh-crypto files, so one require() exercises the whole eval graph.
 *
 *         RED/GREEN is ENVIRONMENT-INDEPENDENT: the probe hooks Module._load to record which
 *         specifiers the vault module-eval require()s. pre-fix, the static esm imports put those
 *         packages in that list (RED); post-fix (lazy), the list is empty (GREEN). this holds whether
 *         or not the node in use can require() an esm package, so the clamp does not rot when node's
 *         require-esm support shifts. a GENERALIZED backstop (esmPackagesLoadedAtEval) also fails on
 *         ANY type:module package require()d at eval — even one no explicit list names — so a future
 *         6th landmine cannot slip past unnoticed.
 * .note = this clamp DELIBERATELY drives internal built-dist artifacts (dist/.../vaultAdapterOsSecure.js
 *         etc.) as its subject rather than a public contract boundary. that is intentional, not a
 *         blackbox violation: the #468 defect IS "the built dist can be require()d under cjs" — a
 *         node-interop property of the compiled artifacts that NO public cli/sdk contract can express
 *         (the contract surface is identical before and after the fix). so the artifact IS the
 *         contract under test here. the reviewer's blackbox rule is honored in spirit: this is an
 *         artifact-level blackbox clamp for a build-output property, the only honest witness for it.
 */
describe('keyrackEsmRequire.realnode.acceptance', () => {
  const vaultDistPath = join(
    __dirname,
    '..',
    '..',
    'dist',
    'domain.operations',
    'keyrack',
    'adapters',
    'vaults',
    'os.secure',
    'vaultAdapterOsSecure.js',
  );
  const ageDistPath = join(
    __dirname,
    '..',
    '..',
    'dist',
    'domain.operations',
    'keyrack',
    'adapters',
    'ageRecipientCrypto.js',
  );
  const mechGithubAppDistPath = join(
    __dirname,
    '..',
    '..',
    'dist',
    'domain.operations',
    'keyrack',
    'adapters',
    'mechanisms',
    'mechAdapterGithubApp.js',
  );
  const sshPubkeyDistPath = join(
    __dirname,
    '..',
    '..',
    'dist',
    'infra',
    'ssh',
    'sshPubkeyToAgeRecipient.js',
  );
  const sshPrikeyDistPath = join(
    __dirname,
    '..',
    '..',
    'dist',
    'infra',
    'ssh',
    'sshPrikeyToAgeIdentity.js',
  );
  const fixturePubkeyPath = join(
    __dirname,
    '..',
    '..',
    'src',
    '.test',
    'assets',
    'keyrack',
    'ssh',
    'test_key_ed25519.pub',
  );
  const fixturePrikeyPath = join(
    __dirname,
    '..',
    '..',
    'src',
    '.test',
    'assets',
    'keyrack',
    'ssh',
    'test_key_ed25519',
  );
  const loaderDistPath = join(
    __dirname,
    '..',
    '..',
    'dist',
    'infra',
    'importEsmSafe',
    'getOneLazyEsmModuleLoader.js',
  );
  const probePath = join(
    __dirname,
    '..',
    '.test',
    'infra',
    'probe.keyrackEsmRequire.cjs',
  );

  given('[case1] the built keyrack dist, require()d in a real node child', () => {
    const report = useBeforeAll(async () => {
      // the built artifacts must exist; acceptance runs after `npm run build`
      if (!existsSync(vaultDistPath))
        throw new ConstraintError(
          'built dist vaultAdapterOsSecure.js absent — run `npm run build` first',
          { vaultDistPath, hint: 'run `npm run build` first, then re-run acceptance' },
        );
      if (!existsSync(ageDistPath))
        throw new ConstraintError(
          'built dist ageRecipientCrypto.js absent — run `npm run build` first',
          { ageDistPath, hint: 'run `npm run build` first, then re-run acceptance' },
        );
      if (!existsSync(mechGithubAppDistPath))
        throw new ConstraintError(
          'built dist mechAdapterGithubApp.js absent — run `npm run build` first',
          {
            mechGithubAppDistPath,
            hint: 'run `npm run build` first, then re-run acceptance',
          },
        );
      if (!existsSync(sshPubkeyDistPath))
        throw new ConstraintError(
          'built dist sshPubkeyToAgeRecipient.js absent — run `npm run build` first',
          {
            sshPubkeyDistPath,
            hint: 'run `npm run build` first, then re-run acceptance',
          },
        );
      if (!existsSync(sshPrikeyDistPath))
        throw new ConstraintError(
          'built dist sshPrikeyToAgeIdentity.js absent — run `npm run build` first',
          {
            sshPrikeyDistPath,
            hint: 'run `npm run build` first, then re-run acceptance',
          },
        );
      if (!existsSync(loaderDistPath))
        throw new ConstraintError(
          'built dist getOneLazyEsmModuleLoader.js absent — run `npm run build` first',
          {
            loaderDistPath,
            hint: 'run `npm run build` first, then re-run acceptance',
          },
        );

      return spawnProbeBetween<{
        requireVaultThrew: boolean;
        requireVaultError: string | null;
        esmLandminesLoadedAtEval: string[];
        pairFormatOk: boolean;
        armoredOk: boolean;
        roundtripOk: boolean;
        multiRecipientOk: boolean;
        wrongIdentityThrew: boolean;
        cryptoError: string | null;
        octokitLoadOk: boolean;
        octokitLoadError: string | null;
        octokitKeyErrorShape: {
          messageHeadline: string;
          hint: string | undefined;
        } | null;
        sshRecipientOk: boolean;
        sshIdentityOk: boolean;
        sshCryptoError: string | null;
        sshRecipient: string | null;
        sshIdentity: string | null;
        ageKeyShapeMasked: { identity: string; recipient: string } | null;
        armoredShapeMasked: string | null;
        loadFailureShape: {
          messageHeadline: string;
          hint: string | undefined;
          reason: string | undefined;
        } | null;
        loadFailureReasonNamesSpecifier: boolean;
      }>({
        args: [
          probePath,
          vaultDistPath,
          ageDistPath,
          mechGithubAppDistPath,
          sshPubkeyDistPath,
          sshPrikeyDistPath,
          fixturePubkeyPath,
          fixturePrikeyPath,
          loaderDistPath,
        ],
        label: 'keyrack-esm-require real-node',
      });
    });

    when('[t0] the built vault adapter is require()d under cjs', () => {
      // a smoke check that the require() completes, NOT the load-throw guarantee itself: a modern
      // node can require() an esm package without a throw, so a false here is necessary but not
      // sufficient. the environment-independent teeth live in [t1]'s Module._load graph.
      then('the require() completes without a throw', () => {
        expect(report.requireVaultThrew).toBe(false);
        expect(report.requireVaultError).toBe(null);
      });
    });

    when('[t1] Module._load records the vault module-eval require graph', () => {
      // the RED/GREEN teeth: EVERY specifier require()d at eval whose real CJS require() would hit a
      // pure-esm module, flagged by the shared subpath-precise detector (no hardcoded package list).
      // pre-fix, the eager static imports put the five landmines (age-encryption, @octokit/auth-app,
      // @noble/curves, @noble/hashes, @scure/base) in this list; post-fix (lazy), it is empty. this
      // bites regardless of whether the node in use can require() an esm package, AND catches a NEW
      // (as-yet-unnamed) pure-esm dep the moment it is eagerly required — there is no list to sync.
      then('no pure-esm landmine is require()d at eval (the GREEN)', () => {
        expect(report.esmLandminesLoadedAtEval).toEqual([]);
      });
    });

    when('[t2] real crypto runs through the built adapter', () => {
      // the lazy-loaded age shape is proven by real use, not mere absence from the eval graph.
      // this also carries the behavioral coverage the deleted jest unit test held (key-format,
      // armored output, multi-recipient, wrong-identity rejection), which jest can no longer host.
      then('no crypto call errored', () => {
        expect(report.cryptoError).toBe(null);
      });
      then('generateAgeKeyPair returns identity + recipient in age formats', () => {
        expect(report.pairFormatOk).toBe(true);
      });
      then('encryptToRecipients returns armored ciphertext', () => {
        expect(report.armoredOk).toBe(true);
      });
      then('generate -> encrypt -> decrypt returns the original secret', () => {
        expect(report.roundtripOk).toBe(true);
      });
      then('a multi-recipient ciphertext decrypts for every recipient', () => {
        expect(report.multiRecipientOk).toBe(true);
      });
      then('a decrypt with an unrelated identity is rejected', () => {
        expect(report.wrongIdentityThrew).toBe(true);
      });
    });

    when('[t3] the SECOND landmine (@octokit/auth-app) loads via the real adapter path', () => {
      // functional proof for the github-app pure-esm dep, driven through the REAL adapter: the probe
      // calls the built mechAdapterGithubApp.deliverForGet with a bogus private key. deliverForGet
      // lazily loads @octokit/auth-app, calls createAppAuth, then auth() — which throws on the bad
      // key (a ConstraintError about the .pem). that key error proves the lazy @octokit load
      // succeeded; a load failure would instead surface a MalfunctionError about the module load.
      then('the lazy @octokit load succeeds (no module-load MalfunctionError)', () => {
        expect(report.octokitLoadError).toBe(null);
        expect(report.octokitLoadOk).toBe(true);
      });

      // the caller-visible bad-pem failure the real adapter path reaches — not just a green boolean
      // (r2 nit1: contract-snapshot-exhaustiveness). the adapter's own deterministic ConstraintError
      // headline + hint are pinned so a drift of the message a keyrack consumer reads surfaces in a
      // diff; the volatile library key-parse text (metadata.reason) is excluded from the shape.
      then('the caller-visible bad-pem ConstraintError shape (headline + hint) is pinned', () => {
        expect(report.octokitKeyErrorShape).toMatchSnapshot();
      });
    });

    when('[t4] the THIRD landmine (@noble/@scure) loads via the real ssh-crypto adapters', () => {
      // functional proof for the ssh-crypto pure-esm deps, driven through the REAL adapters via a
      // genuine import() — the same standard [t2]/[t3] hold their siblings to. absence from the eval
      // graph [t1] is necessary but not sufficient: it does not prove the real-node import() shape
      // (@noble/curves' ed25519.utils.toMontgomery, @noble/hashes' sha512, @scure/base's
      // bech32.encodeFromBytes) matches what the adapter reads. the jest unit tests only exercise the
      // require()-under-jest branch, NOT the real-node import() branch a downstream consumer takes.
      then('no ssh-crypto call errored', () => {
        expect(report.sshCryptoError).toBe(null);
      });
      then('sshPubkeyToAgeRecipient returns an age1 recipient (@noble/curves + @scure/base)', () => {
        expect(report.sshRecipientOk).toBe(true);
      });
      then('sshPrikeyToAgeIdentity returns an AGE-SECRET-KEY identity (@noble/hashes + @scure/base)', () => {
        expect(report.sshIdentityOk).toBe(true);
      });
    });

    when('[t5] the real-node contract output shapes are snapshotted', () => {
      // the reviewer must SEE what a caller sees, not just read a green boolean (r2/r4:
      // contract-snapshot-exhaustiveness + acceptance-journey-coverage). two kinds of shape:
      //  - DETERMINISTIC (fixed fixture keys => fixed age strings): the ssh recipient + identity are
      //    snapped VERBATIM, so a @noble/@scure crypto-shape drift surfaces byte-for-byte in a diff.
      //  - RANDOM (age keypair + ciphertext differ per run): snapped with the volatile body MASKED and
      //    the format anchors kept (prefix, armor header/footer), so the CONTRACT SHAPE is pinned
      //    without a non-deterministic snapshot.
      then('the deterministic ssh recipient + identity are pinned verbatim', () => {
        expect({
          sshRecipient: report.sshRecipient,
          sshIdentity: report.sshIdentity,
        }).toMatchSnapshot();
      });

      then('the random age keypair + ciphertext shapes are pinned (body masked)', () => {
        expect({
          ageKeyShapeMasked: report.ageKeyShapeMasked,
          armoredShapeMasked: report.armoredShapeMasked,
        }).toMatchSnapshot();
      });
    });

    when('[t6] a genuinely-absent pure-esm dep fails loud in real node (vision e6)', () => {
      // the NEGATIVE path of the contract: when a pure-esm dep is truly absent, the fix must fail
      // LOUD (a MalfunctionError that names the module + purpose + an actionable, runtime-aware hint),
      // NOT degrade silently. proven in the real-node runtime the downstream consumer uses (the probe
      // deletes JEST_WORKER_ID, so the hint takes its real-node branch). the message + hint are
      // deterministic; the node reason carries a volatile absolute path + node-version-variant prefix,
      // so it is MASKED to `<node-esm-load-error>` and snapped (mask-then-snap, not carve-out) — the
      // masked shape pins that a reason field surfaces beside message+hint. that it NAMES the absent
      // specifier is asserted separately + deterministically below.
      then('the fail-loud MalfunctionError shape (headline + hint + masked reason) is pinned', () => {
        expect(report.loadFailureShape).toMatchSnapshot();
      });

      then('the failure reason names the absent specifier', () => {
        expect(report.loadFailureReasonNamesSpecifier).toBe(true);
      });
    });
  });
});
