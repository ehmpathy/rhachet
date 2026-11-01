import * as ts from 'typescript';

/** the calls whose callback jest runs at collection, to register the tests inside it */
const CALLS_RUN_AT_COLLECTION = new Set(['describe', 'given', 'when', 'describeBrainLiveOnDemand']);

/** the calls that register a test or a hook: a title (data) and a callback jest runs later */
const CALLS_THAT_REGISTER = new Set([
  'then',
  'test',
  'it',
  'xit',
  'fit',
  'beforeAll',
  'beforeEach',
  'afterAll',
  'afterEach',
  'useBeforeAll',
  'useBeforeEach',
  'useThen',
  'useWhen',
]);

/**
 * .what = the text of each call that jest runs at collection: at the top level, and in each
 *   describe-like callback, the gate's own body included
 * .why = jest runs a skipped describe's body to register its tests, so a call there runs on every
 *   push, gate or no gate; its markers must be read apart from the deferred bodies
 * .note = only a call can reach a brain, so only calls are read: a title, a path string, a
 *   declared name or a comment is data. a call that registers a test or a hook (`then`, `test`,
 *   `useBeforeAll`, …) is left out whole, since its title is data and its callback runs later; a
 *   function declared or assigned runs only when called. a callback handed to any other call may
 *   run at once (a `describe` body, a `.map`, a local `when` wrapper), so it is walked by these
 *   same rules, and the call's own text is kept with its callbacks cut out
 */
export const getContentOfSuiteRunAtCollection = (input: { content: string }): string => {
  const source = ts.createSourceFile('suite.ts', input.content, ts.ScriptTarget.Latest, true);

  // the root name of a callee: `given.runIf(x)` → `given`, `execSync(…).toString` → `execSync`
  const getNameOfCalleeRoot = (expression: ts.Expression): string | null => {
    if (ts.isIdentifier(expression)) return expression.text;
    if (ts.isPropertyAccessExpression(expression)) return getNameOfCalleeRoot(expression.expression);
    if (ts.isCallExpression(expression)) return getNameOfCalleeRoot(expression.expression);
    return null;
  };

  // the nearest call that takes this node as an argument, through any object, array or parens
  const getCallOfArgument = (node: ts.Node): ts.CallExpression | ts.NewExpression | null => {
    const parent = node.parent;
    if (!parent) return null;
    if ((ts.isCallExpression(parent) || ts.isNewExpression(parent)) && parent.expression !== node)
      return parent;
    const isWrapper =
      ts.isObjectLiteralExpression(parent) ||
      ts.isPropertyAssignment(parent) ||
      ts.isArrayLiteralExpression(parent) ||
      ts.isParenthesizedExpression(parent);
    return isWrapper ? getCallOfArgument(parent) : null;
  };

  // a function whose body jest may run at collection: a callback handed to a call that runs
  //   (a describe-like call, or any other call, since it may call back at once); a call that
  //   registers is never walked, so its callbacks never reach here
  const isRunAtCollection = (fn: ts.Node): boolean => getCallOfArgument(fn) !== null;

  // a function-like node
  const isFunction = (node: ts.Node): boolean =>
    ts.isArrowFunction(node) ||
    ts.isFunctionExpression(node) ||
    ts.isFunctionDeclaration(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node) ||
    ts.isConstructorDeclaration(node);

  // the outermost functions within a call, each one a callback the call takes
  const getAllCallbacksOfCall = (call: ts.Node): ts.Node[] => {
    const found: ts.Node[] = [];
    const seek = (node: ts.Node): void => {
      if (isFunction(node)) found.push(node);
      if (!isFunction(node)) ts.forEachChild(node, seek);
    };
    ts.forEachChild(call, seek);
    return found;
  };

  // walk the tree, and keep the text of each call jest runs at collection
  const callsRun: string[] = [];
  const visit = (node: ts.Node): void => {
    // a deferred function body runs only when called
    if (isFunction(node) && !isRunAtCollection(node)) return;

    // a call: register (skip), describe-like (descend into its callback), or run (keep)
    if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
      const nameOfRoot = getNameOfCalleeRoot(node.expression) ?? '';
      if (CALLS_THAT_REGISTER.has(nameOfRoot)) return;
      if (CALLS_RUN_AT_COLLECTION.has(nameOfRoot)) {
        (node.arguments ?? []).forEach(visit);
        return;
      }
      // keep the call's own text, its callbacks cut out, then walk each callback by these rules
      const callbacks = getAllCallbacksOfCall(node);
      const start = node.getStart(source);
      const textCut = callbacks
        .map((fn) => ({ from: fn.getStart(source) - start, to: fn.getEnd() - start }))
        .sort((a, b) => b.from - a.from)
        .reduce((text, span) => `${text.slice(0, span.from)}() => {}${text.slice(span.to)}`, node.getText(source));
      callsRun.push(textCut);
      callbacks.forEach((fn) => ts.forEachChild(fn, visit));
      return;
    }

    ts.forEachChild(node, visit);
  };
  ts.forEachChild(source, visit);
  return callsRun.join('\n');
};
