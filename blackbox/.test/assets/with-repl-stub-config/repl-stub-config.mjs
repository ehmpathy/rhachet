// .what = a rhachet user-config with one role and one stub repl brain
// .why  = the `rhachet ask` / `rhachet act` cli doors reach a repl through `actorAsk` / `actorAct`,
//         which refuse a reviewer (leaf) caller before the brain runs. this config lets a
//         blackbox test drive those doors with no real brain: a work clone's call reaches the
//         stub and prints its sentinel; a leaf's call is refused before the stub is reached.
//
// the stub never calls a model. its `ask` and `act` print the sentinel, plus the depth and the
// leaf mark its own env reads, and return a minimal answer.

const SENTINEL = 'REPL_STUB_RAN';

const answer = (input) => {
  console.log(
    `${SENTINEL} depth=${process.env.RHACHET_CLONE_DEPTH ?? 'absent'} leaf=${process.env.RHACHET_CLONE_LEAF ?? 'absent'}`,
  );
  return { output: { answer: 'stub' }, metrics: null, episode: null, series: null };
};

export const getRoleRegistries = () => [
  {
    slug: 'stub',
    readme: '',
    roles: [
      {
        slug: 'any',
        name: 'Any',
        purpose: 'a stub role for the repl door clamp',
        readme: '',
        traits: [],
        briefs: { dirs: [] },
        skills: {
          dirs: [],
          refs: [],
          // a rigid skill reaches `actorAct`; its executable sits under `.agent/`
          rigid: { stub: { input: {}, output: {} } },
        },
      },
    ],
  },
];

export const getBrainRepls = () => [
  {
    repo: 'stub',
    slug: 'stub/repl',
    description: 'a stub repl brain that never calls a model',
    ask: async (input) => answer(input),
    act: async (input) => answer(input),
  },
];
