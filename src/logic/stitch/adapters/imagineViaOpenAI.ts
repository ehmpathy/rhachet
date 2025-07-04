import { UnexpectedCodePathError } from 'helpful-errors';
import OpenAI from 'openai';
import { ChatModel } from 'openai/resources/shared';

import { GStitcher } from '../../../domain/objects/Stitcher';

export interface ContextOpenAI {
  openai: {
    auth: { key: string };
    llm: {
      model: ChatModel;
      output: 'words' | 'json';
    };
  };
}

export const imagineViaOpenAI = async (
  input: string,
  context: ContextOpenAI,
): Promise<string> => {
  const openai = new OpenAI({
    apiKey: context.openai.auth.key,
  });
  const response = await openai.chat.completions.create({
    response_format:
      context.openai.llm.output === 'json'
        ? { type: 'json_object' }
        : undefined,
    messages: [
      {
        role: 'user',
        content: input,
      },
    ],
    model: context.openai.llm.model,
  });
  if (!response.choices[0])
    throw new UnexpectedCodePathError(
      'at least one response choice should be provided',
      { response },
    );
  if (response.choices.length > 1)
    throw new UnexpectedCodePathError(
      'more than one response.choice provided',
      { response },
    );
  if (!response.choices[0].message.content)
    throw new UnexpectedCodePathError('no content provided in response', {
      response,
    });
  return response.choices[0].message.content;
};
