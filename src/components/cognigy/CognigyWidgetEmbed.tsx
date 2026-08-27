import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useBanking } from '../../contexts/BankingContext';
import { buildPageContext, buildPageDescription } from '../../services/cognigy/pageContext';
import { apiUrl } from '../../services/apiBaseUrl';

// Não é chamada WebRTC direta — é uma ligação de telefonia real via Cognigy
// Voice Gateway, então session.sendInfo() do navegador NUNCA chega no Flow.
// A "visão" da página vai por outro caminho: nosso backend usa a Inject API
// do Cognigy (server-to-server) usando o mesmo userId da chamada.
const COGNIGY_USER_ID = import.meta.env.VITE_COGNIGY_USER_ID || 'onebank-demo-user';

function sendPageContextToBackend(pageContext: unknown, pageDescription: string) {
  fetch(apiUrl('/api/cognigy/banking/page-context'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: COGNIGY_USER_ID, pageContext, pageDescription }),
  })
    .then(async (res) => {
      const body = await res.json().catch(() => null);
      console.log('[pageContext] enviado', res.status, body);
    })
    .catch((err) => console.error('[pageContext] falhou (rede)', err));
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
    const args = {
      pathname: location.pathname,
      section: bank.section,
      selectedCard: bank.selectedCard,
      cardOpen: bank.cardDetail,
      comparisonOpen: bank.comparison,
    };
    sendPageContextToBackend(buildPageContext(args), buildPageDescription(args));
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

    let observer: MutationObserver | null = null;

    const fixCognigyTranscriptStructure = () => {
      const container = document.querySelector(
        '.webrtc_widget_container'
      );

      const transcriptWrapper = document.querySelector(
        '.webrtc_widget_transcript_wrapper'
      );

      if (!container || !transcriptWrapper) {
        return;
      }

      if (transcriptWrapper.parentElement === container) {
        return;
      }

      container.insertBefore(
        transcriptWrapper,
        container.firstChild
      );
    };

    // Só liga o observer DEPOIS que o widget terminar de se montar.
    // Ligar em paralelo com a inicialização dele causa uma corrida: mexemos no
    // DOM bem no meio do processo interno do widget (ele ainda está buscando o
    // asset de áudio), e isso trava o carregamento na primeira vez que a página
    // abre (só "destrava" com F5 porque aí o timing muda).
    const startObservingAfterWidgetReady = () => {
      if (observer) return;
      observer = new MutationObserver(() => {
        requestAnimationFrame(() => {
          fixCognigyTranscriptStructure();
        });
      });
      observer.observe(document.body, { childList: true, subtree: true });
      fixCognigyTranscriptStructure();
    };

    /*
     * =====================================================
     * INICIALIZAÇÃO DO COGNIGY
     * =====================================================
     */

    // Detecta chamada ativa observando a própria classe do widget, em vez dos
    // eventos newRTCSession/accepted (que não disparam nesse tipo de ligação
    // via Voice Gateway). O container do Cognigy usa uma classe "..._idle"
    // quando não há ligação; quando ela some, a ligação está em andamento.
    let callObserver: MutationObserver | null = null;
    const startWatchingCallState = () => {
      if (callObserver) return;
      const check = () => {
        const container = document.querySelector('.webrtc_widget_content_container');
        const isActive = !!container && !container.className.includes('_idle');
        if (isActive && !callActiveRef.current) {
          callActiveRef.current = true;
          const args = {
            pathname: location.pathname,
            section: bank.section,
            selectedCard: bank.selectedCard,
            cardOpen: bank.cardDetail,
            comparisonOpen: bank.comparison,
          };
          sendPageContextToBackend(buildPageContext(args), buildPageDescription(args));
        } else if (!isActive && callActiveRef.current) {
          callActiveRef.current = false;
        }
      };
      callObserver = new MutationObserver(check);
      callObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
      check();
    };

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
        .then(() => {
          // Só agora, com o widget pronto, começamos a corrigir a estrutura do DOM
          // e a observar o estado da chamada.
          startObservingAfterWidgetReady();
          startWatchingCallState();
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
        observer?.disconnect();
        callObserver?.disconnect();
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
        observer?.disconnect();
        callObserver?.disconnect();
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
      observer?.disconnect();
      callObserver?.disconnect();
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