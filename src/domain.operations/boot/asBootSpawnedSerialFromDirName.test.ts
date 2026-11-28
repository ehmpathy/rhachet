import { given, then } from 'test-fns';

import { asBootSpawnedSerialFromDirName } from './asBootSpawnedSerialFromDirName';
import { BOOT_SPAWNED_DIR_PREFIX } from './constants';

const TEST_CASES = [
  {
    description: 'a spawn boot dir name',
    name: 'serial=7c1e0b8a-3f2d-4a51-9e6b-2d8f0c4a1b3e',
    serial: '7c1e0b8a-3f2d-4a51-9e6b-2d8f0c4a1b3e',
  },
  {
    description: 'the bare prefix names no clone',
    name: 'serial=',
    serial: null,
  },
  {
    description: 'a tail after the serial stays part of the serial',
    name: 'serial=abc.bak',
    serial: 'abc.bak',
  },
  { description: 'an empty name', name: '', serial: null },
  { description: 'a name with no prefix', name: 'abc', serial: null },
  {
    description: 'a name with the prefix off the start',
    name: '.reap.serial=abc',
    serial: null,
  },
  {
    description: 'the former revision prefix',
    name: 'sha256=0123456789abcdef',
    serial: null,
  },
  {
    description: 'a prefix of different case',
    name: 'SERIAL=abc',
    serial: null,
  },
  { description: 'a dotfile', name: '.DS_Store', serial: null },
];

describe('asBootSpawnedSerialFromDirName', () => {
  given('[case1] the spawn boot dir prefix', () => {
    then('the prefix is the documented serial=', () => {
      expect(BOOT_SPAWNED_DIR_PREFIX).toEqual('serial=');
    });
  });

  given('[case2] a name read from the boots dir', () => {
    TEST_CASES.map((testCase) =>
      then(
        `${testCase.description} (${JSON.stringify(testCase.name)}) → ${JSON.stringify(testCase.serial)}`,
        () => {
          expect(
            asBootSpawnedSerialFromDirName({ name: testCase.name }),
          ).toEqual(testCase.serial);
        },
      ),
    );
  });
});
