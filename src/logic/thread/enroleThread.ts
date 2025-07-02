import { Thread } from '../../domain/objects/Thread';

export const enrollThread = <TThread extends Thread<any>>(input: {
  thread: TThread;
}) => {};
