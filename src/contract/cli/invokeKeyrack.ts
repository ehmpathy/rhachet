import type { Command } from 'commander';
import { Option } from 'commander';
import {
  ConstraintError,
  HelpfulError,
  MalfunctionError,
} from 'helpful-errors';

import { daoKeyrackHostManifest } from '@src/access/daos/daoKeyrackHostManifest';
import { loadManifestHydrated } from '@src/access/daos/daoKeyrackRepoManifest/hydrate/loadManifestHydrated';
import type {
  KeyrackGrantMechanism,
  KeyrackHostVault,
} from '@src/domain.objects/keyrack';
import {
  delKeyrackKey,
  genContextKeyrack,
  genContextKeyrackGrantGet,
  setKeyrackKey,
} from '@src/domain.operations/keyrack';
import {
  asAttemptsByStatus,
  asNotGrantedAttempts,
  isAllAttemptsGranted,
} from '@src/domain.operations/keyrack/asAttemptsByStatus';
import { asKeyrackAskFor } from '@src/domain.operations/keyrack/asKeyrackAskFor';
import { asKeyrackFilterOrg } from '@src/domain.operations/keyrack/asKeyrackFilterOrg';
import { asKeyrackFirewallSource } from '@src/domain.operations/keyrack/asKeyrackFirewallSource';
import { asKeyrackKeyName } from '@src/domain.operations/keyrack/asKeyrackKeyName';
import { asKeyrackOmittedKeyTip } from '@src/domain.operations/keyrack/asKeyrackOmittedKeyTip';
import { asKeyrackSelectorOrg } from '@src/domain.operations/keyrack/asKeyrackSelectorOrg';
import { asKeyrackSlugParts } from '@src/domain.operations/keyrack/asKeyrackSlugParts';
import { asResolvedAttempt } from '@src/domain.operations/keyrack/asResolvedAttempt';
import { asResolvedEnvForSet } from '@src/domain.operations/keyrack/asResolvedEnvForSet';
import { asSortedHostSlugs } from '@src/domain.operations/keyrack/asSortedHostSlugs';
import { assertKeyrackExportNamesDistinct } from '@src/domain.operations/keyrack/assertKeyrackExportNamesDistinct';
import { assertKeyrackOrgMatchesManifest } from '@src/domain.operations/keyrack/assertKeyrackOrgMatchesManifest';
import { asKeyrackAskSlugParts } from '@src/domain.operations/keyrack/cli/asKeyrackAskSlugParts';
import { asKeyrackDelReport } from '@src/domain.operations/keyrack/cli/asKeyrackDelReport';
import { asKeyrackErroredKeyTip } from '@src/domain.operations/keyrack/cli/asKeyrackErroredKeyTip';
import { asKeyrackGetOutputMode } from '@src/domain.operations/keyrack/cli/asKeyrackGetOutputMode';
import { asKeyrackKeyReachOrEmitBlocked } from '@src/domain.operations/keyrack/cli/asKeyrackKeyReachOrEmitBlocked';
import { asKeyrackListTreestruct } from '@src/domain.operations/keyrack/cli/asKeyrackListTreestruct';
import { asKeyrackStatusEmptyNotice } from '@src/domain.operations/keyrack/cli/asKeyrackStatusEmptyNotice';
import { asKeyrackStatusKeyBranch } from '@src/domain.operations/keyrack/cli/asKeyrackStatusKeyBranch';
import { asKeyrackUnlockExitCode } from '@src/domain.operations/keyrack/cli/asKeyrackUnlockExitCode';
import { asKeyrackUnlockRenderEntries } from '@src/domain.operations/keyrack/cli/asKeyrackUnlockRenderEntries';
import { asShellEscapedSecret } from '@src/domain.operations/keyrack/cli/asShellEscapedSecret';
import { emitKeyrackBlockedReport } from '@src/domain.operations/keyrack/cli/emitKeyrackBlockedReport';
import { emitKeyrackDaemonAbsentNotice } from '@src/domain.operations/keyrack/cli/emitKeyrackDaemonAbsentNotice';
import { emitKeyrackEmptyMachineWideSweepNotice } from '@src/domain.operations/keyrack/cli/emitKeyrackEmptyMachineWideSweepNotice';
import { emitKeyrackKeyBranch } from '@src/domain.operations/keyrack/cli/emitKeyrackKeyBranch';
import { emitKeyrackUnscopableRowsNotice } from '@src/domain.operations/keyrack/cli/emitKeyrackUnscopableRowsNotice';
import {
  formatKeyrackGetAllOutput,
  formatKeyrackGetOneOutput,
} from '@src/domain.operations/keyrack/cli/formatKeyrackGetOneOutput';
import { getAllKeyrackAttemptsForOrg } from '@src/domain.operations/keyrack/cli/getAllKeyrackAttemptsForOrg';
import { getAllKeyrackGrantsOrEmitBlocked } from '@src/domain.operations/keyrack/cli/getAllKeyrackGrantsOrEmitBlocked';
import { getAllKeyrackHostsForFilter } from '@src/domain.operations/keyrack/cli/getAllKeyrackHostsForFilter';
import { getAllKeyrackPeerEnvsForFix } from '@src/domain.operations/keyrack/cli/getAllKeyrackPeerEnvsForFix';
import { getAllKeyrackPeerOrgsForFix } from '@src/domain.operations/keyrack/cli/getAllKeyrackPeerOrgsForFix';
import { getAllKeyrackStatusKeysForFilter } from '@src/domain.operations/keyrack/cli/getAllKeyrackStatusKeysForFilter';
import { getOneKeyrackFilterOrg } from '@src/domain.operations/keyrack/cli/getOneKeyrackFilterOrg';
import { getOneKeyrackGrantByKeyOrEmitBlocked } from '@src/domain.operations/keyrack/cli/getOneKeyrackGrantByKeyOrEmitBlocked';
import { getOneKeyrackRepoScopeForAsk } from '@src/domain.operations/keyrack/cli/getOneKeyrackRepoScopeForAsk';
import {
  isValidKeyrackEnv,
  KEYRACK_VALID_ENVS,
} from '@src/domain.operations/keyrack/constants';
import { pruneKeyrackDaemon } from '@src/domain.operations/keyrack/daemon/sdk';
import { decideIsKeyStrictlyRequired } from '@src/domain.operations/keyrack/decideIsKeyStrictlyRequired';
import { fillKeyrackKeys } from '@src/domain.operations/keyrack/fill/fillKeyrackKeys';
import { findSlugByEnvAndKeyName } from '@src/domain.operations/keyrack/findSlugByEnvAndKeyName';
import { getAllKeyrackGrantsByRepo } from '@src/domain.operations/keyrack/getAllKeyrackGrantsByRepo';
import { getAllKeyrackSlugsForEnv } from '@src/domain.operations/keyrack/getAllKeyrackSlugsForEnv';
import { getAllKeyrackSlugsHeld } from '@src/domain.operations/keyrack/getAllKeyrackSlugsHeld';
import { getAllKeyrackSlugsWithNoScope } from '@src/domain.operations/keyrack/getAllKeyrackSlugsWithNoScope';
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
import { isKeyrackAskMachineWide } from '@src/domain.operations/keyrack/isKeyrackAskMachineWide';
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
import { KeyrackCommand } from './KeyrackCommand';

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
  // ⚠️ a `KeyrackCommand`, never a bare `program.command('keyrack')` — this ONE line is what
  //    makes the blocked-tree render a property of the whole verb family rather than a habit
  //    kept at ~16 call sites. commander's `createCommand` hook carries the class down to every
  //    descendant, so `infra`, `recipient`, `daemon`, and every verb a future round adds inherit
  //    it with no per-site opt-in. see `KeyrackCommand.ts` for the defect class it closes
  const keyrack = new KeyrackCommand('keyrack')
    .description('manage credentials via keyrack')
    .option('--owner <owner>', 'owner identity (e.g., mechanic, foreman)')
    .option('--for <owner>', 'alias for --owner')
    .enablePositionalOptions(); // parse keyrack's own opts before its subcommand
  // .note = `addCommand` + `copyInheritedSettings` is what `program.command()` does internally;
  //         spelled out here only because the subcommand is constructed rather than derived
  keyrack.copyInheritedSettings(program);
  program.addCommand(keyrack);

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
          // ⚠️ the `stanzaGiven` leaf is not decoration — every OTHER enum refusal in this family
          //    carries one (`envGiven`, `intoGiven`, `mechGiven`, `vaultGiven`), so without it
          //    this was the single row in `keyrack.blocked-render-consistency` that rendered a
          //    different shape than its peers. the leaf also does real work: it echoes the value
          //    REJECTED, so a human who mistyped reads back what they typed
          //    (`rule.require.errors-name-the-fix`, `rule.forbid.snapshot-visual-blemishes`)
          throw new ConstraintError('--stanza must be "ssh" if specified', {
            stanzaGiven: opts.stanza,
            hint: 'drop --stanza, or pass --stanza ssh',
          });

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
    // ⚠️ the description carries NO hand-authored `(default: …)`. commander appends one of its
    //    own from the third `.option()` arg, so a hand-authored twin printed the default TWICE:
    //    `target org: @this or @all (default: @this) (default: "@this")`. one source of that
    //    string, and it is commander's (`rule.forbid.snapshot-visual-blemishes`)
    .option('--org <org>', 'target org: @this or @all', '@this')
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

        // which render this invocation owes — a precedence, named once
        const outputMode = asKeyrackGetOutputMode({
          value: opts.value,
          json: opts.json,
          output: opts.output,
        });

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
        // .note = the ask rides in so a machine-wide read skips the repo-manifest load entirely
        const context = await genContextKeyrackGrantGet({
          gitroot,
          owner:
            opts.owner ?? keyrack.opts().owner ?? keyrack.opts().for ?? null,
          // .note = `?? undefined` because a BARE `get` states no ask at all, and the builder
          //         reads an unstated ask as "load the manifest" — byte-identical to every
          //         extant caller. `source`'s bare form is a repo sweep instead, which is why
          //         the cast returns null and each verb spells its own default
          for:
            asKeyrackAskFor({
              for: opts.for ?? null,
              key: opts.key ?? null,
            }) ?? undefined,
          org: opts.org,
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
          const attemptsForAsk = await getAllKeyrackGrantsOrEmitBlocked(
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
          if (!attemptsForAsk) return;

          // narrow the sweep by provenance — the SAME filter `source`, `list`, and `status`
          // apply, through the same two named operations, so `get` cannot drift from its peers
          // ⚠️ .note = this branch is the SWEEP arity, where `--org` FILTERS. the `--key` branch
          //         below is the keyed arity, where the same flag SELECTS a slug segment — it
          //         threads `asKeyrackSelectorOrg` instead, and must never also filter, or one
          //         flag would apply twice under two senses
          //         (`term=sweep._.choice.example=org-filter-vs-selector`)
          // ⚠️ .note.default = `get`'s `--org` carries a `'@this'` DEFAULT (:450), unlike every
          //         peer sweep, whose filter defaults to "no filter". here that default is a
          //         NO-OP by construction, and one invariant is what makes it so:
          //         `getAllKeyrackSlugsForEnv` derives every swept slug from `manifest.org`, so
          //         `@this` expands to the one org the sweep can yield and drops not one row.
          //         the default cannot be removed on this branch alone — commander hands the
          //         same value whether a human typed it or not, so to distinguish them would
          //         change the KEYED arity's contract too. ⇒ if that invariant ever breaks (a
          //         repo sweep that yields a foreign org), this default starts to drop rows
          //         SILENTLY, and the fix is to drop the default from the flag itself
          // ⚠️ .why.pure = the PURE rule is called here, never the i/o wrapper its peers use.
          //         `get` is the one sweep verb whose context ALREADY holds the repo manifest
          //         (a `--for repo` ask is never machine-wide, so the builder loaded one), and
          //         `getOneKeyrackFilterOrg` would re-run `getGitRepoRootOrNull` plus
          //         `daoKeyrackRepoManifest.get` on that same repo — a duplicated round-trip on
          //         the common path, since `get --org` defaults to `@this`. the RULE is shared
          //         either way, so the two ways in cannot answer differently
          //         (`asKeyrackFilterOrg.why.pure`)
          const orgFilterForSweep = asKeyrackFilterOrg({
            org: opts.org ?? null,
            orgOfRepo: context.repoManifest?.org ?? null,
          });
          const attempts = getAllKeyrackAttemptsForOrg({
            attempts: attemptsForAsk,
            org: orgFilterForSweep,
          });

          // a repo sweep narrowed to `@all` is empty by construction — say so, and name the fix
          // .why = the filter above is what MAKES this case reachable, so the notice ships with
          //        it. to add the filter alone would mint the exact silent-empty answer the
          //        notice exists to prevent
          if (orgFilterForSweep === '@all' && attempts.length === 0)
            emitKeyrackEmptyMachineWideSweepNotice({
              env: opts.env ?? null,
              verb: 'get',
              // ⚠️ `context.owner`, never `deriveOwner(opts)` — on `get` alone, `--for` names the
              //    grant SCOPE (`--for repo`) rather than an owner alias, so `deriveOwner` reads
              //    the literal `repo` as an owner and the fix line would spell `--owner repo`.
              //    the context already resolved the owner by `get`'s own rule (`:594`), so it is
              //    the one source that cannot disagree with the read this notice reports on
              owner: context.owner ?? null,
            });

          // output results based on mode
          // .note = 'value' mode already rejected via validation above
          if (outputMode === 'json') {
            console.log(JSON.stringify(attempts, null, 2));
          } else {
            console.log(formatKeyrackGetAllOutput({ attempts }));
          }

          // grade the report above: exit 2 if any key was not granted
          // ⚠️ `exitCode`, never `process.exit(2)` — a STATUS exit after a report render. a hard
          //    exit can truncate the very report it grades when stdout is a pipe
          if (!isAllAttemptsGranted({ attempts })) process.exitCode = 2;
        } else if (opts.key) {
          // grant key via domain operation
          // .note = org parameter passed through to enable:
          //   - @all bypass for sudo access
          //   - org mismatch fail-fast (security enforcement)
          //   - slug construction without manifest
          // .note = @this means "use manifest org" — pass undefined to let domain op handle
          const orgForDomainOp = asKeyrackSelectorOrg({
            org: opts.org ?? null,
          });
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
            // ⚠️ every branch below grades its own report with `process.exitCode`, never a hard
            //    `process.exit(2)`. these are STATUS exits — the render IS the output and the
            //    code grades it, so a hard exit can truncate the very report it grades when
            //    stdout is a pipe. `value` mode is the sharpest case: its whole contract is a
            //    raw secret written with no final newline, which is exactly the write a
            //    truncation would eat
            case 'value': {
              // for value mode: exit 2 with vibes on stderr if not granted
              if (attemptResolved.status !== 'granted') {
                console.error(
                  formatKeyrackGetOneOutput({ attempt: attemptResolved }),
                );
                process.exitCode = 2;
                break;
              }
              // ⚠️ a `--value` read exists to be PIPED, and a pipe consumer may close early —
              //    `| head -c 40`, a `$(…)` that stops reading, a program that exits. node then
              //    emits an async `error` on the stdout socket, and an UNHANDLED one crashed the
              //    process with a raw stack trace, which is the one render
              //    `rule.require.errors-name-the-fix` forbids a human to be shown
              // .note = EPIPE here is NORMAL — it is precisely why `head` composes with every
              //         unix tool — so it exits clean, the way `yes | head` does. any OTHER write
              //         error still surfaces, since a listener would otherwise swallow all of them
              //         (`rule.forbid.failhide`)
              // .note = this is the ONE render that needs the guard. every other keyrack output
              //         goes through `console.log`, which node documents as a swallow of write
              //         errors — verified by walk: `keyrack list | head -1` exits clean
              // .note = the hard `exit(0)` does not contradict the no-hard-exit rule above: that
              //         rule exists so a queued write is not truncated, and here the pipe is
              //         already closed, so no queued byte remains to lose
              process.stdout.on('error', (error: NodeJS.ErrnoException) => {
                if (error.code === 'EPIPE') process.exit(0);
                throw error;
              });
              process.stdout.write(attemptResolved.grant.key.secret);
              break;
            }
            case 'json': {
              console.log(JSON.stringify(attemptResolved, null, 2));
              if (attemptResolved.status !== 'granted') process.exitCode = 2;
              break;
            }
            case 'vibes':
            default: {
              console.log(
                formatKeyrackGetOneOutput({ attempt: attemptResolved }),
              );
              if (attemptResolved.status !== 'granted') process.exitCode = 2;
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
    // ⚠️ --org sits DIRECTLY under --env here and on every verb — see the twin note on `unlock`
    .option(
      '--org <org>',
      // .note = NO default, unlike `get`/`set`/`del`. `source` is a SWEEP verb, so --org
      //         FILTERS the swept set rather than SELECTS one slug's segment — and a filter's
      //         default is "no filter", the verb's extant scope. a '@this' default here would
      //         silently drop every machine-wide key from a bare sweep
      'filter by provenance: @all (machine-wide keys) or @this (repo keys); default: no filter',
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
        org?: string;
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
        // .note.fix = the refusal names WHICH flag to drop, not merely that the two conflict.
        //        strict is the default, so `--strict` is the redundant half in the common case
        //        (`rule.require.errors-name-the-fix`)
        if (opts.strict && opts.lenient) {
          throw new ConstraintError(
            '--strict and --lenient are mutually exclusive',
            {
              hint: 'drop one — strict is the default, so pass --lenient alone to skip absent keys',
            },
          );
        }

        // default to strict mode
        const isLenient = opts.lenient ?? false;

        // fail fast: sudo credentials require --key (not in keyrack.yml)
        // .note = this sentence is the CANONICAL one; `unlock`'s twin was converged onto it. see
        //         the ⚠️ note at that site for why this phrasing won
        if (opts.env === 'sudo' && !opts.key) {
          throw new ConstraintError(
            'sudo credentials require --key. sudo keys are not stored in keyrack.yml.',
            { hint: 'use: rhx keyrack source --env sudo --key <keyname>' },
          );
        }

        // get gitroot for repo manifest — null-tolerant: a keyrack read must serve machine-wide
        // @all keys even when the cwd is not a git repo (a git credential helper from a bare clone)
        const gitroot = await getGitRepoRootOrNull({ from: process.cwd() });

        // ⚠️ .what = what this invocation ASKS FOR, read ONCE, above every branch that consults it
        // .why = two sites need this shape — the context builder's manifest-skip decision, and
        //        the strict-required gate far below. spelled twice, the two must be kept in
        //        lockstep by hand, and a drift between them means the gate answers a different
        //        ask than the context was built from. one const is what makes them one ask
        // .note = a bare `source` IS a repo sweep, so null becomes `{ repo: true }`.
        //         `source` declares no `--for` of this sense, which the cast is told outright
        const askFor = asKeyrackAskFor({
          for: null,
          key: opts.key ?? null,
        }) ?? { repo: true };

        // generate lightweight context (no manifest decryption, no passphrase prompt)
        // .note = a key-scoped ask rides in, so `source --key @all.…` skips the manifest load.
        //         a BARE source is a repo sweep, so it carries no ask and stays manifest-bound
        const context = await genContextKeyrackGrantGet({
          gitroot,
          owner,
          for: askFor,
          org: opts.org,
        });

        // get keys
        // ⚠️ .why = the KEYED branch routes through `OrEmitBlocked`, exactly as the sweep branch
        //        below does. its two refusals — an org mismatch, and a bare key that needs a
        //        manifest there is none of (`getOneKeyrackGrantByKey`) — are both
        //        caller-fixable, so both are owed the `🔐 keyrack … / └─ ✋ ConstraintError:` tree.
        //        called bare, this one ask out of the whole verb family answered them with a
        //        flush-left `✋ ConstraintError:` and an args dump, while every peer branch
        //        rendered the tree (`rule.require.keyrack-emoji-palette`)
        const attemptOneForKey = opts.key
          ? await getOneKeyrackGrantByKeyOrEmitBlocked(
              {
                key: opts.key,
                env: opts.env,
                // .why = a hardcoded `undefined` was correct while `source` had no --org to
                //        forward. now that it does, the flag MUST reach the lookup: this is
                //        the site that turns `--org @all` into an `@all.{env}.{key}` slug
                //        (getOneKeyrackGrantByKey.ts). without it a bare key falls
                //        through every branch — no `@all` match, no manifest (this ask
                //        skipped it), not a full slug, no org — and THROWS 'no keyrack.yml
                //        found in repo' for a key that needs no keyrack.yml at all
                // ⚠️ .why = through the SELECTOR cast, exactly as `get` sends it. verbatim,
                //        `--org @this` reaches the mismatch guard and throws `org '@this'
                //        does not match manifest org '<x>'` — for the one value that names
                //        that very manifest (ehmpathy/rhachet#467)
                org: asKeyrackSelectorOrg({ org: opts.org ?? null }),
                reach,
                allow: { dangerous: opts.allowDangerous },
                command: 'keyrack source',
              },
              context,
            )
          : null;
        // .note = a null from the keyed branch means the report is ALREADY on stderr; the
        //         return type names it so this exit cannot be forgotten
        if (opts.key && !attemptOneForKey) return;

        const attemptsForAsk = attemptOneForKey
          ? [attemptOneForKey]
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

        // `--org` FILTERS the swept set, exactly as it does on `list` and `status`
        // ⚠️ .why = the SWEEP path is what needs this. the key-scoped path threads the flag into
        //         getOneKeyrackGrantByKey, which honors it; the sweep called
        //         getAllKeyrackGrantsByRepo, which never reads it — so the help advertised a
        //         filter that a bare `source --org <x>` silently ignored. a flag a human can
        //         read but the code never consults is a promise the contract does not keep
        // .note = a repo sweep yields only slugs the MANIFEST declares, so `--org @all` over it
        //         honestly selects an empty set. that is the true answer, not a defect: a repo
        //         manifest can never declare a machine-wide key (getAllKeyrackSlugsForEnv), so
        //         the machine-wide export is reached with `--key @all.<env>.<name>` instead
        // .note = routed through the blocked render, like every peer refusal on this verb
        // ⚠️ .note = the KEY-scoped path is deliberately EXCLUDED. there `--org` is a SELECTOR,
        //         already threaded into getOneKeyrackGrantByKey above to pick the slug — so to
        //         filter on it again would apply one flag twice under two senses, and silently
        //         empty a legitimate result: `source --key ehmpathy.prep.FOO --org @all`
        //         resolves a valid repo slug that an `@all` filter would then drop with no
        //         message. one sense per path (`term=sweep._.choice.example=org-filter-vs-selector`)
        const orgFilterForSweep = opts.key
          ? null
          : await getOneKeyrackFilterOrg({
              org: opts.org ?? null,
              from: process.cwd(),
            });
        const attempts = getAllKeyrackAttemptsForOrg({
          attempts: attemptsForAsk,
          org: orgFilterForSweep,
        });

        // a repo sweep narrowed to `@all` is empty by construction — say so, and name the fix
        // .note = the render lives in the named emitter, so this orchestrator reads as narrative
        //         (`rule.require.orchestrators-as-narrative`). the emitter's own doc carries the
        //         why, the stderr rationale, and the glyph choice
        if (orgFilterForSweep === '@all' && attempts.length === 0)
          emitKeyrackEmptyMachineWideSweepNotice({
            env: opts.env ?? null,
            verb: 'source',
            // .note = the `owner` local this action already resolved (`:860`), never a second
            //         `deriveOwner` call — one read means the fix line cannot drift from the
            //         rack the sweep actually looked at. on `source`, `--for` IS an owner alias,
            //         so the two agree here; on `get` they do not, which is why each site names
            //         the value its own verb resolved rather than a freshly derived one
            owner,
          });

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

        // the manifest is required to judge which keys are STRICTLY required — but only for an
        // ask that a repo manifest can speak to. `source` is either for a specific key or for a
        // repo:
        //   - a repo sweep IS the manifest's content, so a null manifest is a hard refusal
        //   - a machine-wide key-scoped ask is declared in the HOST manifest, so no repo
        //     manifest can declare it. to refuse here would grant the key above and then reject
        //     it for a manifest it never needed
        // .note = this is why the refusal is conditional rather than unconditional. it fires
        //         for every repo-scoped ask exactly as before (e1)
        const { repoManifest } = context;
        const isAskMachineWide = isKeyrackAskMachineWide({
          // .note = the SAME binding the context above was built from — not a re-derivation of
          //         it — so the two cannot disagree about what this invocation asked for
          for: askFor,
          org: opts.org ?? null,
        });
        // ⚠️ .note = routed through the blocked report, never thrown raw — the same reason the
        //         keyed lookup above is. this is a caller-fixable refusal on the same verb, in
        //         the same invocation, so a raw throw here would render one of `source`'s two
        //         refusals as a tree and the other as a class dump
        if (!repoManifest && !isAskMachineWide) {
          emitKeyrackBlockedReport({
            error: new ConstraintError('keyrack.yml not found', {
              hint: 'run `rhx keyrack init --org <your-org>` to create one',
            }),
            command: 'keyrack source',
          });
          return;
        }

        // filter out keys whose requirement is waived via is-optional-if-has
        // .note = with no repo manifest (a machine-wide ask), no key can be waived by a repo
        //         declaration, so every not-granted key stays strictly required
        const keysStrictlyRequired = repoManifest
          ? notGranted.filter((k) =>
              decideIsKeyStrictlyRequired({
                attempt: k,
                manifest: repoManifest,
                env: process.env as Record<string, string | undefined>,
              }),
            )
          : notGranted;

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
          // ⚠️ `exitCode` + return, never `process.exit(2)` — a STATUS exit after the report
          //    above. this branch deliberately writes not one byte to stdout (a partial eval
          //    would be worse than an empty one), so the hazard is the stderr report itself
          process.exitCode = 2;
          return;
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
    // ⚠️ no hand-authored `(default: …)` — see the twin note on `get`
    .option('--org <org>', 'target org: @this or @all', '@this')
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
          // .note = the VALUE at fault rides in the metadata, never only the valid set. a
          //         refusal that names what is allowed and not what was typed cannot show a
          //         human their own typo (`rule.require.refusals-carry-context`)
          throw new ConstraintError(
            `invalid --vault: must be one of ${validVaults.join(', ')}`,
            { vaultGiven: opts.vault },
          );
        }

        // ⚠️ ONE read of the ask, consumed by all THREE decisions below — the `--at`
        //    contradiction, the repo-scope call, and the org resolution. read once because the
        //    defect this closes was exactly a DISAGREEMENT between two of them: the scope call
        //    read the whole ask (`for` + `org`) and skipped the manifest for `@all.camp.FOO`,
        //    while the org resolution read the raw `--org` flag alone — so the command skipped
        //    a load it did not need, then refused the very ask it skipped it for
        // .why = a full slug NAMES its own org, which is how `get` and `source` already accept a
        //        machine-wide key with no flag (`getOneKeyrackGrantByKey.ts`). `set`/`del` that
        //        demanded the flag broke the vision's own invariant — every keyrack verb serves
        //        a machine-wide ask identically — for a human who learned the slug idiom from
        //        the read verbs. one named predicate, three readers
        //        (`rule.require.named-transformers`)
        // ⚠️ .why.for.null = `set`'s `--for` is an ALIAS FOR `--owner`, not a scope — only `get`
        //         carries a `--for repo` of the scope sense. so `null` here is the true answer,
        //         and to pass `opts.for` would read an owner name as a sweep
        const ask = {
          for: asKeyrackAskFor({ for: null, key: opts.key ?? null }),
          org: opts.org ?? null,
        };
        const isAskMachineWide = isKeyrackAskMachineWide(ask);

        // ⚠️ .why = `--at` names a repo keyrack; a machine-wide ask declares a key that consults
        //         none. the pair is incoherent as WRITTEN, so it is refused here — beside the
        //         other flag validations, ABOVE every load. checked later it sat below the host
        //         manifest read, so the same command reported `host manifest not found` from a
        //         fresh box: a cause unrelated to the ask, which names a fix that would not fix it
        // .why.ask = the contradiction is a property of the ASK, never of the cwd or the box.
        //         keyed on `!gitroot` instead, this command found a gitroot inside a repo and
        //         went on to HYDRATE the manifest — which rebuilds this wish's own defect (#467)
        //         one flag over: a machine-wide set that dies on an `extends` it never needed
        // .why.both = it reads the ASK, never the flag, so an `@all.<env>.<name>` slug is refused
        //         with `--at` exactly as `--org @all` is. keyed on the flag alone, the slug form
        //         slipped past and loaded the `--at` manifest, which then fed the env inference
        //         while the org came from the slug — the incoherence this guard exists to refuse,
        //         served rather than refused
        // .note = THROWN, never rendered here — `KeyrackCommand` catches it and renders the
        //         blocked treestruct, exactly as it does for every peer refusal on this verb
        if (opts.at && isAskMachineWide) {
          throw new ConstraintError(
            '--at and a machine-wide key are contradictory',
            {
              note: 'a machine-wide key is declared in the host manifest, so it consults no repo keyrack.yml — and --at names one to consult',
              fix: 'drop --at to set the machine-wide key, or name a repo key instead (drop --org @all, and use a bare key name rather than an @all.<env>.<name> slug)',
            },
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
            // .note = the VALUE at fault rides in the metadata — see the `--vault` twin above
            throw new ConstraintError(
              `invalid --mech: must be one of ${validMechs.join(', ')}`,
              { mechGiven: opts.mech },
            );
          }
          return opts.mech as KeyrackGrantMechanism;
        })();

        // get the repo artifacts this ask needs — a machine-wide set needs neither, and the
        // rule is shared with `del` and `unlock` so the three cannot drift
        // .why.refuse = `set` is a keyed mutation: it names ONE key, and a repo key can be
        //               declared only by the repo's own keyrack.yml. with no repo there is no
        //               declaration to write, so the ask is unservable rather than merely narrow
        const { gitroot, repoManifest: repoManifestFound } =
          await getOneKeyrackRepoScopeForAsk({
            ...ask,
            from: process.cwd(),
            onNoRepo: 'refuse',
          });

        // .note = a repo-scoped ask from a non-repo cwd is already refused by
        //         `getOneKeyrackRepoScopeForAsk` above, with a named fix — so `--at` needs no
        //         gitroot guard of its own here. the only `--at` refusal this verb owns is the
        //         `--org @all` contradiction, raised with the other flag validations
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
            // ⚠️ .why = THROW, never `return null`. by here a gitroot is known present: a
            //        repo-scoped ask without one was refused by `getOneKeyrackRepoScopeForAsk`,
            //        and a machine-wide `--at` was refused as a contradiction beside the flag
            //        validations. so this line is unreachable — and an unreachable line must
            //        FAIL LOUD if it is ever reached, never hand back a value the caller treats
            //        as meaningful. a `null` here strips the repo manifest from an `--at` set
            //        and lets `asResolvedEnvForSet` and `setKeyrackKey` proceed against it,
            //        which yields a WRONG ANSWER rather than a crash (`rule.forbid.failhide`).
            //        the `fill` verb's own `!gitroot` guard takes this same shape
            /* c8 ignore next 8 */
            if (!gitroot)
              throw new MalfunctionError(
                'set --at reached the manifest load with no gitroot',
                {
                  hint: 'a repo-scoped ask without a repo is refused above, and a machine-wide ask cannot carry --at — so this state is unreachable by construction',
                  at: opts.at,
                },
              );
            const customPath = opts.at.startsWith('/')
              ? opts.at
              : join(gitroot, opts.at);
            if (!existsSync(customPath))
              throw new ConstraintError(`keyrack not found at: ${opts.at}`, {
                fix: "run 'npx rhachet keyrack init --at <path>' first",
              });
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

        // expand org from manifest (only if not machine-wide)
        // ⚠️ reads the ASK, never `opts.org`. the flag alone missed the slug form, so a
        //    `--key @all.camp.FOO` with no flag fell through to the `no keyrack.yml found`
        //    refusal below — for an ask whose manifest was deliberately skipped above
        // ⚠️ a const IIFE, never a branch-assigned `let` — the same shape `unlock`'s
        //    `slugsForEnv` took, and for the same hazard: a `let` filled across branches lets
        //    a FUTURE fourth branch fall through with the org unset, and typescript cannot
        //    say so once every extant branch assigns. a const has one value by construction
        const resolvedOrg = ((): string => {
          if (isAskMachineWide) return '@all';
          if (repoManifest)
            return assertKeyrackOrgMatchesManifest({
              manifest: repoManifest,
              org: opts.org,
            });

          // ⚠️ no manifest — THROWN, never emit-then-exit. an inline `console.log` + a hard
          //    `process.exit(2)` can truncate the very report it just wrote when stdout is a
          //    pipe, which is the class `KeyrackCommand` exists to end. three ops and `set`'s
          //    `--at` guard were cleared of it this round; these two branches were the residue
          throw new ConstraintError('no keyrack.yml found', {
            fix:
              resolvedEnv === 'sudo'
                ? 'for sudo credentials without keyrack.yml, use --org @all'
                : "run 'npx rhachet keyrack init --org <your-org>' to create one",
          });
        })();

        // delegate to domain operation
        // note: vault adapters prompt for their own secrets via stdin (per rule.require.vault-fetches-own-secrets)
        // .note = a caller-fixable ConstraintError (e.g. keyrack-infra absent, app not
        //         registered, invalid app choice from the github-app guided setup) is
        //         rendered as the turtle blocked treestruct — the same visual language the
        //         success path uses — instead of a raw `ConstraintError: …` class-name dump
        // ⚠️ a FULL slug NAMES its own org and env, so it must be REDUCED to its bare key name
        //    before `setKeyrackKey` composes `$org.$env.$key` (setKeyrackKey.ts). handed the
        //    slug whole, it composed `@all.camp.@all.camp.SLUG_KEY` — a key written under a name
        //    no read verb can ever name, and one its own `del` twin could not remove
        // .why = `set` and `del` are one write/read pair over one rack, so both must reduce a
        //        full slug the same way and refuse a conflicted one the same way. a disagreement
        //        here is the one-concept-two-readers shape as the org defect above
        // ⚠️ .why.shared = the reduction and both guards live in ONE operation, which `del` calls
        //        too. spelled per-verb they DRIFT — one copy guards env-first, the other
        //        org-first, and a doubly-conflicted slug then draws a different refusal from each
        //        verb. see `asKeyrackAskSlugParts`, which owns the order, the messages, and the
        //        metadata keys
        const written = asKeyrackAskSlugParts({
          key: opts.key,
          org: resolvedOrg,
          env: resolvedEnv,
          // ⚠️ `--env` is OPTIONAL on `set` and required on `del`, and that is the one way the
          //    two asks differ. stated as an input, it is one presence check inside the shared
          //    operation rather than a second copy of the whole block
          envAsked: opts.env ?? null,
        });

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
                key: written.key,
                env: written.env,
                org: written.org,
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
        // ⚠️ echoes what was WRITTEN, never what was asked. a full slug carries its own org and
        //    env, so after the reduction above the two can differ from the flags — and a header
        //    that reports the ask while the rack holds the slug's own values is a render a human
        //    would trust and be wrong about (rule.forbid.surprises)
        console.log(
          `🔐 keyrack set (org: ${written.org}, env: ${written.env})`,
        );
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
    // ⚠️ no hand-authored `(default: …)` on either flag below — see the twin note on `get`
    .option(
      '--env <env>',
      'target env: prod, prep, test, all, sudo, or camp',
      'all',
    )
    // ⚠️ --org sits DIRECTLY under --env here and on every verb — see the twin note on `unlock`
    .option('--org <org>', 'target org: @this or @all', '@this')
    .option('--owner <owner>', 'owner identity (e.g., mechanic, foreman)')
    .option('--for <owner>', 'alias for --owner')
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
            { envGiven: opts.env },
          );
        }

        // ⚠️ ONE read of the ask, consumed by the scope call AND the org resolution below —
        //    the exact twin of `set`'s, and for the same defect: the two read different inputs,
        //    so the manifest was skipped for an `@all.<env>.<name>` slug and the org resolution
        //    then refused that same slug for want of the `--org` flag
        // .note.for.null = `del`'s `--for` is an alias for `--owner`, as `set`'s is — see the
        //         twin at `set` for why the literal `null` is the true answer here
        const ask = {
          for: asKeyrackAskFor({ for: null, key: opts.key ?? null }),
          org: opts.org ?? null,
        };
        const isAskMachineWide = isKeyrackAskMachineWide(ask);

        // get the repo artifacts this ask needs — a machine-wide del needs neither, for the
        // same reason `set` does not, and through the SAME operation so the two cannot drift
        // .why.refuse = `del` is a keyed mutation, the exact twin of `set` — see its call site
        const { gitroot, repoManifest } = await getOneKeyrackRepoScopeForAsk({
          ...ask,
          from: process.cwd(),
          onNoRepo: 'refuse',
        });

        // generate context and load host manifest
        const context = genContextKeyrack({
          owner,
          prikeys: opts.prikey ? [opts.prikey] : undefined,
          repoManifest: repoManifest ?? null,
          gitroot,
        });
        await daoKeyrackHostManifest.get({ owner }, context);

        // derive org from manifest (only if not machine-wide)
        // ⚠️ reads the ASK, never `opts.org` — see the twin note on `set`
        // ⚠️ a const IIFE, never a branch-assigned `let` — the twin of `set`'s, and the shape
        //    that hazard demands most here: this tree is FOUR levels deep, so a `let` has four
        //    places to fall through with the org unset, and typescript reports none of them
        //    once every extant leaf assigns
        const derivedOrg = ((): string => {
          if (isAskMachineWide) return '@all';

          if (repoManifest)
            return assertKeyrackOrgMatchesManifest({
              manifest: repoManifest,
              org: opts.org,
            });

          // ⚠️ each refusal below is THROWN, never emit-then-exit — the twin of `set`'s, and
          //    for the same reason: a hard `process.exit(2)` can truncate the report it just
          //    wrote when stdout is a pipe. `KeyrackCommand` renders every one of these
          if (opts.env !== 'sudo')
            throw new ConstraintError('no keyrack.yml found in this repo', {
              fix: "run 'npx rhachet keyrack init --org <your-org>' to create one",
            });

          // for sudo keys, try to find org from host manifest keys
          const hostManifest = context.hostManifest;
          if (!hostManifest)
            throw new ConstraintError('no host manifest found', {
              fix: 'run `rhx keyrack init` to create one',
            });

          // .note = `getAllKeyrackSlugsHeld` carries the address-vs-slug invariant #485
          //         repaired. `hosts` is keyed by ADDRESS (`slug@reachExid`), so a map key
          //         handed on as a slug would carry a reach into `findSlugByEnvAndKeyName`'s
          //         name match, and the org of a reach-cut sudo key could never be derived
          const matchedSlug = findSlugByEnvAndKeyName({
            slugs: getAllKeyrackSlugsHeld({ hosts: hostManifest.hosts }),
            env: opts.env,
            keyName: opts.key,
          });
          if (!matchedSlug)
            throw new ConstraintError(
              `key '${opts.key}' not found in host manifest for env '${opts.env}'`,
              {
                fix: `rhx keyrack list --env ${opts.env} — to see the keys this host holds`,
              },
            );

          return asKeyrackSlugParts({ slug: matchedSlug }).org || '@all';
        })();

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
        // ⚠️ .why.iife = the pair is bound ONCE, as a `const` outcome, the same shape as `set`'s
        //    `setOutcome` and `unlock`'s `unlockOutcome`. two branch-assigned `let`s typecheck
        //    for exactly as long as EVERY path inside the try assigns them — so a future third
        //    branch that returns early, or one that forgets, reads an unset variable, and
        //    typescript goes quiet once the extant paths are covered
        //    (`rule.require.immutable-vars`)
        // .note = the refusal path yields `null` rather than a half-built pair, and the caller
        //    below returns on it. a bare `return` inside this iife would exit only the iife —
        //    the action would carry on and render a del that never happened
        const delOutcome = await (async () => {
          try {
            // reduce the ask to the triple it removes under, and refuse a slug that conflicts
            // ⚠️ .why.shared = `set` calls this SAME operation. the reduction and both conflict
            //    guards were spelled once per verb and drifted on guard order, so a doubly
            //    conflicted slug drew a different refusal from each. see `asKeyrackAskSlugParts`
            // .note = `--env` is REQUIRED on `del`, so the env is always spelled — the presence
            //         check inside the shared operation is inert here, load-bearing for `set`
            const written = asKeyrackAskSlugParts({
              key: opts.key,
              org: derivedOrg,
              env: opts.env,
              envAsked: opts.env,
            });

            // ⚠️ the slug is COMPOSED from the reduced triple on both paths, never taken
            //    verbatim on one and composed on the other. for a full slug the two are
            //    byte-identical — `isKeyrackSlugFormat` demands a VALID env at segment 1, so the
            //    slug's env is never empty and the recomposition returns the name the human typed
            const effectiveEnv = written.env;
            const slug = `${written.org}.${effectiveEnv}.${written.key}`;

            // blank line before the passphrase prompt (matches `set` output cadence)
            // ⚠️ emitted ADJACENT to the prompt it spaces, never at an earlier point. it sat
            //    above the scope fetch once, which wrote a stray blank under a refused ask; the
            //    move to below that fetch fixed the cwd refusal and left FIVE below it — the
            //    no-manifest, no-host-manifest, unmatched-slug, slug-org, and env-conflict
            //    refusals each still opened on a line they never earned
            // .why.here = a blank placed by distance from the prompt is correct only for the
            //    refusals that stood when it was placed. placed AT the prompt, it is correct for
            //    every refusal a future edit inserts above (`rule.require.solve-at-cause`)
            console.log('');

            // delegate to domain operation
            const result = await delKeyrackKey({ slug, reach }, context);
            return { slug, result };
          } catch (error) {
            if (!(error instanceof ConstraintError)) throw error;
            emitKeyrackBlockedReport({ error, command: 'keyrack del' });
            return null;
          }
        })();
        if (!delOutcome) return;
        const { slug, result } = delOutcome;

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
    // ⚠️ --org sits DIRECTLY under --env, on this verb and every other that declares it.
    //    commander prints options in declaration order, so a stray flag between them splits
    //    the one scope PAIR a human reads together — and it split differently per verb, so a
    //    human who learned `--env`/`--org` on `list` had to re-find `--org` on `unlock`
    //    (`rule.forbid.snapshot-visual-blemishes` — same format across similar outputs)
    .option(
      '--org <org>',
      // .note = NO default, unlike `get`/`set`/`del`. `unlock` is a SWEEP verb, so --org
      //         FILTERS the swept set rather than SELECTS one slug's segment. a bare unlock
      //         already sweeps repo keys ∪ machine-wide keys (unlockKeyrackKeys.ts),
      //         so a '@this' default would silently drop every machine-wide key from it
      'filter by provenance: @all (machine-wide keys) or @this (repo keys); default: no filter',
    )
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
        org?: string;
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
              { envGiven: opts.env },
            );
          }
        }

        // sudo env requires --key flag
        if (opts.env === 'sudo' && !opts.key) {
          // ⚠️ .why.hint = the remedy rides `hint`, NOT `note`. the blocked renderer maps `note`
          //    to a `why:` leaf (a CAUSE) and `hint`/`fix` to the leaf that closes the branch
          //    (the FIX) — so under `note` this imperative rendered as `why: run: rhx keyrack
          //    unlock …`, a command labelled as a rationale (`rule.forbid.ambiguous-labels`).
          //    its twin one verb over, `source`, already rides `hint` — same guard, one render
          // .note = worded to match the deep guard in `getAllKeyrackSlugsForUnlock` byte for
          //         byte, so a human meets ONE sentence no matter which of the two fires
          // ⚠️ the SENTENCE is `source`'s, verbatim, and that is deliberate. one condition — an
          //    `--env sudo` ask with no `--key` — was worded two ways on two verbs, and the two
          //    now sit side by side in `keyrack.sudo.acceptance.test.ts.snap`. `source`'s form
          //    wins because it states the REASON (sudo keys live outside keyrack.yml), which is
          //    what turns "you must pass --key" into "here is why no sweep can find it"
          //    (`rule.forbid.surprises`, nielsen-4). only the HINT differs, since only the verb
          //    to run differs
          throw new ConstraintError(
            'sudo credentials require --key. sudo keys are not stored in keyrack.yml.',
            { hint: 'use: rhx keyrack unlock --env sudo --key <keyname>' },
          );
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

        // get the repo artifacts this ask needs — through the SAME operation `set` and `del`
        // use, so the "is a manifest owed?" rule has one home rather than three copies
        // .why.tolerate = `unlock` is a SWEEP, not a keyed mutation. with no repo it narrows to
        //                 what it can reach — the machine-wide set — which is the
        //                 bootstrap-to-clone credential path, and must keep serving
        // .note = a BARE unlock (no --key, no --org) is a union ask — repo keys ∪ machine-wide
        //         keys — so it stays manifest-bound whenever a repo IS found, exactly as today
        // .note.for.null = `unlock`'s `--for` is an alias for `--owner`, as `set`'s and `del`'s
        //         are — see the twin at `set` for why the literal `null` is the true answer
        const { gitroot, repoManifest } = await getOneKeyrackRepoScopeForAsk({
          for: asKeyrackAskFor({ for: null, key: opts.key ?? null }),
          org: opts.org ?? null,
          from: process.cwd(),
          onNoRepo: 'tolerate',
        });

        // ⚠️ validate the `--org` FILTER here, ABOVE the blank and the decrypt, because a
        //    refusal below either one is a refusal a human pays for twice
        // .why = `--org @this` in a repo with no keyrack.yml can never be served, and the pure
        //        rule can say so with no i/o at all. left to `unlockKeyrackKeys` (which guards
        //        it again, and must — it is a public operation that cannot trust its caller),
        //        the refusal lands AFTER the host rack is decrypted, so a human is asked for a
        //        passphrase to unlock a rack the command would refuse to read either way. to
        //        demand a secret for an ask already known invalid is the error
        //        `rule.prefer.prevent-over-correct` exists to design out
        // .why.blank = it also un-earns the `console.log('')` below. that blank spaces a
        //        passphrase PROMPT, so on a refusal it is a byte written to stdout by a verb
        //        that emitted no answer — defect 34/37's stray, at a third site. this hoist is
        //        the cause-level cure (`rule.require.solve-at-cause`): the refusal now lands
        //        before the blank is reached, rather than the blank made conditional
        // .note = the throw is caught and rendered by `KeyrackCommand`, so the blocked tree is
        //         byte-identical to the one the deeper guard produced
        asKeyrackFilterOrg({
          org: opts.org ?? null,
          orgOfRepo: repoManifest?.org ?? null,
        });

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
                org: opts.org,
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

        // the one sequence the tree numbers its connectors against — grants, then omissions
        const allEntries = asKeyrackUnlockRenderEntries({ unlocked, omitted });

        for (let i = 0; i < allEntries.length; i++) {
          const entry = allEntries[i]!;
          const isLast = i === allEntries.length - 1;

          // an unlocked key — render its grant
          if (entry.type === 'unlocked') {
            emitKeyrackKeyBranch({
              entry: { type: 'unlocked', grant: entry.grant },
              isLast,
            });
            continue;
          }

          const omission = entry.omission;

          // a live fault isolated to this one key (G5) — surface it distinctly so a
          // co-batched healthy key still unlocked. the tip render (bare message + fix-or-retry)
          // lives in the asKeyrackErroredKeyTip transformer (rule.forbid.inline-decode-friction)
          if (omission.reason === 'errored') {
            emitKeyrackKeyBranch({
              entry: {
                type: 'errored',
                slug: omission.slug,
                tip: asKeyrackErroredKeyTip({
                  cause: omission.cause,
                  env: opts.env ?? null,
                }),
                ...(omission.reach ? { reach: omission.reach } : {}),
              },
              isLast,
            });
            continue;
          }

          // an omitted key — show absent / lost / remote based on reason
          //
          // ⚠️ the tip INVERTS on whether the manifest holds this slug at a reach, so it is
          //    decided by `asKeyrackOmittedKeyTip` rather than built inline. a flat reachless
          //    `set` tip is actively harmful for a key held only at reaches: obeyed literally it
          //    cuts a reachless TWIN and the unlock still fails, with no signal the duplicate
          //    exists (`rule.require.errors-name-the-fix`)
          //
          // ⚠️ the row carries the reach of the TARGET that failed. a reachless bulk unlock
          //    enumerates one target per reach the rack holds, so ONE slug can file several
          //    rows in a single run — and a vault-level fault (an expired sso session, a
          //    pruned daemon) hits every reach at once. absent this leaf the human reads
          //    byte-identical rows and cannot tell which account failed
          //    (`rule.forbid.ambiguous-labels`)
          emitKeyrackKeyBranch({
            entry: {
              type: omission.reason, // 'absent' | 'lost' | 'remote'
              slug: omission.slug,
              // ⚠️ the row's OWN reach rides into the TIP, never merely onto the leaf below.
              //    a tip built without it named the sorted-first reach on EVERY row of a
              //    multi-reach slug — so the row that read `reach: casey@ahction.com` was
              //    tipped to re-cut `casey@ahbode.com`, a tip that contradicts its own leaf
              //    and re-cuts the wrong account when a human obeys it
              tip: asKeyrackOmittedKeyTip({
                slug: omission.slug,
                reason: omission.reason,
                reach: omission.reach,
                hostManifest: context.hostManifest ?? null,
              }),
              ...(omission.reach ? { reach: omission.reach } : {}),
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
    // .why the slug SHAPE is spelled = `--key` is the only way to relock a machine-wide key,
    //      since `--org @all` is the ratified carve-out below. a help line that read only
    //      "relock specific key" left that escape hatch discoverable from source alone, while
    //      `get`/`set`/`del` each spell `@this or @all` on their own `--org`
    //      (`rule.require.discoverability`)
    // ⚠️ .why.shape.not.example = the placeholder names the FORM (`@all.<env>.<name>`), never a
    //      real key. a concrete name teaches one key rather than the rule, reads as though that
    //      key is special, and goes stale the moment it is renamed — the help must state what a
    //      human may type, which is a shape
    .option(
      '--key <slug>',
      'relock specific key (machine-wide: @all.<env>.<name>)',
    )
    // .note = NO `--org` filter, deliberately, unlike its sibling sweep verbs. a relock is
    //         DESTRUCTIVE, and the daemon protocol filters by slug or env only — so an org
    //         filter would have to narrow the purge set inside the daemon. a filter that
    //         narrows a revoke is the direction this command's own header warns about ("to
    //         grant is narrow and to revoke is wide"), so it is worth its own round rather
    //         than a ride-along. a machine-wide key is already relockable by slug:
    //         `rhx keyrack relock --key @all.camp.FOO`
    // .note = this is a DECLARED deviation from the class-1 table, ratified in
    //         `.agent/…/briefs/define.keyrack-verb-machine-wide-support.md` under
    //         "the ONE ratified carve-out" — so a reader who meets the gap finds the
    //         decision beside the table it departs from, never only beside the code
    // ⚠️ .why the HIDDEN `--org` = the carve-out above is stated in a comment and a brief, and
    //        reached no human. undeclared, `--org` fell to commander's `unknownOption()`:
    //        `error: unknown option '--org'` at exit 1 — no keyrack tree, and above all NO
    //        NAME FOR THE FIX the comment three lines up already knows. declared-and-refused,
    //        the same ask lands as a constraint (exit 2) that hands over the slug form
    // .why hidden = `--help` must list what WORKS. to advertise a flag that always refuses is
    //        a control with no effect (`rule.require.safe-by-default`); to hide it costs a
    //        human no discoverability, since one only reaches for it by analogy to a sibling
    .addOption(
      new Option('--org <org>', 'not supported — see --key').hideHelp(),
    )
    .option('--json', 'output as json (robot mode)')
    .action(
      async (opts: {
        owner?: string;
        for?: string;
        env?: string;
        key?: string;
        org?: string;
        json?: boolean;
      }) => {
        // ⚠️ .why = `--org` is NOT an arbitrary unknown flag, and that is the whole reason it
        //        earns a branded refusal while `--bogus` keeps commander's. eight verbs in this
        //        same family TEACH `--org` — so a human who tries it here is applying a rule the
        //        cli itself taught, not making a typo. that population is owed the fix
        //        (`rule.require.errors-name-the-fix`); a typo population is owed only the flag
        //        name, which commander already gives (`rule.forbid.surprises`)
        if (opts.org !== undefined)
          throw new ConstraintError('relock takes no --org', {
            note: 'a relock REVOKES, and to revoke is wide — an org filter would narrow a purge set inside the daemon, which is its own decision',
            fix: 'relock one machine-wide key by its full slug: rhx keyrack relock --key @all.<env>.<name>',
          });

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
    .option(
      '--org <org>',
      // .note = a SWEEP verb, so --org filters the set exactly as --env does, and its
      //         default is "no filter" — the verb's extant scope
      'filter by provenance: @all (machine-wide keys) or @this (repo keys); default: no filter',
    )
    .option('--json', 'output as json (robot mode)')
    .action(
      async (opts: {
        owner?: string;
        for?: string;
        env?: string;
        org?: string;
        json?: boolean;
      }) => {
        // --owner takes precedence; --for is alias
        const owner = deriveOwner(opts);

        // validate env if provided
        if (opts.env && !isValidKeyrackEnv(opts.env)) {
          throw new ConstraintError(
            `invalid --env: must be one of ${KEYRACK_VALID_ENVS.join(', ')}`,
            { envGiven: opts.env },
          );
        }

        // get status
        const status = await getKeyrackStatus({ owner });

        // filter keys by env and org — each axis is independent, and an absent flag leaves its
        // axis unfiltered, so the two compose (`--env camp --org @all` narrows on both). this
        // is the shape --env already had; --org joins it
        // .note = the org is expanded first because `@this` is a sigil, never a literal
        //         segment; compared verbatim it would match zero slugs and render an empty rack
        // .note = the expansion's ConstraintError is routed through the blocked render, like
        //         every other caller-fixable keyrack refusal. without it a human who runs
        //         `status --org @this` outside a repo gets a raw class dump where every peer
        //         command gives the turtle treestruct — one rule, two renders
        const orgFilter = await getOneKeyrackFilterOrg({
          org: opts.org ?? null,
          from: process.cwd(),
        });
        const filteredKeys = getAllKeyrackStatusKeysForFilter({
          keys: status?.keys ?? [],
          env: opts.env ?? null,
          org: orgFilter,
        });

        // same drop, same silence as `list` — a held key whose slug names neither axis is
        // unfilterable, so under a scope flag it reads as absent unless the drop is named
        if (orgFilter || opts.env)
          emitKeyrackUnscopableRowsNotice({
            slugs: getAllKeyrackSlugsWithNoScope({
              slugs: (status?.keys ?? []).map((key) => key.slug),
            }),
          });

        // compose the fix line for when no key sits in the filtered env
        // ⚠️ the SET of peer envs is a named operation; only the SENTENCE is composed here.
        //    the split is the point: which envs qualify is domain logic a unit test can pin,
        //    while `try --env a or --env b` is render text this action owns
        const getEnvFix = (): string | null => {
          if (!opts.env) return null;
          if (!status || status.keys.length === 0) return null;
          const envsPeer = getAllKeyrackPeerEnvsForFix({
            keys: status.keys,
            env: opts.env,
          });
          if (envsPeer.length === 0) return null;
          return `try --env ${envsPeer.join(' or --env ')}`;
        };

        // compose the fix line for when no key sits in the filtered org
        // ⚠️ the twin of getEnvFix, and it exists for the same reason: `--org` is a flag THIS
        //    wish added, and it inherited an empty render that knew only `--env`. so a typo'd
        //    `--org @al` said "(no keys unlocked)" while a key WAS unlocked — a silent wrong
        //    answer at exit 0 (`rule.forbid.failhide`)
        // .note = the SPELLED org is echoed, never the expanded one, so a human sees the flag
        //         they typed. the peer orgs are the EXPANDED literals, since those are what a
        //         next `--org` must carry to match
        const getOrgFix = (): string | null => {
          if (!orgFilter) return null;
          if (!status || status.keys.length === 0) return null;
          const orgsPeer = getAllKeyrackPeerOrgsForFix({
            keys: status.keys,
            org: orgFilter,
          });
          if (orgsPeer.length === 0) return null;
          return `try --org ${orgsPeer.join(' or --org ')}`;
        };

        // output results
        if (opts.json) {
          // ⚠️ a null daemon is a CAUSE, and the human branch below names it with its fix.
          //    on json it rendered a bare `null` at exit 0 — a value a caller cannot tell
          //    apart from "no keys matched", from "the flag was ignored", or from a parse
          //    failure upstream. stdout stays `null` so no parser moves; the cause and the
          //    fix ride stderr (`rule.forbid.failhide`, `rule.require.errors-name-the-fix`)
          if (!status)
            emitKeyrackDaemonAbsentNotice({
              verb: 'status',
              // .note = the `owner` local this action already resolved (`:2223`) — the same value
              //         the daemon read used, so the fix cannot name a rack the read did not
              owner,
            });
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
              // ⚠️ which of the two empty-causes to name is a DECISION, so it lives in a named
              //    operation a unit test can pin — never inline, where the untested branch is
              //    exactly the one that carried the defect
              console.log(
                `      └─ ${asKeyrackStatusEmptyNotice({
                  env: opts.env ?? null,
                  org: opts.org ?? null,
                  countBefore: status.keys.length,
                  fixEnv: getEnvFix(),
                  fixOrg: getOrgFix(),
                })}`,
              );
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
    // ⚠️ .why = `--env` is taught by NINE keyrack verbs, and by `status` — the other sweep over
    //         this same rack. undeclared here it fell to commander's `unknown option` at exit 1
    //         — no tree, no fix, and an asymmetry between two verbs over one rack that a human
    //         cannot predict. the two sweeps now carry the same two axes, through the same
    //         two-axis filter operation
    .option(
      '--env <env>',
      'filter by env: prod, prep, test, all, sudo, or camp',
    )
    .option(
      '--org <org>',
      // .note = a SWEEP verb, so --org filters the set rather than selects one slug's
      //         segment, and its default is "no filter" — every host slug, as today
      'filter by provenance: @all (machine-wide keys) or @this (repo keys); default: no filter',
    )
    .option('--json', 'output as json (robot mode)')
    .action(
      async (opts: {
        owner?: string;
        for?: string;
        prikey?: string;
        env?: string;
        org?: string;
        json?: boolean;
      }) => {
        // --owner takes precedence; --for is alias
        const owner = deriveOwner(opts);

        // validate env if provided — the same refusal `status` gives, so one bad value reads
        // one way on both sweeps
        if (opts.env && !isValidKeyrackEnv(opts.env)) {
          throw new ConstraintError(
            `invalid --env: must be one of ${KEYRACK_VALID_ENVS.join(', ')}`,
            { envGiven: opts.env },
          );
        }

        // generate context and load host manifest
        const context = genContextKeyrack({
          owner,
          prikeys: opts.prikey ? [opts.prikey] : undefined,
        });
        await daoKeyrackHostManifest.get({ owner }, context);

        // guard for absent host manifest
        // ⚠️ THROWN, never emit-then-exit — `del`'s twin refusal already reads this way, and
        //    both name the same absent file. one shape, so the two cannot drift apart
        if (!context.hostManifest)
          throw new ConstraintError('no host manifest found', {
            fix: 'run: rhx keyrack init',
          });

        // filter the rack by provenance; an absent --org leaves every slug, as today
        // .note = the org is expanded first because `@this` is a sigil, never a literal
        //         segment; compared verbatim it would match zero slugs and render an empty rack
        // .note = routed through the blocked render for the same reason `status` is — a
        //         caller-fixable refusal owes the turtle treestruct, never a raw class dump
        const orgFilter = await getOneKeyrackFilterOrg({
          org: opts.org ?? null,
          from: process.cwd(),
        });
        const hosts = getAllKeyrackHostsForFilter({
          hosts: context.hostManifest.hosts,
          env: opts.env ?? null,
          org: orgFilter,
        });
        const slugs = asSortedHostSlugs({ hosts });

        // a host row that names no org and no env survives NO filter, so under a scope flag it
        // vanishes at exit 0 and reads as absent. name the drop rather than soften it
        if (orgFilter || opts.env)
          emitKeyrackUnscopableRowsNotice({
            slugs: getAllKeyrackSlugsWithNoScope({
              slugs: Object.keys(context.hostManifest.hosts),
            }),
          });

        // output results
        if (opts.json) {
          console.log(JSON.stringify(hosts, null, 2));
        } else {
          // ⚠️ the narrow rides along so an EMPTY rack can name its true cause. without it the
          //    render says "no keys configured on host" for a filter that merely matched none —
          //    a silent wrong answer at exit 0 on a host that holds keys (a typo'd `--org @al`
          //    read as "you have no keys")
          const lines = asKeyrackListTreestruct({
            hosts,
            narrow: {
              org: orgFilter,
              env: opts.env ?? null,
              countBefore: Object.keys(context.hostManifest.hosts).length,
            },
          });
          for (const line of lines) {
            console.log(line);
          }
        }
      },
    );

  // keyrack fill --env <env> [--owner owner...] [--prikey path...] [--key key] [--refresh]
  // .note = NO `--org` flag, and a strict gitroot, both DELIBERATE. `fill` reads the REPO
  //         manifest to learn which keys to fill (that is its whole job — see the description),
  //         so it is repo-scoped by nature and a machine-wide fill is a contradiction, not an
  //         unmet need. a machine-wide key is declared in the HOST manifest, so it is set
  //         directly: `rhx keyrack set --key K --env $env --org @all --vault ...`.
  //         this is the "well-defined" bar for a repo-scoped verb — a stated refusal by design
  //         rather than an incidental one (define.keyrack-verb-machine-wide-support.md)
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
    // ⚠️ .why the HIDDEN `--org` = see the same block on `relock`. `fill` is repo-scoped by
    //        nature and declines `--org` by design, but undeclared that decision reached a
    //        human as commander's `unknown option '--org'` at exit 1 — a refusal that named
    //        neither the reason nor the verb that DOES write a machine-wide key
    .addOption(
      new Option('--org <org>', 'not supported — see keyrack set').hideHelp(),
    )
    .action(
      async (opts: {
        env: string;
        owner: string[];
        prikey?: string[];
        key?: string;
        org?: string;
        refresh?: boolean;
        repair?: boolean;
        allowDangerous?: boolean;
      }) => {
        // ⚠️ .why = a machine-wide key is not a repo's to fill. `fill` reads the keys a REPO
        //        manifest declares, and a repo manifest can never emit an `@all.*` slug — every
        //        slug it yields is derived from `manifest.org` (`getAllKeyrackSlugsForEnv.ts`).
        //        so the ask has an answer, and the answer is another verb
        if (opts.org !== undefined)
          throw new ConstraintError('fill takes no --org', {
            note: 'fill writes the keys THIS repo declares; a machine-wide key lives in the host manifest, which no repo manifest can name',
            fix: 'write a machine-wide key with: rhx keyrack set --org @all --env <env> --key <name>',
          });

        // fill keyrack keys
        // ⚠️ .why the gitroot is INSIDE the try = `fill` is repo-scoped, so it genuinely needs a
        //      repo — but the REFUSAL must read as one. the strict `getGitRepoRoot` sat one line
        //      ABOVE this try, so a non-repo cwd threw a raw `BadRequestError` that stepped
        //      straight over the guard below and rendered as a flush-left class dump. so `fill`
        //      spoke two refusal qualities for two faults that are both "you are not set up
        //      here": a bad manifest got the turtle tree, a bad cwd got a crash report
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
          // .note = `for: null, org: null` — `fill` declares no `--org`, and that stays declined
          //         by design (it is repo-scoped by nature). the shared operation is adopted for
          //         its NAMED refusal, not for org support: an unstated ask is never
          //         machine-wide, so `onNoRepo: 'refuse'` is reached exactly as before — it just
          //         reads as a constraint now instead of a crash
          const { gitroot } = await getOneKeyrackRepoScopeForAsk({
            for: null,
            org: null,
            from: process.cwd(),
            onNoRepo: 'refuse',
          });

          // .why = an unstated ask is never machine-wide, and `onNoRepo: 'refuse'` throws on an
          //        absent gitroot — so a null here means the shared operation broke its own
          //        contract, which is a SERVER fault, not a caller one. stated as a loud throw
          //        rather than a cast: `rule.forbid.as-cast` rules out silencing the compiler,
          //        and a `MalfunctionError` keeps the exit code honest at 1
          if (!gitroot)
            throw new MalfunctionError(
              'getOneKeyrackRepoScopeForAsk returned a null gitroot for a repo-scoped ask',
              { command: 'keyrack fill', cwd: process.cwd() },
            );

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
  // .note = NO `--org` flag, and a strict gitroot, both DELIBERATE. `firewall` sweeps the keys
  //         a REPO declares and validates them against that repo's manifest, so the sweep IS
  //         the manifest's content — an org filter would narrow it to a set the manifest cannot
  //         describe. repo-scoped by nature, and refused by design rather than by accident
  //         (define.keyrack-verb-machine-wide-support.md)
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
    // ⚠️ .why the HIDDEN `--org` = see the same block on `relock`. the decision above was
    //        stated in THIS comment and reached no human: undeclared, `--org` fell to
    //        commander's `unknown option '--org'` at exit 1, which named the flag but never
    //        the reason the comment already holds
    .addOption(
      new Option('--org <org>', 'not supported — a repo sweep').hideHelp(),
    )
    .action(
      async (opts: {
        env: string;
        from: string;
        into: string;
        org?: string;
        owner?: string;
      }) => {
        // ⚠️ .why = a firewall sweep IS the repo manifest's content, and a repo manifest can
        //        never emit an `@all.*` slug — every slug it yields derives from `manifest.org`
        //        (`getAllKeyrackSlugsForEnv.ts`). so there is no org axis to filter on here: the
        //        set `--org @all` would select is empty by construction, never merely absent
        if (opts.org !== undefined)
          throw new ConstraintError('firewall takes no --org', {
            note: 'a firewall sweep is exactly the set THIS repo declares, and no repo manifest can name a machine-wide key — so an org filter would select an empty set',
            fix: 'drop --org; to check one machine-wide key instead, use: rhx keyrack get --key @all.<env>.<name>',
          });

        // ⚠️ .why = the valid set rides in the MESSAGE, never in metadata alone. the blocked
        //        tree renders `.message`, `.note`, and `.fix` — it does not spill a metadata
        //        bag, which is the whole point of that render. so a valid set left in metadata
        //        reaches no human, and `invalid --env value` names the wrong flag but not what
        //        to type instead (`rule.require.errors-name-the-fix`). every peer env gate
        //        spells the set inline (`:1495`, `:1757`, `:2024`,
        //        `asResolvedEnvForSet.ts`); these two are held to the same shape
        // ⚠️ .why.given = the metadata key carries the `*Given` suffix, as every peer gate does
        //        (`envGiven` at `:1648`, `:1914`, `:2248`, `:2426`; plus `mechGiven`,
        //        `vaultGiven`, `outputGiven`). the suffix is not decoration: the refusal's own
        //        message spells the VALID set, so a bare `env:` leaf beside it reads as a second
        //        claim about what env IS rather than a record of what the human TYPED.
        //        `envGiven` says which of the two it is in one word, and the render puts the
        //        pair adjacent
        // validate --env
        if (!isValidKeyrackEnv(opts.env)) {
          throw new ConstraintError(
            `invalid --env: must be one of ${KEYRACK_VALID_ENVS.join(', ')}`,
            { envGiven: opts.env },
          );
        }

        // validate --into
        if (opts.into !== 'github.actions' && opts.into !== 'json') {
          throw new ConstraintError(
            'invalid --into: must be one of github.actions, json',
            { intoGiven: opts.into },
          );
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
          // .note = lowercase, acronym included — every keyrack refusal a human reads is
          //         lowercase, and an all-caps acronym SHOUTS in a tree whose every other
          //         leaf is calm (`rule.forbid.shouts`, `rule.prefer.lowercase`)
          throw new ConstraintError('malformed secrets json', {
            source,
            hint: 'ensure the input is a valid json object',
          });
        }

        // inject secrets into process.env
        for (const [key, value] of Object.entries(secrets)) {
          if (typeof value === 'string') {
            process.env[key] = value;
          }
        }

        // get gitroot and repo manifest
        // ⚠️ .why = the strict `getGitRepoRoot` stood here, so a non-repo cwd threw a raw
        //         `BadRequestError` that reached the top-level catch as a stack trace — the very
        //         crash `getOneKeyrackRepoScopeForAsk` was cut to end, and `firewall` was the one
        //         repo-scoped verb that never adopted it. a repo-scoped verb still REFUSES
        //         without a repo; what changes is that the refusal now names its own fix
        // .note = `for: null, org: null` — `firewall` declares no `--org`, and that stays
        //         declined by design. an unstated ask is never machine-wide, so the manifest
        //         still loads on the same terms it did before
        const { gitroot, repoManifest } = await getOneKeyrackRepoScopeForAsk({
          for: null,
          org: null,
          from: process.cwd(),
          onNoRepo: 'refuse',
        });
        // ⚠️ .why = routed through the blocked report, never thrown raw. the gitroot fetch one
        //        line above already renders its refusal as the
        //        `🔐 keyrack … / └─ ✋ ConstraintError:` tree, so a raw throw HERE — the very
        //        next refusal, one the same human hits in the same breath — escapes to the
        //        top-level handler and lands as a FLUSH-LEFT `✋ ConstraintError:` with an args
        //        dump. one rule, two renders (`rule.require.keyrack-emoji-palette`); `fill`
        //        wraps its twin the same way
        // .note = the class name is the same in both; what the tree fixes is WHERE it lands —
        //        inside the treestruct with its metadata as leaves, rather than as a raw
        //        exception dump that interrupts it (`rule.require.unabridged-error-prefix`)
        if (!repoManifest) {
          emitKeyrackBlockedReport({
            error: new ConstraintError('keyrack.yml not found', {
              hint: 'run `rhx keyrack init` to create keyrack.yml',
            }),
            command: 'keyrack firewall',
          });
          return;
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
          // ⚠️ `exitCode` + return, never `process.exit(2)`. this is a STATUS exit — the report
          //    above IS the output, and the code merely grades it. a hard exit can truncate that
          //    very report when stdout is a pipe, which is the same hazard `emitKeyrackBlockedReport`
          //    avoids by this exact means. a natural return lets queued stdout drain first
          process.exitCode = 2;
          return;
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
