import { UnexpectedCodePathError } from 'helpful-errors';
import OpenAI from 'openai';

export interface ContextOpenAI {
  openai: {
    auth: { key: string };
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
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'user',
        content: input,
      },
    ],
    model: 'gpt-4o-2024-05-13',
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
