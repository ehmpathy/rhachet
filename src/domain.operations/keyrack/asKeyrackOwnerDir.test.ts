import { given, then, when } from 'test-fns';

import { asKeyrackOwnerDir } from './asKeyrackOwnerDir';

describe('asKeyrackOwnerDir', () => {
  given('[case1] owner is provided', () => {
    when('[t0] asKeyrackOwnerDir is called', () => {
      then('returns owner={owner}', () => {
        const result = asKeyrackOwnerDir({ owner: 'ehmpath' });
        expect(result).toEqual('owner=ehmpath');
      });
    });
  });

  given('[case2] owner is null', () => {
    when('[t0] asKeyrackOwnerDir is called', () => {
      then('returns owner=default', () => {
        const result = asKeyrackOwnerDir({ owner: null });
        expect(result).toEqual('owner=default');
      });
    });
  });
});
