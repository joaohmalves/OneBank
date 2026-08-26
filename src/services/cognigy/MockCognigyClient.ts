import type { CognigyClient } from './CognigyClient';
import type { CallState, CognigyInfo, TranscriptMessage } from '../../types/cognigy';
import { apiUrl } from '../apiBaseUrl';
export class MockCognigyClient implements CognigyClient {
  private info = new Set<(v:CognigyInfo)=>void>(); private transcripts = new Set<(v:TranscriptMessage)=>void>(); private states = new Set<(v:CallState)=>void>();
  async connect() {} async disconnect() {} async setMuted(_: boolean) {}
  async sendInfo(info: CognigyInfo) {
    console.info('[Cognigy mock] sendInfo', info);
    try { await fetch(apiUrl('/api/cognigy/action'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(info) }); } catch { /* A demonstração continua local caso a API não esteja em execução. */ }
  }
  async startCall() { this.emitState('connecting'); await new Promise(r => setTimeout(r, 500)); this.emitState('active'); this.emitTranscript({ id: crypto.randomUUID(), author:'agent', text:'Olá! Sou a Julia, sua especialista em atendimento bancário. Como posso ajudar?', time:new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) }); }
  async endCall() { this.emitState('ended'); }
  onInfoReceived(cb:(v:CognigyInfo)=>void) { this.info.add(cb); return () => this.info.delete(cb); }
  onTranscript(cb:(v:TranscriptMessage)=>void) { this.transcripts.add(cb); return () => this.transcripts.delete(cb); }
  onCallStateChange(cb:(v:CallState)=>void) { this.states.add(cb); return () => this.states.delete(cb); }
  emitInfo(v:CognigyInfo) { this.info.forEach(cb=>cb(v)); }
  private emitTranscript(v:TranscriptMessage) { this.transcripts.forEach(cb=>cb(v)); }
  private emitState(v:CallState) { this.states.forEach(cb=>cb(v)); }
}
