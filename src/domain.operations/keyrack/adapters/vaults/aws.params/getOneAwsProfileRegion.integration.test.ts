import { given, then, useBeforeAll, when } from 'test-fns';

import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getOneAwsProfileRegion } from './getOneAwsProfileRegion';

/**
 * .what = integration coverage for the ~/.aws/config region read
 * .why = it crosses the filesystem boundary (reads an ini file), so it is exercised against a
 *        real temp config, not a mock — proves the default/named-profile section parse + the
 *        absent-file/absent-key → null contract
 */
describe('getOneAwsProfileRegion', () => {
  const scene = useBeforeAll(async () => {
    const dir = mkdtempSync(join(tmpdir(), 'aws-config-region-'));
    const configPath = join(dir, 'config');
    writeFileSync(
      configPath,
      [
        '[default]',
        'region = us-east-1',
        'output = json',
        '',
        '[profile demo-agent]',
        'sso_start_url = https://example.awsapps.com/start',
        'region = eu-west-1',
        '',
        '[profile no-region]',
        'output = json',
        '',
      ].join('\n'),
      'utf8',
    );
    return { dir, configPath };
  });

  given('[case1] the default profile has a region', () => {
    when('[t0] read with profile=default', () => {
      then('it returns the default section region', () => {
        expect(
          getOneAwsProfileRegion({
            profile: 'default',
            configPath: scene.configPath,
          }),
        ).toEqual('us-east-1');
      });
    });
  });

  given('[case2] a named profile has a region', () => {
    when('[t0] read with profile=demo-agent', () => {
      then('it returns that named profile section region', () => {
        expect(
          getOneAwsProfileRegion({
            profile: 'demo-agent',
            configPath: scene.configPath,
          }),
        ).toEqual('eu-west-1');
      });
    });
  });

  given('[case3] a named profile with no region key', () => {
    when('[t0] read with profile=no-region', () => {
      then(
        'it returns null (the section exists but declares no region)',
        () => {
          expect(
            getOneAwsProfileRegion({
              profile: 'no-region',
              configPath: scene.configPath,
            }),
          ).toEqual(null);
        },
      );
    });
  });

  given('[case4] a profile that is not in the config', () => {
    when('[t0] read with profile=absent', () => {
      then('it returns null (no such section)', () => {
        expect(
          getOneAwsProfileRegion({
            profile: 'absent',
            configPath: scene.configPath,
          }),
        ).toEqual(null);
      });
    });
  });

  given('[case5] the config file does not exist', () => {
    when('[t0] read with a nonexistent configPath', () => {
      then(
        'it returns null (an absent file is the benign no-region case)',
        () => {
          expect(
            getOneAwsProfileRegion({
              profile: 'default',
              configPath: join(scene.dir, 'does-not-exist'),
            }),
          ).toEqual(null);
        },
      );
    });
  });
});
