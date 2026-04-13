import { createAppAuth } from '@octokit/auth-app';
import { UnexpectedCodePathError } from 'helpful-errors';
import { addDuration, asIsoTimeStamp } from 'iso-time';

import type { KeyrackGrantMechanismAdapter } from '@src/domain.objects/keyrack';

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { createInterface } from 'node:readline';

/**
 * .what = expected shape of github app credentials json
 * .why = validates that stored value contains required fields
 */
interface GithubAppCredentials {
  appId: string | number;
  privateKey: string;
  installationId: string | number;
}

/**
 * .what = parse and validate github app credentials json
 * .why = ensures stored value has required fields for token generation
 */
const parseGithubAppCredentials = (
  value: string,
):
  | { valid: true; creds: GithubAppCredentials }
  | { valid: false; reasons: string[] } => {
  // attempt to parse as json
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return { valid: false, reasons: ['value is not valid json'] };
  }

  // validate required fields
  if (typeof parsed !== 'object' || parsed === null) {
    return { valid: false, reasons: ['value is not a json object'] };
  }

  const obj = parsed as Record<string, unknown>;

  if (!obj.appId && !obj.app_id) {
    return { valid: false, reasons: ['json lacks appId or app_id field'] };
  }

  if (!obj.privateKey && !obj.private_key) {
    return {
      valid: false,
      reasons: ['json lacks privateKey or private_key field'],
    };
  }

  if (!obj.installationId && !obj.installation_id) {
    return {
      valid: false,
      reasons: ['json lacks installationId or installation_id field'],
    };
  }

  // normalize field names
  const creds: GithubAppCredentials = {
    appId: (obj.appId ?? obj.app_id) as string | number,
    privateKey: (obj.privateKey ?? obj.private_key) as string,
    installationId: (obj.installationId ?? obj.installation_id) as
      | string
      | number,
  };

  return { valid: true, creds };
};

/**
 * .what = mechanism adapter for github app credentials
 * .why = translates stored app credentials json into short-lived installation token
 *
 * .note = expects json with appId, privateKey, installationId
 * .note = generates short-lived (1 hour) installation access token
 */
export const mechAdapterGithubApp: KeyrackGrantMechanismAdapter = {
  /**
   * .what = validate that value is valid github app credentials json
   * .why = ensures stored credential can be translated to token
   *
   * .note = source expects json blob with appId, privateKey, installationId
   * .note = cached expects ghs_ token (already translated)
   */
  validate: (input) => {
    // validate cached ephemeral (ghs_ token)
    if (input.cached) {
      if (!input.cached.startsWith('ghs_')) {
        return { valid: false, reasons: ['cached value must be ghs_ token'] };
      }
      return { valid: true };
    }

    // validate source credential (json blob)
    if (input.source) {
      const result = parseGithubAppCredentials(input.source);
      if (!result.valid) {
        return {
          valid: false,
          reasons: result.reasons.map((r) => `github_app: ${r}`),
        };
      }
      return { valid: true };
    }

    return { valid: false, reasons: ['no value to validate'] };
  },

  /**
   * .what = acquire source credential via guided setup
   * .why = prompts user through org → app → pem selection flow
   *
   * .note = keySlug is fully qualified (org.env.name) for display in prompts
   * .note = requires gh cli to be installed and authenticated
   */
  acquireForSet: async (input) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const question = (prompt: string): Promise<string> =>
      new Promise((done) => {
        rl.question(prompt, (answer) => done(answer));
      });

    try {
      // fetch orgs via gh cli
      const orgsOutput = execSync('gh api /user/orgs --jq ".[].login"', {
        encoding: 'utf-8',
      }).trim();
      const orgs = orgsOutput.split('\n').filter((o) => o.length > 0);

      // select org (auto-select if single)
      let selectedOrg: string;
      if (orgs.length === 1) {
        selectedOrg = orgs[0] ?? '';
        console.log('   │');
        console.log(`   ├─ org: ${selectedOrg} (auto-selected)`);
      } else {
        console.log('   │');
        console.log('   ├─ which github org?');
        console.log('   │  ├─ options');
        orgs.forEach((org, i) => {
          console.log(`   │  │  ├─ ${i + 1}. ${org}`);
        });
        const choice = await question('   │  └─ choice: ');
        const idx = parseInt(choice, 10) - 1;
        selectedOrg = orgs[idx] ?? orgs[0] ?? '';
        console.log(`   │     └─ ${selectedOrg} ✓`);
      }

      // fetch apps for selected org
      const appsOutput = execSync(
        `gh api /orgs/${selectedOrg}/installations --jq ".installations[] | {id: .id, app_id: .app_id, slug: .app_slug}"`,
        { encoding: 'utf-8' },
      ).trim();

      const apps = appsOutput
        .split('\n')
        .filter((a) => a.length > 0)
        .map(
          (line) =>
            JSON.parse(line) as { id: number; app_id: number; slug: string },
        );

      // select app (auto-select if single)
      let appId: string;
      let installationId: string;
      if (apps.length === 1) {
        const app = apps[0]!;
        appId = String(app.app_id);
        installationId = String(app.id);
        console.log('   │');
        console.log(
          `   ├─ app: ${app.slug} (id: ${app.app_id}) (auto-selected)`,
        );
      } else {
        console.log('   │');
        console.log('   ├─ which github app?');
        console.log('   │  ├─ options');
        apps.forEach((app, i) => {
          console.log(`   │  │  ├─ ${i + 1}. ${app.slug} (id: ${app.app_id})`);
        });
        const choice = await question('   │  └─ choice: ');
        const idx = parseInt(choice, 10) - 1;
        const selectedApp = apps[idx] ?? apps[0]!;
        appId = String(selectedApp.app_id);
        installationId = String(selectedApp.id);
        console.log(`   │     └─ ${selectedApp.slug} ✓`);
      }

      // prompt for pem path
      console.log('   │');
      console.log('   ├─ which github app secret?');
      const pemPath = await question('   │  └─ private key path (.pem): ');

      // expand ~ to home directory (node doesn't do this automatically)
      const pemPathExpanded = pemPath
        .trim()
        .replace(/^~(?=$|\/|\\)/, homedir());

      // read pem content
      let privateKey: string;
      try {
        privateKey = readFileSync(pemPathExpanded, 'utf-8');
      } catch (err) {
        throw new UnexpectedCodePathError('failed to read pem file', {
          pemPath: pemPathExpanded,
          error: err,
        });
      }

      // construct json blob
      const source = JSON.stringify({
        appId,
        installationId,
        privateKey,
      });

      return { source };
    } finally {
      rl.close();
    }
  },

  /**
   * .what = deliver usable secret from stored source credential
   * .why = transforms github app credentials json to installation access token
   *
   * .note = tokens expire in 1 hour; we set expiresAt to 55 min for clock drift buffer
   */
  deliverForGet: async (input) => {
    const result = parseGithubAppCredentials(input.source);
    if (!result.valid) {
      throw new UnexpectedCodePathError(
        'github_app deliverForGet called with invalid credentials',
        { reasons: result.reasons },
      );
    }

    const { creds } = result;

    // create auth instance
    const auth = createAppAuth({
      appId: creds.appId,
      privateKey: creds.privateKey,
      installationId: Number(creds.installationId),
    });

    // generate installation access token
    const { token } = await auth({ type: 'installation' });

    // github installation tokens expire in 1 hour; buffer 5 min for clock drift
    const expiresAt = addDuration(asIsoTimeStamp(new Date()), { minutes: 55 });

    return { secret: token, expiresAt };
  },
};
