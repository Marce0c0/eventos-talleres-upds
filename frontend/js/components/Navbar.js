// Componente de Navegación Principal — Sistema-Tutoriales-UPDS
import { store } from '../state/store.js';
import { api } from '../services/api.js';
import { ENV, safeStorage, safeSession } from '../config/env.js';
import { Modal } from './Modal.js';
import { Toast } from './Toast.js';
import { Icons } from './Icons.js';
import { can } from '../utils/permissions.js';

const ROLES = [
  { id: 'student', label: 'Estudiante' },
  { id: 'tutor', label: 'Docente' },
  { id: 'admin', label: 'Administrador' },
];

export const Navbar = {
  updateBadge() {
    const state = store.getState();
    const activeUser = state.activeUser;
    const notifs = state.notifications || [];
    const count = activeUser && activeUser.role !== 'guest'
      ? notifs.filter((n) => !Boolean(n.isRead ?? n.is_read) && (n.userId || n.user_id) === activeUser.id).length
      : 0;

    const notifBtn = document.querySelector('.nav-btn[data-view="notifications"]');
    if (notifBtn) {
      let badge = notifBtn.querySelector('.nav-badge');
      if (count > 0) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'nav-badge';
          notifBtn.appendChild(badge);
        }
        badge.textContent = String(count);
      } else if (badge) {
        badge.remove();
      }
    }
  },

  render(container) {
    const state = store.getState();
    const activeUser = state.activeUser;
    const currentView = state.currentView;
    const token = safeStorage.getItem('token');
    const isLoading = !!state.isLoading;
    const isAuthenticated = !!(token && activeUser && activeUser.role !== 'guest');
    const isGuest = activeUser?.role === 'guest';
    const isWelcome = !activeUser || currentView === 'welcome';

    const navItems = isWelcome
      ? []
      : (isGuest
          ? [
              { id: 'courses', label: 'Cursos & Talleres', icon: Icons.book('nav-icon', 16), permission: 'view.courses' },
              { id: 'events', label: 'Eventos & Hackathons', icon: Icons.trophy('nav-icon', 16), permission: 'view.events' },
            ]
          : [
              { id: 'dashboard', label: 'Dashboard', icon: Icons.dashboard('nav-icon', 16), permission: 'view.dashboard' },
              { id: 'users', label: 'Usuarios', icon: Icons.users('nav-icon', 16), permission: 'view.users' },
              { id: 'courses', label: 'Cursos & Talleres', icon: Icons.book('nav-icon', 16), permission: 'view.courses' },
              { id: 'events', label: 'Eventos & Hackathons', icon: Icons.trophy('nav-icon', 16), permission: 'view.events' },
              {
                id: 'bookings',
                label: activeUser?.role === 'admin' ? 'Gestión de Entradas' : (activeUser?.role === 'student' ? 'Mis Entradas QR' : 'Entradas & Reservas'),
                icon: Icons.ticket('nav-icon', 16),
                permission: 'view.bookings',
              },
              { id: 'forums', label: 'Foro de Dudas', icon: Icons.chat('nav-icon', 16), permission: 'view.forums' },
              {
                id: 'notifications',
                label: 'Notificaciones',
                icon: Icons.bell('nav-icon', 16),
                permission: 'view.notifications',
                badge: state.stats.unreadNotifications > 0 ? state.stats.unreadNotifications : null,
              },
            ].filter((item) => !item.permission || can(activeUser?.role, item.permission))
        );

    const userInitial = activeUser?.name ? activeUser.name.trim().charAt(0).toUpperCase() : 'U';
    const roleLabel = ROLES.find((r) => r.id === activeUser?.role)?.label || activeUser?.role || 'Estudiante';

    container.innerHTML = `
      <header class="app-header">
        <div class="header-container">
          <!-- Bloque Superior Izquierdo: Marca UPDS -->
          <div class="header-left-cluster" style="display:flex; align-items:center; gap:0.85rem;">
            <!-- Logo Institucional UPDS (Clic para volver al Inicio) -->
            <div class="brand-area" id="brand-home-btn" role="button" tabindex="0" title="Volver al Inicio UPDS">
              <div class="brand-logo-card">
                <img src="img/upds-logo.png" alt="Universidad Privada Domingo Savio" class="brand-logo-img" />
              </div>
              <div class="brand-text">
                <span class="brand-title">Cursos & Hackathons</span>
                <span class="brand-subtitle">Universidad Privada Domingo Savio · Cochabamba</span>
              </div>
            </div>
          </div>

          <!-- Bloque Superior Derecho: Perfil de Usuario y Controles -->
          <div class="header-right-cluster" style="display:flex; align-items:center; gap:0.65rem;">
            ${
              isLoading
                ? `
                <div class="header-user-skeleton desktop-only-flex" aria-hidden="true" title="Cargando perfil...">
                  <span class="header-shimmer" style="width: 28px; height: 28px; border-radius: 9999px;"></span>
                  <span class="header-shimmer" style="width: 65px; height: 14px; border-radius: 4px;"></span>
                </div>
              `
                : !isWelcome && isGuest
                ? `
                <div class="header-guest-box desktop-only-flex" style="display:inline-flex; align-items:center; gap:0.45rem;">
                  <span class="role-pill role-pill-guest">MODO INVITADO</span>
                  <button id="headbar-login-btn" class="btn btn-xs btn-primary" style="background:#004b93; border-color:#004b93;">
                    ${Icons.key('btn-svg-icon', 13)} <span>Iniciar Sesión</span>
                  </button>
                  <button id="headbar-home-btn" class="btn btn-xs btn-outline" style="color:#ffffff; border-color:rgba(255,255,255,0.3); background:rgba(255,255,255,0.1);" title="Volver al inicio">
                    ${Icons.home('btn-svg-icon', 13)}
                  </button>
                </div>
              `
                : !isWelcome && isAuthenticated
                ? `
                <div class="header-user-wrapper desktop-only-flex" id="user-popover-wrapper">
                  <!-- Trigger del Perfil con Avatar y Chevron -->
                  <button id="user-profile-trigger" class="user-profile-trigger" type="button" aria-haspopup="true" aria-expanded="false" title="Mi Cuenta (${activeUser.name})">
                    <div class="user-chip-avatar role-avatar-${activeUser.role}">
                      <span>${userInitial}</span>
                    </div>
                    <span class="user-trigger-name">${(activeUser.name || 'Usuario').split(' ')[0]}</span>
                    <svg class="user-trigger-chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>

                  <!-- Popover Flotante de Perfil (Progressive Disclosure) -->
                  <div class="user-popover-menu" id="user-profile-popover" role="menu" aria-label="Menú de usuario">
                    <div class="popover-profile-header">
                      <div class="popover-avatar role-avatar-${activeUser.role}">
                        <span>${userInitial}</span>
                      </div>
                      <div class="popover-meta">
                        <strong class="popover-user-name">${activeUser.name}</strong>
                        <span class="popover-user-email" title="${activeUser.email}">${activeUser.email}</span>
                        <div class="popover-role-badge role-pill-${activeUser.role}">
                          <span class="role-status-dot"></span>
                          <span>${roleLabel}</span>
                        </div>
                      </div>
                    </div>

                    <div class="popover-divider"></div>

                    <div class="popover-actions">
                      <button id="popover-logout-btn" class="popover-btn-logout" type="button" role="menuitem">
                        ${Icons.logout('popover-icon-logout', 15)}
                        <span>Cerrar Sesión</span>
                      </button>
                    </div>
                  </div>
                </div>
              `
                : ''
            }
            <!-- Botón Selector de Tema Claro / Oscuro -->
            <button id="theme-toggle-btn" class="theme-toggle-btn" type="button" aria-label="Cambiar tema visual" title="Alternar Modo Claro / Modo Oscuro">
              <span class="theme-icon-light">${Icons.sun('theme-icon-svg', 16)}</span>
              <span class="theme-icon-dark">${Icons.moon('theme-icon-svg', 16)}</span>
            </button>

            <!-- Botón Menú Móvil -->
            ${navItems.length > 0 ? `<button id="mobile-menu-toggle" class="mobile-toggle" aria-label="Abrir menú">${Icons.menu('mobile-menu-icon', 20)}</button>` : ''}
          </div>
        </div>

        <!-- Barra de Navegación por Pestañas (Centrada Arriba al Medio) -->
        ${
          isLoading
            ? `
        <nav class="nav-bar" id="app-nav-bar" aria-label="Cargando navegación">
          <div class="header-nav-skeleton">
            <span class="header-shimmer" style="width: 100px; height: 32px; border-radius: 9999px;"></span>
            <span class="header-shimmer" style="width: 130px; height: 32px; border-radius: 9999px;"></span>
            <span class="header-shimmer" style="width: 140px; height: 32px; border-radius: 9999px;"></span>
            <span class="header-shimmer" style="width: 110px; height: 32px; border-radius: 9999px;"></span>
          </div>
        </nav>
        `
            : navItems.length > 0
            ? `
        <nav class="nav-bar" id="app-nav-bar">
          <ul class="nav-list" style="justify-content:center;">
            <!-- Estado de Sesión en Móvil (dentro del menú desplegable) -->
            ${
              !isWelcome && isGuest
                ? `
              <li class="nav-item mobile-session-item">
                <div class="mobile-session-card">
                  <div><span class="role-pill role-pill-guest">MODO INVITADO</span></div>
                  <div class="mobile-session-actions" style="margin-top:0.4rem; display:flex; gap:0.4rem;">
                    <button id="mobile-login-btn" class="btn btn-sm btn-primary" style="background:#004b93; border-color:#004b93; color:#ffffff; font-size:0.82rem; width:100%; justify-content:center;">
                      ${Icons.key('btn-svg-icon', 14)} <span>Iniciar Sesión</span>
                    </button>
                    <button id="mobile-home-btn" class="btn btn-sm btn-outline" style="color:#ffffff; border-color:rgba(255,255,255,0.35); background:rgba(255,255,255,0.12); font-size:0.82rem; width:100%; justify-content:center;" title="Volver al inicio">
                      ${Icons.home('btn-svg-icon', 14)} <span>Inicio</span>
                    </button>
                  </div>
                </div>
              </li>
            `
                : !isWelcome && isAuthenticated
                ? `
              <li class="nav-item mobile-session-item">
                <div class="mobile-user-card">
                  <div class="mobile-user-card-body">
                    <div class="mobile-avatar role-avatar-${activeUser.role}">
                      <span>${userInitial}</span>
                    </div>
                    <div class="mobile-user-text">
                      <div class="mobile-user-name">${activeUser.name}</div>
                      <div class="mobile-user-email">${activeUser.email}</div>
                    </div>
                    <span class="user-chip-role role-pill-${activeUser.role}">${roleLabel}</span>
                  </div>
                </div>
              </li>
            `
                : ''
            }
            <!-- Selector de Tema en Menú Móvil -->
            <li class="nav-item mobile-session-item" style="margin-bottom:0.65rem;">
              <button id="mobile-theme-toggle-btn" class="mobile-theme-toggle" type="button" aria-label="Cambiar tema">
                <span class="mobile-theme-label">
                  <span class="theme-icon-light">${Icons.sun('theme-icon-svg', 16)}</span>
                  <span class="theme-icon-dark">${Icons.moon('theme-icon-svg', 16)}</span>
                  <span>Modo Visual</span>
                </span>
                <span class="theme-current-badge">${(typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark') ? 'Oscuro' : 'Claro'}</span>
              </button>
            </li>
            ${navItems
              .map(
                (item) => `
              <li class="nav-item">
                <button class="nav-btn ${currentView === item.id ? 'active' : ''}" data-view="${item.id}">
                  <span class="nav-icon">${item.icon}</span>
                  <span class="nav-label">${item.label}</span>
                  ${item.badge ? `<span class="nav-badge">${item.badge}</span>` : ''}
                </button>
              </li>
            `
              )
              .join('')}
            ${
              activeUser
                ? `
              <li class="nav-item mobile-logout-item">
                <button id="mobile-logout-btn" class="nav-btn-mobile-logout" type="button" title="${isAuthenticated ? 'Cerrar Sesión UPDS' : 'Salir del Modo Invitado'}">
                  <span class="nav-icon">${Icons.logout('nav-icon', 18)}</span>
                  <span class="nav-label">${isAuthenticated ? 'Cerrar Sesión (Salir)' : 'Salir del Modo Invitado'}</span>
                </button>
              </li>
            `
                : ''
            }
          </ul>
        </nav>
        `
            : ''
        }
      </header>
    `;

    // ─── Eventos ─────────────────────────────────────────────────────────────
    // Clic en Logo Superior Izquierdo: Volver al Inicio
    container.querySelector('#brand-home-btn').addEventListener('click', () => {
      if (activeUser && activeUser.role !== 'guest') {
        store.setView('dashboard');
      } else {
        safeStorage.removeItem('guestMode');
        safeSession.removeItem('guestMode');
        store.setActiveUser(null);
        store.setView('welcome');
      }
    });

    // Pestañas (solo botones con data-view)
    container.querySelectorAll('.nav-btn[data-view]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const view = btn.getAttribute('data-view');
        if (view) {
          if (!activeUser && (view === 'courses' || view === 'events')) {
            safeSession.setItem('guestMode', 'true');
            store.setActiveUser({
              id: 'guest',
              name: 'Invitado UPDS',
              email: 'invitado@upds.net',
              role: 'guest',
            });
          }
          store.setView(view);
        }
        const navBar = container.querySelector('#app-nav-bar');
        if (navBar) navBar.classList.remove('open');
      });
    });

    // Logout / Salir (Unificado para Escritorio y Móvil)
    const doLogout = () => {
      safeStorage.removeItem('token');
      safeStorage.removeItem('authUser');
      safeStorage.removeItem('guestMode');
      safeSession.removeItem('guestMode');
      store.setActiveUser(null);
      store.setView('welcome');
      Toast.info('Has cerrado sesión exitosamente.');
    };

    const logoutBtn = container.querySelector('#logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', doLogout);
    }

    // Manejo Interactivo del Popover de Perfil (Click, Click-Outside y Tecla Escape)
    const profileTrigger = container.querySelector('#user-profile-trigger');
    const profilePopover = container.querySelector('#user-profile-popover');
    const popoverLogoutBtn = container.querySelector('#popover-logout-btn');

    if (profileTrigger && profilePopover) {
      const closePopover = () => {
        profilePopover.classList.remove('open');
        profileTrigger.setAttribute('aria-expanded', 'false');
      };

      const togglePopover = (e) => {
        e.stopPropagation();
        const isOpen = profilePopover.classList.toggle('open');
        profileTrigger.setAttribute('aria-expanded', String(isOpen));
      };

      profileTrigger.addEventListener('click', togglePopover);

      // Cerrar al hacer clic en cualquier lugar fuera del popover
      const handleOutsideClick = (e) => {
        if (!profilePopover.contains(e.target) && !profileTrigger.contains(e.target)) {
          closePopover();
        }
      };
      document.addEventListener('click', handleOutsideClick);

      // Accesibilidad: Cerrar con tecla Escape
      const handleEscapeKey = (e) => {
        if (e.key === 'Escape' && profilePopover.classList.contains('open')) {
          closePopover();
          profileTrigger.focus();
        }
      };
      document.addEventListener('keydown', handleEscapeKey);

      if (popoverLogoutBtn) {
        popoverLogoutBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          closePopover();
          doLogout();
        });
      }
    }

    const mobileLogoutBtn = container.querySelector('#mobile-logout-btn');
    if (mobileLogoutBtn) {
      mobileLogoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const navBar = container.querySelector('#app-nav-bar');
        if (navBar) navBar.classList.remove('open');
        doLogout();
      });
    }

    // Botón de acceso a Modo Invitado desde el headbar
    const headbarGuestBtn = container.querySelector('#headbar-guest-btn');
    if (headbarGuestBtn) {
      headbarGuestBtn.addEventListener('click', () => {
        safeSession.setItem('guestMode', 'true');
        safeStorage.removeItem('guestMode');
        store.setActiveUser({
          id: 'guest',
          name: 'Invitado UPDS',
          email: 'invitado@upds.net',
          role: 'guest',
        });
        store.setView('courses');
        Toast.info('Explorando el catálogo en Modo Invitado.');
      });
    }

    // Login Modal desde el headbar (Modo Invitado)
    const headbarLoginBtn = container.querySelector('#headbar-login-btn');
    if (headbarLoginBtn) {
      headbarLoginBtn.addEventListener('click', () => {
        this.openLoginModal();
      });
    }

    const mobileLoginBtn = container.querySelector('#mobile-login-btn');
    if (mobileLoginBtn) {
      mobileLoginBtn.addEventListener('click', () => {
        const navBar = container.querySelector('#app-nav-bar');
        if (navBar) navBar.classList.remove('open');
        this.openLoginModal();
      });
    }

    const headbarLoginTopBtn = container.querySelector('#headbar-login-top-btn');
    if (headbarLoginTopBtn) {
      headbarLoginTopBtn.addEventListener('click', () => {
        store.setView('welcome');
      });
    }

    // Regresar al Inicio desde el headbar (Modo Invitado)
    const headbarHomeBtn = container.querySelector('#headbar-home-btn');
    if (headbarHomeBtn) {
      headbarHomeBtn.addEventListener('click', () => {
        safeStorage.removeItem('guestMode');
        safeSession.removeItem('guestMode');
        store.setActiveUser(null);
        store.setView('welcome');
      });
    }

    const mobileHomeBtn = container.querySelector('#mobile-home-btn');
    if (mobileHomeBtn) {
      mobileHomeBtn.addEventListener('click', () => {
        const navBar = container.querySelector('#app-nav-bar');
        if (navBar) navBar.classList.remove('open');
        safeStorage.removeItem('guestMode');
        safeSession.removeItem('guestMode');
        store.setActiveUser(null);
        store.setView('welcome');
      });
    }

    const openLoginBtn = container.querySelector('#open-login-btn');
    if (openLoginBtn) {
      openLoginBtn.addEventListener('click', () => {
        this.openLoginModal();
      });
    }

    // Toggle menú móvil
    const mobileToggle = container.querySelector('#mobile-menu-toggle');
    if (mobileToggle) {
      const navBar = container.querySelector('#app-nav-bar');
      mobileToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (navBar) navBar.classList.toggle('open');
      });
    }

    // Toggle de Tema Claro / Oscuro (Unificado Desktop y Móvil)
    const toggleTheme = (e) => {
      e?.preventDefault();
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      safeStorage.setItem('upds_theme', next);

      const badge = container.querySelector('.theme-current-badge');
      if (badge) {
        badge.textContent = next === 'dark' ? 'Oscuro' : 'Claro';
      }
      Toast.info(next === 'dark' ? 'Modo Oscuro activado.' : 'Modo Claro activado.');
    };

    const themeBtn = container.querySelector('#theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', toggleTheme);
    }
    const mobileThemeBtn = container.querySelector('#mobile-theme-toggle-btn');
    if (mobileThemeBtn) {
      mobileThemeBtn.addEventListener('click', toggleTheme);
    }

    // Utilitario silencioso para consola de desarrollo si se necesita cambiar URL
    window.setBackendUrl = (url) => {
      if (url && typeof url === 'string') {
        ENV.setApiUrl(url.trim());
      }
    };
  },

  openLoginModal(targetView = null) {
    Modal.open({
      title: 'Iniciar Sesión — Autenticación JWT',
      content: `
        <form id="login-modal-form" class="form" onsubmit="return false;">
          <div class="form-group">
            <label class="form-label" for="login-email">Correo Institucional:</label>
            <input type="email" id="login-email" class="form-control" placeholder="admin@upds.edu.bo" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="login-password">Contraseña:</label>
            <input type="password" id="login-password" class="form-control" placeholder="••••••••" required />
          </div>

          <div style="background:#f0f4f8;border-left:4px solid #002855;padding:10px;border-radius:4px;margin-bottom:12px;font-size:0.85rem;">
            <strong>Cuentas Semilla de Prueba (Clave: <code>Upds2026</code>):</strong><br/>
            • <a href="#" class="quick-fill-auth" data-email="admin@upds.edu.bo">admin@upds.edu.bo</a> (Admin)<br/>
            • <a href="#" class="quick-fill-auth" data-email="maria@tutor.com">maria@tutor.com</a> (Tutor)<br/>
            • <a href="#" class="quick-fill-auth" data-email="juan@estudiante.com">juan@estudiante.com</a> (Estudiante)
          </div>
        </form>
      `,
      confirmText: 'Ingresar',
      cancelText: 'Cancelar',
      onConfirm: async (dialog) => {
        const emailInput = dialog.querySelector('#login-email');
        const passInput = dialog.querySelector('#login-password');
        const email = emailInput?.value.trim();
        const password = passInput?.value;

        if (!email || !password) {
          Toast.warning('Complete todos los campos.');
          return;
        }

        try {
          const res = await api.auth.login({ email, password });
          if (res.token && res.user) {
            safeStorage.setItem('token', res.token);
            safeStorage.setItem('authUser', JSON.stringify(res.user));
            safeStorage.removeItem('guestMode');
            safeSession.removeItem('guestMode');
            store.setActiveUser(res.user);
            store.setView(targetView || 'dashboard');
            Toast.success(`Bienvenido/a ${res.user.name} (${res.user.role})`);
            // Recargar datos protegidos y actualizar estado completo
            Promise.all([
              api.users.getAll().catch(() => []),
              api.bookings.getAll().catch(() => []),
              api.notifications.getAll(res.user.id).catch(() => []),
              api.courses.getAll().catch(() => []),
              api.tutorias.getAll().catch(() => []),
            ]).then(([users, bookings, notifications, courses, tutorias]) => {
              store.setState({
                users: users || [],
                bookings: bookings || [],
                notifications: notifications || [],
                courses: (courses && courses.length > 0) ? courses : store.getState().courses,
                tutorias: (tutorias && tutorias.length > 0) ? tutorias : store.getState().tutorias,
              });
            }).catch(() => {});
          }
        } catch (err) {
          Toast.error(err.message || 'Error al autenticar.');
        }
      },
    });

    // Enlazar autofill para cuentas rápidas con Upds2026
    setTimeout(() => {
      document.querySelectorAll('.quick-fill-auth').forEach((link) => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const emailInput = document.getElementById('login-email');
          const passInput = document.getElementById('login-password');
          if (emailInput && passInput) {
            emailInput.value = link.getAttribute('data-email');
            passInput.value = 'Upds2026';
          }
        });
      });
    }, 100);
  },
};
