import { given, then, when } from 'test-fns';

import { getKeyrackInfraReadme } from './getKeyrackInfraReadme';

describe('getKeyrackInfraReadme', () => {
  given('[case1] an org name', () => {
    when('[t0] the readme is built', () => {
      const readme = getKeyrackInfraReadme({ org: 'ehmpathy' });

      then('it names the org', () => {
        expect(readme).toContain('ehmpathy');
      });

      then('it states the safety note that pems never live here', () => {
        expect(readme).toContain('never');
        expect(readme.toLowerCase()).toContain('.pem');
      });

      then('it points at the init command', () => {
        expect(readme).toContain('rhx keyrack infra init');
      });

      then('it matches the snapshot', () => {
        expect(readme).toMatchSnapshot();
      });
    });
  });
});
