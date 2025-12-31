# rhachet-brain-openai

brain plugin for openai models in the rhachet ecosystem.

## install

```sh
npm install rhachet-brain-openai
```

## usage

```ts
import { genContextBrain } from 'rhachet';
import { getBrainAtomsByOpenAI, getBrainReplsByOpenAI } from 'rhachet-brain-openai';

const context = genContextBrain({
  atoms: [...getBrainAtomsByOpenAI()],
  repls: [...getBrainReplsByOpenAI()],
});

// use gpt-4o for inference
const result = await context.brain.atom.imagine({
  brain: { repo: 'openai', slug: 'gpt-4o' },
  role: { briefs: roleArtifacts },
  prompt: 'analyze this code',
});

// use codex for agentic tasks
const result = await context.brain.repl.imagine({
  brain: { repo: 'openai', slug: 'codex' },
  role: { briefs: roleArtifacts },
  prompt: 'refactor this module',
});
```

## available brains

### atoms

- `openai/gpt-4o` - gpt-4o for multimodal reasoning

### repls

- `openai/codex` - codex for agentic coding tasks
