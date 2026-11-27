import { given, then, when } from 'test-fns';

import { EventEmitter } from 'node:events';
import { genHostLossWatch } from './genHostLossWatch';

/**
 * .what = a watch over a fake stdin and a fake parent pid
 */
const genScene = (
  input: { isTTY: boolean } = { isTTY: true },
): {
  stdin: EventEmitter;
  ppid: { value: number };
  losses: { count: number };
  off: () => void;
} => {
  const stdin = Object.assign(new EventEmitter(), { isTTY: input.isTTY });
  const ppid = { value: 4242 };
  const losses = { count: 0 };
  const off = genHostLossWatch(
    {
      onLoss: () => {
        losses.count += 1;
      },
    },
    { stdin, getPpid: () => ppid.value, intervalMs: 10 },
  );
  return { stdin, ppid, losses, off };
};

const delay = (ms: number): Promise<void> =>
  new Promise((wake) => setTimeout(wake, ms));

describe('genHostLossWatch', () => {
  given('[case1] a host whose input ends', () => {
    when('[t0] stdin emits end', () => {
      then('the loss fires once', () => {
        const scene = genScene();
        scene.stdin.emit('end');
        expect(scene.losses.count).toEqual(1);
        scene.off();
      });
    });

    when('[t1] stdin errors, as a vanished tty does on linux', () => {
      then('the loss fires once, and the error does not throw', () => {
        const scene = genScene();
        scene.stdin.emit('error', new Error('read EIO'));
        expect(scene.losses.count).toEqual(1);
        scene.off();
      });
    });
  });

  given('[case6] a host whose input is a pipe, not a terminal', () => {
    when(
      '[t0] the pipe ends, as `enroll --await -p` sees with no input to give',
      () => {
        then('no loss fires, so the brain still answers', () => {
          const scene = genScene({ isTTY: false });
          scene.stdin.emit('end');
          expect(scene.losses.count).toEqual(0);
          scene.off();
        });
      },
    );

    when('[t1] the parent dies', () => {
      then('the loss still fires', async () => {
        const scene = genScene({ isTTY: false });
        scene.ppid.value = 1;
        await delay(50);
        expect(scene.losses.count).toEqual(1);
        scene.off();
      });
    });
  });

  given('[case2] a host whose parent dies', () => {
    when('[t0] the parent pid changes', () => {
      then('the loss fires on the next poll', async () => {
        const scene = genScene();
        scene.ppid.value = 1;
        await delay(50);
        expect(scene.losses.count).toEqual(1);
        scene.off();
      });
    });

    when('[t1] the parent pid holds', () => {
      then('no loss fires', async () => {
        const scene = genScene();
        await delay(50);
        expect(scene.losses.count).toEqual(0);
        scene.off();
      });
    });
  });

  given('[case3] several signs of loss arrive', () => {
    when('[t0] the input ends, then errors, then the parent dies', () => {
      then('the loss fires exactly once', async () => {
        const scene = genScene();
        scene.stdin.emit('end');
        scene.stdin.emit('error', new Error('read EIO'));
        scene.ppid.value = 1;
        await delay(50);
        expect(scene.losses.count).toEqual(1);
        scene.off();
      });
    });
  });

  given('[case5] a loss that has fired', () => {
    when('[t0] time passes after the loss', () => {
      then('the parent poll has stopped', async () => {
        const reads = { count: 0 };
        const stdin = Object.assign(new EventEmitter(), { isTTY: true });
        const off = genHostLossWatch(
          { onLoss: () => undefined },
          {
            stdin,
            getPpid: () => {
              reads.count += 1;
              return 4242;
            },
            intervalMs: 10,
          },
        );
        stdin.emit('end');
        const readsAtLoss = reads.count;
        await delay(50);
        expect(reads.count).toEqual(readsAtLoss);
        off();
      });
    });
  });

  given('[case4] a watch that was unsubscribed', () => {
    when('[t0] the input ends after the unsubscribe', () => {
      then('no loss fires', () => {
        const scene = genScene();
        scene.off();
        scene.stdin.emit('end');
        expect(scene.losses.count).toEqual(0);
      });
    });
  });
});
