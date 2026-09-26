import { MalfunctionError } from 'helpful-errors';
import { getError, given, then, useBeforeAll, when } from 'test-fns';

import { genSampleEphemeralSshKey } from '@src/.test/assets/genSampleEphemeralSshKey';
import { genEphemeralSshAgent } from '@src/infra/ssh/genEphemeralSshAgent';
import { isSshAgentAvailable } from '@src/infra/ssh/isSshAgentAvailable';

import { execFileSync } from 'node:child_process';
import { getOneAgentSignature } from './getOneAgentSignature';
import { getOneWrapKey } from './getOneWrapKey';

/**
 * .what = prove the Node->agent link end-to-end: a key loaded into the
 *         ephemeral agent signs a challenge, and the signature -> wrap key
 *         is DETERMINISTIC across calls
 * .why  = this is the sign-as-KDF crux (vision q1): a stable wrap key is what
 *         makes the whole unlock scheme work
 *
 * .note = integration (spawns a real agent + loads a real throwaway key);
 *         self-isolated; never touches the human's agent or ~/.ssh
 */
describe('getOneAgentSignature', () => {
  if (!isSshAgentAvailable())
    throw new Error(
      'ssh-agent is required for this integration test — install openssh-client',
    );

  const scene = useBeforeAll(async () => {
    // a throwaway passphrase-less ed25519 key
    const { keyPath, pubkeyPath, dir } = genSampleEphemeralSshKey();

    // load it into an ephemeral agent, then move the private key away so
    // ONLY the agent can produce a signature
    const agent = genEphemeralSshAgent({ owner: 'signer' });
    execFileSync('ssh-add', [keyPath], {
      stdio: 'pipe',
      timeout: 30_000,
      env: { ...process.env, SSH_AUTH_SOCK: agent.sock },
    });
    execFileSync('mv', [keyPath, `${keyPath}.away`], {
      stdio: 'pipe',
      timeout: 30_000,
    });

    return { agent, pubkeyPath, dir };
  });

  given('[case1] a key held only by the ephemeral agent', () => {
    when('[t0] the same challenge is signed twice via the agent', () => {
      const challenge = 'keyrack-unlock-v1:ehmpath.test';

      then('the two signatures are byte-identical (deterministic)', () => {
        const s1 = getOneAgentSignature({
          sock: scene.agent.sock,
          pubkeyPath: scene.pubkeyPath,
          challenge,
        });
        const s2 = getOneAgentSignature({
          sock: scene.agent.sock,
          pubkeyPath: scene.pubkeyPath,
          challenge,
        });
        expect(Buffer.from(s1).equals(Buffer.from(s2))).toBe(true);
      });

      then('the derived wrap keys are byte-identical (stable KDF)', () => {
        const k1 = getOneWrapKey({
          signature: getOneAgentSignature({
            sock: scene.agent.sock,
            pubkeyPath: scene.pubkeyPath,
            challenge,
          }),
        });
        const k2 = getOneWrapKey({
          signature: getOneAgentSignature({
            sock: scene.agent.sock,
            pubkeyPath: scene.pubkeyPath,
            challenge,
          }),
        });
        expect(Buffer.from(k1).equals(Buffer.from(k2))).toBe(true);
      });
    });

    when('[t1] two different challenges are signed', () => {
      then('the derived wrap keys differ (domain separation)', () => {
        const kA = getOneWrapKey({
          signature: getOneAgentSignature({
            sock: scene.agent.sock,
            pubkeyPath: scene.pubkeyPath,
            challenge: 'keyrack-unlock-v1:ehmpath.test',
          }),
        });
        const kB = getOneWrapKey({
          signature: getOneAgentSignature({
            sock: scene.agent.sock,
            pubkeyPath: scene.pubkeyPath,
            challenge: 'keyrack-unlock-v1:ehmpath.prep',
          }),
        });
        expect(Buffer.from(kA).equals(Buffer.from(kB))).toBe(false);
      });
    });

    when('[t2] the agent is torn down', () => {
      then('a later sign fails loud with the ssh-agent message', async () => {
        scene.agent.teardown();

        // after teardown the sign MUST fail loud — capture via getError (no
        // let) and assert the exact failure, not just "a throw happened"
        const error = await getError(() =>
          getOneAgentSignature({
            sock: scene.agent.sock,
            pubkeyPath: scene.pubkeyPath,
            challenge: 'keyrack-unlock-v1:ehmpath.test',
          }),
        );
        expect(error).toBeInstanceOf(MalfunctionError);
        expect(error.message).toContain('ssh-agent sign failed');
        // snap only the stable first sentence — the metadata carries the random
        // socket + key paths, so the full message is not deterministic
        expect(error.message.split('\n\n')[0]).toMatchSnapshot();
      });
    });
  });
});
