/**
 * .what = commands the keyrack daemon can handle
 * .why = defines the daemon protocol surface
 *
 * variants:
 * - 'UNLOCK': store keys in daemon with TTL
 * - 'GET': return keys by slug if TTL valid
 * - 'STATUS': list unlocked keys with TTL left
 * - 'RELOCK': purge keys from daemon
 */
export type KeyrackDaemonCommand = 'UNLOCK' | 'GET' | 'STATUS' | 'RELOCK';
