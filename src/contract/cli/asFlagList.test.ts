import { asFlagList } from './asFlagList';

describe('asFlagList', () => {
  test('joins each flag with a slash, in roster order', () => {
    expect(
      asFlagList({ flags: [{ flag: '--role' }, { flag: '--repo' }] }),
    ).toEqual('--role/--repo');
  });

  test('an empty roster yields an empty string', () => {
    expect(asFlagList({ flags: [] })).toEqual('');
  });
});
