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
        leaf: false,
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

  given('[case2] a plain spawn of a work clone vs a leaf', () => {
    // 🔴 the leaf mark must REACH the child — a leaf whose env lacked it could spawn
    //   clones of its own, and a work clone whose env held it could spawn none (#577)
    const spawnAndReadPlace = async (input: {
      depth: number;
      leaf: boolean;
    }): Promise<{ depth: string | null; leaf: string | null }> => {
      const serial = getUuid();
      const cwd = genTempDir({ slug: `plainclone-place-cwd-${serial}` });
      const brainDir = genTempDir({ slug: `plainclone-place-brain-${serial}` });
      const envOut = join(cwd, 'env.json');
      const program = [
        `const env = { depth: process.env[${JSON.stringify(CLONE_ENV_KEYS.depth)}] ?? null, leaf: process.env[${JSON.stringify(CLONE_ENV_KEYS.leaf)}] ?? null };`,
        `require('fs').writeFileSync(${JSON.stringify(envOut)}, JSON.stringify(env));`,
      ].join('\n');
      const clone = genBrainCliPlainClone({
        command: process.execPath,
        args: ['-e', program],
        cwd,
        serial,
        depth: input.depth,
        leaf: input.leaf,
        brainDir,
      });
      await clone.waitForExit;
      return JSON.parse(readFileSync(envOut, 'utf8')) as {
        depth: string | null;
        leaf: string | null;
      };
    };
    const scene = useBeforeAll(async () => ({
      work: await spawnAndReadPlace({ depth: 2, leaf: false }),
      leaf: await spawnAndReadPlace({ depth: 1, leaf: true }),
    }));

    when('[t0] each child reads its place in the chain', () => {
      then('a work clone at depth 2 reads depth 2 and no leaf mark', () => {
        expect(scene.work).toEqual({ depth: '2', leaf: null });
      });

      then('a leaf reads its depth and the leaf mark', () => {
        expect(scene.leaf).toEqual({ depth: '1', leaf: '1' });
      });
    });
  });
});
