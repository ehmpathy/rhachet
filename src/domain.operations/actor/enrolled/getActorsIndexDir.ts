import { join } from 'node:path';

/**
 * .what = derive one of the global INDEX dirs that sit beside the actor dirs under
 *   the actors root — `<actorsRoot>/.slugs`, `.serials`, or `.exids`
 * .why =
 *   - the three index folder names (`.slugs` the slug→clone map, `.serials` the
 *     serial→clone map, `.exids` the exid claim/quarantine map) were hand-rebuilt
 *     as raw string literals across the reach + history-link call graph. this
 *     transformer owns those three tokens so every reader routes through ONE format,
 *     never a scattered literal — the SAME single-owner discipline getActorsRootDir /
 *     asCloneDirName / getCloneHistoryDir already applied to their peer tokens
 *   - a rename or relocation of any index folder then touches one owner, not a
 *     coordinated multi-file grep-hunt
 *
 * .note = `actorsRoot` must already be a getActorsRootDir path (the canonical realpath
 *   root), so a symlink/worktree hop never forks an index dir into two paths
 */
export const getActorsIndexDir = (input: {
  actorsRoot: string;
  index: 'slugs' | 'serials' | 'exids';
}): string => join(input.actorsRoot, `.${input.index}`);
