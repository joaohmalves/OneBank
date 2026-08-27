import { cards } from '../../mocks/data';
import type { CardId } from '../../types/banking';

// "Visão" da página: o que está visível e o que o cliente pode clicar agora.
// Isso é enviado pra Cognigy via session.sendInfo(), pra ela responder perguntas
// tipo "onde eu clico" ou "o que tem aqui" com base no que a tela mostra de fato.
export interface PageContext {
  page: string;
  pageTitle: string;
  section: string;
  selectedCard: CardId;
  cardOpen: CardId | null;
  comparisonOpen: { cardA: CardId; cardB: CardId } | null;
  availableActions: { label: string; action: string }[];
}

const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Visão geral (início)',
  cartoes: 'Cartões',
  extrato: 'Extrato',
};

const PAGE_ACTIONS: Record<string, { label: string; action: string }[]> = {
  dashboard: [
    { label: 'Pix', action: 'navegar_pix' },
    { label: 'Fatura', action: 'ver_fatura' },
    { label: 'Transferências', action: 'ver_transferencias' },
    { label: 'Pagamentos', action: 'ver_pagamentos' },
    { label: 'Extrato', action: 'ver_extrato' },
  ],
  cartoes: [
    { label: 'Ver limite', action: 'ver_limite' },
    { label: 'Ver fatura', action: 'ver_fatura' },
    { label: 'Ver compras', action: 'ver_compras' },
    { label: 'Comparar cartões', action: 'comparar_cartoes' },
  ],
  extrato: [
    { label: 'Ver extrato completo', action: 'ver_extrato_completo' },
  ],
};

interface BuildPageContextArgs {
  pathname: string;
  section: string;
  selectedCard: CardId;
  cardOpen: CardId | null;
  comparisonOpen: { cardA: CardId; cardB: CardId } | null;
}

export function buildPageContext({ pathname, section, selectedCard, cardOpen, comparisonOpen }: BuildPageContextArgs): PageContext {
  const page = pathname.replace('/', '') || 'dashboard';
  return {
    page,
    pageTitle: PAGE_TITLES[page] ?? page,
    section,
    selectedCard,
    cardOpen,
    comparisonOpen,
    availableActions: PAGE_ACTIONS[page] ?? [],
  };
}

// Descrição legível do cartão aberto no momento (quando houver), pra enriquecer o contexto.
export function describeCard(id: CardId) {
  const card = cards.find(c => c.id === id);
  if (!card) return null;
  return { id: card.id, name: card.name, perks: card.perks };
}

// Texto em linguagem natural descrevendo a tela — igual um roteiro pro agente
// "enxergar" a página e responder por voz. Mesma diretriz em todas as telas.
const GUIDELINES = `Diretriz de resposta:
Nunca utilize negrito, itálico ou outras formas especiais em suas frases.
Formate as respostas para serem faladas de forma natural por voz.
Evite caracteres especiais e palavras difíceis.
Use frases simples e claras.
Sempre responda somente a dúvida específica do usuário sobre a página.
Não fale sobre outros assuntos.
Não ofereça ajuda geral.
Responda apenas dúvidas sobre o funcionamento e informações da página.`;

function describeScreen(args: BuildPageContextArgs): string {
  const { pathname, cardOpen, comparisonOpen } = args;
  const page = pathname.replace('/', '') || 'dashboard';

  if (comparisonOpen) {
    const a = cards.find(c => c.id === comparisonOpen.cardA)!;
    const b = cards.find(c => c.id === comparisonOpen.cardB)!;
    return `Descrição da Página — Comparação de Cartões

Está aberta uma janela comparando o cartão ${a.name} com o cartão ${b.name}, lado a lado.
Cada coluna mostra os benefícios do respectivo cartão: ${Object.entries(a.perks).map(([k, v]) => `${k} ${v}`).join(', ')} para o ${a.name}; e ${Object.entries(b.perks).map(([k, v]) => `${k} ${v}`).join(', ')} para o ${b.name}.
Para fechar essa comparação, o cliente clica no X no canto superior da janela.

Orientações simples para o usuário:
Compare os benefícios de cada cartão nas colunas.
Para fechar, clique no X no topo da janela.`;
  }

  if (cardOpen) {
    const card = cards.find(c => c.id === cardOpen)!;
    return `Descrição da Página — Detalhes do Cartão ${card.name}

Está aberta uma janela mostrando os detalhes do cartão ${card.name}, com o número, o nome do titular e a validade.
Abaixo aparecem os benefícios do cartão: ${Object.entries(card.perks).map(([k, v]) => `${k} ${v}`).join(', ')}.
Para fechar essa janela, o cliente clica no X no canto superior direito, ou no botão Fechar.

Orientações simples para o usuário:
Veja os benefícios listados abaixo do cartão.
Para fechar, clique no X ou no botão Fechar.`;
  }

  if (page === 'cartoes') {
    return `Descrição da Página — Cartões

A tela mostra os cartões do cliente e algumas opções de ação.
O cliente pode clicar para ver o limite disponível, ver a fatura atual, ver as compras recentes, ou comparar dois cartões lado a lado.

Orientações simples para o usuário:
Para ver o limite, clique em Ver limite.
Para ver a fatura, clique em Ver fatura.
Para comparar cartões, clique em Comparar cartões.`;
  }

  if (page === 'extrato') {
    return `Descrição da Página — Extrato

A tela mostra a lista de movimentações da conta, com data, nome do estabelecimento e valor de cada uma.
No final da lista tem um link para ver o extrato completo.

Orientações simples para o usuário:
Role a lista para ver as movimentações.
Para ver tudo, clique em Ver extrato completo.`;
  }

  return `Descrição da Página — Visão Geral

A tela inicial mostra o saldo disponível da conta no topo, e abaixo um menu de acessos rápidos: Pix, Fatura, Transferências, Pagamentos e Extrato.
Mais abaixo aparece a lista das últimas movimentações.

Orientações simples para o usuário:
Para fazer um Pix, clique no atalho Pix.
Para ver a fatura, clique no atalho Fatura.
Para ver o extrato, clique no atalho Extrato.`;
}

export function buildPageDescription(args: BuildPageContextArgs): string {
  return `${describeScreen(args)}\n\n${GUIDELINES}`;
}