import type { Command } from 'commander';
import { ConstraintError, HelpfulError } from 'helpful-errors';
import { getGitRepoRoot } from 'rhachet-artifact-git';

import { daoKeyrackHostManifest } from '@src/access/daos/daoKeyrackHostManifest';
import { daoKeyrackRepoManifest } from '@src/access/daos/daoKeyrackRepoManifest';
import { loadManifestHydrated } from '@src/access/daos/daoKeyrackRepoManifest/hydrate/loadManifestHydrated';
import type {
  KeyrackGrantMechanism,
  KeyrackHostVault,
} from '@src/domain.objects/keyrack';
import {
  delKeyrackKey,
  genContextKeyrack,
  genContextKeyrackGrantGet,
  getAllKeyrackGrantsByRepo,
  getOneKeyrackGrantByKey,
  setKeyrackKey,
} from '@src/domain.operations/keyrack';
import {
  asAttemptsByStatus,
  asNotGrantedAttempts,
  isAllAttemptsGranted,
} from '@src/domain.operations/keyrack/asAttemptsByStatus';
import { asKeyrackFirewallSource } from '@src/domain.operations/keyrack/asKeyrackFirewallSource';
import { asKeyrackKeyName } from '@src/domain.operations/keyrack/asKeyrackKeyName';
import { asKeyrackSlugParts } from '@src/domain.operations/keyrack/asKeyrackSlugParts';
import { asResolvedAttempt } from '@src/domain.operations/keyrack/asResolvedAttempt';
import { asResolvedEnvForSet } from '@src/domain.operations/keyrack/asResolvedEnvForSet';
import { asSortedHostSlugs } from '@src/domain.operations/keyrack/asSortedHostSlugs';
import { assertKeyrackExportNamesDistinct } from '@src/domain.operations/keyrack/assertKeyrackExportNamesDistinct';
import { assertKeyrackOrgMatchesManifest } from '@src/domain.operations/keyrack/assertKeyrackOrgMatchesManifest';
import { asKeyrackDelReport } from '@src/domain.operations/keyrack/cli/asKeyrackDelReport';
import { asKeyrackErroredKeyTip } from '@src/domain.operations/keyrack/cli/asKeyrackErroredKeyTip';
import { asKeyrackKeyReachOrEmitBlocked } from '@src/domain.operations/keyrack/cli/asKeyrackKeyReachOrEmitBlocked';
import { asKeyrackListTreestruct } from '@src/domain.operations/keyrack/cli/asKeyrackListTreestruct';
import { asKeyrackStatusKeyBranch } from '@src/domain.operations/keyrack/cli/asKeyrackStatusKeyBranch';
import { asKeyrackUnlockExitCode } from '@src/domain.operations/keyrack/cli/asKeyrackUnlockExitCode';
import { asShellEscapedSecret } from '@src/domain.operations/keyrack/cli/asShellEscapedSecret';
import { emitKeyrackBlockedReport } from '@src/domain.operations/keyrack/cli/emitKeyrackBlockedReport';
import { emitKeyrackKeyBranch } from '@src/domain.operations/keyrack/cli/emitKeyrackKeyBranch';
import {
  formatKeyrackGetAllOutput,
  formatKeyrackGetOneOutput,
} from '@src/domain.operations/keyrack/cli/formatKeyrackGetOneOutput';
import { getAllKeyrackGrantsOrEmitBlocked } from '@src/domain.operations/keyrack/cli/getAllKeyrackGrantsOrEmitBlocked';
import {
  isValidKeyrackEnv,
  KEYRACK_VALID_ENVS,
} from '@src/domain.operations/keyrack/constants';
import { pruneKeyrackDaemon } from '@src/domain.operations/keyrack/daemon/sdk';
import { decideIsKeyStrictlyRequired } from '@src/domain.operations/keyrack/decideIsKeyStrictlyRequired';
import { fillKeyrackKeys } from '@src/domain.operations/keyrack/fill/fillKeyrackKeys';
import { findSlugByEnvAndKeyName } from '@src/domain.operations/keyrack/findSlugByEnvAndKeyName';
import { getAllKeyrackSlugsForEnv } from '@src/domain.operations/keyrack/getAllKeyrackSlugsForEnv';
import { getKeyrackFirewallOutput } from '@src/domain.operations/keyrack/getKeyrackFirewallOutput';
import { getKeyrackKeyGrant } from '@src/domain.operations/keyrack/getKeyrackKeyGrant';
import { genKeyrackInfra } from '@src/domain.operations/keyrack/infra/genKeyrackInfra';
import { getKeyrackInfraInitErrorReport } from '@src/domain.operations/keyrack/infra/getKeyrackInfraInitErrorReport';
import { getKeyrackInfraInitReport } from '@src/domain.operations/keyrack/infra/getKeyrackInfraInitReport';
import {
  type GhRun,
  runGh,
} from '@src/domain.operations/keyrack/infra/gh/runGh';
import { initKeyrack } from '@src/domain.operations/keyrack/initKeyrack';
import { isKeyrackSlugFormat } from '@src/domain.operations/keyrack/isKeyrackSlugFormat';
import { asKeyrackAttemptReach } from '@src/domain.operations/keyrack/reach/asKeyrackAttemptAddress';
import { asKeyrackKeySlugAtReach } from '@src/domain.operations/keyrack/reach/asKeyrackKeySlugAtReach';
import { assertKeyrackReachRequiresKey } from '@src/domain.operations/keyrack/reach/assertKeyrackReachRequiresKey';
import { delKeyrackRecipient } from '@src/domain.operations/keyrack/recipient/delKeyrackRecipient';
import { getKeyrackRecipients } from '@src/domain.operations/keyrack/recipient/getKeyrackRecipients';
import { setKeyrackRecipient } from '@src/domain.operations/keyrack/recipient/setKeyrackRecipient';
import { getKeyrackStatus } from '@src/domain.operations/keyrack/session/getKeyrackStatus';
import { relockKeyrack } from '@src/domain.operations/keyrack/session/relockKeyrack';
import { unlockKeyrackKeys } from '@src/domain.operations/keyrack/session/unlockKeyrackKeys';
import { getGitRepoRootOrNull } from '@src/infra/git/getGitRepoRootOrNull';

import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * .what = adds the "keyrack" command group to the CLI
 * .why = enables credential management via keyrack get/set/unlock
 *
 * .note = does not require rhachet.use.ts config
 * .note = works with host manifest (~/.rhachet/) and repo manifest (.agent/keyrack.yml)
 * .note = ghRun is a composition-root seam; it defaults to the real runGh and is
 *         injectable so contract-grain tests can exercise the infra-init stdout with
 *         a fake runner (no irreversible repo creation)
 * .note = question is a composition-root seam for the github-app guided prompt; it
 *         defaults to undefined (the mech opens a real readline terminal) and is
 *         injectable so contract-grain tests can drive `keyrack set --mech
 *         EPHEMERAL_VIA_GITHUB_APP` with a scripted answer instead of a real terminal
 */
export const invokeKeyrack = ({
  program,
  ghRun = runGh,
  question,
}: {
  program: Command;
  ghRun?: GhRun;
  question?: (prompt: string) => Promise<string>;
}): void => {
  const keyrack = program
    .command('keyrack')
    .description('manage credentials via keyrack')
    .option('--owner <owner>', 'owner identity (e.g., mechanic, foreman)')
    .option('--for <owner>', 'alias for --owner')
    .enablePositionalOptions(); // parse keyrack's own opts before its subcommand

  // derive owner from subcommand opts, falling back to top-level keyrack opts
  // .why = enables `keyrack --owner X <cmd>` in addition to `keyrack <cmd> --owner X`
  const deriveOwner = (opts: {
    owner?: string;
    for?: string;
  }): string | null => {
    const globals = keyrack.opts();
    return opts.owner ?? opts.for ?? globals.owner ?? globals.for ?? null;
  };

  // keyrack init [--owner owner] [--pubkey path] [--label label] [--org org] [--at path]
  keyrack
    .command('init')
    .description('initialize keyrack with a recipient key')
    .option('--owner <owner>', 'owner identity (e.g., mechanic, foreman)')
    .option('--for <owner>', 'alias for --owner')
    .option('--pubkey <path>', 'path to private key or .pub file')
    .option(
      '--prikey <path>',
      'ssh private key path (derives pubkey automatically)',
    )
    .option(
      '--label <label>',
      'label for the recipient key (default: "default")',
    )
    .option(
      '--org <org>',
      'org for repo manifest (required if keyrack.yml absent)',
    )
    .option(
      '--at <path>',
      'custom path for keyrack.yml (for role-level keyracks)',
    )
    .option('--json', 'output as json (robot mode)')
    .action(
      async (opts: {
        owner?: string;
        for?: string;
        pubkey?: string;
        prikey?: string;
        label?: string;
        org?: string;
        at?: string;
        json?: boolean;
      }) => {
        // --owner takes precedence; --for is alias
        const owner = deriveOwner(opts);
        // get gitroot to check for repo manifest
        // note: null is valid when not in a git repo; other errors propagate
        const gitroot = await getGitRepoRootOrNull({ from: process.cwd() });

        // --prikey takes precedence over --pubkey (both accept private key paths)
        const keyPath = opts.prikey ?? opts.pubkey;

        const result = await initKeyrack({
          owner,
          pubkey: keyPath,
          label: opts.label,
          gitroot,
          org: opts.org ?? null,
          at: opts.at ?? null,
        });

        // display paths with ~/ instead of $HOME
        const asHomePath = (p: string) =>
          p.replace(process.env.HOME ?? '', '~');

        if (opts.json) {
          console.log(
            JSON.stringify(
              {
                host: {
                  effect: result.host.effect,
                  manifestPath: result.host.manifestPath,
                  owner: result.host.owner,
                  recipient: result.host.recipient,
                },
                repo: result.repo
                  ? {
                      effect: result.repo.effect,
                      manifestPath: result.repo.manifestPath,
                      org: result.repo.org,
                    }
                  : null,
              },
              null,
              2,
            ),
          );
        } else {
          const hostStatus =
            result.host.effect === 'created'
              ? 'freshly minted ✨'
              : 'already active 👌';
          console.log('');
          console.log('🔐 keyrack init');
          console.log(`   ├─ host manifest: ${hostStatus}`);
          console.log(
            `   │   ├─ path: ${asHomePath(result.host.manifestPath)}`,
          );
          console.log(`   │   ├─ owner: ${result.host.owner ?? 'default'}`);
          console.log(`   │   └─ recipient: ${result.host.recipient.label}`);
          if (result.repo) {
            const repoStatus =
              result.repo.effect === 'created'
                ? 'freshly minted ✨'
                : 'already active 👌';
            // show relative path from cwd
            const repoPathRelative = gitroot
              ? result.repo.manifestPath.replace(`${gitroot}/`, './')
              : result.repo.manifestPath;
            console.log(`   └─ repo manifest: ${repoStatus}`);
            console.log(`       ├─ path: ${repoPathRelative}`);
            console.log(`       └─ org: ${result.repo.org}`);
          } else {
            console.log(`   └─ repo manifest: not in repo`);
            console.log(
              `       └─ run 'rhachet keyrack init --org <org>' to init one`,
            );
          }
          console.log('');
        }
      },
    );

  // keyrack infra init --org <org>
  const infra = keyrack
    .command('infra')
    .description('manage the per-org keyrack-infra repo');

  infra
    .command('init')
    .description('init the $org/keyrack-infra repo and github-apps registry')
    .requiredOption('--org <org>', 'org to init keyrack-infra for')
    .option('--json', 'output as json (robot mode)')
    .action(async (opts: { org: string; json?: boolean }) => {
      // gh runner injected at the composition root (defaults to the real runGh)
      let result: ReturnType<typeof genKeyrackInfra>;
      try {
        result = genKeyrackInfra({ org: opts.org }, { ghRun });
      } catch (error) {
        // presentation boundary: render an EXPECTED (domain) failure in the same turtle
        // treestruct the success path uses (not a raw stack), surface it loud, exit non-zero.
        // allowlist ONLY helpful-errors — genKeyrackInfra + its gh seams throw these with a
        // hint (e.g. gh unauthenticated / forbidden). any other error is a code defect:
        // rethrow it UNCHANGED so its stack propagates and it is never masked as a friendly
        // "blocked" report (rule.forbid.failhide)
        if (!(error instanceof HelpfulError)) throw error;
        console.error(getKeyrackInfraInitErrorReport({ error }));
        // a ConstraintError is caller-fixable (exit 2); any other HelpfulError
        // (a MalfunctionError) is server-side (exit 1) — rule.require.exit-code-semantics
        process.exitCode = error instanceof ConstraintError ? 2 : 1;
        return;
      }

      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(getKeyrackInfraInitReport({ org: opts.org, ...result }));
      }
    });

  // keyrack recipient set|get|del
  const recipient = keyrack
    .command('recipient')
    .description('manage recipients who can decrypt the host manifest');

  // keyrack recipient set --pubkey <pubkey> --label <label> [--owner owner] [--stanza ssh] [--prikey path]
  recipient
    .command('set')
    .description('add a recipient to the host manifest')
    .requiredOption('--pubkey <pubkey>', 'age pubkey (age1...) or ssh pubkey')
    .requiredOption('--label <label>', 'label for this recipient')
    .option('--owner <owner>', 'owner identity (e.g., mechanic, foreman)')
    .option('--for <owner>', 'alias for --owner')
    .option(
      '--stanza <format>',
      'force stanza format: ssh (for ssh-keygen -p prevention flow)',
    )
    .option('--prikey <path>', 'ssh private key for manifest decryption')
    .option('--json', 'output as json (robot mode)')
    .action(
      async (opts: {
        pubkey: string;
        label: string;
        owner?: string;
        for?: string;
        stanza?: string;
        prikey?: string;
        json?: boolean;
      }) => {
        // --owner takes precedence; --for is alias
        const owner = deriveOwner(opts);

        // validate --stanza if provided
        if (opts.stanza && opts.stanza !== 'ssh')
          throw new ConstraintError('--stanza must be "ssh" if specified');

        const recipientAdded = await setKeyrackRecipient({
          owner,
          pubkey: opts.pubkey,
          label: opts.label,
          stanza: (opts.stanza as 'ssh' | undefined) ?? null,
          prikeys: opts.prikey ? [opts.prikey] : undefined,
        });

        if (opts.json) {
          console.log(JSON.stringify(recipientAdded, null, 2));
        } else {
          console.log('');
          console.log('🔐 keyrack recipient set');
          console.log(`   └─ added recipient`);
          console.log(`      ├─ label: ${recipientAdded.label}`);
          console.log(`      ├─ mech: ${recipientAdded.mech}`);
          console.log(
            `      └─ pubkey: ${recipientAdded.pubkey.slice(0, 20)}...`,
          );
          console.log('');
        }
      },
    );

  // keyrack recipient get [--owner owner] [--prikey path]
  recipient
    .command('get')
    .description('list recipients from the host manifest')
    .option('--owner <owner>', 'owner identity (e.g., mechanic, foreman)')
    .option('--for <owner>', 'alias for --owner')
    .option('--prikey <path>', 'ssh private key for manifest decryption')
    .option('--json', 'output as json (robot mode)')
    .action(
      async (opts: {
        owner?: string;
        for?: string;
        prikey?: string;
        json?: boolean;
      }) => {
        // --owner takes precedence; --for is alias
        const owner = deriveOwner(opts);

        const recipients = await getKeyrackRecipients({
          owner,
          prikeys: opts.prikey ? [opts.prikey] : undefined,
        });

        if (opts.json) {
          console.log(JSON.stringify(recipients, null, 2));
        } else {
          console.log('');
          console.log('🔐 keyrack recipient get');
          if (recipients.length === 0) {
            console.log('   └─ (no recipients)');
          } else {
            for (let i = 0; i < recipients.length; i++) {
              const r = recipients[i]!;
              const isLast = i === recipients.length - 1;
              const prefix = isLast ? '   └─' : '   ├─';
              const indent = isLast ? '      ' : '   │  ';
              console.log(`${prefix} ${r.label}`);
              console.log(`${indent}├─ mech: ${r.mech}`);
              console.log(`${indent}├─ pubkey: ${r.pubkey.slice(0, 20)}...`);
              console.log(`${indent}└─ added: ${r.addedAt}`);
            }
          }
          console.log('');
        }
      },
    );

  // keyrack recipient del --label <label> [--owner owner] [--prikey path]
  recipient
    .command('del')
    .description('remove a recipient from the host manifest')
    .requiredOption('--label <label>', 'label of recipient to remove')
    .option('--owner <owner>', 'owner identity (e.g., mechanic, foreman)')
    .option('--for <owner>', 'alias for --owner')
    .option('--prikey <path>', 'ssh private key for manifest decryption')
    .option('--json', 'output as json (robot mode)')
    .action(
      async (opts: {
        label: string;
        owner?: string;
        for?: string;
        prikey?: string;
        json?: boolean;
      }) => {
        // --owner takes precedence; --for is alias
        const owner = deriveOwner(opts);

        await delKeyrackRecipient({
          owner,
          label: opts.label,
          prikeys: opts.prikey ? [opts.prikey] : undefined,
        });

        if (opts.json) {
          console.log(JSON.stringify({ deleted: opts.label }, null, 2));
        } else {
          console.log('');
          console.log('🔐 keyrack recipient del');
          console.log(`   └─ removed recipient: ${opts.label}`);
          console.log('');
        }
      },
    );

  // keyrack get --for repo
  // keyrack get --key $key
  keyrack
    .command('get')
    .description('grant credentials from keyrack')
    .option('--for <scope>', 'grant scope: "repo" for all keys')
    .option('--owner <owner>', 'owner identity (e.g., mechanic, foreman)')
    .option('--key <keyname>', 'raw key name to grant (e.g., AWS_PROFILE)')
    .option('--env <env>', 'target env: prod, prep, test, all, sudo, or camp')
    .option(
      '--org <org>',
      'target org: @this or @all (default: @this)',
      '@this',
    )
    .option(
      '--reach <exid>',
      'reach to fetch (e.g., beav@ehmpathy.com, github://org=ehmpathy); requires --key',
    )
    .option(
      '--allow-dangerous',
      'bypass firewall for blocked long-lived tokens',
    )
    .option(
      '--unlock',
      'auto-unlock locked keys (narrowly, by name) before get',
    )
    .option('--json', 'output as json (robot mode)')
    .option(
      '--output <mode>',
      'output mode: value (raw secret), json, vibes (default)',
    )
    .option('--value', 'shorthand for --output value')
    .action(
      async (opts: {
        for?: string;
        owner?: string;
        key?: string;
        env?: string;
        org: string;
        reach?: string;
        allowDangerous?: boolean;
        unlock?: boolean;
        json?: boolean;
        output?: 'value' | 'json' | 'vibes';
        value?: boolean;
      }) => {
        // parse the reach at the cli boundary, so a malformed exid fails before any lookup.
        // an exid is PLAINTEXT — keyrack parses no scheme and reads no sense into it
        // .note = --org is PROVENANCE (whose manifest declared the key) and --reach is
        //         DESTINATION (which reach it opens). they sit inches apart and mean
        //         opposite directions, which is exactly why each keeps its own word
        const parsed = asKeyrackKeyReachOrEmitBlocked({
          flag: opts.reach,
          command: 'keyrack get',
        });
        if (!parsed) return;
        const { reach } = parsed;

        // a reach is an identity axis of one key — it cannot ride a whole-repo sweep
        // .note = this is the SAME guard `unlockKeyrackKeys` states for a bulk unlock, so
        //         it throws the same class and renders the same turtle blocked treestruct.
        //         one sentence on one flag must not read two ways because a human typed a
        //         different command (rule.forbid.surprises)
        try {
          assertKeyrackReachRequiresKey({
            reach,
            keyed: opts.for !== 'repo',
            // the hint must name the fix the human has NOT already applied.
            // `--for repo` WINS over `--key` downstream (see the `opts.for === 'repo'`
            // branch below, which asks `for: { repo: true }` and reads neither flag), so
            // an ask that carries BOTH genuinely resolves to a sweep — `keyed: false` is
            // correct. but to answer that human with "name the key" names a fix they
            // already applied, and walks them down a road that cannot work
            // (rule.require.errors-name-the-fix). the flag to drop is the sweep
            hint: opts.key
              ? `drop --for repo — a reach is an identity axis of one key, and --for repo sweeps every key in the repo. rhx keyrack get --key ${opts.key} --reach ${opts.reach}`
              : `name the key — rhx keyrack get --key $KEY --reach ${opts.reach}`,
          });
        } catch (error) {
          if (!(error instanceof ConstraintError)) throw error;
          emitKeyrackBlockedReport({ error, command: 'keyrack get' });
          return;
        }

        // derive output mode: --value and --json are shorthands
        const outputMode: 'value' | 'json' | 'vibes' = opts.value
          ? 'value'
          : (opts.output ?? (opts.json ? 'json' : 'vibes'));

        // the three usage guards below render the SAME blocked treestruct the reach guard
        // above them does. they raw-threw a `BadRequestError` until 2026-08-04, which put
        // two renders on one command inches apart: a human who typed `--reach` on a repo
        // sweep got the turtle tree, and a human who forgot `--key` got a stack trace
        // (rule.forbid.surprises). each is a plain usage fault, so each owes exit 2 and a
        // named fix (rule.require.exit-code-semantics, rule.require.errors-name-the-fix)

        // validate: --value requires --key
        if (outputMode === 'value' && !opts.key) {
          emitKeyrackBlockedReport({
            error: new ConstraintError(
              '--value requires --key: a value is one secret, so it names one key',
              {
                hint: 'name the key — rhx keyrack get --key $KEY --value',
              },
            ),
            command: 'keyrack get',
          });
          return;
        }

        // validate: must specify either --for repo or --key
        if (!opts.for && !opts.key) {
          emitKeyrackBlockedReport({
            error: new ConstraintError(
              'must specify --for repo or --key <slug>',
              {
                hint: 'one key — rhx keyrack get --key $KEY; every key in this repo — rhx keyrack get --for repo',
              },
            ),
            command: 'keyrack get',
          });
          return;
        }
        if (opts.for && opts.for !== 'repo') {
          emitKeyrackBlockedReport({
            error: new ConstraintError(
              `--for must be "repo", got '${opts.for}'`,
              {
                forGiven: opts.for,
                hint: 'use --for repo, or name one key with --key $KEY',
              },
            ),
            command: 'keyrack get',
          });
          return;
        }

        // get gitroot for repo manifest — null-tolerant: a keyrack read must serve machine-wide
        // @all keys even when the cwd is not a git repo (a git credential helper from a bare clone)
        const gitroot = await getGitRepoRootOrNull({ from: process.cwd() });

        // generate lightweight context (no manifest decryption, no passphrase prompt)
        // .note = get uses --for as grant scope, not owner alias; only --owner or top-level --owner apply
        const context = await genContextKeyrackGrantGet({
          gitroot,
          owner:
            opts.owner ?? keyrack.opts().owner ?? keyrack.opts().for ?? null,
        });

        // handle grant
        if (opts.for === 'repo') {
          // always route through the get-or-unlock core; --unlock is just a parameter
          // (with.unlock:false is byte-identical to the pure repo get)
          // .note = rendered through the SAME blocked treestruct `set` / `unlock` / `source`
          //         use. `get`'s own --reach guard was already routed here, but the GRANT
          //         call was not — so one command rendered its own refusals as a tree and
          //         the core's refusals as a raw class dump. the sweep that converged the
          //         guards has to reach the call sites too (rule.forbid.surprises)
          // .note = `reaches: true` — this is a STRUCTURED surface. its tree and its json
          //         both hold one branch per key, so they can carry every reach a key
          //         declares, and a sweep that returned only the reachless one would read as
          //         "this repo holds one key" while it holds three. the flat surfaces
          //         (`source`, the secrets map) opt out for the opposite reason: one slot per
          //         bare name, so they announce what they cannot carry instead
          const attempts = await getAllKeyrackGrantsOrEmitBlocked(
            {
              for: { repo: true },
              with: { unlock: !!opts.unlock, reaches: true },
              owner: opts.owner ?? null,
              env: opts.env ?? null,
              allow: { dangerous: opts.allowDangerous },
            },
            { command: 'keyrack get' },
          );

          // null means the refusal is already rendered — no more to say
          if (!attempts) return;

          // output results based on mode
          // .note = 'value' mode already rejected via validation above
          if (outputMode === 'json') {
            console.log(JSON.stringify(attempts, null, 2));
          } else {
            console.log(formatKeyrackGetAllOutput({ attempts }));
          }

          // exit 2 if any key was not granted (blocked by constraints)
          if (!isAllAttemptsGranted({ attempts })) {
            process.exit(2);
          }
        } else if (opts.key) {
          // grant key via domain operation
          // .note = org parameter passed through to enable:
          //   - @all bypass for sudo access
          //   - org mismatch fail-fast (security enforcement)
          //   - slug construction without manifest
          // .note = @this means "use manifest org" — pass undefined to let domain op handle
          const orgForDomainOp =
            opts.org === '@this' ? undefined : (opts.org ?? undefined);
          // always route through the get-or-unlock core; --unlock is just a parameter
          // (with.unlock:false is byte-identical to the pure single-key get)
          // .note = routed to the same blocked render as the repo branch above, and for the
          //         same reason: a refusal from the grant core must read the same as a
          //         refusal from this command's own guards
          const attemptsForKey = await getAllKeyrackGrantsOrEmitBlocked(
            {
              for: { keys: [opts.key] },
              // .note = `reaches: true` for the SAME reason the `--for repo` branch above
              //         carries it — this is one structured surface, and its tree and json
              //         both hold one branch per attempt. an ask that names a key but no
              //         reach used to return the reachless credential alone, so a key cut
              //         at two reaches rendered as `absent` with a tip to `keyrack set` —
              //         a falsehood that invites a human to overwrite a key they hold
              // .note = an explicit `--reach` names ONE reach and does not expand
              with: { unlock: !!opts.unlock, reaches: true },
              owner: opts.owner ?? null,
              env: opts.env ?? null,
              org: orgForDomainOp,
              reach,
              allow: { dangerous: opts.allowDangerous },
            },
            { command: 'keyrack get' },
          );

          // null means the refusal is already rendered — no more to say
          if (!attemptsForKey) return;

          const attempt = attemptsForKey[0]!;

          // extract env and slug from attempt for downstream logic
          const slug =
            attempt.status === 'granted'
              ? attempt.grant.slug
              : (attempt as { slug: string }).slug;
          const slugParts = asKeyrackSlugParts({ slug });
          const env = slugParts.env || opts.env || 'all';

          // promote locked/absent → absent for non-sudo keys not in repo manifest (allowlist)
          const attemptResolved = asResolvedAttempt({
            attempt,
            slug,
            keyName: slugParts.keyName,
            env,
            repoManifest: context.repoManifest,
          });

          // output results based on mode
          switch (outputMode) {
            case 'value': {
              // for value mode: exit 2 with vibes on stderr if not granted
              if (attemptResolved.status !== 'granted') {
                console.error(
                  formatKeyrackGetOneOutput({ attempt: attemptResolved }),
                );
                process.exit(2);
              }
              // output raw secret with no final newline
              process.stdout.write(attemptResolved.grant.key.secret);
              break;
            }
            case 'json': {
              console.log(JSON.stringify(attemptResolved, null, 2));
              // exit 2 if not granted
              if (attemptResolved.status !== 'granted') {
                process.exit(2);
              }
              break;
            }
            case 'vibes':
            default: {
              console.log(
                formatKeyrackGetOneOutput({ attempt: attemptResolved }),
              );
              // exit 2 if not granted
              if (attemptResolved.status !== 'granted') {
                process.exit(2);
              }
              break;
            }
          }
        }
      },
    );

  // keyrack source --env <env> --owner <owner> [--key <key>] [--strict|--lenient]
  keyrack
    .command('source')
    // .note = the description states what the command DOES, and no more. that a bare sweep
    //         carries only the reachless key is a fact about ONE run, not about the command,
    //         and a permanent caveat here would be read by the ~every human who holds no reach
    //         at all. the disclosure lives on the rack instead: `keyrack list` renders a
    //         `reach:` leaf per key, so a human who asks what they hold is answered there
    .description('output export statements for shell eval')
    .option('--key <keyname>', 'single key to source (omit for all repo keys)')
    .requiredOption(
      '--env <env>',
      'target env: prod, prep, test, all, sudo, camp',
    )
    .option('--owner <owner>', 'owner identity (e.g., mechanic, foreman)')
    .option('--for <owner>', 'alias for --owner')
    .option('--strict', 'fail if any key not granted (default)')
    .option('--lenient', 'skip absent keys silently')
    .option(
      '--reach <exid>',
      // .note = `; requires --key` is stated here for the same reason `unlock` and `get`
      //         state it: the constraint is discoverable BEFORE a human types the command
      //         that refuses (rule.require.discoverability, recognition over recall). its
      //         absence here was the help half of a two-part drift — the other half being
      //         a refusal that rendered raw rather than as the turtle tree
      'reach of the key to source (e.g., beav@ehmpathy.com, github://org=ehmpathy); requires --key',
    )
    .option(
      '--allow-dangerous',
      'bypass firewall for blocked long-lived tokens',
    )
    .action(
      async (opts: {
        key?: string;
        env: string;
        owner?: string;
        for?: string;
        strict?: boolean;
        lenient?: boolean;
        reach?: string;
        allowDangerous?: boolean;
      }) => {
        // --owner takes precedence; --for is alias (null = default owner)
        const owner = deriveOwner(opts);

        // parse at the boundary — an unusable reach fails here, never downstream
        // .note = the parse runs BEFORE the key check, as `keyrack get` does. so a malformed
        //         exid reports as malformed rather than as an absent `--key`, which is the
        //         more specific of the two fixes (rule.require.errors-name-the-fix)
        const parsed = asKeyrackKeyReachOrEmitBlocked({
          flag: opts.reach,
          command: 'keyrack source',
        });
        if (!parsed) return;
        const { reach } = parsed;

        // a reach names ONE reach, so it must name the key that reach belongs to
        // (q2). a repo sweep is reach-blind by design — it asks each declared slug with no
        // reach — so a `--reach` on a sweep would apply to not one key it swept
        // .why the catch = `get` and `unlock` each render this refusal as the turtle blocked
        //        treestruct. this call site threw BARE, so the identical rule surfaced as a
        //        raw `ConstraintError:` dump trailed by an `[args] keyrack,source,…` echo —
        //        one rule, two renders, picked by which command a human typed. that is the
        //        exact inconsistency `rule.forbid.surprises` and nielsen's heuristic 4 forbid,
        //        and it is the same shape `asKeyrackKeyReachOrEmitBlocked` was extracted to
        //        end for the PARSE refusal three lines up
        // .note = the hint stays per-caller per `assertKeyrackReachRequiresKey`'s contract —
        //         the copy-paste fix is command-shaped, so it must name `source`
        try {
          assertKeyrackReachRequiresKey({
            reach,
            keyed: !!opts.key,
            hint: `name the key — rhx keyrack source --env ${opts.env} --key $KEY --reach ${opts.reach}`,
          });
        } catch (error) {
          if (!(error instanceof ConstraintError)) throw error;
          emitKeyrackBlockedReport({ error, command: 'keyrack source' });
          return;
        }

        // validate: --strict and --lenient are mutually exclusive
        if (opts.strict && opts.lenient) {
          throw new ConstraintError(
            '--strict and --lenient are mutually exclusive',
          );
        }

        // default to strict mode
        const isLenient = opts.lenient ?? false;

        // fail fast: sudo credentials require --key (not in keyrack.yml)
        if (opts.env === 'sudo' && !opts.key) {
          throw new ConstraintError(
            'sudo credentials require --key. sudo keys are not stored in keyrack.yml.',
            { hint: 'use: rhx keyrack source --env sudo --key <keyname>' },
          );
        }

        // get gitroot for repo manifest — null-tolerant: a keyrack read must serve machine-wide
        // @all keys even when the cwd is not a git repo (a git credential helper from a bare clone)
        const gitroot = await getGitRepoRootOrNull({ from: process.cwd() });

        // generate lightweight context (no manifest decryption, no passphrase prompt)
        const context = await genContextKeyrackGrantGet({
          gitroot,
          owner,
        });

        // get keys
        const attempts = opts.key
          ? [
              await getOneKeyrackGrantByKey(
                {
                  key: opts.key,
                  env: opts.env,
                  org: undefined,
                  reach,
                  allow: { dangerous: opts.allowDangerous },
                },
                context,
              ),
            ]
          : // .note = `reaches: true` — the sweep ENUMERATES every declared reach even
            //         though this surface can emit only one per name. that is deliberate: the
            //         reaches it cannot carry are exactly the ones it must announce, and
            //         a sweep that never asked for them has nothing to announce. the ask is
            //         what ends the silence; the emit below is what the namespace permits
            await getAllKeyrackGrantsByRepo(
              {
                env: opts.env,
                allow: { dangerous: opts.allowDangerous },
                with: { reaches: true },
              },
              context,
            );

        // split by what a flat namespace can carry
        // .why = `export FOO=` holds ONE value per bare name, so a reach-held key can never be
        //        emitted beside its reachless peer. it must sit outside the export set, outside
        //        the collision guard, and outside the strict gate. to leave it in the strict
        //        gate would fail `source` outright whenever a declared reach is merely locked,
        //        which costs the human every credential to report one fact
        // .note = a repo that declares no reach yields no reach attempt at all, so the set
        //         below is identical to today's (e1)
        const attemptsReachless = attempts.filter(
          (attempt) => !asKeyrackAttemptReach({ attempt }),
        );

        // filter to granted keys
        const granted = asAttemptsByStatus({
          attempts: attemptsReachless,
          status: 'granted',
        });
        const notGranted = asNotGrantedAttempts({
          attempts: attemptsReachless,
        });

        // manifest must exist for repo keys (required to get attempts)
        const { repoManifest } = context;
        if (!repoManifest)
          throw new ConstraintError('keyrack.yml not found', {
            hint: 'run `rhx keyrack init --org <your-org>` to create one',
          });

        // filter out keys whose requirement is waived via is-optional-if-has
        const keysStrictlyRequired = notGranted.filter((k) =>
          decideIsKeyStrictlyRequired({
            attempt: k,
            manifest: repoManifest,
            env: process.env as Record<string, string | undefined>,
          }),
        );

        // strict mode: fail if any strictly required keys not granted
        if (!isLenient && keysStrictlyRequired.length > 0) {
          // no stdout (prevent partial eval)
          // emit formatted status to stderr (same as keyrack get)
          if (opts.key) {
            // single-key mode: use single-key formatter
            console.error(
              formatKeyrackGetOneOutput({ attempt: keysStrictlyRequired[0]! }),
            );
          } else {
            // multi-key mode: use multi-key formatter + error + lenient hint
            console.error(
              formatKeyrackGetAllOutput({ attempts: keysStrictlyRequired }),
            );
            console.error(
              '\n✋ some keys were not granted, yet are strictly required',
            );
            console.error('   └─ ask a human to set the keys, then try again');
            console.error(
              '\nhint: use --lenient if partial results are acceptable',
            );
          }
          process.exit(2);
        }

        // refuse to emit when two keys would collide on one shell variable name
        // .why = `asKeyrackKeyName` drops the org AND the env, so a shell variable name
        //        carries neither. two keys that differ on any axis above the name emit the
        //        SAME `export FOO=` and the last line silently wins — a caller who evals
        //        this output holds one key with no hint the other was overwritten. that is
        //        not a wrong-reach substitution, it is a silent LOSS, and it is the one
        //        failure shape in this design that SUCCEEDS. so it throws rather than picks
        // .note = ⚠️ which AXIS can collide here today, verified 2026-08-12 — because an
        //         earlier draft of this note implied the reach axis was live, and it is not:
        //         - ENV: reachable now. an `--env all` sweep yields two envs of one name,
        //           and this is the collision the extant tests exercise. it predates reach
        //         - REACH (e23): NOT reachable through any current caller. `--key` builds a
        //           single-element array, which cannot collide with itself; and the sweep
        //           asks each declared slug with no reach, so every attempt it yields is
        //           reachless. a reach-held key never reaches the export set, so it can
        //           never claim a variable name to collide over
        //         ⚠️ the `attemptsReachless` filter is what keeps the axis dead, and it
        //           carries weight: to pass the unfiltered set here would make this guard
        //           THROW for every repo that declares a reach, which takes every credential
        //           away to report one fact a human reads off `keyrack list` on purpose
        // .note = the reach branch stays regardless, and is not a speculative abstraction:
        //         it costs one reach comparison, and the repo manifest ALREADY declares
        //         reaches (a flat `reaches:` list under a key, q8) that a reach-aware sweep will
        //         enumerate. the day it does, this guard is the difference between a refusal
        //         and a credential dropped on the floor
        // .note = rendered through the SAME blocked treestruct `get` / `set` / `unlock` use
        //         for this error class. uncaught, it would reach `invoke.ts`'s generic
        //         top-level catch and print a bare `✋ ConstraintError:` + `[args]` dump —
        //         so one rule would read two ways, per which command a human typed
        //         (rule.forbid.surprises, rule.require.errors-name-the-fix)
        try {
          assertKeyrackExportNamesDistinct({ attempts: granted });
        } catch (error) {
          if (!(error instanceof ConstraintError)) throw error;
          emitKeyrackBlockedReport({ error, command: 'keyrack source' });
          return;
        }

        // .note = a bare sweep emits the REACHLESS credential for every slug, and says no word
        //         about a reach held beside it. that silence is DELIBERATE (2026-08-12): reach is
        //         opt-in, so a human who cut a reach-key knows a reach-key needs `--reach`, and a
        //         notice that fires on every `source` forever — always the same lines, never
        //         actionable differently — is alarm fatigue. its real cost is that it trains a
        //         human to ignore keyrack stderr, which weakens the two notices that DO vary: the
        //         `assertKeyrackExportNamesDistinct` refusal above, and the uncut-reach throw
        // .note = this is NOT the wrong-territory failure the design forbids. the reachless value
        //         emitted here is the correct one; a reach simply is not among what a flat
        //         namespace can carry. "fewer than exist", never "the wrong one"
        // .note = the disclosure lives on the RACK. `keyrack list` renders a `reach:` leaf per
        //         key, one branch per (slug, reach), so a human who asks "what do i hold?" sees
        //         every reach. one home for the fact, and it is the one a human consults on
        //         purpose rather than one that shouts on a hot path

        // emit export statements for granted keys
        for (const attempt of granted) {
          if (attempt.status !== 'granted') continue;
          const keyName = asKeyrackKeyName({ slug: attempt.grant.slug });
          const escaped = asShellEscapedSecret({
            secret: attempt.grant.key.secret,
          });
          console.log(`export ${keyName}=${escaped}`);
        }
      },
    );

  // keyrack set --key $key --mech $mech --vault $vault [--for owner] [--env env] [--org org]
  keyrack
    .command('set')
    .description('configure storage for a credential key')
    .requiredOption(
      '--key <keyname>',
      'raw key name to configure (e.g., AWS_PROFILE)',
    )
    .option(
      '--mech <mechanism>',
      'grant mechanism (inferred from vault when omitted)',
    )
    .requiredOption(
      '--vault <vault>',
      'storage vault: os.direct, os.secure, os.daemon, os.envvar, 1password, aws.config, aws.params, github.secrets',
    )
    .option('--owner <owner>', 'owner identity (e.g., mechanic, foreman)')
    .option('--for <owner>', 'alias for --owner')
    .option(
      '--env <env>',
      'target env: prod, prep, test, all, sudo, or camp (inferred from manifest if unambiguous)',
    )
    .option(
      '--org <org>',
      'target org: @this or @all (default: @this)',
      '@this',
    )
    .option(
      '--reach <exid>',
      'reach this key is cut for (e.g., beav@ehmpathy.com, github://org=ehmpathy)',
    )
    .option('--exid <exid>', 'external id (vault-specific reference)')
    .option('--max-duration <duration>', 'max TTL for this key (e.g., 5m, 1h)')
    .option('--at <path>', 'custom keyrack.yml path (for role-level keyracks)')
    .option('--prikey <path>', 'ssh private key for manifest decryption')
    .option('--json', 'output as json (robot mode)')
    .action(
      async (opts: {
        key: string;
        mech?: string;
        vault: string;
        owner?: string;
        for?: string;
        env?: string;
        org: string;
        reach?: string;
        exid?: string;
        maxDuration?: string;
        at?: string;
        prikey?: string;
        json?: boolean;
      }) => {
        // --owner takes precedence; --for is alias
        const owner = deriveOwner(opts);

        // parse the reach at the cli boundary, so a malformed exid fails before any prompt.
        // an exid is PLAINTEXT — keyrack parses no scheme and reads no sense into it
        // .note = on `set` a reach DECLARES the reach the stored credential is cut for.
        //         it never writes itself into the repo's keyrack.yml — a `reaches:` line
        //         there is hand-authored by a human, and no keyrack command mutates it
        const parsed = asKeyrackKeyReachOrEmitBlocked({
          flag: opts.reach,
          command: 'keyrack set',
        });
        if (!parsed) return;
        const { reach } = parsed;

        // validate vault first (needed for mech inference)
        const validVaults: KeyrackHostVault[] = [
          'os.direct',
          'os.secure',
          'os.daemon',
          'os.envvar',
          '1password',
          'aws.config',
          'aws.params',
          'github.secrets',
        ];
        if (!validVaults.includes(opts.vault as KeyrackHostVault)) {
          throw new ConstraintError(
            `invalid --vault: must be one of ${validVaults.join(', ')}`,
          );
        }

        // validate mech if provided; otherwise let vault adapter handle inference
        const mech: KeyrackGrantMechanism | null = (() => {
          if (!opts.mech) return null; // vault adapter will infer

          // validate explicit mechanism
          const validMechs: KeyrackGrantMechanism[] = [
            'PERMANENT_VIA_REPLICA',
            'PERMANENT_VIA_REFERENCE',
            'EPHEMERAL_VIA_SESSION',
            'EPHEMERAL_VIA_GITHUB_APP',
            'EPHEMERAL_VIA_AWS_SSO',
            'EPHEMERAL_VIA_GITHUB_OIDC',
          ];
          if (!validMechs.includes(opts.mech as KeyrackGrantMechanism)) {
            throw new ConstraintError(
              `invalid --mech: must be one of ${validMechs.join(', ')}`,
            );
          }
          return opts.mech as KeyrackGrantMechanism;
        })();

        // get gitroot to derive org from manifest
        const gitroot = await getGitRepoRoot({ from: process.cwd() });
        const repoManifestFound = await daoKeyrackRepoManifest.get({ gitroot });

        // create context with lazy identity discovery
        // .note = mech injects the gh runner + guided prompt so a github-app set can
        //         be driven by a contract-grain test; in prod both fall back to real deps
        const context = genContextKeyrack({
          owner,
          prikeys: opts.prikey ? [opts.prikey] : undefined,
          repoManifest: repoManifestFound ?? null,
          gitroot,
          mech: { ghRun, question },
        });

        // load host manifest (triggers identity discovery)
        const hostResult = await daoKeyrackHostManifest.get({ owner }, context);
        if (!hostResult) {
          const initTip = owner
            ? `run: rhx keyrack init --owner ${owner}`
            : 'run: rhx keyrack init';
          throw new ConstraintError(`host manifest not found. ${initTip}`, {
            owner,
          });
        }

        // load manifest: from --at path if provided, otherwise use default repo manifest
        const repoManifest = (() => {
          if (opts.at) {
            const customPath = opts.at.startsWith('/')
              ? opts.at
              : join(gitroot, opts.at);
            if (!existsSync(customPath)) {
              console.log('');
              console.log(`✋ keyrack not found at: ${opts.at}`);
              console.log(
                "   └─ tip: run 'npx rhachet keyrack init --at <path>' first",
              );
              console.log('');
              process.exit(2);
            }
            return loadManifestHydrated({ path: customPath }, { gitroot });
          }
          return context.repoManifest ?? null;
        })();

        // infer or validate env
        const resolvedEnv = asResolvedEnvForSet({
          env: opts.env,
          key: opts.key,
          manifest: repoManifest,
        });

        // expand org from manifest (only if not @all)
        let resolvedOrg: string;
        if (opts.org === '@all') {
          resolvedOrg = '@all';
        } else if (repoManifest) {
          resolvedOrg = assertKeyrackOrgMatchesManifest({
            manifest: repoManifest,
            org: opts.org,
          });
        } else {
          // no manifest available
          if (resolvedEnv === 'sudo') {
            console.log('');
            console.log('✋ no keyrack.yml found');
            console.log(
              '   └─ tip: for sudo credentials without keyrack.yml, use --org @all',
            );
            console.log('');
            process.exit(2);
          }
          console.log('');
          console.log('✋ no keyrack.yml found');
          console.log(
            "   └─ tip: run 'npx rhachet keyrack init --org <your-org>' to create one",
          );
          console.log('');
          process.exit(2);
        }

        // delegate to domain operation
        // note: vault adapters prompt for their own secrets via stdin (per rule.require.vault-fetches-own-secrets)
        // .note = a caller-fixable ConstraintError (e.g. keyrack-infra absent, app not
        //         registered, invalid app choice from the github-app guided setup) is
        //         rendered as the turtle blocked treestruct — the same visual language the
        //         success path uses — instead of a raw `ConstraintError: …` class-name dump
        // run the set inside a const IIFE that yields the outcome, or null on a
        // caller-fixable ConstraintError — so results binds to const, never let
        // (rule.require.immutable-vars). the boundary below reads the null sentinel and
        // returns, so no mutable value is threaded out of the try
        const setOutcome = await (async (): Promise<Awaited<
          ReturnType<typeof setKeyrackKey>
        > | null> => {
          try {
            return await setKeyrackKey(
              {
                key: opts.key,
                env: resolvedEnv,
                org: resolvedOrg,
                vault: opts.vault as KeyrackHostVault,
                mech,
                exid: opts.exid ?? null,
                reach,
                maxDuration: opts.maxDuration ?? null,
                repoManifest: repoManifest ?? undefined,
                at: opts.at ?? null,
              },
              context,
            );
          } catch (error) {
            if (!(error instanceof ConstraintError)) throw error;
            // renders the blocked tree AND sets exit 2 in one operation, so a guard
            // cannot land with one and not the other (term=blocked's invariant)
            emitKeyrackBlockedReport({ error, command: 'keyrack set' });
            return null;
          }
        })();

        // caller-fixable fault: the emit above already set exit 2, so this only returns
        if (setOutcome === null) return;

        const results = setOutcome;

        // output results — json is a terminal render, so it returns and the human
        // tree below reads as the straight-line narrative it is (rule.forbid.else-branches)
        if (opts.json) {
          console.log(
            JSON.stringify(
              results.length === 1 ? results[0] : results,
              null,
              2,
            ),
          );
          return;
        }

        // blank line separates a guided-setup tree from this summary header
        // .note = only ephemeral mechs print a guided tree (e.g. aws sso);
        //         static-secret mechs (e.g. sudo) print no tree, so no blank
        const printedGuidedTree = results.some((result) =>
          result.mech.startsWith('EPHEMERAL'),
        );
        if (printedGuidedTree) console.log('');
        console.log(`🔐 keyrack set (org: ${resolvedOrg}, env: ${opts.env})`);
        for (const result of results) {
          // echo the ADDRESS, not the bare slug — a `set --reach` cuts a key AT a
          // reach, and a human who cannot see which reach cannot confirm the
          // key landed where they meant. `del`, `list`, `status`, and `unlock` all
          // render the reach; `set` was the one command that accepted `--reach` and
          // then stayed silent about it
          // .note = e1 holds — `asKeyrackKeySlugAtReach` returns the bare slug byte for
          //         byte when no reach is given, so every reachless render, and every
          //         snapshot of one, is unchanged
          console.log(
            `   └─ ${asKeyrackKeySlugAtReach({ slug: result.slug, reach })}`,
          );
          console.log(`      ├─ mech: ${result.mech}`);
          // aws.params echoes the COMPUTED ssm param name (the exid) so the human sees exactly
          // where the value is referenced — the autocompute path, with no path typed (vision uc1)
          if (result.vault === 'aws.params' && result.exid) {
            console.log(`      ├─ vault: ${result.vault}`);
            console.log(`      └─ name: ${result.exid}`);
          } else {
            console.log(`      └─ vault: ${result.vault}`);
          }
        }
        if (opts.env === 'sudo') {
          console.log('');
          console.log(
            '   note: sudo credentials are stored in encrypted host manifest only.',
          );
          console.log('         they will NOT appear in keyrack.yml.');
        }
        console.log('');
      },
    );

  // keyrack del --key <key> [--env env] [--owner owner] [--prikey path] [--json]
  keyrack
    .command('del')
    .description('remove a credential key from this host')
    .requiredOption('--key <keyname>', 'key name to remove (e.g., AWS_PROFILE)')
    .option(
      '--env <env>',
      'target env: prod, prep, test, all, sudo, or camp (default: all)',
      'all',
    )
    .option('--owner <owner>', 'owner identity (e.g., mechanic, foreman)')
    .option('--for <owner>', 'alias for --owner')
    .option(
      '--org <org>',
      'target org: @this or @all (default: @this)',
      '@this',
    )
    .option('--prikey <path>', 'ssh private key for manifest decryption')
    .option(
      '--reach <exid>',
      'reach of the key to remove (e.g., beav@ehmpathy.com, github://org=ehmpathy)',
    )
    .option('--json', 'output as json (robot mode)')
    .action(
      async (opts: {
        key: string;
        env: string;
        owner?: string;
        for?: string;
        org: string;
        prikey?: string;
        reach?: string;
        json?: boolean;
      }) => {
        // --owner takes precedence; --for is alias
        const owner = deriveOwner(opts);

        // parse the reach, when one is given
        // .note = a del names ONE address. absent --reach it removes the reachless key, and
        //         a key cut for a reach is removed only when its reach is named —
        //         the same identity axis `set` writes on. this is deliberately NOT relock's
        //         wide sweep (q1): to revoke a session is wide, to delete a key is addressed
        const parsed = asKeyrackKeyReachOrEmitBlocked({
          flag: opts.reach,
          command: 'keyrack del',
        });
        if (!parsed) return;
        const { reach } = parsed;

        // validate env
        if (!isValidKeyrackEnv(opts.env)) {
          throw new ConstraintError(
            `invalid --env: must be one of ${KEYRACK_VALID_ENVS.join(', ')}`,
          );
        }

        // blank line before passphrase prompt (matches `set` output cadence)
        console.log('');

        // get gitroot and repoManifest
        const gitroot = await getGitRepoRoot({ from: process.cwd() });
        const repoManifest = await daoKeyrackRepoManifest.get({ gitroot });

        // generate context and load host manifest
        const context = genContextKeyrack({
          owner,
          prikeys: opts.prikey ? [opts.prikey] : undefined,
          repoManifest: repoManifest ?? null,
          gitroot,
        });
        await daoKeyrackHostManifest.get({ owner }, context);

        // derive org from manifest
        let derivedOrg: string;
        if (opts.org === '@all') {
          derivedOrg = '@all';
        } else {
          if (!repoManifest) {
            if (opts.env === 'sudo') {
              // for sudo keys, try to find org from host manifest keys
              const hostManifest = context.hostManifest;
              if (!hostManifest) {
                console.log('');
                console.log('✋ no host manifest found');
                console.log('');
                process.exit(2);
              }
              const hostSlugs = Object.keys(hostManifest.hosts);
              const matchedSlug = findSlugByEnvAndKeyName({
                slugs: hostSlugs,
                env: opts.env,
                keyName: opts.key,
              });
              if (matchedSlug) {
                derivedOrg =
                  asKeyrackSlugParts({ slug: matchedSlug }).org || '@all';
              } else {
                console.log('');
                console.log(
                  `✋ key '${opts.key}' not found in host manifest for env '${opts.env}'`,
                );
                console.log('');
                process.exit(2);
              }
            } else {
              console.log('');
              console.log('✋ no keyrack.yml found in this repo');
              console.log(
                "   └─ tip: run 'npx rhachet keyrack init --org <your-org>' to create one",
              );
              console.log('');
              process.exit(2);
            }
          } else {
            derivedOrg = assertKeyrackOrgMatchesManifest({
              manifest: repoManifest,
              org: opts.org,
            });
          }
        }

        // detect if key is already a full slug (org.env.key format)
        const isFullSlug = isKeyrackSlugFormat({ value: opts.key });

        // ⚠️ the input guards below and the domain call share ONE try, deliberately. `del`
        //    was the only command that rendered a caller-fixable fault as a raw class dump —
        //    `set`, `source`, and `unlock` each wrap theirs — so a human who typo'd a slug got
        //    a stack trace where every peer command gives the turtle tree
        //    (rule.forbid.surprises, rule.require.errors-name-the-fix)
        // .note = the guards sit INSIDE the try, not merely the domain call. `del` refuses a
        //         caller in two places, and the two a human is far likelier to hit are these —
        //         a mistyped slug, or an `--env` that disagrees with the slug it was given.
        //         wrapped around the domain call alone, the fix would render the rarer fault
        //         and leave the common ones raw
        // .note = both guards throw `ConstraintError`, not `BadRequestError` as they did. the
        //         class is what earns exit 2 (rule.require.exit-code-semantics) and what
        //         `emitKeyrackBlockedReport` accepts by type; `ConstraintError` extends
        //         `BadRequestError`, so any `instanceof BadRequestError` caller is unaffected
        let slug: string;
        let result: Awaited<ReturnType<typeof delKeyrackKey>>;
        try {
          // construct or use slug
          let effectiveEnv: string;
          if (isFullSlug) {
            slug = opts.key;
            const keySlugParts = asKeyrackSlugParts({ slug: opts.key });
            effectiveEnv = keySlugParts.env || opts.env;
            const slugOrg = keySlugParts.org;

            // validate org matches manifest
            if (derivedOrg !== '@all' && slugOrg !== derivedOrg) {
              throw new ConstraintError(
                `slug org '${slugOrg}' does not match manifest org '${derivedOrg}'`,
                {
                  // ⚠️ named `key`, NOT `slug`, deliberately. `getKeyrackBlockedReport`
                  //    renders a `metadata.slug` leaf as `repo: …` — that key means a
                  //    github repo slug to the infra errors it was written for, so a
                  //    keyrack key slug under the same name renders as a flat lie
                  key: opts.key,
                  orgOfSlug: slugOrg,
                  orgOfManifest: derivedOrg,
                  hint: `use a slug under '${derivedOrg}', or pass --org @all`,
                },
              );
            }

            // validate env matches if explicitly provided and differs
            if (opts.env !== 'all' && effectiveEnv !== opts.env) {
              throw new ConstraintError(
                `--env ${opts.env} conflicts with env in slug ${opts.key}`,
                {
                  key: opts.key, // `key`, not `slug` — see the note on the guard above
                  envOfFlag: opts.env,
                  envOfSlug: effectiveEnv,
                  hint: `drop --env, or pass --env ${effectiveEnv} to match the slug`,
                },
              );
            }
          } else {
            slug = `${derivedOrg}.${opts.env}.${opts.key}`;
            effectiveEnv = opts.env;
          }

          // delegate to domain operation
          result = await delKeyrackKey({ slug, reach }, context);
        } catch (error) {
          if (!(error instanceof ConstraintError)) throw error;
          emitKeyrackBlockedReport({ error, command: 'keyrack del' });
          return;
        }

        // the address the human asked to remove — the slug alone would under-report it
        const addressDeleted = asKeyrackKeySlugAtReach({ slug, reach });

        // output results — json is a terminal render, so it returns and the human tree
        // below reads as the straight-line narrative it is (rule.forbid.else-branches)
        //
        // .note = ⚠️ `slug` stays the BARE SLUG here, deliberately, though the human tree
        //         below renders the ADDRESS. the two surfaces owe different things:
        //         - a human named an address, so the tree echoes the address back
        //         - a machine reads FIELDS, and `slug` is a field this payload has
        //           published since 2026-02-08. to put an address under that name would
        //           give one word two senses across two commands — `list --json` already
        //           emits `slug` as the slug, with `reach` beside it
        //           (rule.forbid.ambiguous-labels). worse, a reachless consumer would
        //           still read it correctly while a reach-bearing one silently read a lie
        // .note = so reach rides as its OWN optional field, exactly as `list --json` shapes
        //         it. a caller reconstructs the address from the pair when it wants one.
        //         absent a reach the field is `undefined`, which `JSON.stringify` DROPS —
        //         so a reachless del emits byte-identical json to what it did before this
        //         feature existed (e1/e16), and that is why it must not be `null`
        if (opts.json) {
          console.log(
            JSON.stringify(
              {
                slug,
                reach: reach ?? undefined,
                effect: result.effect,
                // include the destroyed descriptor ONLY when keyrack destroyed a remote secret
                // (the aws.params owned mech); a plain removal omits it, so a peer vault's del
                // json is unchanged — mirrors the human-readable render (asKeyrackDelReport
                // omits it when null) and holds zero peer blast radius
                ...(result.destroyed ? { destroyed: result.destroyed } : {}),
              },
              null,
              2,
            ),
          );
          return;
        }

        // human-readable tree output — the per-outcome render (absent, plain removal, removal +
        // a destroyed remote secret) is a pure transformer so the operator-seen text is
        // unit-snapshottable
        // .note = fed the ADDRESS, not the bare slug — a `del --reach` removes ONE key and the
        //         human must see which. e1 holds: `asKeyrackKeySlugAtReach` returns the bare
        //         slug byte for byte when no reach is given, so every reachless render, and
        //         every snapshot of one, is unchanged
        console.log(
          asKeyrackDelReport({
            address: addressDeleted,
            effect: result.effect,
            destroyed: result.destroyed ?? null,
          }),
        );
      },
    );

  // keyrack unlock [--owner owner] [--env env] [--key key] [--duration 9h] [--prikey path]
  keyrack
    .command('unlock')
    .description('unlock keys and send them to daemon for session access')
    .option('--owner <owner>', 'owner identity (e.g., mechanic, foreman)')
    .option('--for <owner>', 'alias for --owner')
    .option('--env <env>', 'target env: prod, prep, test, all, sudo, or camp')
    .option('--key <key>', 'specific key to unlock (required for --env sudo)')
    .option(
      '--reach <exid>',
      'reach to unlock (e.g., beav@ehmpathy.com, github://org=ehmpathy); requires --key',
    )
    .option(
      '--duration <duration>',
      'TTL for unlocked keys (default: 30m for sudo, 9h for others)',
    )
    .option(
      '--prikey <path>',
      'explicit ssh private key path (fallback when discovery fails)',
    )
    .option('--json', 'output as json (robot mode)')
    .action(
      async (opts: {
        owner?: string;
        for?: string;
        env?: string;
        key?: string;
        reach?: string;
        duration?: string;
        prikey?: string;
        json?: boolean;
      }) => {
        // --owner takes precedence; --for is alias
        const owner = deriveOwner(opts);

        // parse the reach at the cli boundary, so a malformed exid fails before any prompt.
        // an exid is PLAINTEXT — keyrack parses no scheme and reads no sense into it
        // .note = on `unlock` a reach SELECTS which of the stored keys to hand back. it
        //         does not derive one — an unlock at a reach no key was cut for is an
        //         absent key, and absent keys are loud (e6)
        const parsed = asKeyrackKeyReachOrEmitBlocked({
          flag: opts.reach,
          command: 'keyrack unlock',
        });
        if (!parsed) return;
        const { reach } = parsed;

        // validate env if provided
        if (opts.env) {
          if (!isValidKeyrackEnv(opts.env)) {
            throw new ConstraintError(
              `invalid --env: must be one of ${KEYRACK_VALID_ENVS.join(', ')}`,
            );
          }
        }

        // sudo env requires --key flag
        if (opts.env === 'sudo' && !opts.key) {
          throw new ConstraintError('sudo credentials require --key flag', {
            note: 'run: rhx keyrack unlock --env sudo --key X',
          });
        }

        // a reach is an identity axis of one key — it cannot ride a bulk unlock (q2)
        // .why HERE = ⚠️ `unlockKeyrackKeys` already states this invariant, and that deep guard
        //        STAYS — it is the sdk-level rule, and it covers every caller that does not
        //        come through this cli. but it sits BELOW the host manifest decrypt on line
        //        ~1507. so a human who forgot `--key` used to pay that decrypt first: at best
        //        a passphrase prompt for a mistake already knowable from the flags, and at
        //        worst — on a host whose manifest cannot be decrypted, or that has none yet —
        //        a raw `UnexpectedCodePathError` about ssh identities, which names a cause
        //        that has zero relation to what they actually typed wrong
        // .note = the rule three lines up (sudo requires --key) was already checked at this
        //         boundary, so the late reach guard made one class of rule fire at two
        //         different points of the same command (rule.forbid.surprises). now both are
        //         cheap, both are pre-decrypt (rule.prefer.prevent-over-correct, rung 3)
        // .note = the hint is worded to match the deep guard's exactly, so a human meets one
        //         sentence no matter which of the two fires
        try {
          assertKeyrackReachRequiresKey({
            reach,
            keyed: !!opts.key,
            hint: `name the key — rhx keyrack unlock --env ${opts.env ?? '$env'} --key $KEY --reach ${opts.reach}`,
          });
        } catch (error) {
          if (!(error instanceof ConstraintError)) throw error;
          emitKeyrackBlockedReport({ error, command: 'keyrack unlock' });
          return;
        }

        // get gitroot and repoManifest — null-tolerant: unlock must serve machine-wide @all keys
        // from any cwd, even one that is not a git repo (a bare clone). a null gitroot means no
        // repo manifest, and unlockKeyrackKeys' no-manifest branch handles the @all-only path.
        const gitroot = await getGitRepoRootOrNull({ from: process.cwd() });
        const repoManifest = gitroot
          ? await daoKeyrackRepoManifest.get({ gitroot })
          : null;

        // blank line before passphrase prompt (matches `set` output cadence)
        console.log('');

        // generate context and load host manifest (decrypts — may prompt for passphrase)
        const context = genContextKeyrack({
          owner,
          prikeys: opts.prikey ? [opts.prikey] : undefined,
          repoManifest: repoManifest ?? null,
          gitroot,
        });
        await daoKeyrackHostManifest.get({ owner }, context);

        // unlock keys and send to daemon — a const IIFE (no mutable var) mirrors the set
        // path: it returns the batch outcome, or null on a caller-fixable fault.
        // .note = a caller-fixable ConstraintError (e.g. a malformed github-app pem the
        //         caller stored) is caught here and rendered as the turtle blocked
        //         treestruct — the same clean visual the set path uses — instead of a raw
        //         class-name dump or an uncaught crash
        const unlockOutcome = await (async () => {
          try {
            return await unlockKeyrackKeys(
              {
                owner,
                env: opts.env,
                key: opts.key,
                reach,
                duration: opts.duration,
              },
              context,
            );
          } catch (error) {
            if (!(error instanceof ConstraintError)) throw error;
            // renders the blocked tree AND sets exit 2 in one operation (term=blocked)
            emitKeyrackBlockedReport({ error, command: 'keyrack unlock' });
            return null;
          }
        })();

        // caller-fixable fault: the emit above already set exit 2, so this only returns
        if (unlockOutcome === null) return;

        const { unlocked, omitted } = unlockOutcome;

        // exit non-zero when any key errored (G5): the grove chains `unlock && start-app`, so a
        // silent exit 0 with an absent credential would let the app start credential-less. the
        // SPECIFIC code follows exit-code-semantics on the cause — a purely caller-fixable batch
        // (every errored cause a ConstraintError: a grant/region/identity to fix) exits 2, so a
        // retry-loop fixes config rather than a blind retry; any server/transient fault (a
        // MalfunctionError or an unclassed cause) exits 1. both stay distinct from the
        // all-succeeded / all-absent-benign case, which remains exit 0
        // ⚠️ set ABOVE the json return, deliberately. the json branch is a terminal render, so
        //    an exit code computed below it would apply to the human tree ONLY — and the grove,
        //    which is exactly who chains on the code, is exactly who passes --json
        const exitCode = asKeyrackUnlockExitCode({ omitted });
        if (exitCode !== null) process.exitCode = exitCode;

        // output results — json is a terminal render, so it returns and the human tree
        // below reads as the straight-line narrative it is (rule.forbid.else-branches)
        if (opts.json) {
          console.log(JSON.stringify({ unlocked, omitted }, null, 2));
          return;
        }

        console.log('🔓 keyrack unlock');

        // combine all entries for tree output
        const allEntries = [
          ...unlocked.map((k) => ({ type: 'unlocked' as const, key: k })),
          ...omitted.map((o) => ({ type: 'omitted' as const, ...o })),
        ];

        for (let i = 0; i < allEntries.length; i++) {
          const entry = allEntries[i]!;
          const isLast = i === allEntries.length - 1;

          // an unlocked key — render its grant
          if (entry.type === 'unlocked') {
            emitKeyrackKeyBranch({
              entry: { type: 'unlocked', grant: entry.key },
              isLast,
            });
            continue;
          }

          // a live fault isolated to this one key (G5) — surface it distinctly so a
          // co-batched healthy key still unlocked. the tip render (bare message + fix-or-retry)
          // lives in the asKeyrackErroredKeyTip transformer (rule.forbid.inline-decode-friction)
          if (entry.reason === 'errored') {
            emitKeyrackKeyBranch({
              entry: {
                type: 'errored',
                slug: entry.slug,
                tip: asKeyrackErroredKeyTip({
                  cause: entry.cause,
                  env: opts.env ?? null,
                }),
              },
              isLast,
            });
            continue;
          }

          // an omitted key — show absent / lost / remote based on reason
          const { env: slugEnv, keyName } = asKeyrackSlugParts({
            slug: entry.slug,
          });
          emitKeyrackKeyBranch({
            entry: {
              type: entry.reason, // 'absent' | 'lost' | 'remote'
              slug: entry.slug,
              tip: `rhx keyrack set --key ${keyName} --env ${slugEnv}`,
            },
            isLast,
          });
        }
        console.log('');
      },
    );

  // keyrack relock [--owner owner] [--env env] [--key slug]
  keyrack
    .command('relock')
    .description('prune keys from daemon memory (default: all keys)')
    .option('--owner <owner>', 'owner identity (e.g., mechanic, foreman)')
    .option('--for <owner>', 'alias for --owner')
    .option('--env <env>', 'filter by env (test, prod, prep, all, sudo, camp)')
    .option('--key <slug>', 'relock specific key')
    .option('--json', 'output as json (robot mode)')
    .action(
      async (opts: {
        owner?: string;
        for?: string;
        env?: string;
        key?: string;
        json?: boolean;
      }) => {
        // --owner takes precedence; --for is alias
        const owner = deriveOwner(opts);

        // relock keys
        const slugs = opts.key ? [opts.key] : undefined;
        const { relocked } = await relockKeyrack({
          owner,
          slugs,
          env: opts.env,
        });

        // sort for deterministic output
        const sorted = [...relocked].sort();

        // output results
        if (opts.json) {
          console.log(JSON.stringify({ relocked: sorted }, null, 2));
        } else {
          console.log('');
          console.log('🔒 keyrack relock');
          if (sorted.length === 0) {
            console.log('   └─ (no keys to prune)');
          } else {
            for (let i = 0; i < sorted.length; i++) {
              const slug = sorted[i]!;
              const isLast = i === sorted.length - 1;
              const prefix = isLast ? '   └─' : '   ├─';
              console.log(`${prefix} ${slug}: pruned 🔒`);
            }
          }
          console.log('');
        }
      },
    );

  // keyrack status [--owner owner] [--env env]
  keyrack
    .command('status')
    .description('show status of unlocked keys in daemon')
    .option('--owner <owner>', 'owner identity (e.g., mechanic, foreman)')
    .option('--for <owner>', 'alias for --owner')
    .option(
      '--env <env>',
      'filter by env: prod, prep, test, all, sudo, or camp',
    )
    .option('--json', 'output as json (robot mode)')
    .action(
      async (opts: {
        owner?: string;
        for?: string;
        env?: string;
        json?: boolean;
      }) => {
        // --owner takes precedence; --for is alias
        const owner = deriveOwner(opts);

        // validate env if provided
        if (opts.env && !isValidKeyrackEnv(opts.env)) {
          throw new ConstraintError(
            `invalid --env: must be one of ${KEYRACK_VALID_ENVS.join(', ')}`,
          );
        }

        // get status
        const status = await getKeyrackStatus({ owner });

        // filter keys by env if specified
        const filteredKeys = opts.env
          ? (status?.keys ?? []).filter((k) => k.env === opts.env)
          : (status?.keys ?? []);

        // compute hint for when no keys in filtered env
        const getEnvHint = (): string | null => {
          if (!opts.env) return null;
          if (!status || status.keys.length === 0) return null;
          // find other envs that have keys (exclude sudo from hints)
          const otherEnvs = [...new Set(status.keys.map((k) => k.env))].filter(
            (e) => e !== opts.env && e !== 'sudo',
          );
          if (otherEnvs.length === 0) return null;
          return `try --env ${otherEnvs.join(' or --env ')}`;
        };

        // output results
        if (opts.json) {
          const output = status ? { ...status, keys: filteredKeys } : status;
          console.log(JSON.stringify(output, null, 2));
        } else {
          console.log('');
          console.log('🔐 keyrack status');
          if (!status) {
            console.log('   └─ daemon: not found');
            console.log('      └─ run `rhx keyrack unlock` to start session');
          } else {
            // show owner
            const ownerLabel = status.owner ?? '(default)';
            console.log(`   ├─ owner: ${ownerLabel}`);

            // show recipients
            if (status.recipients.length > 0) {
              console.log('   ├─ recipients:');
              for (let i = 0; i < status.recipients.length; i++) {
                const recipient = status.recipients[i]!;
                const isLastRecipient = i === status.recipients.length - 1;
                const prefix = isLastRecipient ? '   │  └─' : '   │  ├─';
                console.log(`${prefix} ${recipient.label} (${recipient.mech})`);
              }
            }

            // show daemon status
            if (filteredKeys.length === 0) {
              console.log('   └─ daemon: active ✨');
              const envHint = getEnvHint();
              if (opts.env && envHint) {
                console.log(
                  `      └─ (no keys in --env ${opts.env}, ${envHint})`,
                );
              } else if (opts.env) {
                console.log(`      └─ (no keys in --env ${opts.env})`);
              } else {
                console.log('      └─ (no keys unlocked)');
              }
            } else {
              console.log('   ├─ daemon: active ✨');
              for (const [i, key] of filteredKeys.entries()) {
                for (const line of asKeyrackStatusKeyBranch({
                  key,
                  isLast: i === filteredKeys.length - 1,
                }))
                  console.log(line);
              }
            }
          }
          console.log('');
        }
      },
    );

  // keyrack list [--owner owner]
  keyrack
    .command('list')
    .description('list configured keys on this host')
    .option('--owner <owner>', 'owner identity (e.g., mechanic, foreman)')
    .option('--for <owner>', 'alias for --owner')
    .option('--prikey <path>', 'ssh private key for manifest decryption')
    .option('--json', 'output as json (robot mode)')
    .action(
      async (opts: {
        owner?: string;
        for?: string;
        prikey?: string;
        json?: boolean;
      }) => {
        // --owner takes precedence; --for is alias
        const owner = deriveOwner(opts);

        // generate context and load host manifest
        const context = genContextKeyrack({
          owner,
          prikeys: opts.prikey ? [opts.prikey] : undefined,
        });
        await daoKeyrackHostManifest.get({ owner }, context);

        // guard for absent host manifest
        if (!context.hostManifest) {
          console.log('');
          console.log('✋ no host manifest found');
          console.log('');
          process.exit(2);
        }
        const hosts = context.hostManifest.hosts;
        const slugs = asSortedHostSlugs({ hosts });

        // output results
        if (opts.json) {
          console.log(JSON.stringify(hosts, null, 2));
        } else {
          const lines = asKeyrackListTreestruct({ hosts });
          for (const line of lines) {
            console.log(line);
          }
        }
      },
    );

  // keyrack fill --env <env> [--owner owner...] [--prikey path...] [--key key] [--refresh]
  keyrack
    .command('fill')
    .description('fill keyrack keys from repo manifest')
    .requiredOption(
      '--env <env>',
      'environment to fill (test, prod, prep, all, sudo, camp)',
    )
    .option('--owner <owner...>', 'owner(s) to fill (default: default)', [
      'default',
    ])
    .option(
      '--prikey <path...>',
      'prikey(s) to consider for manifest decryption',
    )
    .option('--key <key>', 'specific key to fill (default: all)')
    .option('--refresh', 'refresh even if already set')
    .option(
      '--repair',
      'overwrite blocked keys (e.g., rotate dangerous tokens)',
    )
    .option(
      '--allow-dangerous',
      'allow blocked keys through (e.g., accept dangerous tokens as-is)',
    )
    .action(
      async (opts: {
        env: string;
        owner: string[];
        prikey?: string[];
        key?: string;
        refresh?: boolean;
        repair?: boolean;
        allowDangerous?: boolean;
      }) => {
        // get gitroot for repo manifest
        const gitroot = await getGitRepoRoot({ from: process.cwd() });

        // fill keyrack keys
        // .why the catch = `fill` was the ONE keyrack command with no blocked-report guard,
        //      so a caller-fixable halt inside it escaped to the top-level handler and
        //      rendered as a bare `BadRequestError:` class name, a json metadata blob and an
        //      `[args] keyrack,fill,--env,test` trailer — all flush-left, outside the tree it
        //      interrupted. every sibling command (`get`, `source`, `set`, `del`, `unlock`)
        //      already renders the same class of fault as the turtle report, so one rule read
        //      two ways per which command a human typed (`rule.forbid.surprises`, nielsen 4)
        // .note = this is the SAME defect shape found on `keyrack source` earlier in this
        //         round, at a different command. that it recurred here is the evidence that a
        //         per-command render must be proven per command — a guard added at one call
        //         site makes no claim about its neighbours
        // .note = narrows to `ConstraintError` and rethrows all else, so a `MalfunctionError`
        //         still surfaces as a server fault at exit 1 rather than be dressed up as
        //         caller-fixable (`rule.forbid.failhide`). those two are the only error words
        //         this repo throws — never their `helpful-errors` parents, which name no
        //         owner and so decide no exit code
        try {
          await fillKeyrackKeys(
            {
              env: opts.env,
              owners: opts.owner,
              prikeys: opts.prikey ?? [],
              key: opts.key ?? null,
              refresh: opts.refresh ?? false,
              repair: opts.repair ?? false,
              allowDangerous: opts.allowDangerous ?? false,
            },
            { gitroot },
          );
        } catch (error) {
          if (!(error instanceof ConstraintError)) throw error;
          emitKeyrackBlockedReport({ error, command: 'keyrack fill' });
          return;
        }
      },
    );

  // keyrack daemon prune [--owner owner]
  const daemon = keyrack
    .command('daemon')
    .description('manage keyrack daemon lifecycle');

  daemon
    .command('prune')
    .description('kill daemon process so next command starts fresh')
    .option(
      '--owner <owner>',
      'owner identity (default: default, @all for all daemons)',
    )
    .option('--for <owner>', 'alias for --owner')
    .option('--json', 'output as json (robot mode)')
    .action(async (opts: { owner?: string; for?: string; json?: boolean }) => {
      // --owner takes precedence; --for is alias; default is null (default owner)
      const ownerInput = deriveOwner(opts);

      // prune daemon(s)
      const { pruned } = pruneKeyrackDaemon({ owner: ownerInput });

      // output results
      if (opts.json) {
        console.log(JSON.stringify({ pruned }, null, 2));
      } else {
        console.log('');
        console.log('🔐 keyrack daemon prune');

        if (pruned.length === 0) {
          // no daemon found
          const ownerLabel =
            ownerInput === '@all'
              ? 'any owner'
              : `owner=${ownerInput ?? 'default'}`;
          console.log(`   └─ no daemon active for ${ownerLabel}`);
        } else if (pruned.length === 1) {
          // single daemon pruned
          const { owner, pid } = pruned[0]!;
          const ownerLabel = owner ?? 'default';
          console.log(
            `   └─ pruned daemon for owner=${ownerLabel} (pid: ${pid})`,
          );
        } else {
          // multiple daemons pruned
          for (const { owner, pid } of pruned) {
            const ownerLabel = owner ?? 'default';
            console.log(
              `   ├─ pruned daemon for owner=${ownerLabel} (pid: ${pid})`,
            );
          }
          console.log(`   └─ pruned ${pruned.length} daemons`);
        }
        console.log('');
      }
    });

  // keyrack firewall --env <env> --from <source> --into <format> [--owner <owner>]
  keyrack
    .command('firewall')
    .description('translate and validate secrets for CI environments')
    .requiredOption(
      '--env <env>',
      'which env to grant (test, prod, prep, all, sudo, camp)',
    )
    .requiredOption(
      '--from <source>',
      'input source slug (e.g., json(env://SECRETS), json(stdin://*))',
    )
    .requiredOption('--into <format>', 'output format (github.actions, json)')
    .option('--owner <owner>', 'keyrack owner (default: "default")')
    .action(
      async (opts: {
        env: string;
        from: string;
        into: string;
        owner?: string;
      }) => {
        // validate --env
        if (!isValidKeyrackEnv(opts.env)) {
          throw new ConstraintError('invalid --env value', {
            env: opts.env,
            valid: KEYRACK_VALID_ENVS,
          });
        }

        // validate --into
        if (opts.into !== 'github.actions' && opts.into !== 'json') {
          throw new ConstraintError('invalid --into value', {
            into: opts.into,
            valid: ['github.actions', 'json'],
          });
        }

        // parse --from source
        const source = asKeyrackFirewallSource({ slug: opts.from });

        // read secrets from source
        let rawJson: string;
        if (source.type === 'env') {
          rawJson = process.env[source.envVar!] ?? '';
          if (!rawJson) {
            throw new ConstraintError('env var not set', {
              envVar: source.envVar,
              hint: `set ${source.envVar} or use --from 'json(stdin://*)'`,
            });
          }
        } else if (source.type === 'stdin') {
          // read all stdin
          const chunks: Buffer[] = [];
          for await (const chunk of process.stdin) {
            chunks.push(chunk);
          }
          rawJson = Buffer.concat(chunks).toString('utf8');
        } else {
          throw new ConstraintError('unsupported source type', { source });
        }

        // parse JSON
        let secrets: Record<string, string>;
        try {
          secrets = JSON.parse(rawJson);
        } catch {
          throw new ConstraintError('malformed secrets JSON', {
            source,
            hint: 'ensure the input is valid JSON object',
          });
        }

        // inject secrets into process.env
        for (const [key, value] of Object.entries(secrets)) {
          if (typeof value === 'string') {
            process.env[key] = value;
          }
        }

        // get gitroot and repo manifest
        const gitroot = await getGitRepoRoot({ from: process.cwd() });
        const repoManifest = await daoKeyrackRepoManifest.get({ gitroot });
        if (!repoManifest) {
          throw new ConstraintError('keyrack.yml not found', {
            hint: 'run `rhx keyrack init` to create keyrack.yml',
          });
        }

        // get slugs for this env
        const slugs = getAllKeyrackSlugsForEnv({
          manifest: repoManifest,
          env: opts.env,
        });

        // generate context for grant get
        const owner = opts.owner ?? keyrack.opts().owner ?? 'default';
        const context = await genContextKeyrackGrantGet({
          gitroot,
          owner: owner === 'default' ? null : owner,
        });

        // PHASE 1: COLLECT (atomicity: gather all attempts first)
        const attempts = await getKeyrackKeyGrant(
          { for: { repo: true }, env: opts.env, slugs },
          context,
        );

        // PHASE 2: VALIDATE (fail fast if any blocked)
        const blocked = asAttemptsByStatus({ attempts, status: 'blocked' });
        if (blocked.length > 0) {
          // emit output with blocked keys visible
          getKeyrackFirewallOutput({
            attempts,
            grants: [],
            into: opts.into as 'github.actions' | 'json',
          });
          process.exit(2);
        }

        // PHASE 3: EMIT (only if all passed validation)
        const grantedAttempts = asAttemptsByStatus({
          attempts,
          status: 'granted',
        });
        const grants = grantedAttempts.map((a) => a.grant);

        getKeyrackFirewallOutput({
          attempts,
          grants,
          into: opts.into as 'github.actions' | 'json',
        });
      },
    );
};
