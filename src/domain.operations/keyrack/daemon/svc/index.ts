/**
 * .what = keyrack daemon service public contract
 * .why = exposes daemon start functionality for sdk and cli
 */
export {
  spawnKeyrackDaemonBackground,
  startKeyrackDaemon,
} from './src/contract/startKeyrackDaemon';
export {
  createDaemonKeyStore,
  type DaemonKeyStore,
  type UnlockedKey,
} from './src/domain.objects/daemonKeyStore';
export { createKeyrackDaemonServer } from './src/infra/createKeyrackDaemonServer';
