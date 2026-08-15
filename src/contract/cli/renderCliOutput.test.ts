import { given, then, when } from 'test-fns';

import { renderCliOutput } from './renderCliOutput';

describe('renderCliOutput', () => {
  const tree = '🌳 clones\n   └─ @:driver';
  const data = { clones: [{ slug: 'driver', state: 'LIVE' }] };

  given('[case1] tree mode', () => {
    when('[t0] rendered', () => {
      then('it returns the human tree verbatim', () => {
        expect(renderCliOutput({ mode: 'tree', tree, data })).toEqual(tree);
      });

      then('it emits NO json glyphs', () => {
        const out = renderCliOutput({ mode: 'tree', tree, data });
        expect(out).not.toContain('{');
      });
    });
  });

  given('[case2] json mode', () => {
    when('[t0] rendered', () => {
      then('it returns the machine json of the same data', () => {
        const out = renderCliOutput({ mode: 'json', tree, data });
        expect(JSON.parse(out)).toEqual(data);
      });

      then('it emits NO tree glyphs', () => {
        const out = renderCliOutput({ mode: 'json', tree, data });
        expect(out).not.toContain('└─');
      });
    });
  });

  given('[case3] the two modes over one data source', () => {
    when('[t0] both rendered', () => {
      then('the json reflects the same facts the tree shows', () => {
        const jsonOut = renderCliOutput({ mode: 'json', tree, data });
        // the tree names @:driver LIVE; the json carries the same fields
        expect(JSON.parse(jsonOut).clones[0].slug).toEqual('driver');
        expect(JSON.parse(jsonOut).clones[0].state).toEqual('LIVE');
      });
    });
  });
});
