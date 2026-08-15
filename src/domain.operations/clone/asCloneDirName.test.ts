import { asCloneDirName } from './asCloneDirName';
import { getCloneDir } from './getCloneDir';

describe('asCloneDirName', () => {
  it('renders the `serial=<serial>` token', () => {
    expect(asCloneDirName({ serial: '7f3a1111' })).toEqual('serial=7f3a1111');
  });

  it('is the token the full-path builder composes (single source of truth)', () => {
    // getCloneDir must end with the exact token, so a format change touches ONLY
    // asCloneDirName — never a hand-rebuilt literal in a consumer
    const dir = getCloneDir({ actorDir: '/repo/.actor', serial: 'abcd-eeee' });
    expect(dir.endsWith(asCloneDirName({ serial: 'abcd-eeee' }))).toBe(true);
  });
});
