import { given, then, when } from 'test-fns';

import { asKeyrackGithubAppSetCommand } from './asKeyrackGithubAppSetCommand';

const SLUG = '@all.all.EHMPATH_BEAVER_GITHUB_TOKEN';

const TEST_CASES: Array<{
  description: string;
  given: Parameters<typeof asKeyrackGithubAppSetCommand>[0];
  expect: string;
}> = [
  {
    description: 'os.secure pipe, origin unknown, on this box',
    given: {
      vault: 'os.secure',
      owner: 'ehmpath',
      slug: SLUG,
      reach: null,
      form: { kind: 'pipe', readSide: null, host: null },
    },
    expect: `<the current blob> | rhx keyrack set --owner ehmpath --key ${SLUG} --vault os.secure --mech EPHEMERAL_VIA_GITHUB_APP --source @stdin`,
  },
  {
    description:
      'os.secure pipe at a reach, so the cure lands on the file get reads',
    given: {
      vault: 'os.secure',
      owner: 'ehmpath',
      slug: SLUG,
      reach: 'github://org=ehmpathy',
      form: { kind: 'pipe', readSide: null, host: null },
    },
    expect: `<the current blob> | rhx keyrack set --owner ehmpath --key ${SLUG} --reach github://org=ehmpathy --vault os.secure --mech EPHEMERAL_VIA_GITHUB_APP --source @stdin`,
  },
  {
    description: 'os.secure pipe from a known read, onto another box',
    given: {
      vault: 'os.secure',
      owner: '<owner>',
      slug: '<full slug>',
      reach: null,
      form: {
        kind: 'pipe',
        readSide: 'aws ssm get-parameter --name /p --with-decryption',
        host: '<this box>',
      },
    },
    expect:
      'aws ssm get-parameter --name /p --with-decryption | ssh <this box> rhx keyrack set --owner <owner> --key <full slug> --vault os.secure --mech EPHEMERAL_VIA_GITHUB_APP --source @stdin',
  },
  {
    description: 'aws.params guided, the default owner',
    given: {
      vault: 'aws.params',
      owner: null,
      slug: SLUG,
      reach: null,
      form: { kind: 'guided' },
    },
    expect: `rhx keyrack set --key ${SLUG} --vault aws.params --mech EPHEMERAL_VIA_GITHUB_APP`,
  },
];

describe('asKeyrackGithubAppSetCommand', () => {
  TEST_CASES.map((thisCase) =>
    given(thisCase.description, () => {
      when('[t0] rendered', () => {
        then('it names every flag the set needs', () => {
          expect(asKeyrackGithubAppSetCommand(thisCase.given)).toEqual(
            thisCase.expect,
          );
        });
      });
    }),
  );
});
