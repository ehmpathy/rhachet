import { computeCloneSocketOmissionReason } from './computeCloneSocketOmissionReason';
import type { PtyModule } from './pty/getPtyModuleOrNull';

// a stand-in pty module — the classifier only checks it against null, never calls it
const ptyModulePresent = {} as unknown as PtyModule;

const TEST_CASES = [
  {
    description: 'socket wanted + delivered → no omission (null)',
    given: {
      wantsSocket: true,
      socketEligible: true,
      ptyModule: ptyModulePresent,
    },
    expect: null,
  },
  {
    description:
      'socket never asked for → no omission (null), regardless of pty',
    given: { wantsSocket: false, socketEligible: false, ptyModule: null },
    expect: null,
  },
  {
    description: 'wanted but not eligible + pty absent → pty-absent',
    given: { wantsSocket: true, socketEligible: false, ptyModule: null },
    expect: 'pty-absent' as const,
  },
  {
    description: 'wanted but not eligible + pty present → host-incapable',
    given: {
      wantsSocket: true,
      socketEligible: false,
      ptyModule: ptyModulePresent,
    },
    expect: 'host-incapable' as const,
  },
];

describe('computeCloneSocketOmissionReason', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(computeCloneSocketOmissionReason(thisCase.given)).toEqual(
        thisCase.expect,
      );
    }),
  );
});
