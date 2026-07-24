import { ConstraintError } from 'helpful-errors';
import { getError, given, then, useBeforeAll, useThen, when } from 'test-fns';

import { genMockGhRun } from '@src/.test/assets/genMockGhRun';
import { genTempPemFile } from '@src/.test/assets/genTempPemFile';

import { getAllKeyrackInfraRegistryGithubApps } from '../../infra/getAllKeyrackInfraRegistryGithubApps';
import { genGithubAppSource } from './genGithubAppSource';

// the prompt must never be reached on the error paths; fail loud if it is
const questionNeverCalled = async (): Promise<string> => {
  throw new Error('question prompt should not be reached on an error path');
};

describe('genGithubAppSource', () => {
  given('[case1] the org registry already holds a single app', () => {
    const scene = useBeforeAll(async () => {
      const pem = genTempPemFile();
      const registered = {
        org: 'ehmpathy',
        appId: '123',
        installationId: '456',
        slug: 'my-app',
      };
      // seed keyrack-infra with a registry that already lists the app
      const ghRun = genMockGhRun({
        files: [
          {
            repo: 'ehmpathy/keyrack-infra',
            path: 'registry/github-apps.json',
            content: JSON.stringify([registered]),
          },
        ],
      });
      // scripted prompt: the pem-path answer (app is auto-selected, no choice prompt)
      const question = async (): Promise<string> => pem.path;
      return { pem, registered, ghRun, question };
    });

    when('[t0] the source is acquired', () => {
      const result = useThen('it resolves the source blob', async () =>
        genGithubAppSource(
          { keySlug: 'ehmpathy.prep.my-key' },
          { ghRun: scene.ghRun, question: scene.question },
        ),
      );

      then('the source embeds the app ids from the registry', () => {
        const parsed = JSON.parse(result.source);
        expect(parsed.appId).toEqual('123');
        expect(parsed.installationId).toEqual('456');
      });

      then('the source embeds the pem read off disk', () => {
        const parsed = JSON.parse(result.source);
        expect(parsed.privateKey).toEqual(scene.pem.content);
      });

      then('the source is tagged with the github-app mechanism', () => {
        const parsed = JSON.parse(result.source);
        expect(parsed.mech).toEqual('EPHEMERAL_VIA_GITHUB_APP');
      });
    });
  });

  given(
    '[case2] the registry is empty but an admin can list one org install',
    () => {
      const scene = useBeforeAll(async () => {
        const pem = genTempPemFile();
        // keyrack-infra repo exists (registry file absent) + admin install-list has one app
        const ghRun = genMockGhRun({
          repos: ['ehmpathy/keyrack-infra'],
          orgInstalls: {
            forbidden: false,
            installs: [
              { appId: '789', installationId: '1011', slug: 'installed-app' },
            ],
          },
        });
        const question = async (): Promise<string> => pem.path;
        return { pem, ghRun, question };
      });

      when('[t0] the source is acquired', () => {
        const result = useThen('it resolves the source blob', async () =>
          genGithubAppSource(
            { keySlug: 'ehmpathy.prep.my-key' },
            { ghRun: scene.ghRun, question: scene.question },
          ),
        );

        then('the source embeds the app ids from the install list', () => {
          const parsed = JSON.parse(result.source);
          expect(parsed.appId).toEqual('789');
          expect(parsed.installationId).toEqual('1011');
        });

        then('the chosen app is auto-registered into the registry', () => {
          // read the registry back through the same fake gh to prove the write happened
          const registered = getAllKeyrackInfraRegistryGithubApps(
            { org: 'ehmpathy' },
            { ghRun: scene.ghRun },
          );
          expect(registered).toEqual([
            {
              org: 'ehmpathy',
              appId: '789',
              installationId: '1011',
              slug: 'installed-app',
            },
          ]);
        });
      });
    },
  );

  given('[case3] keyrack-infra is not reachable for the org', () => {
    const ghRun = genMockGhRun({ repos: [] });

    when('[t0] the source is acquired', () => {
      then(
        'it fails loud (init your infra first) before any pem prompt',
        async () => {
          const error = await getError(() =>
            genGithubAppSource(
              { keySlug: 'ehmpathy.prep.my-key' },
              { ghRun, question: questionNeverCalled },
            ),
          );
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain('not reachable');
          expect(error.message).toMatchSnapshot();
        },
      );
    });
  });

  given(
    '[case4] the registry is empty and the caller is a member (403)',
    () => {
      const ghRun = genMockGhRun({
        files: [
          {
            repo: 'ehmpathy/keyrack-infra',
            path: 'registry/github-apps.json',
            content: '[]\n',
          },
        ],
        orgInstalls: { forbidden: true },
      });

      when('[t0] the source is acquired', () => {
        then('it fails loud (ask an admin) before any pem prompt', async () => {
          const error = await getError(() =>
            genGithubAppSource(
              { keySlug: 'ehmpathy.prep.my-key' },
              { ghRun, question: questionNeverCalled },
            ),
          );
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain('no github apps registered');
          expect(error.message).toMatchSnapshot();
        });
      });
    },
  );
});
