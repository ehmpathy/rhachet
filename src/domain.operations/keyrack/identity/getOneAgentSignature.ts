import { MalfunctionError } from 'helpful-errors';

import { withPrivateTempDir } from '@src/infra/filesystem/withPrivateTempDir';
import { SSH_EXEC_TIMEOUT_MS } from '@src/infra/ssh/sshExecTimeouts';

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * .what = ask an ssh-agent to sign a fixed challenge, return the raw sig bytes
 * .why  = the Node->agent link (vision, "to validate before build"): the agent
 *         is the only actor that can produce the signature, so the signature is
 *         the secret that sign-as-KDF derives a wrap key from
 *
 * .note = shells to `ssh-keygen -Y sign` against the given SSH_AUTH_SOCK — this is the
 *         SHIPPED, PERMANENT Node->agent link, NOT a temporary probe stand-in:
 *         `ssh-keygen -Y sign` routes the sign THROUGH the agent behind SSH_AUTH_SOCK, so
 *         the raw agent-protocol call it stands for is exactly what it performs. proven
 *         deterministic by keyrack.agent.probe and end-to-end by this op's integration test
 *         + the keyrack.passphrase acceptance suite; matches the repo's extant
 *         execFileSync ssh pattern (getAllSshAgentKeys, isAgeCliAvailable)
 * .note = deterministic for ed25519 (RFC 8032): same key + same challenge ->
 *         byte-identical signature, so the derived wrap key is stable
 * .note = NOT cached, despite the getOne* name: each call re-shells to the agent.
 *         a cache here would be a foot-gun — the agent is ephemeral (one per
 *         invocation) and torn down right after, so a cached signature could
 *         outlive its agent. the single caller (withKeyrackWrapKeyViaAgent) signs
 *         exactly once per invocation, so there is no repeat cost to cache away
 *
 * .note = KNOWN RISK (cross-version stability): the KDF input is the whole PEM
 *         SSH-SIG armor ssh-keygen writes, not the parsed raw signature payload.
 *         an ed25519 signature is deterministic (RFC 8032), but the PEM envelope
 *         (line-wrap, headers) is an OpenSSH serialization detail, not a crypto
 *         guarantee. an OpenSSH build that changed that serialization would derive
 *         a DIFFERENT wrap key — so identities sealed under the old serialization
 *         would fail to unwrap. this fails LOUD (the scrypt tag rejects → the
 *         wrong-key ConstraintError), never a silent corrupt, but it presents as an
 *         unexplained lockout until the human re-seals. only same-process
 *         determinism is proven (keyrack.agent.probe); cross-version stability is
 *         not. a v1-accepted risk: the mitigation (parse the structured SSHSIG
 *         payload to hash the raw signature, not the envelope) is a fast-follow
 */
export const getOneAgentSignature = (input: {
  sock: string;
  pubkeyPath: string;
  challenge: string;
  namespace?: string;
}): Uint8Array => {
  const namespace = input.namespace ?? 'keyrack-unlock';

  // a short 0700 workspace for the challenge + signature files; the shared helper
  // owns the mkdtemp(0700) + guarded rmSync lifecycle
  return withPrivateTempDir({ prefix: 'kr-sign-' }, (dir) => {
    const challengePath = join(dir, 'challenge');
    const sigPath = `${challengePath}.sig`;

    try {
      writeFileSync(challengePath, input.challenge, 'utf8');

      // ssh-keygen -Y sign -n <namespace> -f <pubkey> <file>
      // routes the sign to the agent behind SSH_AUTH_SOCK; writes <file>.sig
      execFileSync(
        'ssh-keygen',
        ['-Y', 'sign', '-n', namespace, '-f', input.pubkeyPath, challengePath],
        {
          stdio: 'pipe',
          env: { ...process.env, SSH_AUTH_SOCK: input.sock },
          // bound the sign so a hung agent can never wedge unlock forever
          timeout: SSH_EXEC_TIMEOUT_MS,
        },
      );

      // read the produced signature (PEM SSH-SIG armor); the raw bytes are the
      // KDF input — we hash the whole armored blob, which is stable per sign
      const sig = readFileSync(sigPath);
      if (sig.length === 0)
        throw new MalfunctionError('agent produced an empty signature', {
          sock: input.sock,
          pubkeyPath: input.pubkeyPath,
        });
      return new Uint8Array(sig);
    } catch (error) {
      if (error instanceof MalfunctionError) throw error;
      throw new MalfunctionError('ssh-agent sign failed', {
        sock: input.sock,
        pubkeyPath: input.pubkeyPath,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  });
};
