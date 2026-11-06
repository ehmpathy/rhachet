import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { getAllMachineNamesInText } from './getAllMachineNamesInText';

const machine = {
  home: '/home/fixturehuman',
  username: 'fixturehuman',
  hostname: 'fixturehost',
};

const TEST_CASES = [
  {
    description: 'a home literal of this machine',
    text: '"claudeMdExcludes": ["/home/fixturehuman/.claude/CLAUDE.md"]',
    found: ['/home/fixturehuman', '/home/fixturehuman/', '/fixturehuman'],
  },
  {
    description: 'the hostname after user@',
    text: '"command": "ssh human@fixturehost -p 22"',
    found: ['fixturehost'],
  },
  {
    description: 'the hostname in a url',
    text: '"url": "https://fixturehost:8080/x"',
    found: ['fixturehost'],
  },
  {
    description: 'a hostname that is a common word, outside a host position, is no host',
    text: '"command": "npm run test" and "test:unit"',
    found: [],
    machineOverride: { hostname: 'test' },
  },
  {
    description: 'a home that prefixes a longer segment is no home',
    text: '"/opt/cipher/bin"',
    found: [],
    machineOverride: { home: '/opt/ci' },
  },
  {
    description: 'a home of one segment or fewer is left to the shape scan',
    text: '"/usr/bin/env"',
    found: [],
    machineOverride: { home: '/' },
  },
  {
    description: 'the username as a path segment of a home not this one',
    text: '"/Users/fixturehuman/notes"',
    found: ['/Users/fixturehuman/', '/fixturehuman'],
  },
  {
    description: "another machine's home",
    text: '"/home/camper/.claude/CLAUDE.md"',
    found: ['/home/camper/'],
  },
  {
    description: 'the root home',
    text: '"/root/.claude/CLAUDE.md"',
    found: ['/root/'],
  },
  {
    description: "another machine's bare home, with no tail",
    text: '{ "a": "/home/camper", "b": "/Users/camper", "c": "/root" }',
    found: ['/Users/camper', '/home/camper', '/root'],
  },
  {
    description: 'the common globs, which name no machine',
    text: '["**/!(brain)/.claude/CLAUDE.md", "**/CLAUDE.local.md"]',
    found: [],
  },
  {
    description: 'a hostname inside a longer word is no hostname',
    text: '"fixturehostname" and "xfixturehost"',
    found: [],
  },
  {
    description: 'a hostname as one label of a qualified name',
    text: '"fixturehost.local"',
    found: ['fixturehost'],
  },
  {
    description: 'a username inside a longer segment is no username',
    text: '"/opt/fixturehumans/bin"',
    found: [],
  },
  {
    description: "another machine's windows home, json-escaped",
    text: '"C:\\\\Users\\\\camper\\\\.claude\\\\CLAUDE.md"',
    found: ['/Users/camper/'],
  },
  {
    description: "this machine's own windows home, json-escaped",
    text: '"C:\\\\Users\\\\fixturehuman\\\\.claude"',
    found: ['C:/Users/fixturehuman', '/Users/fixturehuman/', '/fixturehuman'],
    machineOverride: { home: 'C:\\Users\\fixturehuman' },
  },
  {
    description: 'a dotted hostname is matched literally — its dot is no wildcard',
    text: '"https://fixturexbox/" and "https://fixture.box/"',
    found: ['fixture.box'],
    machineOverride: { hostname: 'fixture.box' },
  },
];

describe('getAllMachineNamesInText', () => {
  given('[case0] an empty machine name', () => {
    when('[t0] the text is scanned', () => {
      then('it fails fast and names the empty field', async () => {
        const error = await getError(async () =>
          getAllMachineNamesInText({
            text: '"/home/x/.claude/CLAUDE.md"',
            machine: { ...machine, username: '' },
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('username');
      });
    });
  });

  TEST_CASES.map((thisCase, index) =>
    given(`[case${index + 1}] ${thisCase.description}`, () => {
      when('[t0] the text is scanned', () => {
        then('each machine name is found, and no other', () => {
          expect(
            getAllMachineNamesInText({
              text: thisCase.text,
              machine: { ...machine, ...thisCase.machineOverride },
            }),
          ).toEqual([...thisCase.found].sort());
        });
      });
    }),
  );
});
