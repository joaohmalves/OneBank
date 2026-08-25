export type CallState = 'idle' | 'connecting' | 'active' | 'ended';
export interface TranscriptMessage { id: string; author: 'agent' | 'user'; text: string; time: string; }
export interface WebContext { page: string; section?: string; selectedCard?: string; lastAction?: string; }
export type CognigyEvent =
  | { type: 'SHOW_CREDIT_LIMIT' }
  | { type: 'SHOW_INVOICE' }
  | { type: 'SHOW_PURCHASES' }
  | { type: 'SHOW_STATEMENT' }
  | { type: 'SHOW_CARDS_TOPIC' }
  | { type: 'SHOW_CARD_DETAIL'; payload: { card: string } }
  | { type: 'COMPARE_CARDS'; payload: { cardA: string; cardB: string } }
  | { type: 'card'; title: string; description: string; actions: { type: string; label?: string }[] };
export type CognigyInfo = CognigyEvent | { type: 'USER_ACTION' | 'PAGE_CHANGED' | 'SECTION_CHANGED' | 'CARD_SELECTED'; action?: string; context?: WebContext & Record<string, unknown> };
