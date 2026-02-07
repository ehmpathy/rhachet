import { given, then, when } from 'test-fns';

import { mechAdapterAwsSso } from './mechAdapterAwsSso';

describe('mechAdapterAwsSso', () => {
  given('[case1] valid aws profile names', () => {
    when('[t0] validate called with simple profile name', () => {
      const result = mechAdapterAwsSso.validate({ source: 'myprofile' });

      then('validation passes', () => {
        expect(result.valid).toBe(true);
      });
    });

    when('[t1] validate called with profile name that has dots', () => {
      const result = mechAdapterAwsSso.validate({ source: 'org-name.dev' });

      then('validation passes', () => {
        expect(result.valid).toBe(true);
      });
    });

    when('[t2] validate called with profile name that has dashes', () => {
      const result = mechAdapterAwsSso.validate({ source: 'my-org-name-prod' });

      then('validation passes', () => {
        expect(result.valid).toBe(true);
      });
    });

    when('[t3] validate called with profile name that has underscores', () => {
      const result = mechAdapterAwsSso.validate({ source: 'my_org_name_prod' });

      then('validation passes', () => {
        expect(result.valid).toBe(true);
      });
    });

    when('[t4] validate called with mixed format profile name', () => {
      const result = mechAdapterAwsSso.validate({
        source: 'AcmeInc_Production.Admin-Role',
      });

      then('validation passes', () => {
        expect(result.valid).toBe(true);
      });
    });
  });

  given('[case2] invalid aws profile names', () => {
    when('[t0] validate called with empty string', () => {
      const result = mechAdapterAwsSso.validate({ source: '' });

      then('validation fails', () => {
        expect(result.valid).toBe(false);
      });

      then('reason mentions no value', () => {
        if (!result.valid) {
          expect(result.reason).toContain('no value to validate');
        }
      });
    });

    when('[t1] validate called with profile name that starts with dash', () => {
      const result = mechAdapterAwsSso.validate({ source: '-invalid' });

      then('validation fails', () => {
        expect(result.valid).toBe(false);
      });
    });

    when('[t2] validate called with profile name that starts with dot', () => {
      const result = mechAdapterAwsSso.validate({ source: '.invalid' });

      then('validation fails', () => {
        expect(result.valid).toBe(false);
      });
    });

    when('[t3] validate called with profile name that has spaces', () => {
      const result = mechAdapterAwsSso.validate({ source: 'invalid profile' });

      then('validation fails', () => {
        expect(result.valid).toBe(false);
      });
    });

    when(
      '[t4] validate called with profile name that has special chars',
      () => {
        const result = mechAdapterAwsSso.validate({
          source: 'invalid@profile!',
        });

        then('validation fails', () => {
          expect(result.valid).toBe(false);
        });
      },
    );
  });
});
