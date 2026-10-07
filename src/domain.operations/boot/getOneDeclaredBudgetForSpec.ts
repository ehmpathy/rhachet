import type { BootBudget } from '@src/domain.objects/RoleBootSpec';

import { parseRoleBootYaml } from './parseRoleBootYaml';
import { readOneBootSpecFile } from './readOneBootSpecFile';

/**
 * .what = the budget one spec declares, read straight off disk — or null where it declares none
 * .why = it is the cheapest question a budget gate can ask, and the one that decides whether a
 *        spec costs a resource walk at all. requirement 4's discipline lives here: a spec that
 *        declares no budget pays one small yaml parse and no tokenizer load.
 *
 * .note = it answers a gate's question — *"may I skip the render?"* — for
 *   `assertRegistryWithinBudget`. the `roles cost --all` sweep reads `payload.budget` off the
 *   render it builds anyway. both reach `parseRoleBootYaml`, which owns where a budget comes from.
 *
 * .note = the read is classified, and that classifier is `readOneBootSpecFile`'s rather than
 *   this operation's. every caller reaches this after an existence check of some shape — a
 *   glob match, an `existsSync` — so the read is a check-then-read pair, and a spec that
 *   vanishes in that window is a caller race rather than a malfunction.
 *
 * ⚠️ .note = a MALFORMED spec raises from `parseRoleBootYaml` and is NOT caught here. a
 *   `boot.yml` this repo cannot parse is a defect its author must see, and one that already
 *   breaks `roles boot` for that role. a caller that must survive a parse fault — the
 *   `roles cost --all` sweep, which reports on foreign specs it cannot repair — wraps this
 *   rather than softens it, so the tolerance is declared at the one caller that earns it
 *   (`rule.forbid.failhide`).
 */
export const getOneDeclaredBudgetForSpec = (input: {
  pathToSpec: string;
}): BootBudget | null =>
  parseRoleBootYaml({
    content: readOneBootSpecFile({ pathToSpec: input.pathToSpec }),
    path: input.pathToSpec,
  })?.budget ?? null;
