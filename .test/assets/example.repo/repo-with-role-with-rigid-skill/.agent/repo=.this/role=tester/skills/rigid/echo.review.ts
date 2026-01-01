import * as fs from 'fs/promises';

/**
 * .what = echoes input to output with optional brain review
 * .why = rigid skill for testing CLI invokeAct with --attempts and --output
 *
 * usage:
 *   echo.review.ts --input input.json --output output.json
 *
 * input format:
 *   { "content": "text to echo" }
 *
 * output format:
 *   { "echoed": "text to echo", "reviewed": true }
 */
export const schema = {
  input: {
    content: { type: 'string', description: 'the content to echo' },
  },
  output: {
    echoed: { type: 'string', description: 'the echoed content' },
    reviewed: { type: 'boolean', description: 'whether brain reviewed' },
  },
};

/**
 * .what = execute the echo.review skill
 * .why = invoked by actorAct with brain context
 */
export const execute = async (input: {
  content: string;
  brain?: { ask: (prompt: string) => Promise<string> };
}): Promise<{ echoed: string; reviewed: boolean }> => {
  // echo the content, optionally with brain review
  const reviewed = input.brain !== undefined;

  return {
    echoed: input.content,
    reviewed,
  };
};

/**
 * .what = CLI entrypoint for the skill
 * .why = enables direct invocation via `npx rhachet act --skill echo.review`
 */
const main = async (): Promise<void> => {
  // parse args
  const args = process.argv.slice(2);
  let inputPath = '';
  let outputPath = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && args[i + 1]) {
      inputPath = args[i + 1];
      i++;
    } else if (args[i] === '--output' && args[i + 1]) {
      outputPath = args[i + 1];
      i++;
    }
  }

  // read input
  const inputContent = await fs.readFile(inputPath, 'utf-8');
  const input = JSON.parse(inputContent);

  // execute skill (no brain in CLI context for this test)
  const result = await execute({ content: input.content });

  // write output
  if (outputPath) {
    await fs.writeFile(outputPath, JSON.stringify(result, null, 2));
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
};

// run if called directly
main().catch(console.error);
