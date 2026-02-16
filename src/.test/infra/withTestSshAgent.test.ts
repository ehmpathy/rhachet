import { execSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { given, then, when } from 'test-fns';

import {
  TEST_SSH_KEY_PATH,
  TEST_SSH_PUBKEY_PATH,
  withTestSshAgent,
} from './withTestSshAgent';

describe('withTestSshAgent', () => {
  given('[case0] test ssh key files', () => {
    then('test key exists at expected path', () => {
      expect(existsSync(TEST_SSH_KEY_PATH)).toBe(true);
    });

    then('test pubkey exists at expected path', () => {
      expect(existsSync(TEST_SSH_PUBKEY_PATH)).toBe(true);
    });

    then('pubkey has ed25519 format', () => {
      const pubkey = readFileSync(TEST_SSH_PUBKEY_PATH, 'utf-8');
      expect(pubkey).toMatch(/^ssh-ed25519 /);
    });
  });

  given('[case1] withTestSshAgent execution', () => {
    when('[t0] callback is invoked', () => {
      then('agent env vars are available inside callback', async () => {
        await withTestSshAgent(async (agentEnv) => {
          expect(agentEnv.SSH_AUTH_SOCK).toBeDefined();
          expect(agentEnv.SSH_AGENT_PID).toBeDefined();

          // verify the agent is responsive
          const result = spawnSync('ssh-add', ['-l'], {
            env: { ...process.env, ...agentEnv },
          });
          expect(result.status).toBe(0);
          expect(result.stdout.toString()).toContain('ED25519');
        });
      });

      then('test key is loaded in agent', async () => {
        await withTestSshAgent(async (agentEnv) => {
          const result = spawnSync('ssh-add', ['-l'], {
            env: { ...process.env, ...agentEnv },
          });
          const output = result.stdout.toString();
          expect(output).toContain('keyrack-test-key');
        });
      });
    });

    when('[t1] callback completes', () => {
      then('agent is cleaned up (pid no longer exists)', async () => {
        let capturedPid: string = '';

        await withTestSshAgent(async (agentEnv) => {
          capturedPid = agentEnv.SSH_AGENT_PID;
        });

        // wait for agent to terminate (SIGTERM may take a moment to complete)
        const isAlive = await (async () => {
          for (let i = 0; i < 10; i++) {
            try {
              process.kill(parseInt(capturedPid, 10), 0);
              // still alive, wait a bit
              await new Promise((resolve) => setTimeout(resolve, 50));
            } catch {
              return false; // process is dead
            }
          }
          return true; // still alive after all retries
        })();

        expect(isAlive).toBe(false);
      });
    });
  });
});
