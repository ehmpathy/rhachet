import { given, then, when } from 'test-fns';

import { getNamesOfExports } from './getNamesOfExports';

const TEST_CASES: { description: string; content: string; names: string[] }[] = [
  {
    description: 'exported consts, a function and a class',
    content:
      'export const a = 1, b = 2;\nexport function f() {}\nexport class C {}\nexport async function g() {}\n',
    names: ['a', 'b', 'f', 'C', 'g'],
  },
  {
    description: 'a named export list, with a rename and a type-only member',
    content: 'const x = 1;\nconst y = 2;\ntype T = 1;\nexport { x, y as z, type T };\n',
    names: ['x', 'z'],
  },
  {
    description: 'types, interfaces and unexported values',
    content: 'export type T = 1;\nexport interface I {}\nconst hidden = 1;\n',
    names: [],
  },
  {
    description: 'an export on a line wrapped by a formatter',
    content: 'export const getRealClaudeBinPath2 =\n  (): string | null => null;\n',
    names: ['getRealClaudeBinPath2'],
  },
  {
    description: 'a default export expression',
    content: 'export default 1;\n',
    names: ['<export default>'],
  },
  {
    description: 'a default export function',
    content: 'export default function ask() {}\n',
    names: ['<export default>'],
  },
  {
    description: 'a star re-export',
    content: "export * from './x';\n",
    names: ['<export *>'],
  },
  {
    description: 'a destructured export',
    content: 'export const { a, b } = obj;\n',
    names: ['<destructured export>'],
  },
  {
    description: 'an exported enum and namespace',
    content: 'export enum E { A }\nexport namespace N { export const x = 1; }\n',
    names: ['E', 'N'],
  },
];

describe('getNamesOfExports', () => {
  TEST_CASES.map((thisCase, index) =>
    given(`[case${index + 1}] ${thisCase.description}`, () => {
      when('[t0] the exports are named', () => {
        then('it names each exported value', () => {
          expect(getNamesOfExports({ content: thisCase.content })).toEqual(thisCase.names);
        });
      });
    }),
  );
});
