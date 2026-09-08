import { given, then, useBeforeAll, when } from 'test-fns';

import { spawnSync } from 'node:child_process';

/**
 * .what = the REAL-service backstop for the `github.secrets` external contract
 * .why = `rule.require.external-contract-integration-tests` demands at least one test that
 *        calls the real service — *"at least one real integration test must exist somewhere,
 *        with atleast the lack of creds failure case"*. every other test of this contract
 *        fakes the boundary: the unit/integration twins `jest.mock('node:child_process')`,
 *        and the acceptance suite runs the real `gh` binary against a LOCAL stand-in. a swap
 *        proves the client stack executes; it proves not one fact about whether github still
 *        answers. this file is the one that dials `api.github.com`.
 *
 * .why.nocreds = the rule's floor is the lack-of-creds failure path, and that path is the ONE
 *        real-service assertion that needs no secret to make — so it runs everywhere, ci
 *        included, with no gate and no skip.
 *
 * .why.teeth = a row that merely asserted "it failed" would pass with the network unplugged,
 *        which is the failhide this rule exists to prevent. so each row asserts a string only
 *        REAL github can produce — `The token in GH_TOKEN is invalid`, and an `HTTP 401` that
 *        names the `actions/secrets/public-key` endpoint. a dns or connect fault yields neither.
 *
 * ⚠️ .why.explicit-env = every row drives `gh` through an EXPLICIT `env`, and NO row calls
 *        `ghSecretSet` / `validateGhAuth`. those read the AMBIENT env — there is no injection
 *        seam — so on a box whose keyrack holds a live token, a call performs a REAL SECRET
 *        WRITE to a shared repo. an earlier draft did precisely that: it set `process.env` in a
 *        `beforeAll`, `useBeforeAll`'s setup ran first, and a `KEYRACK_WIREHOP_PROBE` secret
 *        landed on `ehmpathy/rhachet` (removed; the removal verified by a re-list, never
 *        assumed). ⇒ the safety here is STRUCTURAL, never a matter of hook order: with an
 *        explicit env, no ambient credential can reach the child, so a botched override reds a
 *        row and can never write a secret.
 *
 * .why.argv = each row drives the exact argv the production operation builds
 *        (`ghSecretSet.ts:46-53`, `ghSecretSet.ts:13`), so the endpoints keyrack truly depends
 *        on are the ones proven to still exist and still refuse. the wrapper logic around them
 *        (error class, hint) is covered by the unit twin, which needs no network.
 *
 * ⚠️ .bound = this covers the AUTH REJECTION of the write hop, never a successful write. a
 *        green `PUT`/`DELETE` needs a repo-admin token, which github's workflow `permissions:`
 *        schema cannot mint (it has no secrets scope). that residue is repo-wide and predates
 *        this file — `main` covers the same hop with a REPLACED `gh` binary whose write is
 *        `cat > /dev/null; exit 0`, i.e. the identical gap, unnamed. the manual procedure
 *        `blackbox/.test/infra/verify.githubSecrets.wirehop.sh --mode apply` is the cure a
 *        human can run.
 */

/**
 * .what = an env whose github credential is guaranteed invalid
 * .why = pins a run to the lack-of-creds path regardless of the box's own auth. `GH_TOKEN`
 *        outranks the config dir, and the dir points at nowhere so no fallback can load.
 */
const asEnvWithInvalidGithubCreds = (): NodeJS.ProcessEnv => ({
  ...process.env,
  GH_TOKEN: 'ghp_0000000000000000000000000000000000AA',
  GITHUB_TOKEN: 'ghp_0000000000000000000000000000000000AA',
  GH_CONFIG_DIR: '/nonexistent-keyrack-github-secrets-real-probe',
});

describe('github.secrets external contract (real github)', () => {
  given('[case1] the auth hop, dialed with an invalid credential', () => {
    // .why.argv = `validateGhAuth` runs exactly `gh auth status` (`ghSecretSet.ts:13`)
    const result = useBeforeAll(async () =>
      spawnSync('gh', ['auth', 'status'], {
        encoding: 'utf-8',
        env: asEnvWithInvalidGithubCreds(),
      }),
    );

    when('[t0] real github adjudicates the token', () => {
      then('the auth check fails, never a silent pass', () => {
        expect(result.status).not.toEqual(0);
      });

      // .why = the teeth. only a REAL round-trip can adjudicate a token; an unplugged
      //        network yields a dns/connect message instead, and reds this row
      then('REAL github rejected it — not a local short-circuit', () => {
        expect(result.stderr).toContain('The token in GH_TOKEN is invalid');
      });
    });
  });

  given('[case2] the WRITE hop, reached on the real api', () => {
    // .why.argv = the exact argv `ghSecretSet` builds (`ghSecretSet.ts:46-53`)
    const result = useBeforeAll(async () =>
      spawnSync(
        'gh',
        [
          'secret',
          'set',
          'KEYRACK_WIREHOP_PROBE',
          '--repo',
          'ehmpathy/rhachet',
        ],
        {
          input: 'never-written',
          encoding: 'utf-8',
          env: asEnvWithInvalidGithubCreds(),
        },
      ),
    );

    when('[t0] an unauthorized caller attempts the secret write', () => {
      then('the write is refused, never silently accepted', () => {
        expect(result.status).not.toEqual(0);
      });

      then(
        'REAL github answered 401 — the contract still guards the write',
        () => {
          expect(result.stderr).toContain('HTTP 401');
        },
      );

      then('the endpoint keyrack writes to is the one that answered', () => {
        expect(result.stderr).toContain(
          'api.github.com/repos/ehmpathy/rhachet/actions/secrets/public-key',
        );
      });

      then('the secret value never appears in the output', () => {
        expect(`${result.stdout}${result.stderr}`).not.toContain(
          'never-written',
        );
      });
    });
  });
});
