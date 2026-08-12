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

  /**
   * [case5] THE migration clamp for the label→exid rename
   *
   * .why = the host manifest is ENCRYPTED on disk and cannot be regenerated from anywhere,
   *        so a machine that already holds a reach-key holds it spelled `label`. a strict
   *        `exid`-only schema would reject that human's whole rack — every key, not merely
   *        the reach one — with an error that points at a file they cannot open. this
   *        asserts the read accepts both spellings and yields ONE shape, so the rest of
   *        the system never learns there were two
   */
  given('[case5] a manifest entry written before the label→exid rename', () => {
    const genEntry = (reach: unknown) => ({
      slug: 'testorg.test.CLAUDE_TOKEN',
      mech: 'PERMANENT_VIA_REPLICA',
      vault: 'os.secure',
      exid: null,
      env: 'test',
      org: 'testorg',
      reach,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    when('[t0] its reach is spelled `label`', () => {
      // ⚠️ THE clamp. absent the preprocess this fails schema validation, and
      //    `daoKeyrackHostManifest.get` throws for the WHOLE manifest — so one renamed
      //    field costs a human every credential on the machine
      then('it parses, and the exid carries the label verbatim', () => {
        const result = schemaKeyrackKeyHost.safeParse(
          genEntry({ label: 'beav@ehmpathy.com' }),
        );
        expect(result.success).toBe(true);
        if (result.success)
          expect(result.data.reach).toEqual({ exid: 'beav@ehmpathy.com' });
      });

      // the read yields ONE shape, never a union — so no consumer downstream has to know
      // the manifest was ever written the other way
      then('the parsed shape carries no `label` key at all', () => {
        const result = schemaKeyrackKeyHost.safeParse(
          genEntry({ label: 'beav@ehmpathy.com' }),
        );
        expect(result.success).toBe(true);
        if (result.success)
          expect(result.data.reach).not.toHaveProperty('label');
      });
    });

    when('[t1] its reach is spelled `exid`', () => {
      then(
        'it parses unchanged — the post-rename shape is the native one',
        () => {
          const result = schemaKeyrackKeyHost.safeParse(
            genEntry({ exid: 'beav@ehmpathy.com' }),
          );
          expect(result.success).toBe(true);
          if (result.success)
            expect(result.data.reach).toEqual({ exid: 'beav@ehmpathy.com' });
        },
      );
    });

    when('[t2] its reach holds BOTH spellings', () => {
      // a shape this odd is not one keyrack ever writes, so the rule is simply that the
      // native field wins — the legacy read must never overwrite a value already correct
      then('`exid` wins, and `label` is ignored', () => {
        const result = schemaKeyrackKeyHost.safeParse(
          genEntry({ exid: 'right', label: 'wrong' }),
        );
        expect(result.success).toBe(true);
        if (result.success)
          expect(result.data.reach).toEqual({ exid: 'right' });
      });
    });

    when('[t3] its reach is spelled `label` but is empty', () => {
      // the legacy read is a RENAME, never a relaxation — a value that would have been
      // refused as an exid is still refused when it arrives spelled `label`
      then('it is refused, exactly as an empty exid would be', () => {
        const result = schemaKeyrackKeyHost.safeParse(genEntry({ label: '' }));
        expect(result.success).toBe(false);
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
