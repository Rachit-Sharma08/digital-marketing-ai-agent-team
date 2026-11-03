// Unattributed activity: the raw list of activity the office can't put at anyone's desk (agents without a desk, cards nobody
// owns, requests from deskless agents), with the adapter and agent ids as reported. "Unattributed activity" in Sarah mode.
import { sinceText } from '../../office/status';
import { useDelight } from '../DelightContext';

const KIND: Record<string, string> = { agent: 'Agent', card: 'Card', approval: 'Request' };

export function NainaWindow({ now }: { now: number }) {
  const { mode, unattributed } = useDelight();
  const sarah = mode.sarah;
  return (
    <div className="naina" data-testid="naina-corner">
      <p className="naina-intro">
        {sarah ? '' : 'Naina knows something. '}
        Activity no desk can hold: agents an adapter reports with no desk free, open cards nobody owns, and requests from agents without a desk.
      </p>
      {unattributed.length === 0
        ? <p className="muted naina-empty">{sarah ? 'Nothing unattributed: every agent, card and request has a desk.' : 'Naina knows nothing. For now.'}</p>
        : (
          <ul className="naina-list" aria-label={sarah ? 'Unattributed activity' : 'What Naina knows'}>
            {unattributed.map((i) => (
              <li key={i.id} className={`naina-item kind-${i.kind}`} data-unattributed={i.id}>
                <span className="naina-kind">{KIND[i.kind] ?? i.kind}</span>
                <div className="naina-body">
                  <strong className="naina-title">{i.title}</strong>
                  <span className="naina-detail">{i.detail}</span>
                  <code className="naina-raw">
                    {[i.adapter && `adapter: ${i.adapter}`, i.agentId && `agent: ${i.agentId}`, `id: ${i.id}`].filter(Boolean).join(' · ')}
                    {i.at ? ` · ${sinceText(i.at, now) ?? i.at}` : ''}
                  </code>
                </div>
              </li>
            ))}
          </ul>
        )}
      <p className="muted naina-foot">Give an agent a desk under <code>seats:</code> in config.yaml; a card or request moves to its desk once its agent has one.</p>
    </div>
  );
}
