/**
 * .what = does this VALUE look like a credential, regardless of the key it sits under
 * .why = keyrack's blocked renderer masks by KEY NAME (`secret`, `token`, `passphrase`, …), and a
 *        key-name mask is only as good as the name discipline of every throw site that will ever
 *        exist. the day one stores a vault-returned secret under `value`, `body`, `data`, or
 *        `context`, a key-name mask prints it to a terminal and a ci log. this is a CREDENTIAL
 *        tool, so that is the one failure it may not have
 *
 * ⚠️ .why.not-an-allowlist = the obvious alternative — render only an allowlist of known-safe keys
 *        — was rejected: it is `rule.forbid.failhide` in renderer form. the throw site looks
 *        correct, the field is real, and only the render eats it, so a human reads
 *        "invalid --mech: must be one of …" and never learns which value was at fault
 *        (`rule.require.refusals-carry-context`). every field still renders here; a field whose
 *        VALUE walks like a credential renders as `__REDACTED__` rather than not at all
 *
 * .note = the asymmetry decides how tight each rule is drawn. an over-report costs one leaf that
 *         reads `__REDACTED__` instead of its value; an under-report costs a leaked credential in
 *         a ci log. so each rule below is written to catch the credential shapes that exist, and
 *         the opaque-token rule is deliberately narrow enough that a slug, a path, a git sha, or a
 *         sentence does not trip it
 */
export const isKeyrackSecretShaped = (input: { value: string }): boolean => {
  const value = input.value.trim();
  if (!value) return false;

  // a pem block — a private key pasted into an error's metadata
  if (value.includes('-----BEGIN')) return true;

  // known vendor credential prefixes. these are unambiguous: no non-credential value carries them
  // .note = `@all.camp.GITHUB_TOKEN` is a SLUG, not a token — it carries no prefix below, and the
  //         opaque-token rule cannot reach it either (it holds `.` separators)
  const prefixes = [
    'ghp_', // github personal access token
    'gho_', // github oauth
    'ghu_', // github user-to-server
    'ghs_', // github server-to-server (app install token — the `@all` bootstrap credential)
    'ghr_', // github refresh
    'github_pat_', // github fine-grained pat
    'glpat-', // gitlab pat
    'sk-', // openai / anthropic style
    'sk_live_', // stripe live secret
    'sk_test_', // stripe test secret
    'rk_live_', // stripe restricted
    'xoxb-', // slack bot
    'xoxp-', // slack user
    'xoxa-', // slack app
    'xoxs-', // slack session
    'AKIA', // aws access key id (long-term)
    'ASIA', // aws access key id (session)
    'AIza', // google api key
    'ya29.', // google oauth access token
    'npm_', // npm automation token
    'dop_v1_', // digitalocean
    'shpat_', // shopify
  ];
  if (prefixes.some((prefix) => value.startsWith(prefix))) return true;

  // a jwt — three base64url segments joined by dots, whose first segment spells `{"` as `eyJ`
  if (/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/.test(value))
    return true;

  // an opaque high-entropy token: one unbroken run of base64/hex alphabet, at least 32 chars, with
  // BOTH a lowercase and an uppercase letter AND a digit.
  // ⚠️ .why.narrow = the three demands together are what keep this off real context. a git sha is
  //    lowercase+digits (no uppercase) ⇒ renders. a slug, a path, a url, and a sentence all hold
  //    `.`/`/`/` ` ⇒ render. an env var name is uppercase+`_` with no lowercase ⇒ renders. what is
  //    left is the shape a minted credential actually takes
  if (
    value.length >= 32 &&
    /^[A-Za-z0-9+/=_-]+$/.test(value) &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /[0-9]/.test(value)
  )
    return true;

  return false;
};
