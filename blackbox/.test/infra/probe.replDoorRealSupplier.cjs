// .what = real-node probe: the repl door, driven through the built `rhachet/brains` contract
//         against the REAL installed anthropic supplier, with the agent-sdk's spawn intercepted
// .why  = the supplier spawns its brain via the esm agent-sdk `query()`, which jest cannot load.
//         a real node child loads it for real. the spawn is the one call this probe replaces: it
//         records the env the sdk hands the claude child, then throws, so no brain runs and no
//         token is spent. so the probe reads the exact env a real supplier brain would boot with
//
// argv[2] = absolute path to the built dist contract artifact (dist/contract/sdk.brains.js)
// cwd     = the repo whose package.json declares the rhachet-brains-* deps (the real registry)

// emulate a real-node consumer, not a jest worker (see probe.brainContextEsmRequire.cjs)
delete process.env.JEST_WORKER_ID;

const childProcess = require('node:child_process');
const { syncBuiltinESMExports } = require('node:module');
const { z } = require('zod');

const KEY_DEPTH = 'RHACHET_CLONE_DEPTH';
const KEY_SERIAL = 'RHACHET_CLONE_SERIAL';
const KEY_SOCKET = 'RHACHET_CLONE_SOCKET';

// record each spawn the supplier attempts, then refuse it, so no real brain runs
const spawnsSeen = [];
childProcess.spawn = (command, args, options) => {
  const env = (options && options.env) || {};
  spawnsSeen.push({
    command: String(command),
    depth: env[KEY_DEPTH] ?? null,
    serial: env[KEY_SERIAL] ?? null,
    socket: env[KEY_SOCKET] ?? null,
  });
  throw new Error('probe.replDoorRealSupplier: spawn intercepted');
};
// the agent-sdk is esm and imports `spawn` by name; this pushes the patch into the esm view
syncBuiltinESMExports();

const { genContextBrain } = require(process.argv[2]);

const main = async () => {
  const context = await genContextBrain({
    choice: { repl: 'anthropic/claude/code/haiku' },
  });
  const replInput = {
    role: {},
    prompt: 'reply with ok',
    schema: { output: z.object({ content: z.string() }) },
  };

  // run one door call from a caller at a given depth; report its error and the spawns it made
  const runAt = async (input) => {
    process.env[KEY_DEPTH] = input.depth;
    process.env[KEY_SERIAL] = 'serial-parent';
    process.env[KEY_SOCKET] = '/tmp/socket-parent';
    const spawnsBefore = spawnsSeen.length;
    let error = null;
    try {
      await context.brain.choice[input.door](replInput);
    } catch (thrown) {
      error = {
        name: thrown && thrown.constructor ? thrown.constructor.name : null,
        message: thrown && thrown.message ? String(thrown.message) : '',
      };
    }
    return {
      error,
      spawns: spawnsSeen.slice(spawnsBefore),
      envAfter: {
        depth: process.env[KEY_DEPTH] ?? null,
        serial: process.env[KEY_SERIAL] ?? null,
        socket: process.env[KEY_SOCKET] ?? null,
      },
    };
  };

  const report = {
    choiceRepo: context.brain.choice ? context.brain.choice.repo : null,
    askAtDepth0: await runAt({ door: 'ask', depth: '0' }),
    actAtDepth0: await runAt({ door: 'act', depth: '0' }),
    askAtDepth1: await runAt({ door: 'ask', depth: '1' }),
    actAtDepth1: await runAt({ door: 'act', depth: '1' }),
  };
  process.stdout.write(`REPORT_START${JSON.stringify(report)}REPORT_END`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
