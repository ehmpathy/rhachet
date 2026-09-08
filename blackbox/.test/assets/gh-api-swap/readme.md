# gh-api-swap — the cert fixture that lets a local fake stand in for the github api

## .what

a self-signed TLS certificate + private key for `localhost` / `127.0.0.1`, committed on purpose.

`genFakeGithubApiServer` serves HTTPS with these, and the acceptance suite points the **real `gh`
binary** at it via `GH_HOST` + `SSL_CERT_FILE`. that makes the arrangement a **swap** (the whole
client stack runs, only the remote service is local) rather than a **mock** — see
`.agent/repo=.this/role=any/briefs/domain.terms/term=swap._.choice._.md`.

## .why committed rather than generated

`gh` is a Go binary and always dials `https://` — it refuses a scheme in `GH_HOST` and ignores
`GITHUB_API_URL` entirely, so a plain-http fake (the shape `genFakeSsmServer` uses for SSM) cannot
work. TLS is mandatory, so a cert must exist.

node has no built-in certificate **generation**, and the repo carries no `selfsigned` / `node-forge`
/ `pem` dependency. the two alternatives were both worse:

| option | why refused |
|---|---|
| add a cert-gen dependency | a new dep, with its own audit, for one test fixture |
| shell out to `openssl` at test time | a runtime host binary — `rule.forbid.bare-host-deps` |

⇒ so it is generated **once**, locally, and committed. `openssl` is used at author time only; no
test invokes it.

## ⚠️ .this private key is not a secret

it is a throwaway keypair whose only purpose is to terminate TLS on `127.0.0.1` inside a test. it
guards no asset, is trusted by no process except a suite that explicitly points `SSL_CERT_FILE` at
it, and grants no access to any real system. a scanner that flags it is correct about the *shape*
and wrong about the *risk*.

## .how it was generated

```sh
openssl req -x509 -newkey rsa:2048 \
  -keyout localhost.selfsigned.key.pem \
  -out    localhost.selfsigned.cert.pem \
  -days 7300 -nodes -subj '/CN=localhost' \
  -addext 'subjectAltName=DNS:localhost,IP:127.0.0.1'
```

20-year validity, so the fixture does not silently expire and turn the suite red for a reason that
has no relation to the code under test.

## .refs

- `blackbox/.test/infra/genFakeGithubApiServer.ts` — the server that reads these
- `blackbox/cli/keyrack.vault.githubSecrets.acceptance.test.ts` — the suite that swaps
- `blackbox/.test/infra/genFakeSsmServer.ts` — the plain-http peer, for contrast
