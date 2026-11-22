import { given, then, when } from 'test-fns';

import { genSampleRoleContentDefectsLinked } from '@src/.test/assets/genSampleRoleContentDefectsLinked';

import { asRoleContentDefectHookWarnReply } from './asRoleContentDefectHookWarnReply';

describe('asRoleContentDefectHookWarnReply', () => {
  given('[case1] the stop warn over linked defects', () => {
    when('[t0] the reply renders', () => {
      const reply: unknown = JSON.parse(
        asRoleContentDefectHookWarnReply({
          invocation: 'roles cost --all --when hook.onStop',
          defects: genSampleRoleContentDefectsLinked(),
        }),
      );

      then('it is a json document with one string systemMessage', () => {
        expect(reply).toEqual({ systemMessage: expect.any(String) });
      });

      then('the message names the defect', () => {
        expect(JSON.stringify(reply)).toContain('gone.md.min');
      });

      then('the warn matches its snapshot', () => {
        expect(reply).toMatchSnapshot();
      });
    });
  });
});
