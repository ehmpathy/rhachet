import { MalfunctionError } from 'helpful-errors';
import { getError } from 'test-fns';

import { asHookDispatcherCommand } from './asHookDispatcherCommand';
import { asManifestPathOfHookDispatcherCommand } from './asManifestPathOfHookDispatcherCommand';

describe('asManifestPathOfHookDispatcherCommand', () => {
  const ROUNDTRIP_CASES = [
    {
      manifestPathRel:
        '.agent/.actors/actor.via.repo=ambient/brain/.claude/hooks.dispatch.manifest',
      event: 'PreToolUse',
    },
    {
      manifestPathRel:
        '.agent/.actors/actor.via.hash=9366365e/brain/.claude/hooks.dispatch.manifest',
      event: 'SessionStart',
    },
  ];
  ROUNDTRIP_CASES.map((thisCase) =>
    test(`reads back the manifest path its builder wrote, for ${thisCase.event}`, () => {
      const command = asHookDispatcherCommand(thisCase);
      expect(asManifestPathOfHookDispatcherCommand({ command })).toEqual(
        thisCase.manifestPathRel,
      );
    }),
  );

  const MALFORMED_CASES = [
    'bash ./node_modules/rhachet/bin/hooks.dispatch.sh',
    'sh ./node_modules/rhachet/bin/hooks.dispatch.sh m.manifest Stop',
    'bash ./other.sh m.manifest Stop',
    'bash ./node_modules/rhachet/bin/hooks.dispatch.sh m.manifest Stop extra',
  ];
  MALFORMED_CASES.map((command) =>
    test(`refuses a command of another shape: ${command}`, async () => {
      const error = await getError(async () =>
        asManifestPathOfHookDispatcherCommand({ command }),
      );
      expect(error).toBeInstanceOf(MalfunctionError);
      expect(JSON.stringify((error as MalfunctionError).metadata)).toContain(
        'rhx init --hooks',
      );
    }),
  );
});
