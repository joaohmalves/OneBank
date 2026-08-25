import type { CognigyClient } from './CognigyClient';
import type { CallState, CognigyInfo, TranscriptMessage } from '../../types/cognigy';

export interface ClickToCallAdapter {
  connect(): Promise<void>; disconnect(): Promise<void>; startCall(): Promise<void>; endCall(): Promise<void>; setMuted(muted: boolean): Promise<void>; sendInfo(info: CognigyInfo): Promise<void>;
  onInfoReceived(callback: (info: CognigyInfo) => void): () => void; onTranscript(callback: (message: TranscriptMessage) => void): () => void; onCallStateChange(callback: (state: CallState) => void): () => void;
}

// O adaptador mantém qualquer detalhe da versão instalada do SDK fora do restante do projeto.
export class RealCognigyClient implements CognigyClient {
  constructor(private readonly adapter: ClickToCallAdapter) {}
  connect(){return this.adapter.connect();} disconnect(){return this.adapter.disconnect();} startCall(){return this.adapter.startCall();} endCall(){return this.adapter.endCall();} setMuted(muted:boolean){return this.adapter.setMuted(muted);} sendInfo(info:CognigyInfo){return this.adapter.sendInfo(info);}
  onInfoReceived(cb:(info:CognigyInfo)=>void){return this.adapter.onInfoReceived(cb);} onTranscript(cb:(message:TranscriptMessage)=>void){return this.adapter.onTranscript(cb);} onCallStateChange(cb:(state:CallState)=>void){return this.adapter.onCallStateChange(cb);}
}
