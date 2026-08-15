import { asCloneSerialHuman } from './asCloneSerialHuman';

describe('asCloneSerialHuman', () => {
  test('projects a full uuid serial to its first segment (8 hex)', () => {
    const human = asCloneSerialHuman({
      serial: '49b41f88-2b5b-4c50-b69e-b18d2d50dfda',
    });
    expect(human).toEqual('49b41f88');
  });

  test('the human form is a prefix of the full serial (reach can match it back)', () => {
    const serial = '2e95e654-1111-2222-3333-444455556666';
    const human = asCloneSerialHuman({ serial });
    // the reach path de-hyphenates and prefix-matches; the human form MUST be a
    // genuine prefix of the full serial, else the displayed address is unreachable
    expect(serial.startsWith(human)).toBe(true);
    expect(human.length).toEqual(8);
  });
});
