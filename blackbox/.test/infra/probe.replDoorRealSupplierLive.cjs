// .what = real-node probe: the repl door, driven through the built `rhachet/brains` contract
//         against the REAL installed anthropic supplier, with a LIVE haiku brain
// .why  = the live row beside probe.replDoorRealSupplier.cjs: the claude child really boots and
//         the real service answers, so the depth var is read from the env of a brain that ran
//         (fulcrum F21, option (c))
// .spy  = `child_process.spawn` is wrapped, never replaced: the wrapper records the env the sdk
//         hands the child, then calls the real spawn with the same args. the supplier's ask
//         exposes no shell tool, so the brain cannot echo its own env; the spawn env is the
//         record of what it booted with
//
// argv[2] = absolute path to the built dist contract artifact (dist/contract/sdk.brains.js)
// cwd     = the repo whose package.json declares the rhachet-brains-* deps (the real registry)

// emulate a real-node consumer, not a jest worker (see probe.brainContextEsmRequire.cjs)
delete process.env.JEST_WORKER_ID;

const childProcess = require('node:child_process');
const { syncBuiltinESMExports } = require('node:module');
const { z } = require('zod');

const KEY_DEPTH = 'RHACHET_CLONE_DEPTH';
const KEY_LEAF = 'RHACHET_CLONE_LEAF';

// record each spawn the supplier makes, then let it run for real
const spawnsSeen = [];
const spawnReal = childProcess.spawn;
childProcess.spawn = (command, args, options) => {
  const env = (options && options.env) || {};
  spawnsSeen.push({
    depth: env[KEY_DEPTH] ?? null,
    leaf: env[KEY_LEAF] ?? null,
  });
  return spawnReal(command, args, options);
};
// the agent-sdk is esm and imports `spawn` by name; this pushes the wrap into the esm view
syncBuiltinESMExports();

const { genContextBrain } = require(process.argv[2]);

const main = async () => {
  const context = await genContextBrain({
    choice: { repl: 'anthropic/claude/code/haiku' },
  });

  // a depth-0 work caller: the door must hand its child depth 1 and the leaf mark
  process.env[KEY_DEPTH] = '0';
  delete process.env[KEY_LEAF];

  const result = await context.brain.choice.ask({
    role: {},
    prompt: 'reply with the single word: ok',
    schema: { output: z.object({ content: z.string() }) },
  });

  const report = {
    content: result && result.output ? String(result.output.content) : null,
    spawns: spawnsSeen,
    envAfter: {
      depth: process.env[KEY_DEPTH] ?? null,
      leaf: process.env[KEY_LEAF] ?? null,
    },
  };
  process.stdout.write(`REPORT_START${JSON.stringify(report)}REPORT_END`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
