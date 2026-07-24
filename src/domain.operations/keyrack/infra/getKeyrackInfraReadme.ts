import { KEYRACK_INFRA_REGISTRY_PATH } from './constants';

/**
 * .what = build the readme content for an org's keyrack-infra repo
 * .why = the repo should explain itself to any member who opens it
 *
 * .note = describes the registry as non-secret metadata; pems never live here
 */
export const getKeyrackInfraReadme = (input: { org: string }): string =>
  `# keyrack-infra

shared keyrack infrastructure for the \`${input.org}\` org.

## .what

this private repo is the per-org source of truth that keyrack reads so that
**members** — not just org admins — can set up github-app credentials without the
org-owner-gated installations api.

## .contents

- \`${KEYRACK_INFRA_REGISTRY_PATH}\` — registry of github apps available to keyrack,
  as \`[{ org, appId, installationId, slug }]\`. these are **non-secret identifiers**.

## .safety

- only non-secret ids live here. app private keys (\`.pem\`) are **never** stored in
  this repo — they stay in each host's keyrack vault.
- access is gated by this repo's membership: members with read access can discover
  apps; the pem is required (and held separately) to actually mint tokens.

## .usage

\`\`\`sh
# one-time per org (anyone with repo-create rights)
rhx keyrack infra init --org ${input.org}
\`\`\`

registration into the app registry happens automatically when an admin sets a
github-app key via keyrack.

---

_managed by keyrack — edits here should go through keyrack commands._
`;
