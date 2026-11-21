/**
 * .what = the argv with the value of each named flag masked as `__REDACTED__`, save the values
 *         the caller marks safe to keep
 * .why = a refusal echoes the invocation so a human can reproduce it, but a flag that carries a
 *        credential (`keyrack set --source`) may hold one typed by mistake. the echo must never
 *        print it — to a terminal, a log, or a ci transcript
 *
 * .note = both shapes are masked: `--flag <value>` and `--flag=<value>`. the `=` shape is read
 *         first, so a token that is itself `--flag=…` keeps its prefix
 * .note = a kept value (e.g. the `@stdin` sentinel) is not a credential, and a reproduction needs it
 * .note = the marker is `__REDACTED__`, the one the keyrack blocked report uses for a masked value
 */
export const asArgsFlagValuesMasked = (input: {
  args: string[];
  flags: string[];
  valuesKept: string[];
}): string[] =>
  input.args.map((token, index) => {
    // the `--flag=<value>` shape
    const flagJoined = input.flags.find((flag) => token.startsWith(`${flag}=`));
    if (flagJoined !== undefined) {
      const value = token.slice(flagJoined.length + 1);
      if (input.valuesKept.includes(value)) return token;
      return `${flagJoined}=__REDACTED__`;
    }

    // the value token right after a bare `--flag`
    const tokenPrior = input.args[index - 1];
    if (tokenPrior !== undefined && input.flags.includes(tokenPrior)) {
      if (input.valuesKept.includes(token)) return token;
      return '__REDACTED__';
    }

    return token;
  });
