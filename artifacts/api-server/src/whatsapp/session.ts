export type SessionState =
  | 'idle'
  | 'main_menu'
  | 'awaiting_followup'
  | 'awaiting_evaluation'
  | 'awaiting_final_followup'
  | 'transferred'
  | 'ended';

export interface Session {
  phoneNumber: string;
  state: SessionState;
  startedAt: Date;
  lastActivityAt: Date;
  timeoutHandle?: ReturnType<typeof setTimeout>;
}

const TIMEOUT_MS = 5 * 60 * 1000;

const sessions = new Map<string, Session>();

export function getSession(phoneNumber: string): Session | undefined {
  return sessions.get(phoneNumber);
}

export function createSession(phoneNumber: string): Session {
  const session: Session = {
    phoneNumber,
    state: 'main_menu',
    startedAt: new Date(),
    lastActivityAt: new Date(),
  };
  sessions.set(phoneNumber, session);
  return session;
}

export function updateSession(phoneNumber: string, updates: Partial<Session>): void {
  const session = sessions.get(phoneNumber);
  if (session) {
    Object.assign(session, updates, { lastActivityAt: new Date() });
  }
}

export function endSession(phoneNumber: string): void {
  const session = sessions.get(phoneNumber);
  if (session?.timeoutHandle) {
    clearTimeout(session.timeoutHandle);
  }
  sessions.delete(phoneNumber);
}

export function setSessionTimeout(
  phoneNumber: string,
  onTimeout: (phoneNumber: string) => void
): void {
  const session = sessions.get(phoneNumber);
  if (!session) return;

  if (session.timeoutHandle) {
    clearTimeout(session.timeoutHandle);
  }

  session.timeoutHandle = setTimeout(() => {
    onTimeout(phoneNumber);
  }, TIMEOUT_MS);
}

export function getAllSessions(): Session[] {
  return Array.from(sessions.values());
}

export function getSessionCount(): number {
  return sessions.size;
}
