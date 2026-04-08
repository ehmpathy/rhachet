import type {
  KeyrackGrantMechanism,
  KeyrackHostVaultAdapter,
} from '@src/domain.objects/keyrack';

import { createInterface } from 'node:readline';

/**
 * .what = human-friendly descriptions for each mechanism
 * .why = helps users choose the right mech during stdin prompts
 */
const MECH_DESCRIPTIONS: Record<KeyrackGrantMechanism, string> = {
  PERMANENT_VIA_REPLICA: 'static secret (api key, password)',
  PERMANENT_VIA_REFERENCE: 'reference to external vault (1password, etc)',
  EPHEMERAL_VIA_SESSION: 'session token (daemon cache)',
  EPHEMERAL_VIA_GITHUB_APP: 'github app installation (short-lived tokens)',
  EPHEMERAL_VIA_AWS_SSO: 'aws sso profile (browser login)',
  EPHEMERAL_VIA_GITHUB_OIDC: 'github oidc (ci/cd tokens)',
};

/**
 * .what = infer or prompt for mechanism selection
 * .why = when vault supports multiple mechs and --mech not supplied, prompt via stdin
 *
 * .note = auto-selects if vault supports only one mech
 * .note = filters to vault.mechs.supported only
 */
export const inferKeyrackMechForSet = async (input: {
  vault: KeyrackHostVaultAdapter;
}): Promise<KeyrackGrantMechanism> => {
  const supported = input.vault.mechs.supported;

  // single mech: auto-select
  if (supported.length === 1) {
    return supported[0]!;
  }

  // multiple mechs: prompt via stdin
  // .note = always use terminal: false for consistent behavior with pty-with-answers
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  return new Promise((accept, reject) => {
    // build options list
    const options = supported
      .map((mech, i) => `   ${i + 1}. ${mech} — ${MECH_DESCRIPTIONS[mech]}`)
      .join('\n');

    console.log('');
    console.log('   which mechanism?');
    console.log(options);
    console.log('');

    // write prompt explicitly (readline with terminal:false doesn't emit prompt)
    process.stdout.write('   choice: ');

    rl.once('line', (answer) => {
      rl.close();

      const choice = parseInt(answer, 10);
      if (isNaN(choice) || choice < 1 || choice > supported.length) {
        reject(
          new Error(
            `invalid choice: ${answer}; expected 1-${supported.length}`,
          ),
        );
        return;
      }

      accept(supported[choice - 1]!);
    });
  });
};
