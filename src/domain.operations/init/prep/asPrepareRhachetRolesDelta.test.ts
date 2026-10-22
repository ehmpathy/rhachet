import { given, then } from 'test-fns';

import { asPrepareRhachetRolesDelta } from './asPrepareRhachetRolesDelta';

describe('asPrepareRhachetRolesDelta', () => {
  const cases: Array<{
    description: string;
    given: { command: string; additions: string[]; removals: string[] };
    expect: string;
  }> = [
    {
      description: 'a removal drops its role; every other role and flag stays',
      given: {
        command: 'rhachet init --hooks --roles mechanic xyz behaver',
        additions: [],
        removals: ['xyz'],
      },
      expect: 'rhachet init --hooks --roles mechanic behaver',
    },
    {
      description: 'the build prefix keeps its place',
      given: {
        command: 'npm run build && rhachet init --hooks --roles behaver xyz',
        additions: [],
        removals: ['xyz'],
      },
      expect: 'npm run build && rhachet init --hooks --roles behaver',
    },
    {
      description: 'an unqualified removal drops a qualified role of that slug',
      given: {
        command: 'rhachet init --roles ehmpathy/mechanic behaver',
        additions: [],
        removals: ['mechanic'],
      },
      expect: 'rhachet init --roles behaver',
    },
    {
      description: 'a qualified removal of another repo leaves the role',
      given: {
        command: 'rhachet init --roles ehmpathy/mechanic',
        additions: [],
        removals: ['bhuild/mechanic'],
      },
      expect: 'rhachet init --roles ehmpathy/mechanic',
    },
    {
      description: 'a removal of an absent role changes no token',
      given: {
        command: 'rhachet init --hooks --roles mechanic',
        additions: [],
        removals: ['xyz'],
      },
      expect: 'rhachet init --hooks --roles mechanic',
    },
    {
      description: 'when every role leaves, the `--roles` flag leaves too',
      given: {
        command: 'rhachet init --hooks --roles xyz',
        additions: [],
        removals: ['xyz'],
      },
      expect: 'rhachet init --hooks',
    },
    {
      description: 'a flag after the run keeps its place',
      given: {
        command: 'rhachet init --roles mechanic xyz --hooks',
        additions: [],
        removals: ['xyz'],
      },
      expect: 'rhachet init --roles mechanic --hooks',
    },
    {
      description: 'an addition appends once, never twice',
      given: {
        command: 'rhachet init --roles mechanic',
        additions: ['behaver', 'mechanic'],
        removals: [],
      },
      expect: 'rhachet init --roles mechanic behaver',
    },
    {
      description: 'an addition and a removal compose in one call',
      given: {
        command: 'rhachet init --hooks --roles mechanic xyz',
        additions: ['behaver'],
        removals: ['xyz'],
      },
      expect: 'rhachet init --hooks --roles mechanic behaver',
    },
    {
      description:
        'a comma-form run drops its role, and stays in the comma form',
      given: {
        command: 'rhachet init --hooks --roles mechanic,xyz,behaver',
        additions: [],
        removals: ['xyz'],
      },
      expect: 'rhachet init --hooks --roles mechanic,behaver',
    },
    {
      description: 'an inline `--roles=` run drops its role, and stays inline',
      given: {
        command: 'rhachet init --roles=mechanic,xyz --hooks',
        additions: [],
        removals: ['xyz'],
      },
      expect: 'rhachet init --roles=mechanic --hooks',
    },
    {
      description: 'a mixed space and comma run drops its role',
      given: {
        command: 'rhachet init --roles mechanic,xyz behaver',
        additions: [],
        removals: ['xyz'],
      },
      expect: 'rhachet init --roles mechanic,behaver',
    },
    {
      description: 'an inline run that empties takes its flag with it',
      given: {
        command: 'rhachet init --hooks --roles=xyz',
        additions: [],
        removals: ['xyz'],
      },
      expect: 'rhachet init --hooks',
    },
    {
      description: 'a delta that moves no role keeps the command verbatim',
      given: {
        command: 'npm run build  &&  rhachet init --roles mechanic',
        additions: ['mechanic'],
        removals: ['xyz'],
      },
      expect: 'npm run build  &&  rhachet init --roles mechanic',
    },
    {
      description: 'an addition to a command with no `--roles` opens the run',
      given: {
        command: 'rhachet init --hooks',
        additions: ['mechanic'],
        removals: [],
      },
      expect: 'rhachet init --hooks --roles mechanic',
    },
    {
      description:
        'a delta that moves a role keeps the text around the run verbatim, whitespace and all',
      given: {
        command:
          'npm run build  &&  rhachet init --roles mechanic xyz   --hooks ',
        additions: [],
        removals: ['xyz'],
      },
      expect: 'npm run build  &&  rhachet init --roles mechanic   --hooks ',
    },
    {
      description:
        'a run that empties leaves no doubled gap where its flag stood',
      given: {
        command: 'npm run build  &&  rhachet init --roles xyz && echo done',
        additions: [],
        removals: ['xyz'],
      },
      expect: 'npm run build  &&  rhachet init && echo done',
    },
    {
      description:
        'an addition to a chained command with no `--roles` patches the init, not what follows',
      given: {
        command: 'npm run build && rhachet init --hooks && echo done',
        additions: ['mechanic'],
        removals: [],
      },
      expect:
        'npm run build && rhachet init --hooks --roles mechanic && echo done',
    },
    {
      description:
        'a focused addition atop a held whole role narrows it in place (S3, [t4.b])',
      given: {
        command: 'rhachet init --roles any driver mechanic --hooks',
        additions: ['mechanic::flow'],
        removals: [],
      },
      expect: 'rhachet init --roles any driver mechanic::flow --hooks',
    },
    {
      description: 'a focused addition atop a held focus moves it (E3)',
      given: {
        command: 'rhachet init --roles any,mechanic::flow,driver',
        additions: ['mechanic::code.prod'],
        removals: [],
      },
      expect: 'rhachet init --roles any,mechanic::code.prod,driver',
    },
    {
      description: 'a removal drops a held focus of its role (P11)',
      given: {
        command: 'rhachet init --roles any mechanic::flow',
        additions: [],
        removals: ['mechanic'],
      },
      expect: 'rhachet init --roles any',
    },
    {
      description: 'a focused addition of an absent role appends verbatim',
      given: {
        command: 'rhachet init --roles any driver',
        additions: ['mechanic::flow'],
        removals: [],
      },
      expect: 'rhachet init --roles any driver mechanic::flow',
    },
    {
      description: 'a re-add of a held focus changes naught (E2)',
      given: {
        command: 'rhachet init --roles any mechanic::flow',
        additions: ['mechanic::flow'],
        removals: [],
      },
      expect: 'rhachet init --roles any mechanic::flow',
    },
  ];

  cases.forEach((thisCase, index) =>
    given(`[case${index + 1}] ${thisCase.description}`, () => {
      then('the command matches', () => {
        expect(asPrepareRhachetRolesDelta(thisCase.given)).toEqual(
          thisCase.expect,
        );
      });
    }),
  );
});
