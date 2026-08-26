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
