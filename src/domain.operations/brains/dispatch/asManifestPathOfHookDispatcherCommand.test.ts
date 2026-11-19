import { ConstraintError, MalfunctionError } from 'helpful-errors';
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

  // an unplain manifest path is the human's to fix (the actor slug); an unplain event is the brain
  //   supplier's, so each names its own fix
  const UNPLAIN_CASES = [
    {
      manifestPathRel: 'my repo/hooks.dispatch.manifest',
      event: 'Stop',
      errorClass: ConstraintError,
      fix: 'rhx init --hooks',
    },
    {
      manifestPathRel: '$HOME/hooks.dispatch.manifest',
      event: 'Stop',
      errorClass: ConstraintError,
      fix: 'rhx init --hooks',
    },
    {
      manifestPathRel: 'hooks.dispatch.manifest',
      event: 'Stop;id',
      errorClass: MalfunctionError,
      fix: 'brain supplier',
    },
  ];
  UNPLAIN_CASES.map((thisCase) =>
    test(`the builder refuses a word the shell would split or expand: ${thisCase.manifestPathRel} ${thisCase.event}`, async () => {
      const error = await getError(async () =>
        asHookDispatcherCommand({
          manifestPathRel: thisCase.manifestPathRel,
          event: thisCase.event,
        }),
      );
      expect(error).toBeInstanceOf(thisCase.errorClass);
      expect(JSON.stringify((error as ConstraintError).metadata)).toContain(
        thisCase.fix,
      );
      // json form, so the newlines the message embeds read escaped in the snapshot
      expect(
        JSON.stringify(
          {
            message: error.message,
            metadata: (error as ConstraintError).metadata,
          },
          null,
          2,
        ),
      ).toMatchSnapshot();
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
