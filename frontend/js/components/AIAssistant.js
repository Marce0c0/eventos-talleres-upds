// Asistente Académico Conversacional UPDS (TutorIA)
// Agente interactivo 100% gratuito ($0.00 USD) con arrastre libre, física táctil, persistencia y contexto reactivo en vivo.

import { Icons } from './Icons.js';
import { store } from '../state/store.js';
import { getStoredEvents } from '../views/EventsView.js';

const STORAGE_KEY = 'upds_assistant_pos_v1';
const INTRO_SHOWN_KEY = 'upds_assistant_intro_dismissed';

export class AIAssistant {
  static instance = null;

  static init() {
    if (!AIAssistant.instance) {
      AIAssistant.instance = new AIAssistant();
      AIAssistant.instance.mount();
    }
    return AIAssistant.instance;
  }

  constructor() {
    this.isOpen = false;
    this.isDragging = false;
    this.hasDragged = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.initialLeft = 0;
    this.initialTop = 0;
    this.lastDeltaX = 0;
    this.messages = [];
  }

  mount() {
    if (document.getElementById('upds-assistant-root')) return;

    // Contenedor principal
    const root = document.createElement('div');
    root.id = 'upds-assistant-root';
    root.className = 'upds-assistant-root';

    // 1. Burbuja Flotante Draggable
    const bubble = document.createElement('div');
    bubble.id = 'upds-assistant-bubble';
    bubble.className = 'upds-assistant-bubble';
    bubble.setAttribute('role', 'button');
    bubble.setAttribute('tabindex', '0');
    bubble.setAttribute('aria-label', 'Abrir asistente virtual UPDS');
    bubble.title = 'Asistente Académico UPDS (Arrastra para mover a cualquier lugar)';

    bubble.innerHTML = `
      <div class="assistant-aura-ring"></div>
      <div class="assistant-pulse-dot"></div>
      <div class="assistant-bubble-core">
        <span class="assistant-bot-icon">${Icons.bot('bot-svg', 26)}</span>
        <span class="assistant-sparkle-badge">${Icons.sparkles('sparkle-svg', 11)}</span>
      </div>
      <div class="assistant-invite-tooltip" id="assistant-invite-tooltip">
        <span class="invite-icon">${Icons.sparkles('sparkle-subtle', 12)}</span>
        <span class="invite-text">¿Dudas de cursos o talleres? <strong>¡Pregúntame!</strong></span>
        <button class="invite-close-btn" id="invite-close-btn" type="button" aria-label="Cerrar sugerencia">
          ${Icons.x('x-svg', 10)}
        </button>
      </div>
    `;

    // 2. Ventana de Chat Flotante Unificada (Morphing Canvas con Arrastre desde la Cabecera)
    const windowEl = document.createElement('div');
    windowEl.id = 'upds-assistant-window';
    windowEl.className = 'upds-assistant-window';
    windowEl.setAttribute('aria-hidden', 'true');

    windowEl.innerHTML = `
      <!-- Tarjeta Contenedora del Chat -->
      <div class="assistant-window-card">
        <!-- Encabezado de la Ventana Arrastrable con Asa de Agarre -->
        <div class="assistant-header" id="assistant-header" title="Arrastra desde aquí para mover el chat">
          <div class="assistant-header-drag-handle" aria-hidden="true">
            <span class="drag-grip-bar"></span>
          </div>
          <div class="assistant-header-identity">
            <div class="assistant-avatar-badge">
              ${Icons.bot('header-bot-svg', 20)}
              <span class="assistant-status-indicator" title="En línea y actualizado"></span>
            </div>
            <div class="assistant-header-meta">
              <div style="display:flex; align-items:center; gap:0.4rem;">
                <h3 class="assistant-header-title">TutorIA UPDS</h3>
                <div class="assistant-voice-wave" id="assistant-voice-wave" title="Asistente interactuando">
                  <span class="voice-bar"></span>
                  <span class="voice-bar"></span>
                  <span class="voice-bar"></span>
                </div>
              </div>
              <span class="assistant-header-subtitle">Asistente Académico del Campus</span>
            </div>
          </div>
          <div class="assistant-header-actions">
            <button class="assistant-tool-btn" id="assistant-reset-pos-btn" type="button" title="Restablecer posición inicial">
              ${Icons.rotateCcw('tool-icon', 13)}
            </button>
            <button class="assistant-tool-btn assistant-close-btn" id="assistant-close-btn" type="button" title="Minimizar asistente">
              ${Icons.minimize('tool-icon', 14)}
            </button>
          </div>
        </div>

        <!-- Cuerpo de Mensajes -->
        <div class="assistant-body" id="assistant-messages-container">
          <!-- Los mensajes se inyectan dinámicamente -->
        </div>

        <!-- Sugerencias Rápidas de Pregunta -->
        <div class="assistant-chips-container" id="assistant-chips-container">
          <button class="assistant-chip" type="button" data-prompt="¿Qué cursos y talleres están disponibles?">
            ${Icons.book('chip-icon', 12)} Cursos y Talleres
          </button>
          <button class="assistant-chip" type="button" data-prompt="¿Cuáles cursos son 100% gratuitos?">
            ${Icons.award('chip-icon', 12)} Cursos Gratuitos
          </button>
          <button class="assistant-chip" type="button" data-prompt="¿Cuándo es el próximo Hackathon del campus?">
            ${Icons.trophy('chip-icon', 12)} Próximo Hackathon
          </button>
          <button class="assistant-chip" type="button" data-prompt="¿Cómo descargo o visualizo mi entrada con código QR?">
            ${Icons.qrcode('chip-icon', 12)} Mi Pase QR
          </button>
        </div>

        <!-- Barra de Entrada y Envío (Altura Estable Inmutable) -->
        <form class="assistant-footer" id="assistant-chat-form">
          <input 
            type="text" 
            id="assistant-input" 
            class="assistant-input" 
            placeholder="Escribe tu consulta sobre cursos, horarios, pases..." 
            autocomplete="off" 
            maxlength="280"
          />
          <button type="submit" class="assistant-send-btn" id="assistant-send-btn" aria-label="Enviar pregunta">
            ${Icons.send('send-icon', 15)}
          </button>
        </form>
      </div>
    `;

    root.appendChild(bubble);
    root.appendChild(windowEl);
    document.body.appendChild(root);

    this.root = root;
    this.bubble = bubble;
    this.windowEl = windowEl;
    this.messagesContainer = windowEl.querySelector('#assistant-messages-container');
    this.input = windowEl.querySelector('#assistant-input');
    this.form = windowEl.querySelector('#assistant-chat-form');
    this.chipsContainer = windowEl.querySelector('#assistant-chips-container');
    this.tooltip = bubble.querySelector('#assistant-invite-tooltip');

    // Restaurar o fijar posición inicial persistente
    this.restorePosition();

    // Eventos de arrastre táctil y físico de la burbuja (estado cerrado)
    this.bindDragEvents();

    // Eventos de arrastre desde la cabecera del chat (estado abierto)
    this.bindHeaderDragEvents();

    // Eventos de la ventana de chat y chips
    this.bindChatEvents();

    // Iniciar con mensaje de bienvenida en memoria
    this.initWelcomeMessage();

    // Control del tooltip de invitación
    this.setupTooltipLifecycle();

    // Ajustar si la ventana cambia de tamaño
    window.addEventListener('resize', () => this.clampToBounds());
  }

  // Posicionamiento persistente en localStorage con imantación lateral
  restorePosition() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const bubbleSize = 58;
        const margin = 16;
        let targetLeft = 0;

        if (parsed.side === 'left' || (typeof parsed.left === 'number' && parsed.left < window.innerWidth / 2)) {
          targetLeft = margin;
        } else {
          targetLeft = window.innerWidth - bubbleSize - margin;
        }

        const maxTop = Math.max(margin, window.innerHeight - bubbleSize - margin);
        const top = typeof parsed.top === 'number' 
          ? Math.min(Math.max(parsed.top, margin), maxTop) 
          : (window.innerHeight - bubbleSize - margin - 10);

        this.bubble.style.left = `${targetLeft}px`;
        this.bubble.style.top = `${top}px`;
        this.bubble.style.right = 'auto';
        this.bubble.style.bottom = 'auto';
        this.updateTooltipOrientation();
        return;
      } catch {}
    }

    // Posición inicial por defecto: imantado a la derecha abajo
    this.resetToDefaultPosition(false);
  }

  resetToDefaultPosition(save = true) {
    const bubbleSize = 58;
    const margin = 16;
    const left = window.innerWidth - bubbleSize - margin;
    const top = window.innerHeight - bubbleSize - margin - 12;

    this.bubble.style.left = `${left}px`;
    this.bubble.style.top = `${top}px`;
    this.bubble.style.right = 'auto';
    this.bubble.style.bottom = 'auto';

    this.updateTooltipOrientation();

    if (save) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ side: 'right', left, top }));
    }
  }

  // Imantado magnético obligatorio a los laterales (pantalla izquierda o derecha)
  snapToNearestEdge(animate = true) {
    const bubbleSize = 58;
    const margin = 16;
    const currentLeft = this.bubble.offsetLeft;
    const currentTop = this.bubble.offsetTop;

    const bubbleCenterX = currentLeft + bubbleSize / 2;
    const isLeftHalf = bubbleCenterX < window.innerWidth / 2;

    const targetLeft = isLeftHalf ? margin : (window.innerWidth - bubbleSize - margin);
    const maxTop = Math.max(margin, window.innerHeight - bubbleSize - margin);
    const clampedTop = Math.min(Math.max(currentTop, margin), maxTop);

    if (animate) {
      this.bubble.style.transition = 'left 0.42s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.42s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
    } else {
      this.bubble.style.transition = '';
    }

    this.bubble.style.left = `${targetLeft}px`;
    this.bubble.style.top = `${clampedTop}px`;

    const side = isLeftHalf ? 'left' : 'right';
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ side, top: clampedTop, left: targetLeft }));

    this.updateTooltipOrientation();

    // Actualizar ventana del chat conectada con la animación de imantación
    if (this.isOpen) {
      this.positionWindow();
    }

    if (animate) {
      setTimeout(() => {
        this.bubble.style.transition = '';
        if (this.isOpen) {
          this.positionWindow();
        }
      }, 450);
    }
  }

  // Orientación adaptativa del Tooltip de Invitación según la ubicación del ícono
  updateTooltipOrientation() {
    if (!this.tooltip) return;
    const bubbleRect = this.bubble.getBoundingClientRect();
    const isLeftHalf = (bubbleRect.left + bubbleRect.width / 2) < window.innerWidth / 2;
    const isNearTop = bubbleRect.top < 65;

    this.tooltip.classList.toggle('tooltip-right', isLeftHalf);
    this.tooltip.classList.toggle('tooltip-left', !isLeftHalf);
    this.tooltip.classList.toggle('tooltip-near-top', isNearTop);
  }

  clampToBounds() {
    this.snapToNearestEdge(false);
  }

  // Lógica de arrastre con física táctil ("siente el movimiento")
  bindDragEvents() {
    const onPointerDown = (e) => {
      // Ignorar si se hace clic en el botón de cerrar del tooltip
      if (e.target.closest('#invite-close-btn')) return;

      this.isDragging = false;
      this.hasDragged = false;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.initialLeft = this.bubble.offsetLeft;
      this.initialTop = this.bubble.offsetTop;
      this.lastDeltaX = 0;

      this.bubble.setPointerCapture(e.pointerId);

      // Micro-animación de anticipación al presionar
      this.bubble.classList.add('is-pressed');

      const onPointerMove = (moveEvent) => {
        const dx = moveEvent.clientX - this.dragStartX;
        const dy = moveEvent.clientY - this.dragStartY;
        const dist = Math.hypot(dx, dy);

        // Umbral para distinguir click de arrastre
        if (!this.hasDragged && dist > 6) {
          this.hasDragged = true;
          this.isDragging = true;
          this.bubble.classList.remove('is-pressed');
          this.bubble.classList.add('is-dragging');
          // Ocultar tooltip al arrastrar
          if (this.tooltip) this.tooltip.style.opacity = '0';
        }

        if (this.isDragging) {
          const bubbleSize = 58;
          const margin = 10;
          const maxLeft = window.innerWidth - bubbleSize - margin;
          const maxTop = window.innerHeight - bubbleSize - margin;

          const nextLeft = Math.min(Math.max(this.initialLeft + dx, margin), maxLeft);
          const nextTop = Math.min(Math.max(this.initialTop + dy, margin), maxTop);

          this.bubble.style.left = `${nextLeft}px`;
          this.bubble.style.top = `${nextTop}px`;

          // Actualizar orientación del tooltip de invitación en tiempo real durante el arrastre
          this.updateTooltipOrientation();

          // Física dinámica: inclinación (tilt) y deformación elástica según velocidad horizontal
          const currentDeltaX = moveEvent.movementX || (moveEvent.clientX - (this.prevClientX || moveEvent.clientX));
          this.prevClientX = moveEvent.clientX;

          const tilt = Math.min(Math.max(currentDeltaX * 1.8, -22), 22);
          const stretch = Math.min(Math.hypot(moveEvent.movementX || 0, moveEvent.movementY || 0) * 0.008, 0.14);

          this.bubble.style.transform = `scale(${1 + stretch}, ${1 - stretch * 0.5}) rotate(${tilt}deg)`;

          // Si el chat está abierto mientras se arrastra, mover ventana o cerrarla suavemente
          if (this.isOpen) {
            this.positionWindow();
          }
        }
      };

      const onPointerUp = (upEvent) => {
        this.bubble.releasePointerCapture(upEvent.pointerId);
        this.bubble.removeEventListener('pointermove', onPointerMove);
        this.bubble.removeEventListener('pointerup', onPointerUp);
        this.bubble.removeEventListener('pointercancel', onPointerUp);

        this.bubble.classList.remove('is-pressed');
        this.bubble.classList.remove('is-dragging');

        // Física de rebote y retorno suave al soltar (spring settling)
        this.bubble.style.transform = 'scale(1) rotate(0deg)';

        this.updateTooltipOrientation();

        if (this.hasDragged) {
          // Imantación magnética obligatoria al lateral más cercano (izquierdo o derecho)
          this.snapToNearestEdge(true);
        } else {
          // Fue un clic auténtico: toggle de la ventana
          this.toggleChat();
        }

        this.isDragging = false;
        this.hasDragged = false;
      };

      this.bubble.addEventListener('pointermove', onPointerMove);
      this.bubble.addEventListener('pointerup', onPointerUp);
      this.bubble.addEventListener('pointercancel', onPointerUp);
    };

    this.bubble.addEventListener('pointerdown', onPointerDown);

    // Accesibilidad por teclado (Enter / Espacio abre el chat)
    this.bubble.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.toggleChat();
      }
    });
  }

  // Gestión de Eventos del Chat
  bindChatEvents() {
    // Cerrar / Minimizar
    this.windowEl.querySelector('#assistant-close-btn')?.addEventListener('click', () => {
      this.closeChat();
    });

    // Resetear posición
    this.windowEl.querySelector('#assistant-reset-pos-btn')?.addEventListener('click', () => {
      this.resetToDefaultPosition(true);
      if (this.isOpen) this.positionWindow();
    });

    // Formulario de Envío
    this.form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = this.input.value.trim();
      if (!text) return;
      this.sendMessage(text);
      this.input.value = '';
    });

    // Clics en sugerencias rápidas (Chips)
    this.chipsContainer?.addEventListener('click', (e) => {
      const chip = e.target.closest('.assistant-chip');
      if (chip && chip.dataset.prompt) {
        this.sendMessage(chip.dataset.prompt);
      }
    });

    // Cerrar con Escape
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.closeChat();
      }
    });
  }

  setupTooltipLifecycle() {
    if (!this.tooltip) return;

    const dismissed = localStorage.getItem(INTRO_SHOWN_KEY);
    if (!dismissed) {
      // Mostrar con retardo elegante para llamar la atención sin estorbar
      setTimeout(() => {
        if (!this.isOpen && this.tooltip) {
          this.tooltip.classList.add('is-visible');
        }
      }, 1800);
    }

    const closeBtn = this.tooltip.querySelector('#invite-close-btn');
    closeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.dismissTooltip();
    });
  }

  dismissTooltip() {
    if (this.tooltip) {
      this.tooltip.classList.remove('is-visible');
      localStorage.setItem(INTRO_SHOWN_KEY, 'true');
    }
  }

  toggleChat() {
    if (this.isOpen) {
      this.closeChat();
    } else {
      this.openChat();
    }
  }

  openChat() {
    this.isOpen = true;
    this.dismissTooltip();
    this.positionWindow();
    this.windowEl.classList.add('is-open');
    this.windowEl.setAttribute('aria-hidden', 'false');
    this.bubble.classList.add('is-active');
    this.bubble.classList.add('is-hidden-by-chat');

    // Auto-focus en el input sin retrasos bruscos
    setTimeout(() => {
      this.input?.focus();
      this.scrollToBottom();
    }, 180);
  }

  closeChat() {
    this.isOpen = false;
    this.windowEl.classList.remove('is-open');
    this.windowEl.setAttribute('aria-hidden', 'true');
    this.bubble.classList.remove('is-active');
    this.bubble.classList.remove('is-hidden-by-chat');
  }

  // Posicionamiento ergonómico y estable del chat (Dimensiones fijas sin comprimir input)
  positionWindow() {
    const bubbleRect = this.bubble.getBoundingClientRect();
    const windowWidth = Math.min(384, window.innerWidth - 24);
    const windowHeight = Math.min(530, window.innerHeight - 36);

    const bubbleCenterX = bubbleRect.left + bubbleRect.width / 2;
    const isLeft = bubbleCenterX < window.innerWidth / 2;

    // Horizontal: Pegado al lateral correspondiente con 16px de margen
    const targetLeft = isLeft ? 16 : (window.innerWidth - windowWidth - 16);

    // Vertical: Posición cómoda y natural
    let targetTop = 0;
    if (bubbleRect.top > window.innerHeight / 2) {
      targetTop = window.innerHeight - windowHeight - 16;
    } else {
      targetTop = 16;
    }

    targetTop = Math.max(12, Math.min(targetTop, window.innerHeight - windowHeight - 12));

    this.windowEl.style.left = `${Math.round(targetLeft)}px`;
    this.windowEl.style.top = `${Math.round(targetTop)}px`;
    this.windowEl.style.width = `${windowWidth}px`;
    this.windowEl.style.height = `${windowHeight}px`;

    // Origen de apertura suave desde la esquina donde descansa la burbuja
    const originY = bubbleRect.top > window.innerHeight / 2 ? 'bottom' : 'top';
    const originX = isLeft ? 'left' : 'right';
    this.windowEl.style.transformOrigin = `${originX} ${originY}`;
  }

  // Arrastre fluido de la ventana entera desde la cabecera (Sin tocar ni achicar el chat)
  bindHeaderDragEvents() {
    const header = this.windowEl.querySelector('#assistant-header');
    if (!header) return;

    let isHeaderDragging = false;
    let headerStartX = 0;
    let headerStartY = 0;
    let initialWinLeft = 0;
    let initialWinTop = 0;

    header.addEventListener('pointerdown', (e) => {
      // Ignorar clics sobre los botones de minimizar o reiniciar
      if (e.target.closest('.assistant-tool-btn')) return;

      isHeaderDragging = false;
      headerStartX = e.clientX;
      headerStartY = e.clientY;
      initialWinLeft = this.windowEl.offsetLeft;
      initialWinTop = this.windowEl.offsetTop;

      header.setPointerCapture(e.pointerId);

      const onPointerMove = (moveEvent) => {
        const dx = moveEvent.clientX - headerStartX;
        const dy = moveEvent.clientY - headerStartY;

        if (!isHeaderDragging && Math.hypot(dx, dy) > 5) {
          isHeaderDragging = true;
          this.windowEl.classList.add('is-header-dragging');
          this.windowEl.style.transition = 'none';
        }

        if (isHeaderDragging) {
          const winWidth = this.windowEl.offsetWidth;
          const winHeight = this.windowEl.offsetHeight;
          const maxLeft = window.innerWidth - winWidth - 12;
          const maxTop = window.innerHeight - winHeight - 12;

          const newLeft = Math.min(Math.max(initialWinLeft + dx, 12), maxLeft);
          const newTop = Math.min(Math.max(initialWinTop + dy, 12), maxTop);

          this.windowEl.style.left = `${newLeft}px`;
          this.windowEl.style.top = `${newTop}px`;
        }
      };

      const onPointerUp = (upEvent) => {
        header.releasePointerCapture(upEvent.pointerId);
        header.removeEventListener('pointermove', onPointerMove);
        header.removeEventListener('pointerup', onPointerUp);
        header.removeEventListener('pointercancel', onPointerUp);

        if (isHeaderDragging) {
          this.windowEl.classList.remove('is-header-dragging');

          // Imantación fluida al lateral más cercano (izquierdo o derecho)
          const winWidth = this.windowEl.offsetWidth;
          const winCenter = this.windowEl.offsetLeft + winWidth / 2;
          const isLeft = winCenter < window.innerWidth / 2;
          const targetLeft = isLeft ? 16 : (window.innerWidth - winWidth - 16);
          const targetTop = this.windowEl.offsetTop;

          this.windowEl.style.transition = 'left 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
          this.windowEl.style.left = `${targetLeft}px`;

          // Sincronizar posición de la burbuja cerrada
          const side = isLeft ? 'left' : 'right';
          const bubbleSize = 58;
          const bubbleLeft = isLeft ? 16 : (window.innerWidth - bubbleSize - 16);
          const bubbleTop = Math.min(Math.max(targetTop + 14, 16), window.innerHeight - bubbleSize - 16);

          this.bubble.style.left = `${bubbleLeft}px`;
          this.bubble.style.top = `${bubbleTop}px`;
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ side, top: bubbleTop, left: bubbleLeft }));
          this.updateTooltipOrientation();

          setTimeout(() => {
            this.windowEl.style.transition = '';
          }, 420);
        }
        isHeaderDragging = false;
      };

      header.addEventListener('pointermove', onPointerMove);
      header.addEventListener('pointerup', onPointerUp);
      header.addEventListener('pointercancel', onPointerUp);
    });
  }

  initWelcomeMessage() {
    const state = store.getState();
    const userName = state.activeUser?.name ? state.activeUser.name.split(' ')[0] : 'Estudiante';
    const coursesCount = (state.courses || []).length;
    const eventsCount = getStoredEvents().length;

    const welcomeHtml = `
      ¡Hola, <strong>${userName}</strong>! Soy tu asistente de campus UPDS. 
      Tengo sincronizados <strong>${coursesCount} cursos y talleres</strong> y <strong>${eventsCount} convocatorias activas</strong>. 
      ¿En qué te puedo asesorar hoy?
    `;

    this.messages = [
      {
        id: 'welcome',
        sender: 'bot',
        text: welcomeHtml,
        time: this.formatTime(),
      },
    ];

    this.renderMessages();
  }

  formatTime() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  renderMessages() {
    if (!this.messagesContainer) return;

    this.messagesContainer.innerHTML = this.messages
      .map((msg) => {
        const isBot = msg.sender === 'bot';
        return `
          <div class="assistant-msg-row ${isBot ? 'bot-row' : 'user-row'} animate-fade-in">
            ${
              isBot
                ? `<div class="msg-bot-avatar" aria-hidden="true">${Icons.bot('msg-bot-svg', 14)}</div>`
                : ''
            }
            <div class="msg-bubble ${isBot ? 'msg-bubble-bot' : 'msg-bubble-user'}">
              <div class="msg-text">${msg.text}</div>
              <div class="msg-time">${msg.time}</div>
            </div>
          </div>
        `;
      })
      .join('');

    this.scrollToBottom();
  }

  showTypingIndicator() {
    const typingRow = document.createElement('div');
    typingRow.id = 'assistant-typing-indicator';
    typingRow.className = 'assistant-msg-row bot-row animate-fade-in';
    typingRow.innerHTML = `
      <div class="msg-bot-avatar">${Icons.bot('msg-bot-svg', 14)}</div>
      <div class="msg-bubble msg-bubble-bot typing-dots-bubble">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </div>
    `;
    this.messagesContainer.appendChild(typingRow);
    this.scrollToBottom();
  }

  hideTypingIndicator() {
    const typing = this.messagesContainer?.querySelector('#assistant-typing-indicator');
    if (typing) typing.remove();
  }

  scrollToBottom() {
    if (this.messagesContainer) {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
  }

  sendMessage(text) {
    // 1. Mensaje del usuario
    this.messages.push({
      id: `u-${Date.now()}`,
      sender: 'user',
      text: this.escapeHtml(text),
      time: this.formatTime(),
    });
    this.renderMessages();

    // 2. Indicador de escritura animado
    this.showTypingIndicator();

    // 3. Procesar consulta en contexto con retardo natural (400ms - 600ms)
    setTimeout(() => {
      this.hideTypingIndicator();
      const botReply = this.generateContextualAnswer(text);
      this.messages.push({
        id: `b-${Date.now()}`,
        sender: 'bot',
        text: botReply,
        time: this.formatTime(),
      });
      this.renderMessages();
    }, 450);
  }

  // Motor Contextual con Datos en Tiempo Real de la BD / Store
  generateContextualAnswer(query) {
    const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const state = store.getState();
    const courses = state.courses || [];
    const tutorias = state.tutorias || [];
    const bookings = state.bookings || [];
    const activeUser = state.activeUser;
    const events = getStoredEvents();

    // 1. Consulta sobre Cursos Gratuitos
    if (q.includes('gratis') || q.includes('gratuito') || q.includes('costo cero') || q.includes('sin costo')) {
      const freeCourses = courses.filter((c) => Number(c.price || 0) === 0);
      if (freeCourses.length > 0) {
        const list = freeCourses
          .map((c) => `• <strong>${c.title}</strong> (${c.category || 'General'}) · <em>Inversión: 0 Bs</em>`)
          .join('<br/>');
        return `
          En el campus contamos con <strong>${freeCourses.length} cursos 100% gratuitos</strong> para la comunidad UPDS:<br/><br/>
          ${list}<br/><br/>
          Puedes reservar tu cupo libremente en el Catálogo de Cursos sin ningún cargo.
        `;
      }
      return 'Actualmente los talleres cuentan con costos institucionales accesibles (desde 30 Bs a 150 Bs). Revisa la pestaña de Cursos para ver promociones vigentes.';
    }

    // 2. Consulta sobre Hackathons y Convocatorias
    if (q.includes('hackathon') || q.includes('evento') || q.includes('convocatoria') || q.includes('concurso')) {
      const activeEvents = events.filter((e) => e.status !== 'cancelled');
      if (activeEvents.length > 0) {
        const list = activeEvents
          .map((e) => `• <strong>${e.title}</strong><br/>&nbsp;&nbsp;📅 ${e.date || 'Próximamente'} · 🏆 ${e.prize || 'Premios al mérito'} · Modalidad: ${e.modality || 'Campus Central'}`)
          .join('<br/><br/>');
        return `
          Encontramos <strong>${activeEvents.length} eventos y hackathons activos</strong> en el campus:<br/><br/>
          ${list}<br/><br/>
          Puedes postular a tu equipo directamente desde la sección <strong>Eventos</strong> del menú principal.
        `;
      }
      return 'No hay hackathons con inscripción abierta en este instante, pero se anuncian nuevas fechas al inicio de cada semestre.';
    }

    // 3. Consulta sobre Entrada QR / Mis Pases
    if (q.includes('qr') || q.includes('pase') || q.includes('entrada') || q.includes('recibo') || q.includes('comprobante') || q.includes('ticket')) {
      if (!activeUser) {
        return 'Para consultar tus entradas QR debes iniciar sesión con tu cuenta estudiantil o docente.';
      }
      const myBookings = bookings.filter((b) => b.studentId === activeUser.id && b.status !== 'cancelled');
      if (myBookings.length > 0) {
        return `
          Tienes <strong>${myBookings.length} ${myBookings.length === 1 ? 'pase activo' : 'pases activos'}</strong> vinculados a tu cuenta:<br/><br/>
          Puedes ver tu credencial con código QR en alta resolución de dos maneras:<br/>
          1. Desde tu <strong>Dashboard Principal</strong> en el botón <em>"Ver Entrada QR"</em>.<br/>
          2. En el menú superior <strong>Mis Entradas</strong>, donde también puedes descargar el comprobante en PDF o imprimir el recibo bancario.
        `;
      }
      return `
        Aún no tienes entradas emitidas a nombre de <strong>${activeUser.name}</strong>.<br/><br/>
        Para obtener tu primer pase con código QR, ingresa a la pestaña <strong>Cursos</strong>, elige un taller y presiona <em>"Inscribirme"</em>.
      `;
    }

    // 4. Catálogo General de Cursos y Talleres
    if (q.includes('curso') || q.includes('taller') || q.includes('oferta') || q.includes('materia') || q.includes('aprender')) {
      if (courses.length > 0) {
        const topCourses = courses.slice(0, 4);
        const list = topCourses
          .map((c) => {
            const priceText = Number(c.price || 0) === 0 ? 'Gratuito' : `${c.price} Bs`;
            return `• <strong>${c.title}</strong> · ${priceText} (Cupos: ${c.capacity || 'Disponibles'})`;
          })
          .join('<br/>');
        return `
          Contamos con <strong>${courses.length} cursos y talleres registrados</strong> en la plataforma. Te comparto algunos destacados:<br/><br/>
          ${list}<br/><br/>
          ¿Deseas saber más sobre alguno en particular o consultar su horario de tutoría?
        `;
      }
      return 'Actualmente se están sincronizando los cursos desde el servidor central UPDS. Por favor actualiza la vista en unos momentos.';
    }

    // 5. Horarios, Fechas y Docentes
    if (q.includes('horario') || q.includes('docente') || q.includes('tutor') || q.includes('cuando') || q.includes('fecha')) {
      if (tutorias.length > 0) {
        const tut = tutorias[0];
        return `
          Las tutorías prácticas se organizan tanto en modalidad presencial (Campus Central UPDS) como virtual (Zoom / Teams).<br/><br/>
          Por ejemplo, la próxima sesión de <strong>${tut.title || 'Asesoría Académica'}</strong> está agendada para el <em>${tut.scheduledAt ? new Date(tut.scheduledAt).toLocaleString() : 'Próximo viernes'}</em>.<br/><br/>
          Puedes consultar el calendario completo dentro de la ficha de cada curso.
        `;
      }
      return 'Los horarios de los talleres se adaptan a la disponibilidad de los estudiantes los días viernes y sábados.';
    }

    // 6. Precios y Formas de Pago
    if (q.includes('precio') || q.includes('costo') || q.includes('pagar') || q.includes('pago') || q.includes('banco') || q.includes('cuanto')) {
      return `
        Los cursos de extensión universitaria van desde <strong>0 Bs (gratuitos)</strong> hasta <strong>150 Bs</strong> según la certificación.<br/><br/>
        Opciones de pago habilitadas:<br/>
        • <strong>Transferencia / QR Simple</strong> (validación instantánea).<br/>
        • <strong>Caja Campus UPDS</strong> presentando tu número de ticket temporal.<br/>
        Una vez confirmado tu pago, el pase QR cambiará inmediatamente a estado <em>Confirmado</em>.
      `;
    }

    // 7. Saludo y Pregunta Amigable
    if (q.includes('hola') || q.includes('buenos dias') || q.includes('buenas tardes') || q.includes('que tal') || q.includes('ayuda')) {
      return `
        ¡Hola! Con gusto te oriento. Puedo darte información detallada sobre:<br/>
        • <strong>Cursos y Talleres disponibles</strong> y sus costos.<br/>
        • <strong>Fechas de Hackathons</strong> y premios.<br/>
        • <strong>Estado de tus Entradas QR</strong> y comprobantes.<br/>
        • Procedimiento para inscribirte o contactar a un docente.
      `;
    }

    // 8. Respuesta Abierta y Recomendación Inteligente
    return `
      Entendido. Sobre <em>"${this.escapeHtml(query)}"</em>, te sugiero revisar las pestañas del menú principal o preguntarme sobre:
      <br/><br/>
      • <em>"¿Qué talleres hay?"</em><br/>
      • <em>"¿Cuáles son gratis?"</em><br/>
      • <em>"¿Cómo descargo mi entrada QR?"</em><br/>
      • <em>"¿Cuándo es el Hackathon?"</em>
    `;
  }

  escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
