import { asKeyrackMachineWideAsk } from './asKeyrackMachineWideAsk';

const TEST_CASES: {
  description: string;
  given: { keyAsk: string | null; envFlag: string | null };
  expect: { output: { env: string | null; slugAsked: string | null } };
}[] = [
  {
    description: 'a bare key with --env composes the slug under @all',
    given: { keyAsk: 'MY_KEY', envFlag: 'prep' },
    expect: { output: { env: 'prep', slugAsked: '@all.prep.MY_KEY' } },
  },
  {
    description: 'a full slug with no --env names its own env and slug',
    given: { keyAsk: '@all.camp.MISSING', envFlag: null },
    expect: { output: { env: 'camp', slugAsked: '@all.camp.MISSING' } },
  },
  {
    description: 'a full slug is never re-prefixed, even with --env',
    given: { keyAsk: '@all.all.MY_KEY', envFlag: 'all' },
    expect: { output: { env: 'all', slugAsked: '@all.all.MY_KEY' } },
  },
  {
    description: 'a bare key with no --env names neither',
    given: { keyAsk: 'MY_KEY', envFlag: null },
    expect: { output: { env: null, slugAsked: null } },
  },
  {
    description: 'no key asked keeps the --env and names no slug',
    given: { keyAsk: null, envFlag: 'test' },
    expect: { output: { env: 'test', slugAsked: null } },
  },
];

describe('asKeyrackMachineWideAsk', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(asKeyrackMachineWideAsk(thisCase.given)).toEqual(
        thisCase.expect.output,
      );
    }),
  );
});
