import { HelpfulError } from 'helpful-errors';

import { asKeyrackKeyOrg } from './asKeyrackKeyOrg';
import { isKeyrackSecretShaped } from './isKeyrackSecretShaped';

/**
 * .what = build the human-readable blocked tree report for a keyrack command failure
 * .why = keyrack roots its output on its own domain glyph, the lock 🔐 — a credential-domain
 *        signature, never a role mascot. the blocked path roots on 🔐 too (no seaturtle vibe
 *        header), so a failure reads as keyrack's own voice, uniform with the 🔐 success root,
 *        instead of a raw exception dump (e.g. a `ConstraintError: …` that leaks the class name)
 *
 * .note = command is the `🔐` root label (e.g. 'keyrack infra init', 'keyrack set')
 * .note = reads the caller-relevant metadata a HelpfulError carries (slug, stderr, hint)
 *         and renders each present field as a tree leaf under the blocked node
 */
export const getKeyrackBlockedReport = (input: {
  error: Error;
  command: string;

  /**
   * .what = the argv a human typed, or null to echo none
   * .why = a human reads a refusal minutes after they typed it, often from a scrollback or a CI
   *        log where the command scrolled away — and an agent reads it with no scrollback at
   *        all. the raw dump this tree replaced carried an `[args]` trailer; a prettier render
   *        that dropped it told the human LESS (`rule.require.refusals-carry-context`)
   * .why.injected = passed IN rather than read from `process.argv` here, so this stays pure and
   *        a test names an invocation instead of a global it must mutate and restore
   */
  invocation?: string[] | null;
}): string => {
  // a HelpfulError bakes a severity emoji + its class name + metadata json into .message
  // (e.g. "✋ ConstraintError: …"); redact the metadata + cause so the blob does not land in
  // the node, then split the emoji from the class name so each is re-emitted deliberately
  const redactedMessage =
    input.error instanceof HelpfulError
      ? input.error.redact(['metadata', 'cause']).message
      : input.error.message;

  // ⚠️ the CLASS NAME IS KEPT — never stripped, never substituted
  //    (`rule.require.unabridged-error-prefix`). `ConstraintError` vs `MalfunctionError` is the
  //    one token that names WHO must fix the fault, and it is what decides the exit code
  //    (2 vs 1). a glyph alone names the SEVERITY and not the OWNER, so a human reads a refusal
  //    and cannot tell whether they mistyped an input or the tool broke — and cannot grep the
  //    class out of a scrollback or a ci log, because the token is simply absent
  //
  // ⚠️ BOTH the class and its glyph are read off the ERROR'S OWN CONSTRUCTOR — never off the
  //    message text, and never off a second table declared here. `helpful-errors` builds the
  //    `${emoji} ${name}: ` prefix it bakes into `.message` from these same two statics
  //    (`ConstraintError.emoji = '✋'`, `MalfunctionError.emoji = '💥'`), so one read keeps the
  //    glyph paired to its class BY CONSTRUCTION. a hardcoded `✋` here would pair the
  //    caller-fixable glyph with a server-fixable class the moment a `MalfunctionError` arrived
  //    — which `getKeyrackInfraInitErrorReport` hands it (`rule.require.keyrack-emoji-palette`)
  // ⚠️ .note = `.name` is NOT a usable source: `HelpfulError` never assigns it, so it reads
  //    `'Error'` for every subclass. the constructor is the only faithful read
  const ctor = input.error.constructor as { name: string; emoji?: string };
  const errorClass = ctor.name;

  // ⚠️ an UNCLASSIFIED error defaults to 💥, never ✋. a class that declares no emoji is not a
  //    `helpful-errors` subclass, so it never asserted that its caller can fix it — and `✋` is
  //    exactly that assertion (`rule.require.keyrack-emoji-palette`). a bare `throw new Error(...)`
  //    under `✋` tells a human they mistyped an input, about a fault they cannot act on, and it
  //    disagrees with the exit code the same fault produces (1 = malfunction, not 2). unclassified
  //    means unproven-caller-fixable, so it renders as the malfunction it is
  const glyph = ctor.emoji ?? '💥';

  // ⚠️ a bare `Error` KEEPS its class token, even though the word adds no taxonomy. a reviewer
  //    asked to drop it as redundant; the extant clamp refuses, and the clamp is right: the
  //    literal `Error:` is what makes a bare `throw new Error(...)` GREPPABLE in a scrollback or
  //    a ci log, so it points at exactly the throw sites that still owe a real class. drop it and
  //    the defect becomes invisible. so only the GLYPH is corrected above — which was the
  //    load-bearing half of the ask — and the token stays (`rule.require.unabridged-error-prefix`)

  // strip the prefix helpful-errors baked into `.message`, so the node never renders it twice
  // .note = the prefix is REBUILT above off the constructor rather than captured here, so a
  //         throw site that hand-composed its message still gets its true class on the node
  const bareMessage = redactedMessage.replace(
    /^[^A-Za-z]*[A-Z][A-Za-z]*Error:\s*/,
    '',
  );

  // helpful-errors carry structured metadata; read the caller-relevant fields
  const metadata =
    (input.error as { metadata?: Record<string, unknown> }).metadata ?? {};

  // the FIX — the one line a human copy-pastes. two metadata keys carry it in this repo
  // (`hint` and `fix`), and both must render.
  // ⚠️ .why both = the message body is `redact(['metadata'])`ed above, so a field this
  //    renderer does not explicitly re-emit is DROPPED. a throw site that names its remedy
  //    under `fix:` would otherwise render as a bare symptom with no way forward —
  //    `rule.require.errors-name-the-fix` violated by omission, and invisibly, because the
  //    throw site looks correct and only the render loses it
  // .why.read-first = read HERE, above the leaf loop, because the loop consults it: a leaf
  //    whose content the fix already spells is noise, not context (see `.why.echo` below)
  const hint =
    typeof metadata.hint === 'string'
      ? metadata.hint
      : typeof metadata.fix === 'string'
        ? metadata.fix
        : null;

  // collect the flat leaves (repo, stderr, note) that precede the hint, in a stable order.
  // .note = trim the stderr value: a gh boundary error carries a newline at its end, which
  //         would render as a blank line between this leaf and the hint and sever the tree's
  //         `│` margin (rule.require.treestruct-output)
  // .note = a leaf carries `children` so a nested object can render as its own sub-branch rather
  //         than as a json blob on one line (see `.why.expand` below). a scalar leaf carries none
  const flatLeaves: { text: string; children: string[] }[] = [];
  // ⚠️ the label names the key's SCOPE, so it must follow the slug's namespace. a machine-wide
  //    slug opens with the reserved `@all` org, which MEANS "not repo-scoped" — so a flat
  //    `repo:` label contradicts its own value and sends a human who debugs a reach miss to
  //    look in a repo that has no part in it (`rule.forbid.ambiguous-labels`: one label may
  //    carry exactly one sense). this surfaced the first time a refusal was captured for an
  //    `@all` key, in the machine-wide reach journey
  //
  // .note = the org is read through `asKeyrackKeyOrg`, the CANONICAL extractor, rather than a
  //         raw `startsWith('@all.')` probe. a bare prefix test is decode-friction that each
  //         reader must re-derive and keep in agreement forever
  //         (`rule.require.named-transformers`); the extractor also gets the boundary right for
  //         free, since an org that merely OPENS with those letters (`@allstate`) splits to its
  //         own name and is never mistaken for the reserved one
  if (typeof metadata.slug === 'string')
    flatLeaves.push({
      text: `${asKeyrackKeyOrg({ slug: metadata.slug }) === '@all' ? 'machine' : 'repo'}: ${metadata.slug}`,
      children: [],
    });
  if (typeof metadata.stderr === 'string' && metadata.stderr.trim())
    flatLeaves.push({
      text: `stderr: ${metadata.stderr.trim()}`,
      children: [],
    });
  if (typeof metadata.note === 'string' && metadata.note.trim())
    flatLeaves.push({ text: `why: ${metadata.note.trim()}`, children: [] });

  // ⚠️ EVERY other metadata field renders too — the four keys above earn a friendly LABEL, and
  //    earn no monopoly. an allowlist here is a `rule.forbid.failhide` in renderer form: the
  //    throw site looks correct, the field is real, and only the render eats it — so a human
  //    reads "invalid --mech: must be one of …" and never learns which value was at fault, and
  //    nobody learns the context was dropped. the raw dump this tree replaced printed the whole
  //    metadata object, so to allowlist was to render prettier and say LESS
  //    (`rule.require.refusals-carry-context`)
  // .note = `hint` and `fix` are excluded here because they close the branch below, as the FIX
  // ⚠️ .why.masked = keyrack is a CREDENTIAL tool, and this loop renders whatever it is handed.
  //    that is exactly the property that makes it useful and exactly the one that makes it a
  //    hazard: the day a throw site names a value under `secret`/`token`/`passphrase`, an error
  //    render would print the credential to a terminal and a ci log. the mask is here rather
  //    than at each throw site because a site added later cannot be relied on to remember
  //    (`rule.require.safe-by-default` — the easy path is the safe one)
  // ⚠️ .why.two-masks = a key-name mask ALONE is only as good as the name discipline of every
  //    throw site that will ever exist — a vault-returned secret stored under `value`, `body`,
  //    `data`, or `context` walks straight past it, and this renderer is the ONE place every
  //    keyrack refusal converges. so the VALUE is masked on its own shape too
  //    (`isKeyrackSecretShaped`), and a leak now needs BOTH masks to miss. the alternative — an
  //    allowlist of renderable keys — is `rule.forbid.failhide` in renderer form, for exactly the
  //    reason the loop above exists, so the second mask is value-shaped rather than key-gated
  const labelled = new Set(['slug', 'stderr', 'note', 'hint', 'fix']);
  const isKeyASecretBearer = (key: string): boolean =>
    /secret|password|passphrase|token|credential|prikey|privatekey/i.test(key);
  // .why = both masks apply at EVERY depth. a nested member is exactly as leakable as a
  //        top-level one, so the expansion below routes each child through the same gate
  //        rather than a trust that a secret only ever lands one level up
  const asMaskedValue = (mask: { key: string; value: string }): string =>
    isKeyASecretBearer(mask.key) || isKeyrackSecretShaped({ value: mask.value })
      ? '__REDACTED__'
      : mask.value;
  for (const [key, value] of Object.entries(metadata)) {
    if (labelled.has(key)) continue;
    if (value === null || value === undefined) continue;
    // .note = a nested value that this renderer cannot expand into sub-leaves (see `.why.expand`
    //         below) is JSON-spelled on ONE line, so a leaf never breaks the tree's `│` margin
    //         (`rule.require.treestruct-output`)
    // ⚠️ .why.error = an `Error` carries its content on NON-enumerable fields, so
    //    `JSON.stringify(err)` is `'{}'` — and this repo attaches one under `cause` on five
    //    aws.params gates (`asKeyrackAwsParamErrorGate`). rendered raw that becomes a
    //    `cause: {}` leaf: a line shaped like a fact that states none. spell its name and
    //    message instead, which is the content a reader came for
    // ⚠️ .why.prune = a NESTED null is dropped the same as a top-level one. the guard above
    //    drops `region: null`, so a bare null never reaches a human — but the identical
    //    absence nested one level rendered in full, as
    //    `input: {"fromEnv":null,"fromEnvDefault":null,"fromProfile":null}`. same fact, same
    //    worthlessness, and the deeper form is worse: it is a wall of syntax a human must
    //    parse before they learn it states no fact. pruned here, an all-null object
    //    serializes to `{}` and the hollow guard below drops it, so ONE rule covers both
    //    depths
    const pruned =
      value instanceof Error ||
      typeof value !== 'object' ||
      Array.isArray(value)
        ? value
        : Object.fromEntries(
            Object.entries(value as Record<string, unknown>).filter(
              ([, member]) => member !== null && member !== undefined,
            ),
          );
    // ⚠️ .why.expand = a nested object of SCALARS renders as its own sub-branch, never as a json
    //    blob on one leaf. `source: {"type":"env","format":"json","envVar":"SECRETS_JSON"}` puts
    //    braces, quotes and colons into a tree whose every other leaf is `key: value` prose —
    //    machine syntax inside a human render, the same blemish the scalar-list join above cures
    //    (`rule.forbid.snapshot-visual-blemishes`, `rule.require.treestruct-output`). it is also
    //    the WORSE half of that pair: a list joins to a readable phrase, but an object's json
    //    keeps every delimiter, so the reader parses syntax to reach three facts a sub-branch
    //    would have simply stated
    // .why.one-level = only a scalar-membered object expands. a member that is itself an object
    //    or a list would need a recursive margin, and a deeper tree is not obviously kinder than
    //    the json — so the deeper shape keeps its blob rather than invent a rail it cannot hold.
    //    same bound, same reason, as the scalars-only rule for lists
    // .why.key-first = a secret-bearing PARENT key never expands: it falls through to the json
    //    path below, where the mask redacts the whole object at once. to expand it would spread
    //    a credential across several leaves and hand the mask more surface to miss
    const expandable =
      pruned !== null &&
      typeof pruned === 'object' &&
      !Array.isArray(pruned) &&
      !(pruned instanceof Error) &&
      !isKeyASecretBearer(key) &&
      Object.entries(pruned as Record<string, unknown>).length > 0 &&
      Object.entries(pruned as Record<string, unknown>).every(
        ([, member]) =>
          typeof member === 'string' ||
          typeof member === 'number' ||
          typeof member === 'boolean',
      )
        ? Object.entries(pruned as Record<string, unknown>)
        : null;
    if (expandable) {
      flatLeaves.push({
        text: key,
        children: expandable.map(
          ([member, memberValue]) =>
            `${member}: ${asMaskedValue({ key: member, value: String(memberValue).trim() })}`,
        ),
      });
      continue;
    }

    // ⚠️ .why.bare-error = an error's `name` is spelled ONLY when it carries a fact. a named
    //    class — `AccessDeniedException`, `BadRequestError` — tells a human WHICH failure this
    //    is, and is the most useful word on the leaf. the base `Error` tells them the value was
    //    an error, which the `error:` label beside it already said, so to spell it renders
    //    `error: Error: ENOENT …` — a class name leaked into a refusal, which is the exact dump
    //    this whole report exists to replace (see the `.what` at the head of this file). the
    //    OS code that follows it (`ENOENT` vs `EACCES`) is the real fact and is kept: it says
    //    WHICH of the hint's two conditions failed, and no other leaf carries that
    // ⚠️ .why.scalar-list = a list of scalars is spelled as a comma-joined phrase, never as raw
    //    json. `supported: ["PERMANENT_VIA_REPLICA","EPHEMERAL_VIA_GITHUB_APP"]` puts brackets,
    //    quotes and commas into a tree whose every other leaf is prose — machine syntax inside a
    //    human render, which is the blemish `rule.forbid.snapshot-visual-blemishes` names. the
    //    joined form says the same fact and reads as the sentence it belongs to
    // .why.scalars-only = a list of OBJECTS keeps its json, because a join would collapse each
    //    member to `[object Object]` — a hollow leaf under a real label, which is strictly worse
    //    than the brackets it cured
    const spelled =
      typeof pruned === 'string'
        ? pruned.trim()
        : pruned instanceof Error
          ? pruned.name === 'Error'
            ? pruned.message
            : `${pruned.name}: ${pruned.message}`
          : Array.isArray(pruned) &&
              pruned.every(
                (member) =>
                  typeof member === 'string' ||
                  typeof member === 'number' ||
                  typeof member === 'boolean',
              )
            ? pruned.join(', ')
            : JSON.stringify(pruned);
    // .note = an EMPTY scalar list joins to `''` and is dropped right here, so the hollow guard
    //         below never sees it — the two paths agree on what a fact-free container is
    if (!spelled) continue;
    // ⚠️ .why.echo = an `Error` whose message the FIX already spells is dropped, because the
    //    fix is the line a human reads and a mid-branch leaf that repeats it is noise, not
    //    context. the aws.params grant gates hit this exactly: they attach the sdk error under
    //    `cause` AND quote its message in a curated `why (raw AWS): …` hint branch, so one
    //    `AccessDeniedException` render printed the same sentence twice
    //    (`rule.forbid.snapshot-visual-blemishes`)
    // .why.errors-only = scoped to `Error` values on purpose. a scalar fact — `region:
    //    us-east-1` — may legitimately also appear inside a hint sentence, and to suppress it
    //    on a substring match would drop a real field to cure a cosmetic one, which is
    //    `rule.forbid.failhide` in renderer form. only an error's own message is redundant
    //    enough to be certain
    if (value instanceof Error && hint?.includes(value.message)) continue;
    // ⚠️ .why.hollow = a value that serializes to an EMPTY container renders as `{}` or `[]` —
    //    fact-shaped, fact-free, and indistinguishable from a real field to a human who scans
    //    the tree. to carry context is to carry FACTS; a hollow leaf is the failure this
    //    renderer's own rule forbids, reached from the opposite side of the allowlist it
    //    replaced (`rule.require.refusals-carry-context`)
    if (spelled === '{}' || spelled === '[]') continue;
    // the two masks are OR'd: the key may name a secret, or the value may walk like one
    flatLeaves.push({
      text: `${key}: ${asMaskedValue({ key, value: spelled })}`,
      children: [],
    });
  }

  // the invocation a human typed, echoed so the refusal can be REPRODUCED rather than merely
  // read. spelled shell-shaped (space-joined) rather than the raw dump's comma-joined `[args]`,
  // so it can be copy-pasted (`rule.require.refusals-carry-context`)
  if (input.invocation?.length)
    flatLeaves.push({
      text: `ran: ${input.invocation.join(' ')}`,
      children: [],
    });

  // a hint may carry multiple `;`-joined conditional branches; split so each renders as
  // its own sub-branch — a single semicolon-joined line wraps mid-phrase in a terminal
  const hintParts = hint
    ? hint
        .split(';')
        .map((part) => part.trim())
        .filter(Boolean)
    : [];

  // the hint (when present) always closes the branch, so every flat leaf is a mid-branch;
  // absent a hint, the last flat leaf closes the branch
  // a leaf's children indent one level deeper; the `│` rail is carried only while the leaf is
  // not the last node of the branch, so the tree's vertical margin stays unbroken
  // (`rule.require.treestruct-output`) — the same rail the hint's header/child nesting uses below
  const flatLines = flatLeaves.flatMap((leaf, i) => {
    const isLast = i === flatLeaves.length - 1 && hintParts.length === 0;
    const leafLine = isLast ? `      └─ ${leaf.text}` : `      ├─ ${leaf.text}`;
    if (leaf.children.length === 0) return [leafLine];
    const childMargin = isLast ? '         ' : '      │  ';
    return [
      leafLine,
      ...leaf.children.map((child, j) =>
        j === leaf.children.length - 1
          ? `${childMargin}└─ ${child}`
          : `${childMargin}├─ ${child}`,
      ),
    ];
  });

  // group the hint parts into a two-level tree: a part that ends with `:` is a HEADER, and the
  // parts that come after it (until the next header) are its CHILDREN. this keeps a header — e.g.
  // the grant-list's "aws.params set needs these grants on this identity:" — as the visual parent
  // of its items, instead of a flat render of header + items as equal-weight siblings, so a human
  // who reads the tree sees the grant lines belong to the header (rule.require.treestruct-output).
  // a part with no `:` at its end, or a header with no children after it, renders as a plain leaf
  const hintNodes: { text: string; children: string[] }[] = [];
  for (const part of hintParts) {
    const openNode = hintNodes[hintNodes.length - 1];
    const isChild =
      !!openNode && openNode.text.endsWith(':') && !part.endsWith(':');
    if (isChild) openNode.children.push(part);
    else hintNodes.push({ text: part, children: [] });
  }

  // one hint part renders as a single leaf that closes the branch; multiple parts nest under the
  // `hint:` node, and a header node further nests its children one level deeper
  const hintLines =
    hintParts.length === 0
      ? []
      : hintParts.length === 1
        ? [`      └─ hint: ${hintParts[0]}`]
        : [
            '      └─ hint:',
            ...hintNodes.flatMap((node, i) => {
              const isLastNode = i === hintNodes.length - 1;
              const nodeLine = `         ${isLastNode ? '└─' : '├─'} ${node.text}`;
              if (node.children.length === 0) return [nodeLine];
              // a header's children indent one level deeper; carry a `│` margin only when the
              // header is not the last node, so the tree's vertical rail stays unbroken
              const childMargin = isLastNode ? '            ' : '         │  ';
              const childLines = node.children.map((child, j) =>
                j === node.children.length - 1
                  ? `${childMargin}└─ ${child}`
                  : `${childMargin}├─ ${child}`,
              );
              return [nodeLine, ...childLines];
            }),
          ];

  // assemble the blocked treestruct: 🔐 keyrack domain root, blocked node beneath it.
  // .note = keyrack roots on its own lock glyph 🔐 (never a role mascot) — the blocked path
  //         drops the seaturtle vibe header so a credential-domain failure reads as keyrack's
  //         own voice, uniform with the 🔐 success root (rule.require.keyrack-emoji-palette)
  return [
    '',
    `🔐 ${input.command}`,
    `   └─ ${glyph} ${errorClass}: ${bareMessage}`,
    ...flatLines,
    ...hintLines,
    '',
  ].join('\n');
};
