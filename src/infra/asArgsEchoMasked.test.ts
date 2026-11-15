import { given, then, when } from 'test-fns';

import { asArgsEchoMasked } from './asArgsEchoMasked';

describe('asArgsEchoMasked', () => {
  given('[case1] argv with a literal --source value', () => {
    when('[t0] masked', () => {
      then('the value is masked, never echoed', () => {
        const argv = asArgsEchoMasked({
          args: ['keyrack', 'set', '--source', 'ghs_literal_value'],
        });
        expect(argv.join(' ')).not.toContain('ghs_literal_value');
        expect(argv).toContain('--source');
      });
    });
  });

  given('[case2] argv with --source @stdin', () => {
    when('[t0] masked', () => {
      then('the @stdin sentinel is kept, so a reproduction runs', () => {
        const argv = asArgsEchoMasked({
          args: ['keyrack', 'set', '--source', '@stdin'],
        });
        expect(argv).toEqual(['keyrack', 'set', '--source', '@stdin']);
      });
    });
  });

  given('[case4] argv of another command with a --source path', () => {
    when('[t0] masked', () => {
      then(
        'the path is kept, since --source carries no credential there',
        () => {
          const argv = asArgsEchoMasked({
            args: ['reflect', '--source', './feedback', '--target', './briefs'],
          });
          expect(argv).toEqual([
            'reflect',
            '--source',
            './feedback',
            '--target',
            './briefs',
          ]);
        },
      );
    });
  });

  given('[case3] argv with no credential-carry flag', () => {
    when('[t0] masked', () => {
      then('it is echoed as given', () => {
        const argv = asArgsEchoMasked({
          args: ['keyrack', 'get', '--key', 'X'],
        });
        expect(argv).toEqual(['keyrack', 'get', '--key', 'X']);
      });
    });
  });
});
