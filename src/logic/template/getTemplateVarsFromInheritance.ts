import { Thread } from '../../domain/objects';

/**
 * .what = extracts template vars from a thread's inherited traits and skills
 * .why  = standardizes how role memory is rendered into prompt templates
 */
export const getTemplateVarsFromRoleInherit = <
  TThread extends Thread<{
    inherit: {
      traits: { content: string }[];
      skills: { content: string }[];
    };
  }>,
>({
  thread,
}: {
  thread: TThread;
}): { inherit: { skills: string; traits: string } } => ({
  inherit: {
    traits: thread.context.inherit.traits.map((t) => t.content).join('\n\n'),
    skills: thread.context.inherit.skills.map((s) => s.content).join('\n\n'),
  },
});
