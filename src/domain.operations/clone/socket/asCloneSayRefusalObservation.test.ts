import { given, then, when } from 'test-fns';

import { asCloneSayRefusalObservation } from './asCloneSayRefusalObservation';

describe('asCloneSayRefusalObservation', () => {
  given('a dirty-region refusal', () => {
    when('the observation is built', () => {
      then('it carries the refusal, no rise, and a null screen', () => {
        expect(
          asCloneSayRefusalObservation({ refusal: 'input-region-dirty' }),
        ).toEqual({
          refusal: 'input-region-dirty',
          transcriptRose: false,
          screen: null,
          probeReason: null,
        });
      });
    });
  });

  given('a modal refusal', () => {
    when('the observation is built', () => {
      then('it carries the modal reason and no read to observe', () => {
        expect(
          asCloneSayRefusalObservation({ refusal: 'modal-holds-focus' }),
        ).toEqual({
          refusal: 'modal-holds-focus',
          transcriptRose: false,
          screen: null,
          probeReason: null,
        });
      });
    });
  });
});
