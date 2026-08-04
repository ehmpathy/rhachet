import { BadRequestError, ConstraintError } from 'helpful-errors';

import type {
  KeyrackGrantMechanism,
  KeyrackHostVaultAdapter,
} from '@src/domain.objects/keyrack';
import { promptLineInput } from '@src/infra/promptLineInput';

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

  // no-TTY guard: an interactive prompt has no answer when stdin is not a terminal (a
  // provision task, a piped/redirected stdin). fail loud — state --mech as the fix — rather
  // than block forever on a read no process can answer; unattended `set` must never hang
  if (!process.stdin.isTTY)
    throw new ConstraintError(
      'a mechanism choice is required but stdin is not a terminal',
      {
        hint: `pass --mech <${supported.join('|')}> so no interactive prompt is needed`,
        supported,
      },
    );

  // multiple mechs: prompt via stdin
  // build options list with treestruct markers
  // .note = withStdoutPrefix adds the base indent; we add tree markers only
  console.log('');
  console.log('which mechanism?');
  supported.forEach((mech, i) => {
    const isLast = i === supported.length - 1;
    const marker = isLast ? '└─' : '├─';
    console.log(`${marker} ${i + 1}. ${mech} — ${MECH_DESCRIPTIONS[mech]}`);
  });

  const answer = await promptLineInput({ prompt: 'choice: ' });
  const choice = parseInt(answer, 10);
  if (isNaN(choice) || choice < 1 || choice > supported.length) {
    throw new BadRequestError('invalid mechanism choice', {
      answer,
      expected: `1-${supported.length}`,
    });
  }

  return supported[choice - 1]!;
};
