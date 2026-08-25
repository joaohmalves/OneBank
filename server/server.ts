import cors from 'cors'; import express from 'express'; import { InMemoryBankingRepository } from './data/store.js';
import { addSseClient, broadcastCognigyEvent, mapInboundEventToFrontend, removeSseClient } from './cognigyEvents.js';
const app=express(), repo=new InMemoryBankingRepository();app.use(cors());app.use(express.json());
app.get('/api/customer',(_,res)=>res.json(repo.getCustomer()));app.get('/api/cards',(_,res)=>res.json(repo.getCards()));app.get('/api/cards/:id',(req,res)=>{const card=repo.getCard(req.params.id);card?res.json(card):res.status(404).json({error:'Cartão não encontrado'});});app.get('/api/cards/:id/purchases',(req,res)=>res.json(repo.getPurchases(req.params.id)));app.get('/api/cards/:id/statement',(req,res)=>res.json(repo.getStatement(req.params.id)));app.get('/api/cards/:id/invoice',(req,res)=>{const card=repo.getCard(req.params.id);if(!card)return res.status(404).json({error:'Cartão não encontrado'});res.json({id:'INV-2026-08',dueDate:'2026-09-10',amount:card.limit-card.availableLimit});});app.get('/api/cards/compare/:cardA/:cardB',(req,res)=>{const a=repo.getCard(req.params.cardA),b=repo.getCard(req.params.cardB);a&&b?res.json({cardA:a,cardB:b}):res.status(404).json({error:'Cartão não encontrado'});});
// Endpoint que a Cognigy chama quando o agente reconhece uma intenção (ex.: nó "HTTP Request" no flow).
// Body aceito, ex: { "intent": "cartao" } | { "intent": "cartao_detalhe", "card": "black" }
// | { "intent": "comparar_cartoes", "cardA": "black", "cardB": "platinum" } | { "intent": "extrato" }
app.post('/api/cognigy/event',(req,res)=>{
  console.info('[Cognigy inbound]',req.body);
  const event=mapInboundEventToFrontend(req.body);
  if(event){broadcastCognigyEvent(event);res.status(202).json({accepted:true,dispatched:event});}
  else{res.status(202).json({accepted:true,dispatched:null,note:'Corpo recebido mas nenhuma intenção reconhecida'});}
});
// Canal Server-Sent Events que o front-end assina para receber, em tempo real, os eventos acima.
app.get('/api/cognigy/stream',(req,res)=>{
  res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});
  res.write('retry: 2000\n\n');
  addSseClient(res);
  req.on('close',()=>removeSseClient(res));
});
app.post('/api/cognigy/action',(req,res)=>{console.info('[Cognigy action]',req.body);res.status(202).json({accepted:true});});
app.listen(3001,()=>console.log('OneBank API on http://localhost:3001'));
