# define.root-org-inheritance

## .what

extended keyracks inherit the org from the root manifest, not their own declared org.

## .why

the same role may need different keys per organization.

example: `XAI_API_KEY` for the reviewer role
- org1 has their own XAI account → `org1.prep.XAI_API_KEY`
- org2 has their own XAI account → `org2.prep.XAI_API_KEY`

if extended keyracks used their own org:
- role keyrack declares `org: ehmpathy`
- repo keyrack declares `org: ahbode`
- key would be stored as `ehmpathy.prep.XAI_API_KEY`
- but ahbode needs their own key for cost allocation and invoices

with root org inheritance:
- role keyrack declares `org: ehmpathy` (ignored)
- repo keyrack declares `org: ahbode` (wins)
- key is stored as `ahbode.prep.XAI_API_KEY`
- ahbode tracks their own costs, pays their own invoices

## .the rule

| manifest | org used |
|----------|----------|
| root (repo) | root org — always wins |
| extended (role) | root org — own org ignored |
| nested extends | outermost org — always wins |

## .benefits

- **cost isolation** — each org tracks their own api usage
- **invoice separation** — each org pays for their own keys
- **security boundaries** — org1 keys never leak to org2
- **key rotation** — each org rotates independently

## .see also

- `hydrateKeyrackRepoManifest.ts` — implements org inheritance
- `keyrack.extends.acceptance.test.ts` — case9, case10 verify behavior
