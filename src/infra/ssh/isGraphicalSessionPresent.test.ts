import { isGraphicalSessionPresent } from './isGraphicalSessionPresent';

/**
 * .what = prove the graphical-session probe reads DISPLAY / WAYLAND_DISPLAY, and
 *         treats set-but-empty as absent
 * .why  = this probe gates the distinct headless message; a wrong read would
 *         either misfire on a real desktop or miss a headless box (vision q2)
 */
describe('isGraphicalSessionPresent', () => {
  const CASES = [
    {
      description: 'X11 DISPLAY set → present',
      base: { DISPLAY: ':0' },
      expected: true,
    },
    {
      description: 'Wayland WAYLAND_DISPLAY set → present',
      base: { WAYLAND_DISPLAY: 'wayland-0' },
      expected: true,
    },
    {
      description: 'both set → present',
      base: { DISPLAY: ':0', WAYLAND_DISPLAY: 'wayland-0' },
      expected: true,
    },
    {
      description: 'neither set → absent (headless)',
      base: {},
      expected: false,
    },
    {
      description:
        'DISPLAY set but empty → absent (an empty display is no display)',
      base: { DISPLAY: '' },
      expected: false,
    },
    {
      description: 'WAYLAND_DISPLAY set but empty → absent',
      base: { WAYLAND_DISPLAY: '' },
      expected: false,
    },
  ];

  CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(isGraphicalSessionPresent({ base: thisCase.base })).toEqual(
        thisCase.expected,
      );
    }),
  );
});
