import type { FileCost } from './getRoleFileCosts';

/**
 * .what = represents a node in the cost tree structure
 * .why = enables building hierarchical tree from flat file list
 */
interface TreeNode {
  name: string;
  isFile: boolean;
  fileCost?: FileCost;
  children: Map<string, TreeNode>;
}

/**
 * .what = formats a cost value as a dollar string
 * .why = consistent cost display across the tree
 * .how = uses fixed precision based on cost magnitude
 */
export const formatCost = (cost: number): string => {
  if (cost < 0.001) return '$0.000';
  if (cost < 0.01) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(2)}`;
};

/**
 * .what = formats token count with thousands separators
 * .why = improves readability for large token counts
 */
export const formatTokens = (tokens: number): string => {
  return tokens.toLocaleString('en-US');
};

/**
 * .what = builds a tree structure from flat file costs
 * .why = enables hierarchical rendering of directory structure
 * .how = splits paths and builds nested map of nodes
 */
const buildTree = (fileCosts: FileCost[], rootPath: string): TreeNode => {
  const root: TreeNode = {
    name: rootPath,
    isFile: false,
    children: new Map(),
  };

  for (const fileCost of fileCosts) {
    // extract path relative to root
    const relativePath = fileCost.relativePath.replace(`${rootPath}/`, '');
    const parts = relativePath.split('/');

    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!;
      const isLastPart = i === parts.length - 1;

      if (!current.children.has(part)) {
        current.children.set(part, {
          name: part,
          isFile: isLastPart,
          fileCost: isLastPart ? fileCost : undefined,
          children: new Map(),
        });
      }

      current = current.children.get(part)!;
    }
  }

  return root;
};

/**
 * .what = renders a tree node and its children as formatted lines
 * .why = produces the visual tree structure with box-drawing characters
 * .how = recursively renders children with appropriate prefixes
 */
const renderNode = (
  node: TreeNode,
  prefix: string,
  isLast: boolean,
  isRoot: boolean,
): string[] => {
  const lines: string[] = [];

  // determine connector character
  const connector = isRoot ? '' : isLast ? '└── ' : '├── ';
  const childPrefix = isRoot ? '' : prefix + (isLast ? '    ' : '│   ');

  // format the line for this node
  if (node.isFile && node.fileCost) {
    const tokens = formatTokens(node.fileCost.tokens);
    const cost = formatCost(node.fileCost.cost);
    const docsOnly = node.fileCost.isDocsOnly ? ' [docs only]' : '';

    // right-align cost info
    const costInfo = `${tokens} tokens (${cost})${docsOnly}`;
    lines.push(`${prefix}${connector}${node.name}  ${costInfo}`);
  } else if (!isRoot) {
    lines.push(`${prefix}${connector}${node.name}`);
  } else {
    lines.push(node.name);
  }

  // render children
  const children = Array.from(node.children.values()).sort((a, b) => {
    // directories first, then alphabetical
    if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
    return a.name.localeCompare(b.name);
  });

  children.forEach((child, index) => {
    const isLastChild = index === children.length - 1;
    lines.push(...renderNode(child, childPrefix, isLastChild, false));
  });

  return lines;
};

/**
 * .what = formats file costs as a tree structure with token/cost annotations
 * .why = provides visual cost breakdown for role resources
 * .how = builds tree from file paths and renders with box-drawing characters
 */
export const formatCostTree = (input: {
  fileCosts: FileCost[];
  rootPath: string;
}): string => {
  const { fileCosts, rootPath } = input;

  // handle empty case
  if (fileCosts.length === 0) {
    return `${rootPath}\n  (empty)`;
  }

  // build and render tree
  const tree = buildTree(fileCosts, rootPath);
  const lines = renderNode(tree, '', true, true);

  return lines.join('\n');
};
