import { ArrowDownLeft, ArrowUpRight, CheckCircle2, Clock3, CreditCard, RotateCcw, Store, WalletCards } from 'lucide-react';
import { machines, machineMovements as movements } from '../mocks/data';
import { money } from '../utils/format';
import { useBanking } from '../contexts/BankingContext';

const totalReceived = machines.reduce((sum, machine) => sum + machine.received, 0);
const totalRefunds = machines.reduce((sum, machine) => sum + machine.refunds, 0);
const totalTransactions = machines.reduce((sum, machine) => sum + machine.transactions, 0);
const totalCredit = machines.reduce((sum, machine) => sum + machine.creditAmount, 0);
const totalDebit = machines.reduce((sum, machine) => sum + machine.debitAmount, 0);
const totalCreditTransactions = machines.reduce((sum, machine) => sum + machine.creditTransactions, 0);
const totalDebitTransactions = machines.reduce((sum, machine) => sum + machine.debitTransactions, 0);

export function Statement() {
  const { selectedMachine, selectMachine } = useBanking();

  const filteredMovements = selectedMachine === 'Todas as maquininhas'
    ? movements
    : movements.filter((movement) => movement.machine === selectedMachine);

  return (
    <>
      <div className="title-row">
        <div>
          <small>MAQUININHAS</small>
          <h1>Suas maquininhas OneBank</h1>
        </div>
        <select value={selectedMachine} onChange={(event) => selectMachine(event.target.value)}>
          <option>Todas as maquininhas</option>
          {machines.map((machine) => <option key={machine.id}>{machine.name}</option>)}
        </select>
      </div>

      <section className="machine-hero">
        <div>
          <span>Vendas processadas</span>
          <h2>{money(totalReceived)}</h2>
          <p>{totalTransactions} transações realizadas nas suas maquininhas</p>
        </div>
        <CreditCard size={42} />
      </section>

      <section className="grid three machine-summary">
        <div className="panel machine-stat">
          <span>Vendas no crédito</span>
          <strong>{money(totalCredit)}</strong>
          <small><ArrowDownLeft size={14} /> {totalCreditTransactions} transações · repasse em até 30 dias</small>
        </div>
        <div className="panel machine-stat">
          <span>Vendas no débito</span>
          <strong>{money(totalDebit)}</strong>
          <small><ArrowDownLeft size={14} /> {totalDebitTransactions} transações · ciclo normal de repasse</small>
        </div>
        <div className="panel machine-stat">
          <span>Estornos</span>
          <strong>{money(totalRefunds)}</strong>
          <small><RotateCcw size={14} /> Valores devolvidos</small>
        </div>
      </section>

      <section className="machine-layout">
        <div className="panel">
          <div className="section-heading">
            <div>
              <small>LANÇAMENTOS RECENTES</small>
              <h3>Movimentações das maquininhas</h3>
            </div>
            <WalletCards size={20} />
          </div>

          {filteredMovements.map((movement) => (
            <div className="transaction machine-transaction" key={movement.id}>
              <span className="transaction-icon">
                {movement.type === 'refund' ? <RotateCcw size={17} /> : <ArrowUpRight size={17} />}
              </span>
              <span>
                <b>{movement.merchant}</b>
                <small>{movement.machine} · {movement.paymentType === 'credit' ? 'Crédito' : 'Débito'} · {movement.date} às {movement.time}</small>
              </span>
              <strong className={movement.type === 'refund' ? '' : 'positive'}>
                {movement.type === 'refund' ? '- ' : '+ '}{money(movement.amount)}
              </strong>
            </div>
          ))}
        </div>

        <div className="panel machine-list">
          <div className="section-heading">
            <div>
              <small>SEUS EQUIPAMENTOS</small>
              <h3>Consolidado por maquininha</h3>
            </div>
            <Store size={20} />
          </div>

          {machines.map((machine) => (
            <article className="machine-card" key={machine.id}>
              <div className="machine-card-top">
                <div className="machine-icon"><CreditCard size={19} /></div>
                <div>
                  <b>{machine.name}</b>
                  <small>{machine.serial} · {machine.location}</small>
                </div>
                <span className="machine-status">{machine.status}</span>
              </div>
              <div className="machine-card-values">
                <div><small>Crédito</small><strong>{money(machine.creditAmount)}</strong></div>
                <div><small>Débito</small><strong>{money(machine.debitAmount)}</strong></div>
                <div><small>Estornos</small><strong>{money(machine.refunds)}</strong></div>
              </div>
              <div className="machine-card-values">
                <div><small>Transações crédito</small><strong>{machine.creditTransactions}</strong></div>
                <div><small>Transações débito</small><strong>{machine.debitTransactions}</strong></div>
                <div><small>Crédito disponível para antecipação</small><strong>{money(machine.creditAmount)}</strong></div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="settlement-notice">
        <div className="settlement-icon"><Clock3 size={22} /></div>
        <div>
          <small>REPASSE E ANTECIPAÇÃO</small>
          <h3>Antecipação disponível somente para vendas no crédito</h3>
          <p>
            As vendas no crédito têm prazo de até 30 dias para chegar à conta administrativa. Se você pedir uma antecipação, o valor considerado será somente o saldo de crédito elegível. As vendas no débito não entram na antecipação e seguem o ciclo normal de repasse.
          </p>
        </div>
      </section>
    </>
  );
}
