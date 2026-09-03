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
    destroyWebRTCWidget?: () => void;
  }
}

// Timeout por tentativa e nº de retries antes de desistir e mostrar erro.
// Existem porque o initWebRTCWidget() pode ficar pendurado indefinidamente
// (fetch interno sem timeout / WebSocket que nunca conecta), travando o
// botão de chamada até o usuário dar F5. Ver histórico do chat para detalhes.
const WIDGET_INIT_TIMEOUT_MS = 8000;
const WIDGET_MAX_RETRIES = 2;

const WIDGET_SCRIPT_URL =
  'https://github.com/Cognigy/click-to-call-widget/releases/latest/download/webRTCWidget.js';

// Singleton em nível de módulo: garante que o <script> do widget só é
// injetado no DOM uma única vez, mesmo com o double-mount do
// React.StrictMode em dev ou remounts do componente. Ver comentário
// detalhado dentro do useEffect abaixo.
let widgetScriptPromise: Promise<void> | null = null;

function loadWidgetScriptOnce(): Promise<void> {
  // Script já executou com sucesso nesta página (nesta sessão ou numa
  // montagem anterior do componente) — não injeta de novo.
  if (window.initWebRTCWidget) {
    return Promise.resolve();
  }

  if (widgetScriptPromise) {
    return widgetScriptPromise;
  }

  widgetScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-cognigy-widget]'
    );

    if (existing) {
      // Já existe uma tag no DOM (de uma montagem anterior). Não
      // duplicamos — só penduramos nos callbacks dela.
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error('Falha ao baixar o script do widget Cognigy (rede/CDN).')),
        { once: true }
      );
      return;
    }

    const script = document.createElement('script');
    script.src = WIDGET_SCRIPT_URL;
    script.async = true;
    script.dataset.cognigyWidget = 'true';
    script.onload = () => resolve();
    script.onerror = () => {
      // Falhou antes de executar (erro de rede) — nunca chegou a rodar,
      // então é seguro remover e permitir uma nova tentativa de download
      // sem risco de redeclaração de identificadores globais.
      script.remove();
      widgetScriptPromise = null;
      reject(new Error('Falha ao baixar o script do widget Cognigy (rede/CDN).'));
    };

    document.body.appendChild(script);
  });

  return widgetScriptPromise;
}

export function CognigyWidgetEmbed() {
  const endpointUrl = import.meta.env.VITE_COGNIGY_ENDPOINT_URL;
  const [error, setError] = useState('');
  const [status, setStatus] = useState<string | null>(null);
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
      selectedMachine: bank.selectedMachine,
    };
    sendPageContextToBackend(buildPageContext(args), buildPageDescription(args));
  }, [location.pathname, bank.section, bank.selectedCard, bank.cardDetail, bank.comparison, bank.selectedMachine]);


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
            selectedMachine: bank.selectedMachine,
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

    let cancelled = false;
    let retryTimer: number | undefined;
    let attempt = 0;

    // Carrega o <script> UMA ÚNICA VEZ para a vida inteira da página.
    //
    // Por quê: webRTCWidget.js não é um módulo — ele declara dezenas de
    // `const`/`class` no escopo top-level do arquivo (const eV=..., class
    // Qu extends..., class zu extends...). Se essa tag <script> for
    // removida e reinjetada (ex.: por causa do StrictMode do React, que
    // monta -> desmonta -> monta de novo o efeito em dev), o navegador
    // executa o arquivo pela segunda vez e tenta redeclarar os mesmos
    // identificadores globais -> SyntaxError -> a execução aborta ANTES
    // de chegar na linha final `window.initWebRTCWidget = $u` -> nada
    // mais carrega, nem com F5 simples. Foi exatamente isso que quebrou
    // na versão anterior deste arquivo.
    //
    // Por isso o load do script fica num singleton em nível de módulo
    // (sobrevive ao double-mount do StrictMode) e nunca é refeito. Retry
    // de falha de rede/timeout mexe só na chamada de initWebRTCWidget(),
    // que o próprio bundle já protege internamente (a função exportada
    // chama destroy() antes de cada init, então é segura pra repetir).


    // Corre o initWebRTCWidget() contra um relógio: se ele não resolver nem
    // rejeitar dentro do timeout (o fetch de config interno do widget não
    // tem timeout próprio e pode ficar pendurado pra sempre), desistimos
    // dessa tentativa em vez de travar o botão indefinidamente.
    const initWithTimeout = () =>
      new Promise<void>((resolve, reject) => {
        if (!window.initWebRTCWidget) {
          reject(new Error('initWebRTCWidget não disponível após carregar o script.'));
          return;
        }

        let settled = false;
        const timer = window.setTimeout(() => {
          if (settled) return;
          settled = true;
          reject(new Error(`Timeout: widget não respondeu em ${WIDGET_INIT_TIMEOUT_MS}ms.`));
        }, WIDGET_INIT_TIMEOUT_MS);

        window
          .initWebRTCWidget(endpointUrl, {
            userId:
              import.meta.env.VITE_COGNIGY_USER_ID ||
              'onebank-demo-user',

            ui: {
              labels: {
                callButton: 'Falar com a Julia',
                endButton: 'Encerrar chamada',
                listenLabel: 'Julia está ouvindo',
              },
            },
          })
          .then(() => {
            if (settled) return;
            settled = true;
            window.clearTimeout(timer);
            resolve();
          })
          .catch((reason: unknown) => {
            if (settled) return;
            settled = true;
            window.clearTimeout(timer);
            reject(reason instanceof Error ? reason : new Error(String(reason)));
          });
      });

    const attemptInit = () => {
      if (cancelled) return;

      setError('');
      setStatus(
        attempt === 0
          ? 'Conectando…'
          : `Conectando… (tentativa ${attempt + 1} de ${WIDGET_MAX_RETRIES + 1})`
      );

      // Limpa qualquer instância anterior travada antes de tentar de novo.
      if (window.destroyWebRTCWidget) {
        try {
          window.destroyWebRTCWidget();
        } catch {
          // ignora erro de cleanup — o importante é seguir pra próxima tentativa
        }
      }

      loadWidgetScriptOnce()
        .then(() => initWithTimeout())
        .then(() => {
          if (cancelled) return;

          setStatus(null);
          attempt = 0;

          // Só agora, com o widget pronto, começamos a corrigir a estrutura do DOM
          // e a observar o estado da chamada.
          startObservingAfterWidgetReady();
          startWatchingCallState();
        })
        .catch((reason: unknown) => {
          if (cancelled) return;

          console.warn(`[CognigyWidgetEmbed] tentativa ${attempt + 1} falhou:`, reason);
          attempt += 1;

          if (attempt <= WIDGET_MAX_RETRIES) {
            setStatus(
              `Falha ao conectar. Tentando novamente… (${attempt + 1}/${WIDGET_MAX_RETRIES + 1})`
            );
            retryTimer = window.setTimeout(attemptInit, 800);
          } else {
            setStatus(null);
            setError('O Cognigy recusou a inicialização. Veja o Console do navegador.');
          }
        });
    };

    attemptInit();

    /*
     * Limpeza dos observers e do retry pendente quando o componente for desmontado
     */
    return () => {
      cancelled = true;
      if (retryTimer) window.clearTimeout(retryTimer);
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
          Ligar para Julia
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

      {status && (
        <div className="cognigy-widget-status" role="status" aria-live="polite">
          <span className="cognigy-widget-status-spinner" />
          {status}
        </div>
      )}

      {error && (
        <div className="cognigy-config-error">
          {error}
        </div>
      )}
    </>
  );
}