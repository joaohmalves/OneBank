import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useBanking } from '../../contexts/BankingContext';
import { buildPageContext } from '../../services/cognigy/pageContext';
import { apiUrl } from '../../services/apiBaseUrl';

// Não é chamada WebRTC direta — é uma ligação de telefonia real via Cognigy
// Voice Gateway, então session.sendInfo() do navegador NUNCA chega no Flow.
// A "visão" da página vai por outro caminho: nosso backend usa a Inject API
// do Cognigy (server-to-server) usando o mesmo userId da chamada.
const COGNIGY_USER_ID = import.meta.env.VITE_COGNIGY_USER_ID || 'onebank-demo-user';

function sendPageContextToBackend(pageContext: unknown) {
  fetch(apiUrl('/api/cognigy/banking/page-context'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: COGNIGY_USER_ID, pageContext }),
  }).catch(() => { /* chamada pode não estar ativa ainda; sem problema */ });
}

declare global {
  interface Window {
    initWebRTCWidget?: (
      endpointUrl: string,
      options?: unknown
    ) => Promise<{ on: (event: string, cb: (arg: unknown) => void) => void }>;
  }
}

let initialization: Promise<unknown> | null = null;

export function CognigyWidgetEmbed() {
  const endpointUrl = import.meta.env.VITE_COGNIGY_ENDPOINT_URL;
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const bank = useBanking();
  const callActiveRef = useRef(false);

  // Sempre que a tela mudar (rota, seção, cartão aberto, comparação), avisa o agente
  // enquanto houver uma chamada ativa — assim ele "enxerga" o que o cliente está vendo.
  useEffect(() => {
    if (!callActiveRef.current) return;
    sendPageContextToBackend(buildPageContext({
      pathname: location.pathname,
      section: bank.section,
      selectedCard: bank.selectedCard,
      cardOpen: bank.cardDetail,
      comparisonOpen: bank.comparison,
    }));
  }, [location.pathname, bank.section, bank.selectedCard, bank.cardDetail, bank.comparison]);


  useEffect(() => {
    document.body.classList.toggle('cognigy-drawer-open', open);

    return () => {
      document.body.classList.remove('cognigy-drawer-open');
    };
  }, [open]);

  useEffect(() => {
    if (!endpointUrl) {
      setError('Configure VITE_COGNIGY_ENDPOINT_URL no .env.');
      return;
    }

    /*
     * =====================================================
     * CORREÇÃO DA ESTRUTURA DO CLICK-TO-CALL
     * =====================================================
     *
     * O Cognigy cria originalmente:
     *
     * content_stack
     * ├── transcript_wrapper
     * └── widget_container
     *
     * Queremos:
     *
     * content_stack
     * └── widget_container
     *     ├── transcript_wrapper
     *     ├── content_container_calling
     *     └── powered_by
     *
     * Como o Cognigy cria esses elementos dinamicamente,
     * usamos um MutationObserver.
     */

    const fixCognigyTranscriptStructure = () => {
      const container = document.querySelector(
        '.webrtc_widget_container'
      );

      const transcriptWrapper = document.querySelector(
        '.webrtc_widget_transcript_wrapper'
      );

      // O Cognigy ainda não criou os elementos
      if (!container || !transcriptWrapper) {
        return;
      }

      // Já está dentro do container, não precisa fazer nada
      if (transcriptWrapper.parentElement === container) {
        return;
      }

      // Move o transcript para dentro do container
      container.insertBefore(
        transcriptWrapper,
        container.firstChild
      );
    };

    /*
     * Observa o DOM porque o Cognigy cria/recria
     * os elementos do Click-to-Call dinamicamente.
     */
    const observer = new MutationObserver(() => {
      requestAnimationFrame(() => {
        fixCognigyTranscriptStructure();
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Tenta corrigir caso o widget já exista
    fixCognigyTranscriptStructure();

    /*
     * =====================================================
     * INICIALIZAÇÃO DO COGNIGY
     * =====================================================
     */

    const initialize = () => {
      if (initialization || !window.initWebRTCWidget) {
        return;
      }

      initialization = window
        .initWebRTCWidget(endpointUrl, {
          userId:
            import.meta.env.VITE_COGNIGY_USER_ID ||
            'onebank-demo-user',

          ui: {
            labels: {
              callButton: 'Falar com a Carla',
              endButton: 'Encerrar chamada',
              listenLabel: 'Carla está ouvindo',
            },
          },
        })
        .then((widget) => {
          // Marca a chamada como ativa/inativa, pra saber quando mandar contexto.
          widget.on('newRTCSession', (raw) => {
            const session = raw as { on: (event: string, cb: () => void) => void };
            session.on('accepted', () => {
              callActiveRef.current = true;
              sendPageContextToBackend(buildPageContext({
                pathname: location.pathname,
                section: bank.section,
                selectedCard: bank.selectedCard,
                cardOpen: bank.cardDetail,
                comparisonOpen: bank.comparison,
              }));
            });
            session.on('ended', () => { callActiveRef.current = false; });
            session.on('terminated', () => { callActiveRef.current = false; });
          });
        })
        .catch((reason: unknown) => {
          console.error(
            'Falha ao iniciar o widget Cognigy:',
            reason
          );

          setError(
            'O Cognigy recusou a inicialização. Veja o Console do navegador.'
          );
        });
    };

    /*
     * Se o script já estiver carregado
     */
    if (window.initWebRTCWidget) {
      initialize();
      return () => {
        observer.disconnect();
      };
    }

    /*
     * Verifica se o script já está sendo carregado
     */
    const existing =
      document.querySelector<HTMLScriptElement>(
        'script[data-cognigy-widget]'
      );

    if (existing) {
      existing.addEventListener('load', initialize, {
        once: true,
      });

      return () => {
        observer.disconnect();
      };
    }

    /*
     * Carrega o script do Cognigy
     */
    const script = document.createElement('script');

    script.src =
      'https://github.com/Cognigy/click-to-call-widget/releases/latest/download/webRTCWidget.js';

    script.async = true;
    script.dataset.cognigyWidget = 'true';

    script.onload = initialize;

    script.onerror = () => {
      console.error(
        'Não foi possível carregar o Click-to-Call Widget do Cognigy.'
      );
    };

    document.body.appendChild(script);

    /*
     * Limpeza do observer quando o componente for desmontado
     */
    return () => {
      observer.disconnect();
    };
  }, [endpointUrl]);

  return (
    <>
      {!open && (
        <button
          className="cognigy-launcher"
          onClick={() => setOpen(true)}
        >
          Ligar para Carla
        </button>
      )}

      {open && (
        <button
          className="cognigy-drawer-close"
          onClick={() => setOpen(false)}
          aria-label="Fechar atendimento"
        >
          ×
        </button>
      )}

      {error && (
        <div className="cognigy-config-error">
          {error}
        </div>
      )}
    </>
  );
}