import { given, then, when } from 'test-fns';

import {
  asCommonPrefixFromProfileNames,
  asOrgLabelFromSsoStartUrl,
} from './asOrgLabelFromSsoStartUrl';

describe('asOrgLabelFromSsoStartUrl', () => {
  given('[case1] a meaningful subdomain', () => {
    when('[t0] the subdomain is a real org name', () => {
      then('extracts the subdomain as org label', () => {
        expect(
          asOrgLabelFromSsoStartUrl({
            ssoStartUrl: 'https://acme.awsapps.com/start',
          }),
        ).toEqual('acme');
      });

      then('handles hyphenated subdomains', () => {
        expect(
          asOrgLabelFromSsoStartUrl({
            ssoStartUrl: 'https://acme-corp.awsapps.com/start',
          }),
        ).toEqual('acme-corp');
      });
    });
  });

  given('[case2] a random directory id subdomain', () => {
    when('[t0] no profile names provided', () => {
      then('returns null', () => {
        expect(
          asOrgLabelFromSsoStartUrl({
            ssoStartUrl: 'https://d-90660aa711.awsapps.com/start',
          }),
        ).toEqual(null);
      });
    });

    when('[t1] profile names with common prefix provided', () => {
      then('extracts common prefix from profile names', () => {
        expect(
          asOrgLabelFromSsoStartUrl({
            ssoStartUrl: 'https://d-90660aa711.awsapps.com/start',
            profileNames: ['ahbode.test', 'ahbode.prod', 'ahbode.prep'],
          }),
        ).toEqual('ahbode');
      });
    });

    when('[t2] profile names with no common prefix', () => {
      then('returns null', () => {
        expect(
          asOrgLabelFromSsoStartUrl({
            ssoStartUrl: 'https://d-90660aa711.awsapps.com/start',
            profileNames: ['ahbode.test', 'ahction.prod', 'widge.prep'],
          }),
        ).toEqual(null);
      });
    });
  });

  given('[case3] a non-standard sso start url', () => {
    when('[t0] the url is a custom domain', () => {
      then('returns null', () => {
        expect(
          asOrgLabelFromSsoStartUrl({
            ssoStartUrl: 'https://sso.custom-domain.com/start',
          }),
        ).toEqual(null);
      });
    });

    when('[t1] the url has no subdomain', () => {
      then('returns null', () => {
        expect(
          asOrgLabelFromSsoStartUrl({
            ssoStartUrl: 'https://awsapps.com/start',
          }),
        ).toEqual(null);
      });
    });

    when('[t2] the url does not end with /start', () => {
      then('returns null', () => {
        expect(
          asOrgLabelFromSsoStartUrl({
            ssoStartUrl: 'https://acme.awsapps.com/portal',
          }),
        ).toEqual(null);
      });
    });
  });
});

describe('asCommonPrefixFromProfileNames', () => {
  given('[case1] profile names with common prefix', () => {
    when('[t0] all names share same org', () => {
      then('extracts the common prefix', () => {
        expect(
          asCommonPrefixFromProfileNames({
            profileNames: ['ahbode.test', 'ahbode.prod', 'ahbode.prep'],
          }),
        ).toEqual('ahbode');
      });
    });
  });

  given('[case2] profile names with different prefixes', () => {
    when('[t0] names have different orgs', () => {
      then('returns null', () => {
        expect(
          asCommonPrefixFromProfileNames({
            profileNames: ['ahbode.test', 'ahction.prod', 'widge.prep'],
          }),
        ).toEqual(null);
      });
    });
  });

  given('[case3] empty or single profile', () => {
    when('[t0] no profile names', () => {
      then('returns null', () => {
        expect(
          asCommonPrefixFromProfileNames({
            profileNames: [],
          }),
        ).toEqual(null);
      });
    });

    when('[t1] single profile name', () => {
      then('returns the org', () => {
        expect(
          asCommonPrefixFromProfileNames({
            profileNames: ['ahbode.test'],
          }),
        ).toEqual('ahbode');
      });
    });
  });

  given('[case4] profile names without dots', () => {
    when('[t0] names have no org.env pattern', () => {
      then('returns the name itself if all same', () => {
        expect(
          asCommonPrefixFromProfileNames({
            profileNames: ['myprofile', 'myprofile'],
          }),
        ).toEqual('myprofile');
      });
    });
  });
});
