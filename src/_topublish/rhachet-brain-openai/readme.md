# rhachet-brain-openai

brain plugin for openai models in the rhachet ecosystem.

## install

```sh
npm install rhachet-brain-openai
```

## usage

### direct factory usage

```ts
import { genBrainAtom, genBrainRepl } from 'rhachet-brain-openai';
import { z } from 'zod';

// create a brain atom for direct model inference
const brainAtom = genBrainAtom({ slug: 'openai/gpt-4o-mini' });

const result = await brainAtom.ask({
  role: { briefs: [] },
  prompt: 'explain this code',
  schema: { output: z.object({ content: z.string() }) },
});

// create a brain repl for agentic tasks
const brainRepl = genBrainRepl({ slug: 'openai/codex' });

const result = await brainRepl.ask({
  role: { briefs: roleArtifacts },
  prompt: 'analyze this codebase',
  schema: { output: z.object({ content: z.string() }) },
});

// use act() for read+write operations
const result = await brainRepl.act({
  role: { briefs: roleArtifacts },
  prompt: 'refactor this module',
  schema: { output: z.object({ content: z.string() }) },
});

// use mini for fast, cheap tasks
const fastRepl = genBrainRepl({ slug: 'openai/codex/mini' });
```

### with rhachet context

```ts
import { genContextBrain } from 'rhachet';
import { getBrainAtomsByOpenAI, getBrainReplsByOpenAI } from 'rhachet-brain-openai';

const context = genContextBrain({
  atoms: [...getBrainAtomsByOpenAI()],
  repls: [...getBrainReplsByOpenAI()],
});

// use gpt-4o for inference
const result = await context.brain.atom.imagine({
  brain: { repo: 'openai', slug: 'openai/gpt-4o' },
  role: { briefs: roleArtifacts },
  prompt: 'analyze this code',
});

// use codex for agentic tasks
const result = await context.brain.repl.imagine({
  brain: { repo: 'openai', slug: 'openai/codex' },
  role: { briefs: roleArtifacts },
  prompt: 'refactor this module',
});
```

## available brains

### atoms (via genBrainAtom)

stateless inference without tool use.

| slug | model | description |
|------|-------|-------------|
| `openai/gpt-4o` | gpt-4o | multimodal model for reasoning and vision |
| `openai/gpt-4o-mini` | gpt-4o-mini | fast and cost-effective multimodal model |
| `openai/gpt-4-turbo` | gpt-4-turbo | high capability with vision support |
| `openai/o1` | o1 | advanced reasoning model for complex problems |
| `openai/o1-mini` | o1-mini | fast reasoning model for coding and math |
| `openai/o1-preview` | o1-preview | preview of advanced reasoning capabilities |

### repls (via genBrainRepl)

agentic coding assistant with tool use via codex-sdk.

| slug | model | description |
|------|-------|-------------|
| `openai/codex` | default | uses SDK default (gpt-5.1-codex-max) |
| `openai/codex/max` | gpt-5.1-codex-max | optimized for long-horizon agentic coding |
| `openai/codex/mini` | gpt-5.1-codex-mini | fast and cost-effective |
| `openai/codex/5.2` | gpt-5.2-codex | most advanced agentic coding model |

## sources

- [Codex Models Documentation](https://developers.openai.com/codex/models/)
- [Codex SDK Documentation](https://developers.openai.com/codex/sdk/)
