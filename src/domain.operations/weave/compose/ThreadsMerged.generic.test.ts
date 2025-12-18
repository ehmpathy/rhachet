import { given, then } from 'test-fns';
import type { Empty } from 'type-fns';

import { Thread } from '@src/domain.objects/Thread';
import type { Threads } from '@src/domain.objects/Threads';
import { genThread } from '@src/domain.operations/thread/genThread';

import type { ThreadsMerged } from './ThreadsMerged.generic';

describe('ThreadsMerged', () => {
  const artistEmpty = new Thread({
    context: { role: 'artist' as const },
    stitches: [],
  });
  const criticEmpty = new Thread({
    context: { role: 'critic' as const },
    stitches: [],
  });
  const directorEmpty = new Thread({
    context: { role: 'director' as const },
    stitches: [],
  });
  const judgeEmpty = new Thread({
    context: { role: 'judge' as const },
    stitches: [],
  });

  const directorWithVision = new Thread({
    context: {
      role: 'director' as const,
      vision: 'denser habitats -> more nature',
    },
    stitches: [],
  });
  const artistWithSkills = new Thread({
    context: { role: 'artist' as const, skills: ['code:diff:conflictMarkers'] },
    stitches: [],
  });

  given('threads with the same exact role.names & role.contexts', () => {
    const threadsA: Threads<{ artist: Empty; director: Empty }> = {
      artist: artistEmpty,
      director: directorEmpty,
    };
    const threadsB: Threads<{ artist: Empty; director: Empty }> = {
      artist: artistEmpty,
      director: directorEmpty,
    };

    then('they should support correct instantiation', () => {
      const threadsMerged: ThreadsMerged<[typeof threadsA, typeof threadsB]> = {
        artist: artistEmpty,
        director: directorEmpty,
      };
      expect(threadsMerged);
    });

    then('they should complain at missed inputs', () => {
      // @ts-expect-error: Property 'director' is missing in type '{ artist: Thread<ThreadContextRole<"artist">>; }' but required in type 'ThreadsMerged<[Threads<{ artist: Empty; director: Empty; }>, Threads<{ artist: Empty; director: Empty; }>]>'
      const threadsMerged: ThreadsMerged<[typeof threadsA, typeof threadsB]> = {
        artist: artistEmpty,
      };
      expect(threadsMerged);
    });

    then('they should complain at incorrect inputs', () => {
      const threadsMerged: ThreadsMerged<[typeof threadsA, typeof threadsB]> = {
        artist: artistEmpty,
        // @ts-expect-error: Type 'Thread<ThreadContextRole<"artist">>' is not assignable to type 'Thread<ThreadContextRole<"director">>'.
        director: artistEmpty,
      };
      expect(threadsMerged);
    });

    then('they should complain at unexpected inputs', () => {
      const threadsMerged: ThreadsMerged<[typeof threadsA, typeof threadsB]> = {
        artist: artistEmpty,
        director: directorEmpty,
        // @ts-expect-error: 'critic' does not exist in type 'ThreadsMerged<[Threads<{ artist: Empty; director: Empty; }>, Threads<{ artist: Empty; director: Empty; }>]>'
        critic: criticEmpty,
      };
      expect(threadsMerged);
    });
  });

  given('threads with different roles, one is a superset', () => {
    const threadsA: Threads<{ artist: Empty }> = {
      artist: artistEmpty,
    };
    const threadsB: Threads<{ artist: Empty; director: Empty }> = {
      artist: artistEmpty,
      director: directorEmpty,
    };

    then('they should support correct instantiation', () => {
      const threadsMerged: ThreadsMerged<[typeof threadsA, typeof threadsB]> = {
        artist: artistEmpty,
        director: directorEmpty,
      };
      expect(threadsMerged);
    });

    then('they should complain at missed inputs', () => {
      // @ts-expect-error: Property 'director' is missing in type '{ artist: Thread<ThreadContextRole<"artist">>; }' but required in type 'ThreadsMerged<[Threads<{ artist: Empty; director: Empty; }>, Threads<{ artist: Empty; director: Empty; }>]>'
      const threadsMerged: ThreadsMerged<[typeof threadsA, typeof threadsB]> = {
        artist: artistEmpty,
      };
      expect(threadsMerged);
    });

    then('they should complain at incorrect inputs', () => {
      const threadsMerged: ThreadsMerged<[typeof threadsA, typeof threadsB]> = {
        artist: artistEmpty,
        // @ts-expect-error: Type 'Thread<ThreadContextRole<"artist">>' is not assignable to type 'Thread<ThreadContextRole<"director">>'.
        director: threadsA.artist,
      };
      expect(threadsMerged);
    });

    then('they should complain at unexpected inputs', () => {
      const threadsMerged: ThreadsMerged<[typeof threadsA, typeof threadsB]> = {
        artist: artistEmpty,
        director: directorEmpty,
        // @ts-expect-error: 'judge' does not exist in type ...
        judge: judgeEmpty,
      };
      expect(threadsMerged);
    });
  });

  given('threads with different roles, partial overlap', () => {
    const threadsA: Threads<{ artist: Empty; critic: Empty }> = {
      artist: artistEmpty,
      critic: criticEmpty,
    };
    const threadsB: Threads<{ artist: Empty; director: Empty }> = {
      artist: artistEmpty,
      director: directorEmpty,
    };

    then('they should support correct instantiation', () => {
      const threadsMerged: ThreadsMerged<[typeof threadsA, typeof threadsB]> = {
        artist: artistEmpty,
        critic: criticEmpty,
        director: directorEmpty,
      };
      expect(threadsMerged);
    });

    then('they should complain at missed inputs', () => {
      // @ts-expect-error: Property 'director' is missing in type '{ artist: Thread<ThreadContextRole<"artist">>; }' but required in type 'ThreadsMerged<[Threads<{ artist: Empty; director: Empty; }>, Threads<{ artist: Empty; director: Empty; }>]>'
      const threadsMerged: ThreadsMerged<[typeof threadsA, typeof threadsB]> = {
        artist: artistEmpty,
        critic: criticEmpty,
      };
      expect(threadsMerged);
    });

    then('they should complain at incorrect inputs', () => {
      const threadsMerged: ThreadsMerged<[typeof threadsA, typeof threadsB]> = {
        artist: artistEmpty,
        critic: criticEmpty,
        // @ts-expect-error: Type 'Thread<ThreadContextRole<"artist">>' is not assignable to type 'Thread<ThreadContextRole<"director">>'.
        director: artistEmpty,
      };
      expect(threadsMerged);
    });

    then('they should complain at unexpected inputs', () => {
      const threadsMerged: ThreadsMerged<[typeof threadsA, typeof threadsB]> = {
        artist: artistEmpty,
        director: directorEmpty,
        critic: criticEmpty,
        // @ts-expect-error: 'judge' does not exist in type ...
        judge: judgeEmpty,
      };
      expect(threadsMerged);
    });
  });

  given('threads with different roles, no overlap', () => {
    const threadsA: Threads<{ artist: Empty }> = {
      artist: artistEmpty,
    };
    const threadsB: Threads<{ director: Empty }> = {
      director: directorEmpty,
    };

    then('they should support correct instantiation', () => {
      const threadsMerged: ThreadsMerged<[typeof threadsA, typeof threadsB]> = {
        artist: artistEmpty,
        director: directorEmpty,
      };
      expect(threadsMerged);
    });

    then('they should complain at missed inputs', () => {
      // @ts-expect-error: Property 'director' is missing in type '{ artist: Thread<ThreadContextRole<"artist">>; }' but required in type 'ThreadsMerged<[Threads<{ artist: Empty; director: Empty; }>, Threads<{ artist: Empty; director: Empty; }>]>'
      const threadsMerged: ThreadsMerged<[typeof threadsA, typeof threadsB]> = {
        artist: artistEmpty,
      };
      expect(threadsMerged);
    });

    then('they should complain at incorrect inputs', () => {
      const threadsMerged: ThreadsMerged<[typeof threadsA, typeof threadsB]> = {
        artist: artistEmpty,
        // @ts-expect-error: Type 'Thread<ThreadContextRole<"artist">>' is not assignable to type 'Thread<ThreadContextRole<"director">>'.
        director: threadsA.artist,
      };
      expect(threadsMerged);
    });

    then('they should complain at unexpected inputs', () => {
      const threadsMerged: ThreadsMerged<[typeof threadsA, typeof threadsB]> = {
        artist: artistEmpty,
        director: directorEmpty,
        // @ts-expect-error: 'critic' does not exist in type ...
        critic: criticEmpty,
      };
      expect(threadsMerged);
    });
  });

  given(
    'threads with the same exact role.names & role.contexts, but the contexts are extended',
    () => {
      const threadsA: Threads<{
        artist: { skills: string[] };
      }> = {
        artist: artistWithSkills,
      };
      const threadsB: Threads<{
        artist: { skills: string[] };
      }> = {
        artist: artistWithSkills,
      };

      then('they should support correct instantiation', () => {
        const threadsMerged: ThreadsMerged<[typeof threadsA, typeof threadsB]> =
          {
            artist: artistWithSkills,
          };
        expect(threadsMerged);
      });

      then('they should complain at missed inputs', () => {
        // @ts-expect-error: Property 'artist' is missing in type ...
        const threadsMerged: ThreadsMerged<[typeof threadsA, typeof threadsB]> =
          {};
        expect(threadsMerged);
      });

      then('they should complain at incorrect inputs', () => {
        const threadsMerged: ThreadsMerged<[typeof threadsA, typeof threadsB]> =
          {
            // @ts-expect-error:  Property 'skills' is missing in type '{ role: "artist"; }' but required in type ...
            artist: artistEmpty,
          };
        expect(threadsMerged);
      });

      then('they should complain at unexpected inputs', () => {
        const threadsMerged: ThreadsMerged<[typeof threadsA, typeof threadsB]> =
          {
            artist: artistWithSkills,
            // @ts-expect-error: 'critic' does not exist in type ...
            critic: criticEmpty,
          };
        expect(threadsMerged);
      });
    },
  );

  given(
    'threads with the one same exact role.names, but different role.contexts',
    () => {
      const threadsA: Threads<{
        artist: Empty;
      }> = {
        artist: artistEmpty,
      };
      const threadsB: Threads<{
        artist: { skills: string[] };
      }> = {
        artist: artistWithSkills,
      };

      then('they should support correct instantiation', () => {
        const threadsMerged: ThreadsMerged<[typeof threadsA, typeof threadsB]> =
          {
            artist: artistWithSkills,
          };
        expect(threadsMerged);
      });

      then('they should complain at missed inputs', () => {
        // @ts-expect-error: Property 'artist' is missing in type ...
        const threadsMerged: ThreadsMerged<[typeof threadsA, typeof threadsB]> =
          {};
        expect(threadsMerged);
      });

      then(
        'they should complain at incorrect inputs',
        { because: 'it should demand the superset context: artistWithSkills' },
        () => {
          const threadsMerged: ThreadsMerged<
            [typeof threadsA, typeof threadsB]
          > = {
            // @ts-expect-error:  Property 'skills' is missing in type '{ role: "artist"; }' but required in type ...
            artist: artistEmpty,
          };
          expect(threadsMerged);
        },
      );

      then('they should complain at unexpected inputs', () => {
        const threadsMerged: ThreadsMerged<[typeof threadsA, typeof threadsB]> =
          {
            artist: artistWithSkills,
            // @ts-expect-error: 'critic' does not exist in type ...
            critic: criticEmpty,
          };
        expect(threadsMerged);
      });
    },
  );

  given(
    'threads with the same exact role.names, but different role.contexts',
    () => {
      const threadsA: Threads<{ artist: Empty; director: { vision: string } }> =
        {
          artist: artistEmpty,
          director: directorWithVision,
        };
      const threadsB: Threads<{
        artist: { skills: string[] };
        director: Empty;
      }> = {
        artist: artistWithSkills,
        director: directorEmpty,
      };

      then('they should support correct instantiation', () => {
        const threadsMerged: ThreadsMerged<[typeof threadsA, typeof threadsB]> =
          {
            artist: artistWithSkills,
            director: directorWithVision,
          };
        expect(threadsMerged);
      });

      then('they should complain at missed inputs', () => {
        // @ts-expect-error: Property 'director' is missing in type '{ artist: Thread<ThreadContextRole<"artist">>; }' but required in type 'ThreadsMerged<[Threads<{ artist: Empty; director: Empty; }>, Threads<{ artist: Empty; director: Empty; }>]>'
        const threadsMerged: ThreadsMerged<[typeof threadsA, typeof threadsB]> =
          {
            artist: artistWithSkills,
          };
        expect(threadsMerged);
      });

      then('they should complain at incorrect input.roles', () => {
        const threadsMerged: ThreadsMerged<[typeof threadsA, typeof threadsB]> =
          {
            artist: artistWithSkills,
            // @ts-expect-error: Type 'Thread<ThreadContextRole<"artist">>' is not assignable to type 'Thread<ThreadContextRole<"director">>'.
            director: artistWithSkills,
          };
        expect(threadsMerged);
      });

      then('they should complain at incorrect input.contexts, 1', () => {
        const threadsMerged: ThreadsMerged<[typeof threadsA, typeof threadsB]> =
          {
            // @ts-expect-error: Property 'skills' is missing in type '{ role: "artist"; }'
            artist: artistEmpty,
            director: directorWithVision,
          };
        expect(threadsMerged);
      });

      then('they should complain at incorrect input.contexts, 2', () => {
        const threadsMerged: ThreadsMerged<[typeof threadsA, typeof threadsB]> =
          {
            artist: artistWithSkills,
            // @ts-expect-error:  Property 'vision' is missing in type '{ role: "artist"; }'
            director: directorEmpty,
          };
        expect(threadsMerged);
      });

      then('they should complain at unexpected inputs', () => {
        const threadsMerged: ThreadsMerged<[typeof threadsA, typeof threadsB]> =
          {
            artist: artistWithSkills,
            director: directorWithVision,
            // @ts-expect-error: 'critic' does not exist in type 'ThreadsMerged<[Threads<{ artist: Empty; director: Empty; }>, Threads<{ artist: Empty; director: Empty; }>]>'
            critic: criticEmpty,
          };
        expect(threadsMerged);
      });
    },
  );

  given('three thread sets with overlap and disjoint roles', () => {
    const threadsA: Threads<{ artist: { skills: string[] } }> = {
      artist: artistWithSkills,
    };
    const threadsB: Threads<{ director: { vision: string } }> = {
      director: directorWithVision,
    };
    const threadsC: Threads<{ artist: { skills: string[] }; judge: Empty }> = {
      artist: artistWithSkills,
      judge: judgeEmpty,
    };

    then('they should support correct merged instantiation', () => {
      const threadsMerged: ThreadsMerged<
        [typeof threadsA, typeof threadsB, typeof threadsC]
      > = {
        artist: artistWithSkills,
        director: directorWithVision,
        judge: judgeEmpty,
      };
      expect(threadsMerged);
    });

    then('they should complain at missed inputs', () => {
      // @ts-expect-error: Property 'director' is missing
      const threadsMerged: ThreadsMerged<
        [typeof threadsA, typeof threadsB, typeof threadsC]
      > = {
        artist: artistWithSkills,
        judge: judgeEmpty,
      };
      expect(threadsMerged);
    });
  });

  given('merger with one empty thread set', () => {
    const threadsA: Threads<Record<never, never>> = {};
    const threadsB: Threads<{ artist: { skills: string[] } }> = {
      artist: artistWithSkills,
    };

    then('it should infer just the non-empty threads', () => {
      const threadsMerged: ThreadsMerged<[typeof threadsA, typeof threadsB]> = {
        artist: artistWithSkills,
      };
      expect(threadsMerged);
    });

    then('it should fail if required threads are missing', () => {
      // @ts-expect-error: Property 'artist' is missing
      const threadsMerged: ThreadsMerged<[typeof threadsA, typeof threadsB]> =
        {};
      expect(threadsMerged);
    });
  });

  given('threads with same role but conflicting context field types', () => {
    const artistWithSkillStrings = new Thread({
      context: { role: 'artist' as const, skills: ['draw'] },
      stitches: [],
    });

    const artistWithSkillNumbers = new Thread({
      context: { role: 'artist' as const, skills: [123] },
      stitches: [],
    });

    const threadsA: Threads<{ artist: { skills: string[] } }> = {
      artist: artistWithSkillStrings,
    };
    const threadsB: Threads<{ artist: { skills: number[] } }> = {
      artist: artistWithSkillNumbers,
    };

    then('they should error due to conflicting types, choice one', () => {
      const threadsMerged: ThreadsMerged<[typeof threadsA, typeof threadsB]> = {
        // @ts-expect-error: skills type conflict
        artist: artistWithSkillStrings,
      };
      expect(threadsMerged);
    });
    then('they should error due to conflicting types, choice two', () => {
      const threadsMerged: ThreadsMerged<[typeof threadsA, typeof threadsB]> = {
        // @ts-expect-error: skills type conflict
        artist: artistWithSkillNumbers,
      };
      expect(threadsMerged);
    });
  });

  given('an array instead of a tuple input of threads', () => {
    then('it should fail fast and block the usage', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      type Merged = ThreadsMerged<
        // @ts-expect-error: Type 'Threads<{ main: Empty; }>[]' does not satisfy the constraint 'readonly [Threads<any>, ...Threads<any>[]]'
        Threads<{
          main: Empty;
        }>[]
      >;

      // // @ts-expect-error:  'anything' does not exist in type 'ThreadsMerged<Threads<{ main: Empty; }>[]>'.
      // const expectError: Merged = { anything: 'goes' };
      // expect(expectError);

      // // and this should succeed
      // const expectSuccess: Merged = { main: genThread({ role: 'main' }) };
      // expect(expectSuccess);
    });
  });

  given('an readonly tuple', () => {
    then('it should resolve the type strictly still', () => {
      type Merged = ThreadsMerged<
        readonly [
          Threads<{
            main: Empty;
          }>,
          Threads<{
            main: Empty;
          }>,
        ]
      >;

      // @ts-expect-error:  'anything' does not exist in type 'ThreadsMerged<Threads<{ main: Empty; }>[]>'.
      const expectError: Merged = { anything: 'goes' };
      expect(expectError);

      // and this should succeed
      const expectSuccess: Merged = { main: genThread({ role: 'main' }) };
      expect(expectSuccess);
    });
  });
});
