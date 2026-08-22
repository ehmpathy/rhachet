import { execSync, spawn } from 'node:child_process';
import { chmodSync, existsSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

import {
  sshPrikeyToAgeIdentity,
  sshPubkeyToAgeRecipient,
} from '@src/infra/ssh';

/**
 * .what = path to the committed test ssh key
 * .why = portable, deterministic key for all tests
 */
export const TEST_SSH_KEY_PATH = join(
  __dirname,
  '../assets/keyrack/ssh/test_key_ed25519',
);

/**
 * .what = path to the committed test ssh pubkey
 * .why = portable, deterministic pubkey for all tests
 */
export const TEST_SSH_PUBKEY_PATH = `${TEST_SSH_KEY_PATH}.pub`;

/**
 * .what = age recipient derived from test ssh pubkey (memoized async getter)
 * .why = enables tests to encrypt manifests to the test ssh key. sshPubkeyToAgeRecipient is now
 *        async (it lazy-loads pure-esm @noble/@scure crypto — rhachet#468), so the derived recipient
 *        is an awaited getter rather than a module-eval const. memoized so the conversion runs once.
 */
let testSshAgeRecipientCached: Promise<string> | undefined;
export const getTestSshAgeRecipient = (): Promise<string> => {
  if (!testSshAgeRecipientCached)
    testSshAgeRecipientCached = sshPubkeyToAgeRecipient({
      pubkey: readFileSync(TEST_SSH_PUBKEY_PATH, 'utf8'),
    }).catch((error) => {
      // do not cache a failed load — clear so a later call re-attempts (mirrors getOneLazyEsmModuleLoader)
      testSshAgeRecipientCached = undefined;
      throw error;
    });
  return testSshAgeRecipientCached;
};

/**
 * .what = age identity derived from test ssh private key (memoized async getter)
 * .why = enables tests to decrypt manifests encrypted to the test ssh key. sshPrikeyToAgeIdentity is
 *        now async (it lazy-loads pure-esm @noble/@scure crypto — rhachet#468), so the derived
 *        identity is an awaited getter rather than a module-eval const. memoized so it runs once.
 */
let testSshAgeIdentityCached: Promise<string> | undefined;
export const getTestSshAgeIdentity = (): Promise<string> => {
  if (!testSshAgeIdentityCached)
    testSshAgeIdentityCached = sshPrikeyToAgeIdentity({
      keyPath: TEST_SSH_KEY_PATH,
    }).catch((error) => {
      // do not cache a failed load — clear so a later call re-attempts (mirrors getOneLazyEsmModuleLoader)
      testSshAgeIdentityCached = undefined;
      throw error;
    });
  return testSshAgeIdentityCached;
};

/**
 * .what = spawns an isolated ssh-agent, loads the test key, runs fn, then cleans up
 * .why = enables tests to use ssh-agent flow without system agent pollution
 */
export const withTestSshAgent = async <T>(
  fn: (agentEnv: { SSH_AUTH_SOCK: string; SSH_AGENT_PID: string }) => Promise<T>,
): Promise<T> => {
  // spawn ssh-agent and capture its output
  const agentOutput = execSync('ssh-agent -s').toString();

  // parse the agent output to get env vars
  const sockMatch = agentOutput.match(/SSH_AUTH_SOCK=([^;]+)/);
  const pidMatch = agentOutput.match(/SSH_AGENT_PID=(\d+)/);

  if (!sockMatch || !pidMatch)
    throw new Error('failed to parse ssh-agent output');

  const agentEnv = {
    SSH_AUTH_SOCK: sockMatch[1]!,
    SSH_AGENT_PID: pidMatch[1]!,
  };

  // store original env
  const originalSock = process.env.SSH_AUTH_SOCK;
  const originalPid = process.env.SSH_AGENT_PID;

  try {
    // set agent env vars
    process.env.SSH_AUTH_SOCK = agentEnv.SSH_AUTH_SOCK;
    process.env.SSH_AGENT_PID = agentEnv.SSH_AGENT_PID;

    // ensure key has restrictive permissions (git does not preserve 0600)
    chmodSync(TEST_SSH_KEY_PATH, 0o600);

    // add the test key to the agent
    execSync(`ssh-add ${TEST_SSH_KEY_PATH}`, {
      env: { ...process.env, ...agentEnv },
    });

    // run the test function
    return await fn(agentEnv);
  } finally {
    // kill the agent
    try {
      process.kill(parseInt(agentEnv.SSH_AGENT_PID, 10), 'SIGTERM');
    } catch (error) {
      // allow expected errors: ESRCH = no such process (already dead)
      if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
    }

    // cleanup socket file if it exists
    if (existsSync(agentEnv.SSH_AUTH_SOCK)) {
      try {
        unlinkSync(agentEnv.SSH_AUTH_SOCK);
      } catch (error) {
        // allow expected errors: ENOENT = file already cleaned up
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    }

    // restore original env
    if (originalSock) process.env.SSH_AUTH_SOCK = originalSock;
    else delete process.env.SSH_AUTH_SOCK;

    if (originalPid) process.env.SSH_AGENT_PID = originalPid;
    else delete process.env.SSH_AGENT_PID;
  }
};
