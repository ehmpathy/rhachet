/**
 * .what = the 🟡 receipt block of an output, from its header to its last indented row
 * .why = the output carries other receipts; a snapshot locks this one alone
 */
export const asRoleContentDefectReceiptBlock = (input: {
  output: string;
}): string => {
  const lines = input.output.split('\n');
  const start = lines.findIndex((line) => line.startsWith('🟡 boot set aside'));
  if (start < 0) return '';
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => !line.startsWith('   '));
  return [lines[start], ...(end < 0 ? rest : rest.slice(0, end))].join('\n');
};
