import { useEffect, useState } from 'react';

declare global {
  interface Window {
    initWebRTCWidget?: (
      endpointUrl: string,
      options?: unknown
    ) => Promise<unknown>;
  }
}

let initialization: Promise<unknown> | null = null;

export function CognigyWidgetEmbed() {
  const endpointUrl = import.meta.env.VITE_COGNIGY_ENDPOINT_URL;
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);

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