import * as ts from 'typescript';

/**
 * .what = every value a module exports by name: an exported const, let, function or class,
 *   and each name in an `export { … }` list
 * .why = a registered module's exports must each be classified live or stub, so a new export
 *   cannot reach a brain unseen; read from the syntax tree, never from a line regex
 * .note = type-only exports (`interface`, `type`) are not values, so they are not names here
 * .note = a value export with no plain name (a default, a star re-export, a destructured list)
 *   comes back as a `<…>` sentinel, so the classifier asks for it, never skips it
 */
export const getNamesOfExports = (input: { content: string }): string[] => {
  const source = ts.createSourceFile('module.ts', input.content, ts.ScriptTarget.Latest, true);

  // an `export` modifier on a declaration
  const isExported = (node: ts.Node): boolean =>
    (ts.canHaveModifiers(node) ? ts.getModifiers(node) ?? [] : []).some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
    );

  // a `default` modifier on a declaration
  const isDefault = (node: ts.Node): boolean =>
    (ts.canHaveModifiers(node) ? ts.getModifiers(node) ?? [] : []).some(
      (modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword,
    );

  return source.statements.flatMap((statement): string[] => {
    // export const a = …, b = …; a destructured name list has no plain name
    if (ts.isVariableStatement(statement) && isExported(statement))
      return statement.declarationList.declarations.map((declaration) =>
        ts.isIdentifier(declaration.name) ? declaration.name.text : '<destructured export>',
      );

    // export default …
    if (ts.isExportAssignment(statement)) return ['<export default>'];
    if (
      (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) &&
      isExported(statement) &&
      isDefault(statement)
    )
      return ['<export default>'];

    // export function f / export class C / export enum E / export namespace N
    if (
      (ts.isFunctionDeclaration(statement) ||
        ts.isClassDeclaration(statement) ||
        ts.isEnumDeclaration(statement)) &&
      isExported(statement) &&
      statement.name
    )
      return [statement.name.text];
    if (ts.isModuleDeclaration(statement) && isExported(statement) && ts.isIdentifier(statement.name))
      return [statement.name.text];

    // export * from './x'
    if (ts.isExportDeclaration(statement) && !statement.isTypeOnly && !statement.exportClause)
      return ['<export *>'];

    // export { a, b as c }
    if (
      ts.isExportDeclaration(statement) &&
      !statement.isTypeOnly &&
      statement.exportClause &&
      ts.isNamedExports(statement.exportClause)
    )
      return statement.exportClause.elements
        .filter((element) => !element.isTypeOnly)
        .map((element) => element.name.text);

    return [];
  });
};
