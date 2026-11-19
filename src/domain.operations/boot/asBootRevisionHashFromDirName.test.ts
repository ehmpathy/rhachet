import { given, then } from 'test-fns';

import { asBootRevisionHashFromDirName } from './asBootRevisionHashFromDirName';
import { BOOT_REVISION_DIR_PREFIX } from './constants';

const TEST_CASES = [
  {
    description: 'a revision dir name',
    name: 'sha256=0123456789abcdef',
    hash: '0123456789abcdef',
  },
  {
    description: 'the bare prefix holds an empty hash',
    name: 'sha256=',
    hash: '',
  },
  {
    description: 'a tail after the hash stays part of the hash',
    name: 'sha256=0123456789abcdef.bak',
    hash: '0123456789abcdef.bak',
  },
  {
    description: 'a second prefix later in the name stays part of the hash',
    name: 'sha256=sha256=abc',
    hash: 'sha256=abc',
  },
  { description: 'an empty name', name: '', hash: null },
  {
    description: 'a name with no prefix',
    name: '0123456789abcdef',
    hash: null,
  },
  {
    description: 'a name with the prefix off the start',
    name: 'x.sha256=0123456789abcdef',
    hash: null,
  },
  {
    description: 'a prefix of another algo',
    name: 'sha512=0123456789abcdef',
    hash: null,
  },
  {
    description: 'a prefix of different case',
    name: 'SHA256=0123456789abcdef',
    hash: null,
  },
  {
    description: 'a prefix with no equals sign',
    name: 'sha256',
    hash: null,
  },
  { description: 'a dotfile', name: '.DS_Store', hash: null },
];

describe('asBootRevisionHashFromDirName', () => {
  given('[case1] the revision dir prefix', () => {
    then('the prefix is the documented sha256=', () => {
      expect(BOOT_REVISION_DIR_PREFIX).toEqual('sha256=');
    });
  });

  given('[case2] a name read from the boots dir', () => {
    TEST_CASES.map((testCase) =>
      then(
        `${testCase.description} (${JSON.stringify(testCase.name)}) → ${JSON.stringify(testCase.hash)}`,
        () => {
          expect(
            asBootRevisionHashFromDirName({ name: testCase.name }),
          ).toEqual(testCase.hash);
        },
      ),
    );
  });
});
