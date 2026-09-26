import { homedir } from 'node:os';
import { join } from 'node:path';
import { SSH_KEY_CANDIDATES } from './sshKeyCandidates';

/**
 * .what = the ordered ssh private-key path candidates on this machine, in ONE
 *         precedence — the owner key first, then any prescribed prikeys, then the
 *         standard default names (id_ed25519, id_rsa, id_ecdsa)
 * .why = init (which key seals the manifest) and unlock's Variant A (which key
 *        re-derives K) must search keys in the SAME precedence. a divergent order
 *        seals-with-A but re-derives-with-B → a silently wrong K and an opaque "no
 *        identity could decrypt". this single source of precedence makes that
 *        divergence unrepresentable (rule.require.solve-at-cause)
 *
 * .note = returns the raw ordered paths, de-duped, order preserved — it does NOT
 *         filter on existence or key type. each caller applies its own policy
 *         (init needs prikey+pubkey present; Variant A additionally needs ed25519),
 *         so the shared piece is exactly the precedence that had drift risk
 * .note = the standard names come from the shared SSH_KEY_CANDIDATES const, so this
 *         precedence and that list stay in lockstep
 */
export const getAllSshKeyCandidatePaths = (input: {
  owner: string | null;
  prescribed?: string[];
}): string[] => {
  const home = process.env.HOME ?? homedir();

  // build the candidate paths in priority order (owner → prescribed → standard)
  const candidatePaths = [
    // the owner key first (e.g. ~/.ssh/ehmpath) — most likely the intended key
    ...(input.owner ? [join(home, '.ssh', input.owner)] : []),
    // then any prescribed prikey the human named explicitly (--prikey)
    ...(input.prescribed ?? []),
    // then the standard default names — the ONE canonical list
    ...SSH_KEY_CANDIDATES.map((name) => join(home, '.ssh', name)),
  ];

  // de-dup, order preserved (a prescribed path equal to a default is tried once)
  return [...new Set(candidatePaths)];
};
