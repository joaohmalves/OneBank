import type { CognigyClient } from './CognigyClient';
import { MockCognigyClient } from './MockCognigyClient';
import { RealCognigyClient, type ClickToCallAdapter } from './RealCognigyClient';

export function createCognigyClient(adapter?: ClickToCallAdapter): CognigyClient {
  const wantsReal = import.meta.env.VITE_COGNIGY_MODE === 'real' && import.meta.env.VITE_COGNIGY_ENABLED === 'true';
  if (wantsReal && adapter) return new RealCognigyClient(adapter);
  return new MockCognigyClient();
}
