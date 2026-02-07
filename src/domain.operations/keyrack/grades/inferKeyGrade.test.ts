import { given, then, when } from 'test-fns';

import { inferKeyGrade } from './inferKeyGrade';

describe('inferKeyGrade', () => {
  given('[case1] vault determines protection', () => {
    when('[t0] vault is os.envvar', () => {
      then('protection is plaintext', () => {
        const grade = inferKeyGrade({
          vault: 'os.envvar',
          mech: 'PERMANENT_VIA_REPLICA',
        });
        expect(grade.protection).toEqual('plaintext');
      });
    });

    when('[t1] vault is os.direct', () => {
      then('protection is plaintext', () => {
        const grade = inferKeyGrade({
          vault: 'os.direct',
          mech: 'PERMANENT_VIA_REPLICA',
        });
        expect(grade.protection).toEqual('plaintext');
      });
    });

    when('[t2] vault is os.secure', () => {
      then('protection is encrypted', () => {
        const grade = inferKeyGrade({
          vault: 'os.secure',
          mech: 'PERMANENT_VIA_REPLICA',
        });
        expect(grade.protection).toEqual('encrypted');
      });
    });

    when('[t3] vault is os.daemon', () => {
      then('protection is encrypted', () => {
        const grade = inferKeyGrade({
          vault: 'os.daemon',
          mech: 'PERMANENT_VIA_REPLICA',
        });
        expect(grade.protection).toEqual('encrypted');
      });
    });

    when('[t4] vault is 1password', () => {
      then('protection is encrypted', () => {
        const grade = inferKeyGrade({
          vault: '1password',
          mech: 'PERMANENT_VIA_REPLICA',
        });
        expect(grade.protection).toEqual('encrypted');
      });
    });
  });

  given('[case2] mechanism determines duration', () => {
    when('[t0] mech is PERMANENT_VIA_REPLICA', () => {
      then('duration is permanent', () => {
        const grade = inferKeyGrade({
          vault: 'os.secure',
          mech: 'PERMANENT_VIA_REPLICA',
        });
        expect(grade.duration).toEqual('permanent');
      });
    });

    when('[t1] mech is EPHEMERAL_VIA_GITHUB_APP', () => {
      then('duration is ephemeral', () => {
        const grade = inferKeyGrade({
          vault: 'os.secure',
          mech: 'EPHEMERAL_VIA_GITHUB_APP',
        });
        expect(grade.duration).toEqual('ephemeral');
      });
    });

    when('[t2] mech is EPHEMERAL_VIA_AWS_SSO', () => {
      then('duration is ephemeral', () => {
        const grade = inferKeyGrade({
          vault: 'os.secure',
          mech: 'EPHEMERAL_VIA_AWS_SSO',
        });
        expect(grade.duration).toEqual('ephemeral');
      });
    });

    when('[t3] mech is EPHEMERAL_VIA_GITHUB_OIDC', () => {
      then('duration is ephemeral', () => {
        const grade = inferKeyGrade({
          vault: 'os.secure',
          mech: 'EPHEMERAL_VIA_GITHUB_OIDC',
        });
        expect(grade.duration).toEqual('ephemeral');
      });
    });
  });

  given('[case3] deprecated mechanism aliases', () => {
    when('[t0] mech is REPLICA (deprecated)', () => {
      then('duration is permanent', () => {
        const grade = inferKeyGrade({
          vault: 'os.secure',
          mech: 'REPLICA',
        });
        expect(grade.duration).toEqual('permanent');
      });
    });

    when('[t1] mech is GITHUB_APP (deprecated)', () => {
      then('duration is ephemeral', () => {
        const grade = inferKeyGrade({
          vault: 'os.secure',
          mech: 'GITHUB_APP',
        });
        expect(grade.duration).toEqual('ephemeral');
      });
    });

    when('[t2] mech is AWS_SSO (deprecated)', () => {
      then('duration is ephemeral', () => {
        const grade = inferKeyGrade({
          vault: 'os.secure',
          mech: 'AWS_SSO',
        });
        expect(grade.duration).toEqual('ephemeral');
      });
    });
  });

  given('[case4] os.daemon always has transient duration', () => {
    when('[t0] vault is os.daemon with permanent mech', () => {
      then('duration is transient (overrides mech)', () => {
        const grade = inferKeyGrade({
          vault: 'os.daemon',
          mech: 'PERMANENT_VIA_REPLICA',
        });
        expect(grade.duration).toEqual('transient');
      });
    });

    when('[t1] vault is os.daemon with ephemeral mech', () => {
      then('duration is transient (overrides mech)', () => {
        const grade = inferKeyGrade({
          vault: 'os.daemon',
          mech: 'EPHEMERAL_VIA_AWS_SSO',
        });
        expect(grade.duration).toEqual('transient');
      });
    });
  });

  given('[case5] combined grade inference', () => {
    when('[t0] os.secure with PERMANENT_VIA_REPLICA', () => {
      then('grade is encrypted + permanent', () => {
        const grade = inferKeyGrade({
          vault: 'os.secure',
          mech: 'PERMANENT_VIA_REPLICA',
        });
        expect(grade).toEqual({
          protection: 'encrypted',
          duration: 'permanent',
        });
      });
    });

    when('[t1] os.direct with EPHEMERAL_VIA_AWS_SSO', () => {
      then('grade is plaintext + ephemeral', () => {
        const grade = inferKeyGrade({
          vault: 'os.direct',
          mech: 'EPHEMERAL_VIA_AWS_SSO',
        });
        expect(grade).toEqual({
          protection: 'plaintext',
          duration: 'ephemeral',
        });
      });
    });

    when('[t2] os.daemon with any mech', () => {
      then('grade is encrypted + transient', () => {
        const grade = inferKeyGrade({
          vault: 'os.daemon',
          mech: 'PERMANENT_VIA_REPLICA',
        });
        expect(grade).toEqual({
          protection: 'encrypted',
          duration: 'transient',
        });
      });
    });
  });
});
