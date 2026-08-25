import { X } from 'lucide-react';
import { cards } from '../../mocks/data';
import { useBanking } from '../../contexts/BankingContext';

export function CardDetailModal() {
  const { cardDetail, closeCardDetail } = useBanking();
  if (!cardDetail) return null;
  const card = cards.find(c => c.id === cardDetail)!;
  return (
    <div className="modal-backdrop" onClick={closeCardDetail}>
      <section className="comparison-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={closeCardDetail}><X /></button>
        <small>SEU NOVO CARTÃO</small>
        <h2>{card.name}</h2>
        <div className={`bank-card ${card.color}`}>
          <span>onebank</span>
          <strong>{card.name.replace('OneBank ', '')}</strong>
          <p>{card.number}</p>
          <footer><small>{card.holder}</small><small>VALIDADE {card.expiry}</small></footer>
        </div>
        <table>
          <tbody>
            {Object.entries(card.perks).map(([key, value]) => (
              <tr key={key}><th>{key}</th><td>{value}</td></tr>
            ))}
          </tbody>
        </table>
        <button className="primary" onClick={closeCardDetail}>Fechar</button>
      </section>
    </div>
  );
}
