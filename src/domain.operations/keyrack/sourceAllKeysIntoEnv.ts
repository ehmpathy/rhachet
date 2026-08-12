import { spawnSync } from 'child_process';
import { MalfunctionError } from 'helpful-errors';
import { join, resolve } from 'path';

import { loadManifestHydrated } from '@src/access/daos/daoKeyrackRepoManifest/hydrate/loadManifestHydrated';
import type { KeyrackGrantAttempt } from '@src/domain.objects/keyrack/KeyrackGrantAttempt';
import type { KeyrackKeyReach } from '@src/domain.objects/keyrack/KeyrackKeyReach';
import { asKeyrackKeyReachExid } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReachExid';

import { asKeyrackKeyName } from './asKeyrackKeyName';
import { assertKeyrackExportNamesDistinct } from './assertKeyrackExportNamesDistinct';
import { formatKeyrackGetAllOutput } from './cli/formatKeyrackGetOneOutput';
import { decideIsKeySlugForEnv } from './decideIsKeySlugEqual';
import { decideIsKeyStrictlyRequired } from './decideIsKeyStrictlyRequired';
import { asKeyrackAttemptReach } from './reach/asKeyrackAttemptAddress';
import { assertKeyrackReachRequiresKey } from './reach/assertKeyrackReachRequiresKey';

/**
 * .what = absolute path to rhx binary
 * .why = relative path ./node_modules/.bin/rhx fails in temp directories with symlinked node_modules
 */
const RHX_BIN = resolve(__dirname, '../../../bin/rhx');

const getSlug = (k: KeyrackGrantAttempt): string =>
  k.status === 'granted' ? k.grant.slug : k.slug;

/**
 * .what = source keyrack keys into process.env
 * .why = enables test setup files to fetch credentials without manual `source` commands
 *
 * .note = sync because jest setup files run synchronously
 * .note = keyrack prefers daemon (explicit unlock) over envvar (ci fallback)
 * .note = prints same stdout as `rhx keyrack get` and exits with code 2 on failure
 *
 * .note = ⚠️ a BULK source (no `key`) never INJECTS a reach-held grant — `process.env` holds one
 *         value per bare key name, so a reach cannot sit beside its reachless peer. that
 *         much is permanent, and it is why `reach` is accepted only alongside `key` (below)
 * .note = ⚠️ a bulk source is reach-blind AND SILENT about it, deliberately (2026-08-12). all
 *         three flatten surfaces behave alike — the cli `keyrack source`, this operation, and
 *         `getKeyrackKeySecrets` — so one fact reads one way (rule.forbid.ambiguous-labels).
 *         an announce per omitted reach was built and then cut: it fired on every call for any
 *         repo that declares a reach, always the same lines, never actionable differently,
 *         which trains a caller to ignore keyrack stderr and so weakens the notices that DO vary
 * .note = the value injected is the CORRECT one — a reach is simply not among what a flat
 *         namespace can carry. "fewer than exist", never "the wrong one", so this is not the
 *         wrong-territory failure the design forbids. `keyrack list` renders a `reach:` leaf
 *         per key, which is where a human reads what this host holds
 * .note = so `reach` is accepted only ALONGSIDE `key`, and `assertKeyrackReachRequiresKey`
 *         refuses it otherwise (q2). that guard is not decoration: before it, the collision
 *         error below offered `reach` as its fix while this contract had no `reach` to
 *         accept — an error that named a fix a caller could not perform, which is precisely
 *         what `rule.require.errors-name-the-fix` forbids and what that same error's own
 *         note claims to avoid on the env axis
 */
export const sourceAllKeysIntoEnv = (input: {
  /**
   * the environment to fetch keys for (e.g., 'test', 'prod')
   */
  env: string;

  /**
   * the keyrack owner (e.g., 'ehmpath')
   */
  owner: string;

  /**
   * optional: source only this specific key (otherwise sources all repo keys)
   */
  key?: string;

  /**
   * optional: the reach to source that key from — legal only alongside `key`
   *
   * .why = a reach is an identity axis of ONE key, so it cannot ride a repo sweep (q2)
   */
  reach?: KeyrackKeyReach;

  /**
   * when 'strict', failfast if any keys are not granted (default: 'strict')
   */
  mode?: 'strict' | 'lenient';
}): void => {
  // a reach is an identity axis of one key, so it must name the key it belongs to (q2)
  // .note = the hint is sdk-shaped, never cli-shaped: a human here holds an input object,
  //         so `--key` would name a flag this surface does not have
  // .note = this THROWS while the absent-key path below RENDERS and `process.exit(2)`s, and
  //         the split is deliberate rather than an oversight. an absent key is an
  //         ENVIRONMENT gap — a human must go set it, so a treestruct that names the fix
  //         serves them and a stack trace is noise. a reach without a key is a CONTRACT
  //         misuse — the fix is one line of the caller's own source, and a stack trace is
  //         the one output that points straight at it (`test-reach.mjs:4:9`). the message
  //         and hint ride the throw either way, so the error names its fix on both paths
  assertKeyrackReachRequiresKey({
    reach: input.reach,
    keyed: !!input.key,
    hint: 'name the key too: sourceAllKeysIntoEnv({ key, reach })',
  });

  // build args based on whether key filter is provided
  const args = input.key
    ? [
        'keyrack',
        'get',
        '--key',
        input.key,
        '--env',
        input.env,
        '--owner',
        input.owner,
        // the reach rides the keyed ask only — the guard above proves `key` is set here
        ...(input.reach
          ? ['--reach', asKeyrackKeyReachExid({ reach: input.reach })]
          : []),
      ]
    : [
        'keyrack',
        'get',
        '--for',
        'repo',
        '--env',
        input.env,
        '--owner',
        input.owner,
      ];

  // call keyrack get --json to get structured data
  const jsonResult = spawnSync(RHX_BIN, [...args, '--json'], {
    encoding: 'utf8', // eslint-disable-line @cspell/spellchecker -- node api
  });

  // if command failed to execute, get formatted output and exit
  if (jsonResult.error) {
    const formatted = spawnSync(RHX_BIN, args, {
      encoding: 'utf8', // eslint-disable-line @cspell/spellchecker -- node api
    });
    process.stdout.write(formatted.stdout || '');
    process.stderr.write(formatted.stderr || jsonResult.error.message);
    process.exit(2);
  }

  // parse JSON response (single key returns object, repo returns array)
  let keys: KeyrackGrantAttempt[];
  try {
    const parsed = JSON.parse(jsonResult.stdout);
    keys = Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    // JSON parse failed - get formatted output and forward it
    const formatted = spawnSync(RHX_BIN, args, {
      encoding: 'utf8', // eslint-disable-line @cspell/spellchecker -- node api
    });
    process.stdout.write(formatted.stdout || jsonResult.stdout);
    process.stderr.write(formatted.stderr || jsonResult.stderr);
    process.exit(2);
  }

  // filter to keys for the requested env (include env=all fallback)
  const keysForEnvAtAnyReach = keys.filter((k) =>
    decideIsKeySlugForEnv({ slug: getSlug(k), env: input.env }),
  );

  // split by what a flat namespace can carry
  // .why = `process.env` is the same one-slot-per-name map a shell export lands in, so a
  //        reach-held key can never be injected beside its reachless peer. the repo sweep
  //        this reads from ENUMERATES reaches, so both arrive here — and the reach ones
  //        must sit outside the injection set, outside the collision guard, and outside the
  //        strict gate, or a merely-locked reach would fail the whole source
  // .note = a repo that declares no reach yields no reach key at all, so every set below
  //         is identical to today's (e1)
  const keysForEnv = keysForEnvAtAnyReach.filter(
    (k) => !asKeyrackAttemptReach({ attempt: k }),
  );

  // check if all keys are granted (strict mode enabled by default)
  const mode = input.mode ?? 'strict';
  const keysNotGranted = keysForEnv.filter((k) => k.status !== 'granted');

  // load manifest for is-optional-if-has lookup
  const gitroot = process.cwd();
  const manifest = loadManifestHydrated(
    { path: join(gitroot, '.agent', 'keyrack.yml') },
    { gitroot },
  );

  // manifest must exist if keyrack get returned valid JSON
  if (!manifest)
    throw new MalfunctionError(
      'manifest not found after keyrack get succeeded',
      { gitroot },
    );

  // filter out keys whose requirement is waived via is-optional-if-has
  const keysStrictlyRequired = keysNotGranted.filter((k) =>
    decideIsKeyStrictlyRequired({ attempt: k, manifest, env: process.env }),
  );

  if (mode === 'strict' && keysStrictlyRequired.length > 0) {
    // format only the strictly required keys (not all absent keys)
    const formatted = formatKeyrackGetAllOutput({
      attempts: keysStrictlyRequired,
    });
    const errorOutput = [
      formatted,
      '\n',
      '✋ some keys were not granted, yet are strictly required\n',
      '   └─ ask a human to set the keys, then try again\n',
      '\n',
      "hint: use mode: 'lenient' if partial results are acceptable\n",
    ].join('');
    process.stdout.write(errorOutput);
    process.stderr.write(errorOutput);
    process.exit(2);
  }

  // refuse to inject when two keys would claim one env var name
  // .why = `process.env` is the same flat namespace a shell export lands in, so this path
  //        carries the identical collision the cli `source` command guards (e23/q11). before
  //        this call it resolved a clash by KEEPING THE FIRST (`!process.env[name]`) while the
  //        cli THREW and `getKeyrackKeySecrets` kept the LAST — one collision, three answers,
  //        none announced. one assertion now states the rule for all three
  // .note = the hints are sdk-shaped rather than cli-shaped: this is `keyrack.source`, so a
  //         human here holds an input object, never a `--reach` flag. the MESSAGE is shared so
  //         the invariant cannot drift; the HINT names the fix for THIS surface
  // .note = ⚠️ the reach hint read `pass \`reach\` to name which one you want` while this
  //         contract had NO `reach` field — a fix a caller could not perform. it names `key`
  //         first now, deliberately: a reach is legal only alongside a key here (q2), so a
  //         hint that named `reach` alone would still refuse the caller who obeyed it
  assertKeyrackExportNamesDistinct({
    attempts: keysForEnv,
    hints: {
      forReachCollision:
        'source one reach at a time: sourceAllKeysIntoEnv({ key, reach })',
      forEnvCollision:
        'source one env at a time; narrow `env`, or name one key via `key`',
      forOrgCollision:
        'source one org at a time; name one key via `key` — `env` cannot separate two orgs',
    },
  });

  // .note = `process.env` holds ONE value per bare key name, so a reach held beside a slug is
  //         not injected, and this path says no word about it. that silence is DELIBERATE
  //         (2026-08-12) and matches the cli `keyrack source` exactly, so the two flatten
  //         surfaces state one fact one way (rule.forbid.ambiguous-labels). reach is opt-in: a
  //         caller who wants one asks for it via `sourceAllKeysIntoEnv({ key, reach })`, which
  //         the reach-collision hint above already names
  // .note = the value injected is the CORRECT one. a reach is simply not among what a flat
  //         namespace can carry — "fewer than exist", never "the wrong one", so this is not the
  //         wrong-territory failure the design forbids
  // .note = `keyrack list` renders a `reach:` leaf per key, so the rack is where a human reads
  //         which reaches this host holds

  // inject granted secrets into process.env
  for (const key of keysForEnv) {
    if (key.status !== 'granted') continue;
    // .note = `asKeyrackKeyName` rather than a hand-rolled `.split('.').pop()`: the drop of
    //         org+env is the very reason a collision is possible, so the one operation that
    //         performs it is where that fact belongs (rule.forbid.inline-decode-friction)
    const envVarName = asKeyrackKeyName({ slug: key.grant.slug });
    if (!process.env[envVarName]) {
      process.env[envVarName] = key.grant.key.secret;
    }
  }
};
