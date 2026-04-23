import { ConstraintError } from 'helpful-errors';

import type {
  KeyrackGrantAttempt,
  KeyrackKeyGrant,
} from '@src/domain.objects/keyrack';

import { appendFileSync } from 'node:fs';
import { asAttemptsByStatus } from './asAttemptsByStatus';
import { asKeyrackKeyName } from './asKeyrackKeyName';

/**
 * .what = mask secret in github actions logs, line-by-line for multiline
 * .why = ::add-mask:: only works on single lines (HCSEC-2021-13)
 */
const maskInGithubLogs = (secret: string): void => {
  for (const line of secret.split('\n')) {
    if (line.trim()) console.log(`::add-mask::${line}`);
  }
};

/**
 * .what = write key=value to GITHUB_ENV with heredoc for multiline
 * .why = github actions requires heredoc syntax for multiline values
 */
const writeToGithubEnv = (key: string, value: string): void => {
  const githubEnv = process.env.GITHUB_ENV;
  if (!githubEnv) return;

  // detect multiline (PEM keys, JSON blobs)
  if (value.includes('\n')) {
    // heredoc syntax: KEY<<EOF\nVALUE\nEOF
    const delimiter = 'EOF_' + Date.now();
    appendFileSync(githubEnv, `${key}<<${delimiter}\n${value}\n${delimiter}\n`);
  } else {
    // simple syntax: KEY=VALUE
    appendFileSync(githubEnv, `${key}=${value}\n`);
  }
};

/**
 * .what = emit treestruct summary for human-readable output
 * .why = github.actions mode needs visual feedback in CI logs
 */
const emitTreestructSummary = (input: {
  attempts: KeyrackGrantAttempt[];
  grants: KeyrackKeyGrant[];
}): void => {
  console.log('');
  console.log('🔐 keyrack firewall');
  console.log(`   ├─ grants: ${input.grants.length}`);
  const blocked = asAttemptsByStatus({
    attempts: input.attempts,
    status: 'blocked',
  });
  const absent = asAttemptsByStatus({
    attempts: input.attempts,
    status: 'absent',
  });
  if (blocked.length > 0) {
    console.log(`   ├─ blocked: ${blocked.length}`);
  }
  if (absent.length > 0) {
    console.log(`   ├─ absent: ${absent.length}`);
  }
  console.log(`   └─ keys`);

  for (let i = 0; i < input.attempts.length; i++) {
    const attempt = input.attempts[i]!;
    const isLast = i === input.attempts.length - 1;
    const prefix = isLast ? '      └─' : '      ├─';
    const contPrefix = isLast ? '         ' : '      │  ';

    if (attempt.status === 'granted') {
      const keyName = asKeyrackKeyName({ slug: attempt.grant.slug });
      const mech = attempt.grant.source.mech;
      console.log(`${prefix} ${keyName}`);
      console.log(`${contPrefix}├─ mech: ${mech}`);
      if (attempt.grant.expiresAt) {
        console.log(`${contPrefix}├─ expires: ${attempt.grant.expiresAt}`);
      }
      console.log(`${contPrefix}└─ status: granted 🔑`);
    } else if (attempt.status === 'blocked') {
      const keyName = asKeyrackKeyName({ slug: attempt.slug });
      console.log(`${prefix} ${keyName}`);
      console.log(`${contPrefix}├─ status: blocked 🚫`);
      console.log(`${contPrefix}└─ reasons: ${attempt.reasons.join(', ')}`);
    } else if (attempt.status === 'absent') {
      const keyName = asKeyrackKeyName({ slug: attempt.slug });
      console.log(`${prefix} ${keyName}`);
      console.log(`${contPrefix}└─ status: absent 🫧`);
    }
  }
  console.log('');
};

/**
 * .what = format keyrack firewall output for target
 * .why = enables different output formats for CI and tests
 *
 * .note = github.actions: treestruct + ::add-mask:: + ::notice:: + $GITHUB_ENV
 * .note = json: pure JSON for programmatic use (pipeable to jq)
 */
export const getKeyrackFirewallOutput = (input: {
  attempts: KeyrackGrantAttempt[];
  grants: KeyrackKeyGrant[];
  into: 'github.actions' | 'json';
}): void => {
  if (input.into === 'github.actions') {
    // treestruct summary for human-readable CI logs
    emitTreestructSummary({ attempts: input.attempts, grants: input.grants });
    const githubEnv = process.env.GITHUB_ENV;
    if (!githubEnv) {
      throw new ConstraintError('GITHUB_ENV not set', {
        hint: '--into github.actions requires a GitHub Actions workflow context',
      });
    }

    for (const grant of input.grants) {
      const keyName = asKeyrackKeyName({ slug: grant.slug });
      const secret = grant.key.secret;

      // mask in logs (line-by-line for multiline secrets)
      maskInGithubLogs(secret);

      // expiry notice for ephemeral tokens
      if (grant.expiresAt) {
        console.log(`::notice::${keyName} expires at ${grant.expiresAt}`);
      }

      // write to GITHUB_ENV (heredoc for multiline)
      writeToGithubEnv(keyName, secret);
    }
  } else if (input.into === 'json') {
    // structured output for tests and programmatic use
    console.log(JSON.stringify(input.attempts, null, 2));
  }
};
