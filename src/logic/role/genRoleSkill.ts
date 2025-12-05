import {
  type GStitcher,
  RoleSkill,
  type RoleSkillContextGetter,
  type RoleSkillThreadsGetter,
  type Stitcher,
} from '../../domain/objects';

/**
 * .what = factory for role skills
 * .why = ensures narrow type coupling between getter inputs
 */
export const genRoleSkill = <
  TStitcher extends GStitcher<any, any, any>,
  TThreadsVars extends Record<string, string>,
  TContextVars extends Record<string, string>,
>(input: {
  slug: string;
  readme: string;
  route: Stitcher<TStitcher>;
  threads: RoleSkillThreadsGetter<TStitcher['threads'], TThreadsVars>;
  context: RoleSkillContextGetter<TStitcher['context'], TContextVars>;
}): RoleSkill<TStitcher> => {
  return RoleSkill.build({
    slug: input.slug,
    readme: input.readme,
    route: input.route as any,
    threads: input.threads,
    context: input.context,
  });
};
