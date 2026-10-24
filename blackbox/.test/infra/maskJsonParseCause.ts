/**
 * .what = masks the text of a serialized `SyntaxError` cause to a stable token
 * .why = the text is v8's json parser's own, and it moves across node majors
 *   (`Unexpected token m in JSON at position 2` on older nodes, `Expected property name or '}'
 *   in JSON at position 2 (line 1 column 3)` on current). the class stays live, so the
 *   snapshot still proves the refusal names a parse fault, on any node
 */
export const maskJsonParseCause = (input: string): string =>
  input.replace(
    /("class": "SyntaxError",\s*"message": )"[^"\n]*"/g,
    '$1"$JSON_PARSE_MESSAGE"',
  );
