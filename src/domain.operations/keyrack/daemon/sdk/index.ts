/**
 * .what = keyrack daemon SDK public contract
 * .why = provides typed access to daemon operations for clients
 */

export { daemonAccessGet } from './src/domain.operations/daemonAccessGet';
export { daemonAccessRelock } from './src/domain.operations/daemonAccessRelock';
// .why.type = `DaemonStatusRow` is the SHAPE `daemonAccessStatus` returns, so a caller that
//        holds the operation needs the type in the same breath. absent from this contract, six
//        callers reached past it into `./src/domain.operations/daemonAccessStatus` — a
//        scope-leak that the sdk's own boundary exists to forbid, and one this index already
//        answers for `DaemonResponse` below (`rule.require.solve-at-cause`)
export {
  type DaemonStatusRow,
  daemonAccessStatus,
} from './src/domain.operations/daemonAccessStatus';
export { daemonAccessUnlock } from './src/domain.operations/daemonAccessUnlock';
export { findsertKeyrackDaemon } from './src/domain.operations/findsertKeyrackDaemon';
export { killKeyrackDaemon } from './src/domain.operations/killKeyrackDaemon';
export { pruneKeyrackDaemon } from './src/domain.operations/pruneKeyrackDaemon';
export {
  connectToKeyrackDaemon,
  isDaemonReachable,
} from './src/infra/connectToKeyrackDaemon';
export {
  type DaemonResponse,
  sendKeyrackDaemonCommand,
} from './src/infra/sendKeyrackDaemonCommand';
