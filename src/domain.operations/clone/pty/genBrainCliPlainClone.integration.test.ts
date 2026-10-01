import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';
import { getUuid } from 'uuid-fns';

import { CLONE_ENV_KEYS } from '@src/utils/cloneEnvKeys';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { genBrainCliPlainClone } from './genBrainCliPlainClone';

describe('genBrainCliPlainClone.integration', () => {
  given('[case1] a plain spawn with an actor brain dir', () => {
    const scene = useBeforeAll(async () => {
      const serial = getUuid();
      const cwd = genTempDir({ slug: `plainclone-cwd-${serial}` });
      const brainDir = genTempDir({ slug: `plainclone-brain-${serial}` });
      const envOut = join(cwd, 'env.json');

      // the child records the env vars the spawn must carry
      const program = [
        `const env = { configDir: process.env.CLAUDE_CONFIG_DIR ?? null, secureStorageDir: process.env.CLAUDE_SECURESTORAGE_CONFIG_DIR ?? null, serial: process.env[${JSON.stringify(CLONE_ENV_KEYS.serial)}] ?? null };`,
        `require('fs').writeFileSync(${JSON.stringify(envOut)}, JSON.stringify(env));`,
      ].join('\n');

      const clone = genBrainCliPlainClone({
        command: process.execPath,
        args: ['-e', program],
        cwd,
        serial,
        depth: 0,
        brainDir,
      });
      const exitCode = await clone.waitForExit;
      const env = JSON.parse(readFileSync(envOut, 'utf8')) as {
        configDir: string | null;
        secureStorageDir: string | null;
        serial: string | null;
      };
      return { serial, brainDir, exitCode, env };
    });

    when('[t0] the child reads its env', () => {
      then('it exits clean', () => {
        expect(scene.exitCode).toEqual(0);
      });

      then('its CLAUDE_CONFIG_DIR is the actor brain dir', () => {
        expect(scene.env.configDir).toEqual(scene.brainDir);
      });

      then('its login store is the shared ~/.claude, via an empty var', () => {
        // '' is set, never unset: unset would key the login to the brain dir
        expect(scene.env.secureStorageDir).toEqual('');
      });

      then('it carries its own serial', () => {
        expect(scene.env.serial).toEqual(scene.serial);
      });
    });
  });
});
