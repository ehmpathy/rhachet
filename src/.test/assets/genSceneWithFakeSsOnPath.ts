import { genFakeSsOnPath } from './genFakeSsOnPath';

/**
 * .what = a test scene built while a fake `ss` sits first on `PATH`, whose `close` also restores
 *   the `PATH`
 * .why = a swap that outlives its case leaks a slow or blind `ss` into every later test of the
 *   worker. this owns both exits: a setup fault restores before it rethrows, and the scene's own
 *   `close` restores at teardown, so a caller cannot forget either
 * .note = the swap comes first, so a host with no `ss` fails with the fixture's named
 *   ConstraintError before any scene is built. a teardown should call `scene?.close?.()`: on that
 *   fault the scene is absent, and a bare call would mask the named error with a TypeError
 * .note = the scene is spread into a new object, so it must be plain data: arrays and handles are
 *   shared by reference, but a getter would freeze at its first read and a `this`-bound method
 *   would lose its receiver. every scene here is a plain record of values and arrow closures
 */
export const genSceneWithFakeSsOnPath = async <
  TScene extends { close: () => Promise<void> },
>(
  input: { ss: Parameters<typeof genFakeSsOnPath>[0] },
  context: { genScene: () => Promise<TScene> },
): Promise<TScene> => {
  // swap `ss`, then build the scene; a scene fault must not leave the fake on PATH
  const fakeSs = genFakeSsOnPath(input.ss);
  const scene = await context.genScene().catch((error: unknown) => {
    fakeSs.restore();
    throw error;
  });

  // the scene's close undoes both, PATH first, so a close fault cannot strand the swap
  return {
    ...scene,
    close: async () => {
      fakeSs.restore();
      await scene.close();
    },
  };
};
