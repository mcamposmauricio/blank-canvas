(function() {
  'use strict';

  const WIDGET_VERSION = '1.0.0';
  const BASE_URL = window.NPS_WIDGET_BASE_URL || 'https://nps-connect-link.lovable.app';

  // Styles for the widget
  const WIDGET_STYLES = `
    .nps-widget-container {
      position: fixed;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }
    .nps-widget-container.bottom-right {
      bottom: 20px;
      right: 20px;
    }
    .nps-widget-container.bottom-left {
      bottom: 20px;
      left: 20px;
    }
    .nps-widget-container.center-modal {
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
    .nps-widget-iframe {
      border: none;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
      background: transparent;
      width: 0;
      height: 0;
      overflow: hidden;
      max-width: calc(100vw - 32px);
      max-height: calc(100vh - 32px);
      transition: width 0.3s ease, height 0.3s ease;
    }
    .nps-widget-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 999998;
    }
    @media (max-width: 480px) {
      .nps-widget-container {
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        transform: none !important;
      }
      .nps-widget-iframe {
        width: 100%;
        max-width: 100%;
        border-radius: 12px 12px 0 0;
      }
    }
  `;

  class NPSWidget {
    constructor() {
      this.container = null;
      this.iframe = null;
      this.overlay = null;
      this.config = {
        apiKey: null,
        externalId: null,
        position: 'bottom-right',
        showOverlay: false,
        onComplete: null,
        onDismiss: null,
        onError: null
      };
      this.initialized = false;
    }

    init(options) {
      if (this.initialized) {
        console.warn('NPS Widget already initialized');
        return;
      }

      Object.assign(this.config, options);

      if (!this.config.apiKey || !this.config.externalId) {
        console.error('NPS Widget: apiKey and externalId are required');
        if (this.config.onError) {
          this.config.onError({ message: 'apiKey and externalId are required' });
        }
        return;
      }

      this.injectStyles();
      this.createWidget();
      this.setupMessageListener();
      this.initialized = true;
    }

    injectStyles() {
      if (document.getElementById('nps-widget-styles')) return;

      const style = document.createElement('style');
      style.id = 'nps-widget-styles';
      style.textContent = WIDGET_STYLES;
      document.head.appendChild(style);
    }

    createWidget() {
      // Create overlay if needed
      if (this.config.showOverlay || this.config.position === 'center-modal') {
        this.overlay = document.createElement('div');
        this.overlay.className = 'nps-widget-overlay';
        this.overlay.addEventListener('click', () => this.dismiss());
        document.body.appendChild(this.overlay);
      }

      // Create container
      this.container = document.createElement('div');
      this.container.className = `nps-widget-container ${this.config.position}`;

      // Create iframe
      this.iframe = document.createElement('iframe');
      this.iframe.className = 'nps-widget-iframe';
      this.iframe.src = `${BASE_URL}/embed?api_key=${encodeURIComponent(this.config.apiKey)}&external_id=${encodeURIComponent(this.config.externalId)}`;

      this.container.appendChild(this.iframe);
      document.body.appendChild(this.container);
    }

    setupMessageListener() {
      window.addEventListener('message', (event) => {
        const data = event.data;

        if (data.type === 'nps-ready') {
          if (this.iframe) {
            this.iframe.style.width = '400px';
            this.iframe.style.height = '450px';
          }
          if (this.overlay) {
            this.overlay.style.display = 'block';
          }
        } else if (data.type === 'nps-no-survey') {
          this.destroy();
        } else if (data.type === 'nps-complete') {
          this.handleComplete(data.score);
        } else if (data.type === 'nps-dismiss') {
          this.dismiss();
        }
      });
    }

    handleComplete(score) {
      if (this.config.onComplete) {
        this.config.onComplete({ score });
      }

      // Auto-hide after delay
      setTimeout(() => {
        this.destroy();
      }, 2000);
    }

    dismiss() {
      if (this.config.onDismiss) {
        this.config.onDismiss();
      }
      this.destroy();
    }

    destroy() {
      if (this.container) {
        this.container.remove();
        this.container = null;
      }
      if (this.overlay) {
        this.overlay.remove();
        this.overlay = null;
      }
      this.iframe = null;
      this.initialized = false;
    }

    show() {
      if (this.container) {
        this.container.style.display = 'block';
      }
      if (this.overlay) {
        this.overlay.style.display = 'block';
      }
    }

    hide() {
      if (this.container) {
        this.container.style.display = 'none';
      }
      if (this.overlay) {
        this.overlay.style.display = 'none';
      }
    }
  }

  // Create global instance
  window.NPSWidget = new NPSWidget();

  // Auto-init from data attributes
  document.addEventListener('DOMContentLoaded', function() {
    const script = document.querySelector('script[data-api-key][data-external-id]');
    if (script) {
      window.NPSWidget.init({
        apiKey: script.getAttribute('data-api-key'),
        externalId: script.getAttribute('data-external-id'),
        position: script.getAttribute('data-position') || 'bottom-right',
        showOverlay: script.getAttribute('data-overlay') === 'true'
      });
    }
  });

  console.log(`NPS Widget v${WIDGET_VERSION} loaded`);
})();
