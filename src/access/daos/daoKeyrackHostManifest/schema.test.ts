import { given, then, when } from 'test-fns';

import { schemaKeyrackHostManifest, schemaKeyrackKeyHost } from './schema';

describe('schemaKeyrackHostManifest', () => {
  given('[case1] a legacy manifest entry without env/org fields', () => {
    const legacyEntry = {
      slug: 'testorg.prod.AWS_PROFILE',
      mech: 'REPLICA',
      vault: 'os.direct',
      exid: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    when('[t0] parsed through schemaKeyrackKeyHost', () => {
      then('env should default to "all"', () => {
        const result = schemaKeyrackKeyHost.safeParse(legacyEntry);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.env).toEqual('all');
        }
      });

      then('org should default to "unknown"', () => {
        const result = schemaKeyrackKeyHost.safeParse(legacyEntry);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.org).toEqual('unknown');
        }
      });
    });
  });

  given('[case2] a legacy manifest with hosts', () => {
    const legacyManifest = {
      uri: 'file://~/.rhachet/keyrack/keyrack.host.age',
      owner: null,
      recipients: [],
      hosts: {
        'testorg.prod.AWS_PROFILE': {
          slug: 'testorg.prod.AWS_PROFILE',
          mech: 'REPLICA',
          vault: 'os.direct',
          exid: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      },
    };

    when('[t0] parsed through schemaKeyrackHostManifest', () => {
      then('host env should default to "all"', () => {
        const result = schemaKeyrackHostManifest.safeParse(legacyManifest);
        expect(result.success).toBe(true);
        if (result.success) {
          const host = result.data.hosts['testorg.prod.AWS_PROFILE'];
          expect(host?.env).toEqual('all');
          expect(host?.org).toEqual('unknown');
        }
      });
    });
  });

  given('[case3] a converted manifest with env/org set from slug', () => {
    // simulates what genTestTempRepo's convertLegacyManifest produces
    const convertedManifest = {
      uri: 'file://~/.rhachet/keyrack/keyrack.host.age',
      owner: null,
      recipients: [
        {
          mech: 'age',
          pubkey: 'age1test...',
          label: 'test-key',
          addedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      hosts: {
        'testorg.prod.AWS_PROFILE': {
          slug: 'testorg.prod.AWS_PROFILE',
          mech: 'REPLICA',
          vault: 'os.direct',
          exid: null,
          env: 'prod', // set from slug
          org: 'testorg', // set from slug
          vaultRecipient: null,
          maxDuration: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      },
    };

    when('[t0] parsed through schemaKeyrackHostManifest', () => {
      then('host env should be "prod"', () => {
        const result = schemaKeyrackHostManifest.safeParse(convertedManifest);
        expect(result.success).toBe(true);
        if (result.success) {
          const host = result.data.hosts['testorg.prod.AWS_PROFILE'];
          expect(host?.env).toEqual('prod');
          expect(host?.org).toEqual('testorg');
        }
      });
    });
  });
});
