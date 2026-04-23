import type {
  KeyrackGrantAttempt,
  KeyrackGrantStatus,
} from '@src/domain.objects/keyrack';

export const asAttemptsByStatus = <TStatus extends KeyrackGrantStatus>(input: {
  attempts: KeyrackGrantAttempt[];
  status: TStatus;
}): Extract<KeyrackGrantAttempt, { status: TStatus }>[] => {
  return input.attempts.filter((a) => a.status === input.status) as Extract<
    KeyrackGrantAttempt,
    { status: TStatus }
  >[];
};

export const asNotGrantedAttempts = (input: {
  attempts: KeyrackGrantAttempt[];
}): Exclude<KeyrackGrantAttempt, { status: 'granted' }>[] => {
  return input.attempts.filter((a) => a.status !== 'granted') as Exclude<
    KeyrackGrantAttempt,
    { status: 'granted' }
  >[];
};

export const isAllAttemptsGranted = (input: {
  attempts: KeyrackGrantAttempt[];
}): boolean => {
  return input.attempts.every((a) => a.status === 'granted');
};
