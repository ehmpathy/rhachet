import { given, then, when } from 'test-fns';

import { asBootEmittedPayload } from './asBootEmittedPayload';
import { asBootPayloadLogged } from './asBootPayloadLogged';

describe('asBootPayloadLogged', () => {
  given('[case1] a stats block and a body', () => {
    const input = {
      linesStats: ['<stats tokens=12 />'],
      linesBody: ['# brief', 'one line'],
    };

    when('[t0] the logged payload is assembled', () => {
      then('the stats block frames the body, above and below', () => {
        expect(asBootPayloadLogged(input)).toEqual(
          '<stats tokens=12 />\n# brief\none line\n<stats tokens=12 />',
        );
      });

      then('it ends with no newline — console.log adds that one', () => {
        expect(asBootPayloadLogged(input).endsWith('\n')).toEqual(false);
      });

      then('the emitted peer is exactly one newline longer', () => {
        expect(asBootEmittedPayload(input)).toEqual(
          `${asBootPayloadLogged(input)}\n`,
        );
      });
    });
  });
});
