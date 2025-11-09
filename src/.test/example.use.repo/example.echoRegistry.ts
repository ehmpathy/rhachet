import { Artifact } from 'rhachet-artifact';
import { genArtifactGitFile, GitFile } from 'rhachet-artifact-git';
import { Empty } from 'type-fns';

import {
  StitchStepCompute,
  GStitcher,
  Threads,
  RoleSkill,
  GStitcherOf,
  Role,
  RoleRegistry,
} from '../../domain/objects';
import { genThread } from '../../logic/thread/genThread';

const stepEchoAsk = new StitchStepCompute<
  GStitcher<Threads<{ caller: { ask: string } }>>
>({
  slug: 'echo.step',
  form: 'COMPUTE',
  stitchee: 'caller',
  readme: 'simple echo logic',
  invoke: async ({ threads }, context) => {
    context.log.info('echo:', { ask: threads.caller.context.ask });
    return {
      input: null,
      output: `echo: ${threads.caller.context.ask}`,
    };
  },
});

const echoSkill = RoleSkill.build<RoleSkill<GStitcherOf<typeof stepEchoAsk>>>({
  slug: 'echo',
  readme: 'Echoes back the ask string.',
  route: stepEchoAsk,
  threads: {
    lookup: {},
    assess: (input): input is Empty => true,
    instantiate: (input) => ({
      caller: genThread({ role: 'caller', ask: input.ask }),
    }),
  },
  context: {
    lookup: {},
    assess: (input: any): input is Empty => true,
    instantiate: () => ({
      log: console,
      stitch: {
        trail: [],
      },
    }),
  },
});

const stepWriteAsk = new StitchStepCompute<
  GStitcher<
    Threads<{
      caller: { ask: string; art: { output: Artifact<typeof GitFile> } };
    }>
  >
>({
  slug: 'step.write',
  form: 'COMPUTE',
  stitchee: 'caller',
  readme: 'simple echo logic',
  invoke: async ({ threads }, context) => {
    context.log.info('echo:', { ask: threads.caller.context.ask });
    await threads.caller.context.art.output.set({
      content: threads.caller.context.ask,
    });
    return {
      input: null,
      output: `echo: ${threads.caller.context.ask}`,
    };
  },
});

const writeSkill = RoleSkill.build<RoleSkill<GStitcherOf<typeof stepWriteAsk>>>(
  {
    slug: 'write',
    readme: 'Writes down the ask string.',
    route: stepWriteAsk,
    threads: {
      lookup: {
        output: {
          source: 'process.argv',
          char: 'o',
          desc: 'the output file to write against',
          type: 'string',
        },
      },
      assess: (input): input is { ask: string; output: string } =>
        input.output && input.ask,
      instantiate: (input: { ask: string; output: string }) => ({
        caller: genThread({
          role: 'caller',
          ask: input.ask,
          art: { output: genArtifactGitFile({ uri: input.output }) },
        }),
      }),
    },
    context: {
      lookup: {},
      assess: (input: any): input is Empty => true,
      instantiate: () => ({
        log: console,
        stitch: {
          trail: [],
        },
      }),
    },
  },
);

const echoRole = Role.build({
  slug: 'echoer',
  name: 'Echoer',
  purpose: 'repeat things',
  readme: 'knows how to echo input back to the user.',
  traits: [],
  skills: {
    dirs: [],
    refs: [echoSkill, writeSkill],
  },
  briefs: { dirs: [] },
});

export const EXAMPLE_REGISTRY = new RoleRegistry({
  slug: 'echo',
  readme: 'basic registry for testing CLI execution',
  roles: [echoRole],
});
