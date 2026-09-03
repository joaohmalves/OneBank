import { cards, machineMovements, machines } from '../../mocks/data';
import type { CardId } from '../../types/banking';

// "Visão" da página: o que está visível e os dados que o cliente consegue
// consultar naquele momento. Isso é enviado ao backend para a Cognigy responder
// perguntas específicas sobre a tela, inclusive valores, maquininhas e repasses.
export interface PageContext {
  page: string;
  pageTitle: string;
  section: string;
  selectedCard: CardId;
  cardOpen: CardId | null;
  comparisonOpen: { cardA: CardId; cardB: CardId } | null;
  availableActions: { label: string; action: string }[];
  machineContext?: {
    selectedMachine: string;
    totalReceived: number;
    totalRefunds: number;
    totalTransactions: number;
    totalCredit: number;
    totalDebit: number;
    totalCreditTransactions: number;
    totalDebitTransactions: number;
    anticipatableCredit: number;
    activeMachines: number;
    machines: typeof machines;
    movements: typeof machineMovements;
  };
}

const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Visão geral (início)',
  cartoes: 'Cartões',
  extrato: 'Maquininhas',
};

const PAGE_ACTIONS: Record<string, { label: string; action: string }[]> = {
  dashboard: [
    { label: 'Pix', action: 'navegar_pix' },
    { label: 'Fatura', action: 'ver_fatura' },
    { label: 'Transferências', action: 'ver_transferencias' },
    { label: 'Pagamentos', action: 'ver_pagamentos' },
    { label: 'Maquininhas', action: 'ver_maquininhas' },
  ],
  cartoes: [
    { label: 'Ver limite', action: 'ver_limite' },
    { label: 'Ver fatura', action: 'ver_fatura' },
    { label: 'Ver compras', action: 'ver_compras' },
    { label: 'Comparar cartões', action: 'comparar_cartoes' },
  ],
  extrato: [
    { label: 'Ver movimentações das maquininhas', action: 'ver_movimentacoes_maquininhas' },
    { label: 'Filtrar por maquininha', action: 'filtrar_maquininha' },
    { label: 'Consultar consolidado', action: 'ver_consolidado_maquininha' },
  ],
};

interface BuildPageContextArgs {
  pathname: string;
  section: string;
  selectedCard: CardId;
  cardOpen: CardId | null;
  comparisonOpen: { cardA: CardId; cardB: CardId } | null;
  selectedMachine?: string;
}

export function buildPageContext({
  pathname,
  section,
  selectedCard,
  cardOpen,
  comparisonOpen,
  selectedMachine = 'Todas as maquininhas',
}: BuildPageContextArgs): PageContext {
  const page = pathname.replace('/', '') || 'dashboard';

  const base: PageContext = {
    page,
    pageTitle: PAGE_TITLES[page] ?? page,
    section,
    selectedCard,
    cardOpen,
    comparisonOpen,
    availableActions: PAGE_ACTIONS[page] ?? [],
  };

  if (page === 'extrato') {
    const visibleMovements = selectedMachine === 'Todas as maquininhas'
      ? machineMovements
      : machineMovements.filter((movement) => movement.machine === selectedMachine);

    base.machineContext = {
      selectedMachine,
      totalReceived,
      totalRefunds,
      totalTransactions,
      totalCredit,
      totalDebit,
      totalCreditTransactions,
      totalDebitTransactions,
      anticipatableCredit: selectedMachine === 'Todas as maquininhas'
        ? totalCredit
        : machines.find((machine) => machine.name === selectedMachine)?.creditAmount ?? 0,
      activeMachines: machines.filter((machine) => machine.status === 'Ativa').length,
      machines,
      movements: visibleMovements,
    };
  }

  return base;
}

export function describeCard(id: CardId) {
  const card = cards.find(c => c.id === id);
  if (!card) return null;
  return { id: card.id, name: card.name, perks: card.perks };
}

const GUIDELINES = `Diretriz de resposta:
Nunca utilize negrito, itálico ou outras formas especiais em suas frases.
Formate as respostas para serem faladas de forma natural por voz.
Evite caracteres especiais e palavras difíceis.
Sempre responda somente a dúvida específica do usuário sobre a página.
Não fale sobre outros assuntos.
Não ofereça ajuda geral.
Quando a pergunta for sobre uma venda ou movimentação, use os dados enviados no contexto da página e informe o valor, a maquininha, a data e o horário quando essas informações estiverem disponíveis.
Quando a pergunta for sobre uma maquininha específica, use os dados consolidados daquele equipamento.
Para antecipação, considere somente vendas no crédito. Nunca inclua vendas no débito, estornos ou qualquer outro valor no valor antecipável.
Quando o usuário pedir para antecipar, informe que a antecipação incide apenas sobre o crédito elegível e que as vendas no débito seguem o ciclo normal de repasse.
Não invente valores, vendas, datas, horários, máquinas ou informações de repasse que não estejam no contexto enviado.
Responda apenas dúvidas sobre o funcionamento e informações da página.`;

function describeMachineContext(selectedMachine: string): string {
  const visibleMovements = selectedMachine === 'Todas as maquininhas'
    ? machineMovements
    : machineMovements.filter((movement) => movement.machine === selectedMachine);

  const machineDetails = machines.map((machine) =>
    `${machine.name}: número de série ${machine.serial}; localização ${machine.location}; status ${machine.status}; total processado ${formatMoney(machine.received)}; crédito ${formatMoney(machine.creditAmount)} em ${machine.creditTransactions} transações; débito ${formatMoney(machine.debitAmount)} em ${machine.debitTransactions} transações; estornos ${formatMoney(machine.refunds)}; crédito com repasse em ${machine.creditSettlement}; crédito disponível para antecipação ${formatMoney(machine.creditAmount)}; próximo repasse ${machine.nextSettlement}.`
  ).join('\n');

  const movementDetails = visibleMovements.map((movement) =>
    `${movement.type === 'refund' ? 'Estorno' : 'Venda'} de ${formatMoney(movement.amount)}; ${movement.merchant.replace(/^Venda · |^Estorno · /, '')}; maquininha ${movement.machine}; ${movement.date} às ${movement.time}.`
  ).join('\n');

  const selectedMachineData = machines.find((machine) => machine.name === selectedMachine);
  const anticipatableCredit = selectedMachine === 'Todas as maquininhas'
    ? totalCredit
    : selectedMachineData?.creditAmount ?? 0;

  return `Dados detalhados da Página — Maquininhas

Filtro atual: ${selectedMachine}.

Consolidado geral:
Crédito: ${formatMoney(totalCredit)} em ${totalCreditTransactions} transações.
Débito: ${formatMoney(totalDebit)} em ${totalDebitTransactions} transações.
Valor de crédito elegível para antecipação no filtro atual: ${formatMoney(anticipatableCredit)}.
Regra de antecipação: somente crédito. Débito não é antecipável. Crédito tem prazo de até 30 dias para repasse à conta administrativa.

Consolidado das maquininhas:
${machineDetails}

Movimentações exibidas no filtro atual:
${movementDetails || 'Nenhuma movimentação para o filtro selecionado.'}`;
}

function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const totalReceived = machines.reduce((sum, machine) => sum + machine.received, 0);
const totalRefunds = machines.reduce((sum, machine) => sum + machine.refunds, 0);
const totalTransactions = machines.reduce((sum, machine) => sum + machine.transactions, 0);
const totalCredit = machines.reduce((sum, machine) => sum + machine.creditAmount, 0);
const totalDebit = machines.reduce((sum, machine) => sum + machine.debitAmount, 0);
const totalCreditTransactions = machines.reduce((sum, machine) => sum + machine.creditTransactions, 0);
const totalDebitTransactions = machines.reduce((sum, machine) => sum + machine.debitTransactions, 0);

function describeScreen(args: BuildPageContextArgs): string {
  const { pathname, cardOpen, comparisonOpen, selectedMachine = 'Todas as maquininhas' } = args;
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
    return `Descrição da Página — Maquininhas

A tela mostra as duas maquininhas OneBank do cliente, o valor recebido por cada equipamento, os estornos, a quantidade de transações, o status, a localização e o próximo repasse.
Também mostra as movimentações recentes, com o tipo da movimentação, estabelecimento, valor, maquininha, data e horário.

Resumo da página:
Vendas processadas: ${formatMoney(totalReceived)}.
Vendas no crédito: ${formatMoney(totalCredit)}.
Vendas no débito: ${formatMoney(totalDebit)}.
Estornos: ${formatMoney(totalRefunds)}.
Total de transações: ${totalTransactions}.
Crédito elegível para antecipação no filtro atual: ${formatMoney(selectedMachine === 'Todas as maquininhas' ? totalCredit : machines.find((machine) => machine.name === selectedMachine)?.creditAmount ?? 0)}.
Maquininhas ativas: ${machines.filter((machine) => machine.status === 'Ativa').length}.

${describeMachineContext(selectedMachine)}

Orientações simples para o usuário:
Use o filtro no topo para consultar uma maquininha específica.
Nas movimentações, é possível identificar o valor, a maquininha, o estabelecimento, a data e o horário de cada venda ou estorno.
No consolidado por maquininha, consulte os valores recebidos, os estornos, as transações e o próximo repasse de cada equipamento.`;
  }

  return `Descrição da Página — Visão Geral

A tela inicial mostra o saldo disponível da conta no topo, e abaixo um menu de acessos rápidos: Pix, Fatura, Transferências, Pagamentos e Maquininhas.
Mais abaixo aparece a lista das últimas movimentações.

Orientações simples para o usuário:
Para fazer um Pix, clique no atalho Pix.
Para ver a fatura, clique no atalho Fatura.
Para consultar as maquininhas, clique no atalho Maquininhas.`;
}

export function buildPageDescription(args: BuildPageContextArgs): string {
  return `${describeScreen(args)}\n\n${GUIDELINES}`;
}
