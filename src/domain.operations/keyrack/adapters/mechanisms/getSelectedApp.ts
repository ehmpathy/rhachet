import { ConstraintError } from 'helpful-errors';

import type { KeyrackInfraRegistryGithubApp } from '../../infra/KeyrackInfraRegistryGithubApp';

/**
 * .what = pick which candidate app to use; prompt the human only when needed
 * .why = auto-selects the sole candidate; otherwise offers a numbered choice
 *
 * .note = a guard early-return keeps the single-app path branch-free (no else)
 * .note = the readline prompt is injected as `question` so this stays testable
 * .note = an out-of-range or non-numeric choice fails loud (caller-fixable) rather
 *         than silently default to the first app — no surprise selection
 */
export const getSelectedApp = async (input: {
  candidates: KeyrackInfraRegistryGithubApp[];
  question: (prompt: string) => Promise<string>;
}): Promise<KeyrackInfraRegistryGithubApp> => {
  const { candidates, question } = input;

  // auto-select when there is only one candidate
  if (candidates.length === 1) {
    const only = candidates[0]!;
    console.log('   │');
    // the auto-select note folds into the id parenthetical so the line reads as one
    // statement — and carries no `·`/space delimiter that a pty capture would strip,
    // so the raw and pty-cleaned snapshots render this line identically
    console.log(`   ├─ app: ${only.slug} (id: ${only.appId}, auto-selected)`);
    return only;
  }

  // otherwise offer a numbered choice to the human, under an `options` node:
  //   ├─ which github app?
  //   │  ├─ options
  //   │  │  ├─ 1. ...
  //   │  └─ choice: <n>
  //   │     └─ <slug> ✓
  // the `options` node holds the numbered peers; `choice:` closes the question's
  // children and its `✓` leaf marks the settled pick
  console.log('   │');
  console.log('   ├─ which github app?');
  console.log('   │  ├─ options');
  candidates.forEach((app, i) => {
    console.log(`   │  │  ├─ ${i + 1}. ${app.slug} (id: ${app.appId})`);
  });
  const choice = await question('   │  └─ choice: ');
  const idx = parseInt(choice, 10) - 1;

  // fail loud on an out-of-range or non-numeric choice — never guess for the human
  const chosen = candidates[idx];
  if (!chosen)
    throw new ConstraintError(`invalid app choice: "${choice}"`, {
      hint: `enter a number between 1 and ${candidates.length}`,
    });

  // ✓ marks the settled choice as a child of the `choice:` prompt
  console.log(`   │     └─ ${chosen.slug} ✓`);
  return chosen;
};
