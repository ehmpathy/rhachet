import { given, then, when } from 'test-fns';

import { schemaKeyrackHostManifest, schemaKeyrackKeyHost } from './schema';

describe('schemaKeyrackHostManifest', () => {
  given('[case1] a legacy manifest entry without env/org fields', () => {
    const legacyEntry = {
      slug: 'testorg.prod.AWS_PROFILE',
      mech: 'PERMANENT_VIA_REPLICA',
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
          mech: 'PERMANENT_VIA_REPLICA',
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

  given('[case4] an aws.params vault entry', () => {
    // clamps a regression: the TS union KeyrackHostVault included 'aws.params' but this
    // runtime schema did not, so the first `set aws.params` wrote a manifest that failed
    // schema validation on every later read (re-set/unlock/get/del) — the vault was
    // write-once-then-unreadable. this asserts the schema accepts the vault value.
    const awsParamsEntry = {
      slug: 'testorg.prod.ANTHROPIC_API_KEY',
      mech: 'PERMANENT_VIA_REFERENCE',
      vault: 'aws.params',
      exid: '/keyrack/infra/vault/aws.params/v1/mechanic/testorg/prod/ANTHROPIC_API_KEY',
      env: 'prod',
      org: 'testorg',
      meta: { region: 'us-east-1' },
      maxDuration: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    when('[t0] parsed through schemaKeyrackKeyHost', () => {
      then('the aws.params vault value is accepted', () => {
        const result = schemaKeyrackKeyHost.safeParse(awsParamsEntry);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.vault).toEqual('aws.params');
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
          mech: 'PERMANENT_VIA_REPLICA',
          vault: 'os.direct',
          exid: null,
          env: 'prod', // set from slug
          org: 'testorg', // set from slug
          meta: null,
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
