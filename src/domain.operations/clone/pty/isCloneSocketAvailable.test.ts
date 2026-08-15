import type { PtyModule } from './getPtyModuleOrNull';
import { isCloneSocketAvailable } from './isCloneSocketAvailable';

// a stand-in pty module — the transformer only checks it for non-null, never calls it
const ptyStub = { spawn: (() => undefined) as unknown } as PtyModule;

const TEST_CASES: {
  description: string;
  given: {
    wantsSocket: boolean;
    ptyModule: PtyModule | null;
    socketPath: string | null;
  };
  expect: boolean;
}[] = [
  {
    description: 'all three present → available',
    given: { wantsSocket: true, ptyModule: ptyStub, socketPath: '/tmp/x.sock' },
    expect: true,
  },
  {
    description: 'socket not wanted → unavailable',
    given: {
      wantsSocket: false,
      ptyModule: ptyStub,
      socketPath: '/tmp/x.sock',
    },
    expect: false,
  },
  {
    description: 'pty addon absent → unavailable',
    given: { wantsSocket: true, ptyModule: null, socketPath: '/tmp/x.sock' },
    expect: false,
  },
  {
    description: 'no socket path resolved → unavailable',
    given: { wantsSocket: true, ptyModule: ptyStub, socketPath: null },
    expect: false,
  },
];

describe('isCloneSocketAvailable', () => {
  TEST_CASES.forEach((thisCase) =>
    test(thisCase.description, () => {
      expect(isCloneSocketAvailable(thisCase.given)).toEqual(thisCase.expect);
    }),
  );
});
