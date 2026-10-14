import type { BootStats } from './BootStats';

/**
 * .what = the one brief rhachet itself says at the top of every boot
 * .why = every other brief comes from a role. this one says how to reach the roles'
 *        skills, and asks a clone to turn a repeated tactic into a skill, so the next
 *        clone runs it rather than rediscovers it
 *
 * .note = tiny on purpose — it is paid on every session, by every clone
 * .note = static, so a boot render stays byte-stable across runs and repos
 */
const RHACHET_BOOT_INTRO = `# rhachet

you are enrolled via rhachet. your roles' briefs and skills follow.

- \`rhx list\` — every skill your roles grant. check it before you improvise
- \`rhx <skill> --help\` — how to call one
- \`rhx init · roles · list · run · enroll · actor · clone · keyrack · ask · act · upgrade\` — the commands; \`rhx <command> --help\` for each

entool: a tactic worth repeat becomes a skill — \`.agent/repo=.this/role=any/skills/<name>.sh\` — so the next clone runs it, never rediscovers it.
`;

/**
 * .what = the rhachet intro as a boot body with its census, in the shape of a role's
 * .why = the corpus joins role bodies; the intro joins the same way, first
 * .note = `chars` counts the said content alone, never the `<brief.say>` wrapper — the
 *   census contract every role body follows (`BootStats`), so the totals sum like to like
 */
export const getOneRhachetBootIntro = (): {
  body: string;
  stats: BootStats;
} => {
  const lines = [
    '<brief.say path="rhachet/intro">',
    RHACHET_BOOT_INTRO,
    '</brief.say>',
    '',
  ];
  return {
    body: lines.map((line) => `${line}\n`).join(''),
    stats: {
      roles: 0,
      files: 0,
      briefsSay: 1,
      briefsRef: 0,
      skillsSay: 0,
      skillsRef: 0,
      chars: RHACHET_BOOT_INTRO.length,
    },
  };
};
