/**
 * .what = a shape by which code reaches a live brain
 * .why = `scope` says where the shape counts: 'everywhere' is checked in prod modules too
 *   (a supplier import has no business in prod), 'tests' only in tests and test infra
 *   (prod may spawn claude; a suite that holds a mock's call is a named exception), and
 *   'remote' only in an integration or acceptance suite (a unit test crosses no remote
 *   boundary, and a slug there is a mock's)
 */
export interface LiveBrainMarker {
  name: string;
  pattern: RegExp;
  scope: 'everywhere' | 'tests' | 'remote';
}

/**
 * .what = a suite that may hold a marker outside the gate, with its reason
 * .why = `allows` names each marker the suite may hold, so a later reach of another shape is
 *   named, never passed under a blanket exception
 */
export interface LiveBrainSuiteException {
  reason: string;
  allows: string[];
}

/**
 * .what = a non-test module that can reach a brain, by path, with its reason
 * .why = a test that reaches a brain through test infra holds no marker of its own, so the
 *   scan must know the module by path. `reach` says how a test's use of it is read:
 *   - 'import': any import of the module makes the importer live (it exists only to call a brain)
 *   - 'names': the module also serves stub suites; every export is classified `live` or
 *     `stub`, and only a `live` name makes its user live
 *   - 'none': the module holds a marker as data, and reaches no brain; `allows` names each marker
 *     it may hold, and the scan reads it, so the claim is checked, never trusted
 * .note = a union on `reach`, so each entry holds only the fields its reach is read by: an
 *   'import' or 'names' module is live by its entry, so each marker it holds is the reach its
 *   users are already gated for, and only a 'none' module carries `allows`
 */
export type LiveBrainInfraModule =
  | { path: string; reach: 'import'; reason: string }
  | {
      path: string;
      reach: 'names';
      reason: string;
      live: string[];
      stub: string[];
      // .note = the live names that only build a lazy value (a key read on use), so a call at
      //   collection reaches no brain; each still marks its user live, so the suite is gated
      lazy: string[];
    }
  | { path: string; reach: 'none'; reason: string; allows: string[] };

/**
 * .what = the one place that says what may reach a live brain in this repo
 * .why = the clamp on rule.forbid.live-brain-spend-beyond-the-smoke-tier reads this registry;
 *   the scan operations take it as input, so the data and the operations stay apart
 * .note = the operations live under `.test/`, which the build excludes, so no peer repo can
 *   import them yet; the publish is caught as a dream (one-home-for-the-live-brain-clamp)
 */
export interface LiveBrainRegistry {
  markers: LiveBrainMarker[];
  infraModules: LiveBrainInfraModule[];
  suiteExceptions: Record<string, LiveBrainSuiteException>;
}

export const LIVE_BRAIN_REGISTRY: LiveBrainRegistry = {
  // the shapes any repo's code reaches a brain by; a supplier import is matched by the
  //   package, never the factory name, so a new getter or a namespace import is caught too
  // .note = each string matches any quote, since no formatter runs on blackbox/ or .test/
  markers: [
    {
      name: 'an import of a rhachet-brains-* supplier',
      pattern: /(\bfrom\s*|\brequire\(\s*|\bimport\(\s*)['"`]rhachet-brains-[^'"`]*['"`]/,
      scope: 'everywhere',
    },
    {
      name: 'an import of a vendor sdk',
      pattern: /(\bfrom\s*|\brequire\(\s*|\bimport\(\s*)['"`](openai|@anthropic-ai\/sdk)['"`]/,
      scope: 'tests',
    },
    {
      // any child-process call whose command is claude, by bin or in a shell line
      name: 'a spawn of the claude cli',
      pattern:
        /\b(spawn|spawnSync|exec|execSync|execFile|execFileSync|execa|execaSync|execaCommand|fork)\(\s*['"`]claude\b/,
      scope: 'tests',
    },
    {
      name: 'a call to a vendor api host',
      pattern: /\bapi\.(anthropic|openai)\.com\b|\bapi\.x\.ai\b/,
      scope: 'tests',
    },
    {
      // a brain slug handed to the cli's --brain flag, or as a `brain:` choice, reaches a supplier
      //   with no import; read only where a remote call may sit (an integration or acceptance
      //   suite). a slug in an assertion or a supplier factory is data: the factory's import is
      //   its own marker
      name: 'a live brain slug',
      pattern:
        /--brain['"`]?\s*[,=]?\s*['"`]?(anthropic|openai|xai)\/[a-z]|\bbrain\s*:\s*['"`](anthropic|openai|xai)\/[a-z]/,
      scope: 'remote',
    },
    {
      name: 'a claude print-mode call',
      pattern: /\[\s*['"`]-p['"`],\s*['"`]--model['"`]/,
      scope: 'tests',
    },
    { name: 'the real claude bin override', pattern: /\bRHACHET_REAL_CLAUDE_BIN\b/, scope: 'tests' },
    { name: 'a brain call', pattern: /\bbrain\.choice!?\.(ask|act)\(/, scope: 'tests' },
    {
      name: 'a brain context with a call',
      pattern: /\bgenContextBrain\([\s\S]*\.(ask|act)\(/,
      scope: 'tests',
    },
    // a context found by discovery needs no supplier import, and may be handed to an operation
    //   that asks, so a bare context counts in a suite too
    { name: 'a brain context', pattern: /\bgenContextBrain\(/, scope: 'tests' },
    { name: 'a claude print-mode command', pattern: /\bclaude\s+(-p|--print)\b/, scope: 'tests' },
  ],

  // every test-infra module that can reach a brain
  infraModules: [
    {
      path: 'blackbox/.test/infra/brainDirBootJourney.ts',
      reach: 'import',
      reason: 'runs `claude -p --model haiku` against an isolated home; it exists only for the live journey',
    },
    {
      path: 'blackbox/.test/infra/enrollCloneHarness.ts',
      reach: 'names',
      reason: 'serves the stub-brain suites and the real-claude suites alike',
      live: [
        'getRealClaudeBinPath',
        'isRealClaudeAuthed',
        'getRealClaudeOrThrow',
        'setRealClaudeFirstRunAccepted',
        'enrollRealClaudeAndWaitReach',
        'sayAndPollForMarker',
      ],
      stub: [
        'STUB_BRAIN',
        'setupEnrollFixture',
        'setupRichStubBrainPath',
        'readStubEnvDumped',
        'waitForReadyOrRefusal',
        'enrollCloneAndWaitReady',
        'pollForAck',
        'pollForCloneListState',
        'expectCloneSaySuccessTree',
        'asCloneSayHeadSnapshotSafe',
      ],
      lazy: [],
    },
    {
      path: 'blackbox/.test/infra/genRealBrainSlot.ts',
      reach: 'names',
      reason: 'the host-wide bound on live brains; only a real-claude enroll takes a slot',
      live: ['genRealBrainSlot'],
      stub: [],
      lazy: [],
    },
    {
      path: 'blackbox/.test/infra/genIsolatedClaudeHome.ts',
      reach: 'names',
      reason: 'installs the real claude cli and builds a home for it; a spawn of that bin is the reach',
      live: ['getCachedClaudeCliBin', 'genIsolatedClaudeHome'],
      stub: [],
      lazy: [],
    },
    {
      path: 'src/.test/getContextOpenAI.ts',
      reach: 'names',
      reason: 'the openai context, read by the imagine suites',
      live: ['getContextOpenAI'],
      stub: [],
      // the openai key is a nested getter read on use, so a call at collection reads no key
      lazy: ['getContextOpenAI'],
    },
    {
      path: 'blackbox/.test/infra/probe.replDoorRealSupplierLive.cjs',
      reach: 'import',
      reason: 'boots the real claude child through the anthropic supplier and asks it; run by its file name',
    },
    {
      path: 'blackbox/.test/infra/probe.replDoorRealSupplier.cjs',
      reach: 'none',
      reason: 'wraps child_process.spawn and throws before the claude child starts, so no brain boots',
      allows: ['a brain context'],
    },
    {
      path: 'blackbox/.test/infra/probe.genContextBrain.discoveryNotFound.cjs',
      reach: 'none',
      reason: 'asks discovery for a brain no supplier offers, and asserts the refusal; no brain is built',
      allows: ['a brain context'],
    },
    {
      path: 'blackbox/.test/infra/probe.genContextBrain.discoveryNotFound.esmFixture.cjs',
      reach: 'none',
      reason: 'asks discovery for a brain the fixed esm fixture lacks, and asserts the refusal; no brain is built',
      allows: ['a brain context'],
    },
    {
      path: 'blackbox/.test/infra/probe.genContextBrain.discoveryNotFound.realRegistry.cjs',
      reach: 'none',
      reason: 'asks discovery for a brain the real registry lacks, and asserts the refusal; no brain is built',
      allows: ['a brain context'],
    },
    {
      path: '.test/assets/example.repo/rhachet-roles-example.collocated/.agent/repo=.this/role=scribe/actor.ts',
      reach: 'none',
      reason:
        'a fixture package: its supplier builds a lazy brain, and only the gated genActor.brain.caseCollocated suite runs it, from a temp repo copy',
      allows: ['an import of a rhachet-brains-* supplier'],
    },
    {
      path: '.test/assets/example.repo/rhachet-roles-example.published/src/domain.roles/author/actor.ts',
      reach: 'none',
      reason:
        'a fixture package: its supplier builds a lazy brain, and only the gated genActor.brain.casePublished suite runs it, from a temp repo copy',
      allows: ['an import of a rhachet-brains-* supplier'],
    },
    {
      path: '.agent/repo=.this/role=any/skills/claude.vendor.probe.sh',
      reach: 'none',
      reason:
        'a crew skill a seat runs by hand to read the vendor text a hung repl hides; no test reaches a brain through it, since its one suite puts a claude stub first on PATH',
      allows: ['a claude print-mode command'],
    },
    {
      path: 'src/.test/infra/liveBrainRegistry.ts',
      reach: 'none',
      reason: 'this registry; it holds every marker and live name as data',
      allows: [
        'a claude print-mode command',
        'a live entry point of blackbox/.test/infra/enrollCloneHarness.ts',
        'a live entry point of blackbox/.test/infra/genRealBrainSlot.ts',
        'a live entry point of blackbox/.test/infra/genIsolatedClaudeHome.ts',
        'a live entry point of src/.test/getContextOpenAI.ts',
        'an import of blackbox/.test/infra/probe.replDoorRealSupplierLive.cjs',
      ],
    },
  ],

  // the suites that hold a marker outside the gate, each with its reason
  suiteExceptions: {
    'src/contract/cli/invokeAct.integration.test.ts': {
      reason:
        'names a live slug only as the refused input of the allowlist check, against plain brain shapes; the refusal throws before any brain call',
      allows: ['a live brain slug'],
    },
    'blackbox/cli/clone.realbrain.acceptance.test.ts': {
      reason: 'tier 2: the smoke suite that runs on every push, on haiku',
      allows: ['a live entry point of blackbox/.test/infra/enrollCloneHarness.ts'],
    },
    'blackbox/.test/infra/getRealClaudeOrThrow.integration.test.ts': {
      reason:
        'drives the tier-2 gate against a stub `claude` that only prints a version; the gate spawns naught else',
      allows: [
        'a live entry point of blackbox/.test/infra/enrollCloneHarness.ts',
        'the real claude bin override',
      ],
    },
    'blackbox/cli/enroll.shared-brain-auth.acceptance.test.ts': {
      reason:
        'no credential: a fake expired login and every key unset, so the cli refuses before any billed call',
      allows: ['a live entry point of blackbox/.test/infra/genIsolatedClaudeHome.ts'],
    },
    'src/domain.operations/context/genContextBrain.integration.test.ts': {
      reason: 'constructs the supplier brains only; every ask and act goes to an in-file mock brain',
      allows: ['an import of a rhachet-brains-* supplier', 'a brain context with a call', 'a brain context'],
    },
    'src/domain.operations/context/genContextBrain.test.ts': {
      reason: 'the unit test of the context: every brain is a genMockedBrainAtom or genMockedBrainRepl',
      allows: ['a brain call', 'a brain context with a call', 'a brain context'],
    },
    'src/domain.operations/context/genContextBrain.scope=creds.integration.test.ts': {
      reason: 'the creds scope of the context: every brain answers with genMockedBrainOutput',
      allows: ['a brain call', 'a brain context with a call', 'a brain context'],
    },
    'src/domain.operations/context/genContextBrain.types.test.ts': {
      reason: 'the type test of the context: each context is built over explicit mock brains',
      allows: ['a brain context'],
    },
    'blackbox/sdk/genContextBrain.acceptance.test.ts': {
      reason: 'the sdk contract of the context: each is built over genMockedBrainAtom and genMockedBrainRepl',
      allows: ['a brain context'],
    },
    'src/.test/getContextOpenAI.test.ts': {
      reason: 'the unit test of the getter: it proves the key is read on use, and calls no model',
      allows: ['a live entry point of src/.test/getContextOpenAI.ts'],
    },
    'src/.test/infra/getMarkersOfContent.test.ts': {
      reason: 'the marker table: its markers sit in fixture strings, never in a call',
      allows: [
        'a brain call',
        'a brain context with a call',
        'a brain context',
        'a claude print-mode command',
        'an import of a rhachet-brains-* supplier',
        'an import of a vendor sdk',
        'a spawn of the claude cli',
        'a call to a vendor api host',
        'a claude print-mode call',
        'the real claude bin override',
        'a live entry point of blackbox/.test/infra/enrollCloneHarness.ts',
        'a live entry point of src/.test/getContextOpenAI.ts',
        'an import of blackbox/.test/infra/brainDirBootJourney.ts',
        'an import of blackbox/.test/infra/probe.replDoorRealSupplierLive.cjs',
      ],
    },
    'src/.test/infra/getContentOfSuiteRunAtCollection.test.ts': {
      reason: 'the collection-text table: its markers sit in fixture strings, never in a call',
      allows: ['a spawn of the claude cli', 'a claude print-mode command', 'a brain call'],
    },
    'src/.test/infra/getAllLiveBrainSuitesUngated.integration.test.ts': {
      reason: 'the scan itself: its markers sit in fixture strings, never in a call',
      allows: [
        'a brain call',
        'a brain context with a call',
        'a brain context',
        'a claude print-mode command',
        'an import of a rhachet-brains-* supplier',
        'a spawn of the claude cli',
        'a call to a vendor api host',
        'a live brain slug',
        'a claude print-mode call',
        'a live entry point of blackbox/.test/infra/enrollCloneHarness.ts',
        'a live entry point of src/.test/getContextOpenAI.ts',
        'an import of blackbox/.test/infra/brainDirBootJourney.ts',
        'an import of blackbox/.test/infra/probe.replDoorRealSupplierLive.cjs',
      ],
    },
  },
};
