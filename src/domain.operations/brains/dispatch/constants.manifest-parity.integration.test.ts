import { MalfunctionError } from 'helpful-errors';
import { given, then, useBeforeAll, when } from 'test-fns';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  HOOK_DISPATCH_MANIFEST_FIELDS,
  HOOK_DISPATCH_MANIFEST_HEAD,
  HOOK_DISPATCH_MANIFEST_VERSION,
} from './asHookDispatchManifestText';
import { HOOK_DISPATCH, HOOK_DISPATCH_MATCHER_LIST } from './constants';

describe('hook dispatch manifest contract, typescript against bin/hooks.dispatch.sh', () => {
  given(
    '[case1] the dispatcher bash, which reads what the typescript side writes',
    () => {
      const scene = useBeforeAll(async () => ({
        dispatcher: readFileSync(
          join(__dirname, '../../../../bin/hooks.dispatch.sh'),
          'utf-8',
        ),
      }));

      when('[t0] the bash row `read` list is read', () => {
        then(
          'it names the declared fields, in order, then one catch for extra fields',
          () => {
            const readLine = scene.dispatcher
              .split('\n')
              .find((line) =>
                /^while IFS="\$__rhx_dispatch_us" read -r /.test(line),
              );
            if (!readLine)
              throw new MalfunctionError(
                'the dispatcher row `read` line was not found',
                {
                  hint: 'bin/hooks.dispatch.sh changed its row loop; update this parity read',
                },
              );
            const names = [
              ...readLine.matchAll(/__rhx_dispatch_f_([a-z]+)/g),
            ].map((match) => match[1]!);
            const namesRead = names.slice(0, names.indexOf('extra') + 1);
            expect(namesRead).toEqual([
              ...HOOK_DISPATCH_MANIFEST_FIELDS,
              'extra',
            ]);
          },
        );
      });

      when('[t1] the bash header check is read', () => {
        then('it reads the version the writer stamps', () => {
          const versions = [
            ...scene.dispatcher.matchAll(
              /'# rhachet hooks\.dispatch manifest (v\d+)/g,
            ),
          ].map((match) => match[1]!);
          expect(versions.length).toBeGreaterThan(0);
          expect([...new Set(versions)]).toEqual([
            HOOK_DISPATCH_MANIFEST_VERSION,
          ]);
          expect(HOOK_DISPATCH_MANIFEST_HEAD).toContain(
            `# rhachet hooks.dispatch manifest ${HOOK_DISPATCH_MANIFEST_VERSION} `,
          );
        });
      });

      when('[t2] the bash exact-list matcher pattern is read', () => {
        then('it equals the declared one', () => {
          const patterns = [
            ...scene.dispatcher.matchAll(
              /__rhx_dispatch_f_matcher" =~ (\S+) \]\]/g,
            ),
          ].map((match) => match[1]!);
          expect(patterns).toEqual([HOOK_DISPATCH_MATCHER_LIST.source]);
        });
      });

      when('[t3] the bash TERM-to-KILL grace is read', () => {
        then('it equals the declared grace', () => {
          const grace = scene.dispatcher.match(/__rhx_dispatch_grace=(\d+)/);
          expect(Number(grace?.[1])).toEqual(HOOK_DISPATCH.timeoutGraceSeconds);
        });
      });

      when('[t4] the bash export of a held stop is read', () => {
        then('it exports the var a stop rule reads', () => {
          const names = [
            ...scene.dispatcher.matchAll(/export (RHACHET_[A-Z_]+)=1/g),
          ].map((match) => match[1]!);
          expect(names).toEqual([HOOK_DISPATCH.envStopHeld]);
        });
      });
    },
  );
});
