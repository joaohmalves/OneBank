import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MockCognigyClient } from '../services/cognigy/MockCognigyClient';
import type { CognigyClient } from '../services/cognigy/CognigyClient';
import type { CallState, CognigyEvent, CognigyInfo, TranscriptMessage, WebContext } from '../types/cognigy';
import { useBanking } from './BankingContext';
import { apiUrl } from '../services/apiBaseUrl';
// Em modo real, injete o adaptador do SDK oficial ao criar o provider.
const mockClient = new MockCognigyClient();
interface CognigyValue { connected:boolean; callState:CallState; muted:boolean; transcript:TranscriptMessage[]; webContext:WebContext; lastEvent:CognigyEvent|null; startCall:()=>Promise<void>; endCall:()=>Promise<void>; toggleMute:()=>Promise<void>; sendInfo:(info:CognigyInfo)=>Promise<void>; dispatchCognigyEvent:(event:CognigyEvent)=>void; }
const CognigyContext=createContext<CognigyValue|null>(null);
export function CognigyProvider({children, client=mockClient}:{children:ReactNode;client?:CognigyClient}) { const navigate=useNavigate(), location=useLocation(), bank=useBanking(); const [connected,setConnected]=useState(false),[callState,setCallState]=useState<CallState>('idle'),[muted,setMuted]=useState(false),[transcript,setTranscript]=useState<TranscriptMessage[]>([]),[lastEvent,setLastEvent]=useState<CognigyEvent|null>(null); const webContext:WebContext={page:location.pathname.replace('/','')||'dashboard',section:bank.section,selectedCard:bank.selectedCard};
  const dispatchCognigyEvent=(event:CognigyEvent)=>{setLastEvent(event); if(event.type==='SHOW_CREDIT_LIMIT'){navigate('/cartoes');bank.showSection('credit-limit');} if(event.type==='SHOW_INVOICE'){navigate('/cartoes');bank.showSection('invoice');} if(event.type==='SHOW_PURCHASES'){navigate('/cartoes');bank.showSection('purchases');} if(event.type==='SHOW_STATEMENT'){navigate('/extrato');bank.showSection('statement');} if(event.type==='SHOW_CARDS_TOPIC'){navigate('/cartoes');bank.showSection('overview');} if(event.type==='SHOW_CARD_DETAIL'){navigate('/cartoes');bank.openCardDetail(event.payload.card as never);} if(event.type==='COMPARE_CARDS'){navigate('/cartoes');bank.openComparison(event.payload.cardA as never,event.payload.cardB as never);} };
  useEffect(()=>{void client.connect().then(()=>setConnected(true)); const off=[client.onInfoReceived(info=>dispatchCognigyEvent(info as CognigyEvent)),client.onTranscript(message=>setTranscript(items=>[...items,message])),client.onCallStateChange(setCallState)]; return()=>{off.forEach(fn=>fn());void client.disconnect();};},[client]);
  // Canal separado: eventos que a Cognigy manda via HTTP direto pro backend (POST /api/cognigy/event),
  // que o servidor repassa em tempo real por SSE. Independe do client (mock ou real) usado pra voz/chat.
  useEffect(()=>{
    const source=new EventSource(apiUrl('/api/cognigy/stream'));
    source.onmessage=(message)=>{
      try{ dispatchCognigyEvent(JSON.parse(message.data) as CognigyEvent); }
      catch(err){ console.error('[Cognigy SSE] payload inválido', err); }
    };
    source.onerror=()=>{ /* o EventSource reconecta sozinho; nada a fazer aqui */ };
    return ()=>source.close();
  },[]);
  const sendInfo=async(info:CognigyInfo)=>client.sendInfo({...info,context:{...webContext,...(('context' in info && info.context)||{})}} as CognigyInfo);
  const value=useMemo(()=>({connected,callState,muted,transcript,webContext,lastEvent,startCall:()=>client.startCall(),endCall:()=>client.endCall(),toggleMute:async()=>{await client.setMuted(!muted);setMuted(!muted);},sendInfo,dispatchCognigyEvent}),[connected,callState,muted,transcript,location.pathname,bank.section,bank.selectedCard,lastEvent]); return <CognigyContext.Provider value={value}>{children}</CognigyContext.Provider>; }
export const useCognigy=()=>{const value=useContext(CognigyContext);if(!value)throw new Error('useCognigy deve estar dentro de CognigyProvider');return value;};
export const getMockCognigyClient=()=>mockClient;
