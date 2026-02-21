/**
 * .what = keyrack daemon SDK public contract
 * .why = provides typed access to daemon operations for clients
 */

export { daemonAccessGet } from './src/domain.operations/daemonAccessGet';
export { daemonAccessRelock } from './src/domain.operations/daemonAccessRelock';
export { daemonAccessStatus } from './src/domain.operations/daemonAccessStatus';
export { daemonAccessUnlock } from './src/domain.operations/daemonAccessUnlock';
export { findsertKeyrackDaemon } from './src/domain.operations/findsertKeyrackDaemon';
export { killKeyrackDaemon } from './src/domain.operations/killKeyrackDaemon';
export {
  connectToKeyrackDaemon,
  isDaemonReachable,
} from './src/infra/connectToKeyrackDaemon';
export {
  type DaemonResponse,
  sendKeyrackDaemonCommand,
} from './src/infra/sendKeyrackDaemonCommand';
