import * as ts from 'typescript';

export const CAUSE_SUITE_GATE_ABSENT =
  'no top-level describeBrainLiveOnDemand; wrap the suite in it, or name an exception with its reason in liveBrainRegistry.ts (rule.forbid.live-brain-spend-beyond-the-smoke-tier)';
export const CAUSE_SUITE_GATE_TWICE =
  'more than one top-level describeBrainLiveOnDemand; merge them into one gate per file (rule.forbid.live-brain-spend-beyond-the-smoke-tier)';
export const CAUSE_SUITE_GATE_MIXED =
  'an ungated top-level statement beside the gate; move the live cases to a *.live.integration.test.ts (rule.forbid.live-brain-spend-beyond-the-smoke-tier)';

/**
 * .what = why a live test file is not wholly gated, or null when it is
 * .why = a live file must sit wholly behind one gate: a live call added beside it, in any
 *   other top-level statement, would bill every push
 * .note = read from the syntax tree, so the rule holds under any format: a file is wholly
 *   gated when its top-level statements are imports, declarations, `jest.*` calls, and exactly
 *   one call of `describeBrainLiveOnDemand`. a comment, a string or a template is never a
 *   statement, so none can satisfy or break it
 */
export const getCauseOfSuiteUngated = (input: { content: string }): string | null => {
  const source = ts.createSourceFile('suite.ts', input.content, ts.ScriptTarget.Latest, true);

  // the callee of a top-level call statement, by name, or null
  const getCalleeOf = (statement: ts.Statement): ts.Expression | null =>
    ts.isExpressionStatement(statement) && ts.isCallExpression(statement.expression)
      ? statement.expression.expression
      : null;
  const isGateCall = (statement: ts.Statement): boolean => {
    const callee = getCalleeOf(statement);
    return !!callee && ts.isIdentifier(callee) && callee.text === 'describeBrainLiveOnDemand';
  };
  const isJestCall = (statement: ts.Statement): boolean => {
    const callee = getCalleeOf(statement);
    return (
      !!callee &&
      ts.isPropertyAccessExpression(callee) &&
      ts.isIdentifier(callee.expression) &&
      callee.expression.text === 'jest'
    );
  };
  const isDeclaration = (statement: ts.Statement): boolean =>
    ts.isImportDeclaration(statement) ||
    ts.isImportEqualsDeclaration(statement) ||
    ts.isExportDeclaration(statement) ||
    ts.isVariableStatement(statement) ||
    ts.isFunctionDeclaration(statement) ||
    ts.isClassDeclaration(statement) ||
    ts.isInterfaceDeclaration(statement) ||
    ts.isTypeAliasDeclaration(statement) ||
    ts.isEnumDeclaration(statement) ||
    ts.isModuleDeclaration(statement) ||
    ts.isEmptyStatement(statement);

  // count the gates, and find any statement that is neither a gate, a jest call nor a declaration
  const gates = source.statements.filter(isGateCall);
  const isOtherPresent = source.statements.some(
    (statement) => !isGateCall(statement) && !isJestCall(statement) && !isDeclaration(statement),
  );

  // name the first gap found
  if (gates.length === 0) return CAUSE_SUITE_GATE_ABSENT;
  if (gates.length > 1) return CAUSE_SUITE_GATE_TWICE;
  if (isOtherPresent) return CAUSE_SUITE_GATE_MIXED;
  return null;
};
