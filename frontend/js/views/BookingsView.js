// Vista de Gestión de Entradas y Reservas — Sistema-Tutoriales-UPDS
import { store } from '../state/store.js';
import { api } from '../services/api.js';
import { Badge } from '../components/Badge.js';
import { Modal } from '../components/Modal.js';
import { Toast } from '../components/Toast.js';
import { Validators } from '../utils/validators.js';
import { EmptyState } from '../components/EmptyState.js';
import { can } from '../utils/permissions.js';
import { withButtonLoading } from '../utils/button.js';
import { Icons } from '../components/Icons.js';
import { TicketModal } from '../components/TicketModal.js';
import { Pagination } from '../components/Pagination.js';
import { getBookingReceipt, saveBookingReceipt, parseCourseDescription } from './CoursesView.js';

export const BookingsView = {
  render() {
    const state = store.getState();
    const role = state.activeUser?.role;
    const isAdmin = role === 'admin';
    const isStudent = role === 'student';
    const canManage = can(role, 'bookings.manage');
    const canCreate = can(role, 'bookings.create');
    const container = document.createElement('div');
    container.className = 'view-content animate-fade-in';

    let currentPage = 1;
    let filterStatus = 'pending'; // Prioridad inicial: atender primero comprobantes pendientes
    let searchQuery = '';
    let selectedBookingId = null;

    BookingsView.openDetail = (bookingId) => {
      selectedBookingId = bookingId;
      if (this._renderList) this._renderList();
    };

    this._renderList = () => {
      const currentState = store.getState();
      const currentRole = currentState.activeUser?.role;
      const currentCanManage = can(currentRole, 'bookings.manage');
      const isCurrentStudent = currentRole === 'student';

      // Estudiante solo ve sus propias reservas; Admin y Tutor ven todas las asignadas o globales
      const allUserBookings = currentCanManage
        ? (currentState.bookings || [])
        : (currentState.bookings || []).filter((b) => b.studentId === currentState.activeUser?.id);

      const countAll = allUserBookings.length;
      const countPending = allUserBookings.filter((b) => b.status === 'pending').length;
      const countConfirmed = allUserBookings.filter((b) => b.status === 'confirmed').length;

      // Si se inició en 'pending' pero no hay ningún pendiente, alternar automáticamente a 'all'
      if (filterStatus === 'pending' && countPending === 0 && countAll > 0) {
        filterStatus = 'all';
      }

      const bodyContainer = container.querySelector('#bookings-table-container');
      const filterTabsContainer = container.querySelector('#bookings-filter-tabs');
      if (!bodyContainer) return;

      // ─── PANTALLA 2: DETALLE DE ENTRADA & TODAS LAS OPCIONES ──────────────
      if (selectedBookingId) {
        if (filterTabsContainer) filterTabsContainer.innerHTML = '';

        const booking = currentState.bookings?.find((b) => b.id === selectedBookingId);
        if (!booking) {
          selectedBookingId = null;
          this._renderList();
          return;
        }

        const course = currentState.courses?.find((c) => c.id === booking.courseId) || booking.course;
        const tutoria = currentState.tutorias?.find((t) => t.id === booking.tutoriaId) || booking.tutoria;
        const student = currentState.users?.find((u) => u.id === booking.studentId) || booking.student || currentState.activeUser;
        const parsed = course ? parseCourseDescription(course) : null;
        const eventTitle = course?.title || tutoria?.title || 'Evento / Sesión Académica';
        const tutoriaTitle = tutoria?.title || 'Sesión de Clase / Taller Práctico';
        const lowerTitle = eventTitle.toLowerCase();
        const eventPrice = (course && typeof course.price === 'number' && course.price > 0)
          ? course.price
          : (parsed?.price ?? 0);
        const eventCategory = (course && course.category && course.category !== 'Académico')
          ? course.category
          : (lowerTitle.includes('bootcamp') ? 'Bootcamp' : (lowerTitle.includes('hackathon') ? 'Hackathon' : (lowerTitle.includes('ciberseguridad') ? 'Ciberseguridad' : (lowerTitle.includes('taller') ? 'Taller' : 'Académico'))));

        const modality = tutoria?.modality || booking.tutoria?.modality || 'presencial';
        const location = tutoria?.location || booking.tutoria?.location || 'Campus Central UPDS - Aula 302';
        const meetingUrl = tutoria?.meetingUrl || booking.tutoria?.meetingUrl || 'https://meet.google.com/upds-academic';
        const isCancelled = booking.status === 'cancelled';
        const isDeletedByAdmin = isCancelled && typeof booking.receiptUrl === 'string' && booking.receiptUrl.includes('deleted_by_admin');
        const isPending = booking.status === 'pending';
        const ticketId = `UPDS-${(booking.id || '').slice(0, 8).toUpperCase()}`;

        // Obtener comprobante de pago bancario si existe
        let receipt = null;
        const rawUrl = booking.receiptUrl || '';
        const cleanImage = rawUrl.includes('data:image') || rawUrl.startsWith('http') ? rawUrl.split('###')[0] : null;
        if (cleanImage) {
          receipt = {
            bookingId: booking.id,
            studentName: student?.name || 'Estudiante UPDS',
            studentEmail: student?.email || 'estudiante@upds.edu.bo',
            courseTitle: eventTitle,
            amount: eventPrice > 0 ? `${eventPrice} Bs` : 'Arancel UPDS',
            uploadedAt: booking.createdAt || booking.scheduledAt,
            receiptImage: cleanImage,
            status: booking.status,
            isDemoReceipt: false,
          };
        } else {
          receipt = getBookingReceipt(booking.id);
        }

        if (!receipt && isPending) {
          receipt = {
            bookingId: booking.id,
            studentName: student?.name || 'Estudiante UPDS',
            studentEmail: student?.email || 'estudiante@upds.edu.bo',
            courseTitle: eventTitle,
            amount: eventPrice > 0 ? `${eventPrice} Bs` : 'Arancel UPDS',
            uploadedAt: booking.scheduledAt || new Date().toISOString(),
            receiptImage: 'img/upds-logo.png',
            status: 'pending',
            isDemoReceipt: true,
          };
        }

        bodyContainer.innerHTML = `
          <div class="booking-detail-view animate-fade-in">
            <!-- Botón Volver a Mis Entradas -->
            <button type="button" class="btn-back-link" id="btn-back-to-bookings">
              ${Icons.arrowLeft('', 16)} <span>Volver a ${currentCanManage ? 'Gestión de Entradas' : 'Mis Entradas'}</span>
            </button>

            <!-- Tarjeta de Resumen del Evento -->
            <div class="card booking-detail-hero">
              <div class="detail-header">
                <div class="detail-tags">
                  <span class="badge badge-info" style="font-size:0.75rem;">${eventCategory}</span>
                  ${eventPrice > 0 ? `<span class="badge" style="background:#ecfdf5; color:#047857; font-weight:700; border:1px solid #a7f3d0; font-size:0.75rem;">${eventPrice} Bs</span>` : '<span class="badge" style="background:#f1f5f9; color:#475569; font-size:0.75rem;">Gratuito</span>'}
                  ${Badge.bookingStatus(booking.status, booking.receiptUrl)}
                </div>
                <h2 class="detail-title">${eventTitle}</h2>
                <p class="detail-tutoria">${tutoriaTitle}</p>
              </div>

              <!-- Metadatos de la Entrada -->
              <div class="detail-meta-grid">
                <div class="detail-meta-item">
                  <span class="meta-label">Estudiante Titular</span>
                  <strong class="meta-value">${student?.name || 'Estudiante UPDS'}</strong>
                  <small class="meta-sub">${student?.email || ''}</small>
                </div>
                <div class="detail-meta-item">
                  <span class="meta-label">Fecha y Horario</span>
                  <strong class="meta-value">${Badge.formatDate(booking.scheduledAt)}</strong>
                  <small class="meta-sub">Hora Oficial de Bolivia</small>
                </div>
                <div class="detail-meta-item">
                  <span class="meta-label">Modalidad y Acceso</span>
                  <strong class="meta-value">${modality === 'presencial' ? 'Presencial' : 'Virtual en Vivo'}</strong>
                  <small class="meta-sub">${modality === 'presencial' ? location : `<a href="${meetingUrl}" target="_blank" rel="noopener" style="color:#0284c7; text-decoration:underline;">Enlace Meet</a>`}</small>
                </div>
                <div class="detail-meta-item">
                  <span class="meta-label">ID de Entrada</span>
                  <strong class="meta-value" style="font-family:monospace; letter-spacing:0.04em; color:#002855;">#${ticketId}</strong>
                  <small class="meta-sub">Registro Verificado en Base de Datos</small>
                </div>
              </div>
            </div>

            <!-- Panel de Opciones del Evento ("Todas las Opciones") -->
            <div class="detail-options-container">
              <h3 class="detail-options-title">Opciones Disponibles para tu Entrada</h3>

              <div class="detail-options-list">
                <!-- Opción 1: Ver Pase Digital con Código QR -->
                <div class="detail-option-card primary-option">
                  <div class="opt-icon-box navy">
                    ${Icons.ticket('', 24)}
                  </div>
                  <div class="opt-content">
                    <h4>Ver Pase Digital & Código QR</h4>
                    <p>Accede a tu credencial académica con QR óptico de alta legibilidad y opciones oficiales para Google Wallet y Apple Wallet.</p>
                  </div>
                  <button type="button" class="btn btn-primary btn-detail-action" id="detail-btn-qr">
                    ${Icons.ticket('', 16)} <span>Ver Entrada QR</span>
                  </button>
                </div>

                <!-- Opción 2: Ver Recibo de Pago (Distintivo Verde Esmeralda Financiero) -->
                <div class="detail-option-card receipt-option">
                  <div class="opt-icon-box emerald">
                    ${Icons.fileText('', 24)}
                  </div>
                  <div class="opt-content">
                    <h4>Ver Recibo y Comprobante Bancario</h4>
                    <p>${receipt ? 'Consulta el comprobante de transferencia Simple QR enviado a la administración académica.' : 'Esta inscripción fue registrada como gratuita o sin comprobante bancario requerido.'}</p>
                  </div>
                  <button type="button" class="btn btn-outline btn-detail-action btn-receipt-action" id="detail-btn-receipt" ${!receipt ? 'disabled' : ''} style="${!receipt ? 'opacity:0.6; cursor:not-allowed;' : ''}">
                    ${Icons.fileText('', 16)} <span>${receipt ? 'Ver Recibo' : 'Sin Comprobante'}</span>
                  </button>
                </div>

                <!-- Opción 3: Ya no asistiré (Estudiante con entrada activa) -->
                ${isCurrentStudent && !isCancelled && !isPending ? `
                  <div class="detail-option-card warning-option">
                    <div class="opt-icon-box red">
                      ${Icons.x('', 24)}
                    </div>
                    <div class="opt-content">
                      <h4>Cancelar Asistencia ("Ya no asistiré")</h4>
                      <p>Si no podrás asistir a la clase, anula tu entrada para liberar de inmediato tu cupo y permitir que otro estudiante pueda aprovechar la plaza.</p>
                    </div>
                    <button type="button" class="btn btn-danger-outline btn-detail-action" id="detail-btn-cancel">
                      ${Icons.x('', 16)} <span>Ya no asistiré</span>
                    </button>
                  </div>
                ` : ''}

                <!-- Opción 4: Descartar Registro Anulado (Estudiante con entrada eliminada por admin) -->
                ${isCurrentStudent && isDeletedByAdmin ? `
                  <div class="detail-option-card danger-option">
                    <div class="opt-icon-box red">
                      ${Icons.trash('', 24)}
                    </div>
                    <div class="opt-content">
                      <h4>Descartar Registro de mi Lista</h4>
                      <p>Esta entrada fue anulada por la administración. Puedes removerla definitivamente de tu historial.</p>
                    </div>
                    <button type="button" class="btn btn-danger btn-detail-action" id="detail-btn-dismiss">
                      ${Icons.trash('', 16)} <span>Descartar Entrada</span>
                    </button>
                  </div>
                ` : ''}

                <!-- Opción 5: Validación Administrativa (Admin / Tutor con comprobante pendiente) -->
                ${currentCanManage && isPending ? `
                  <div class="detail-option-card admin-option">
                    <div class="opt-icon-box amber">
                      ${Icons.clock('', 24)}
                    </div>
                    <div class="opt-content">
                      <h4>Validación Administrativa de Pago</h4>
                      <p>Comprueba la acreditación bancaria y aprueba o rechaza el acceso oficial del estudiante.</p>
                    </div>
                    <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
                      <button type="button" class="btn btn-success btn-detail-action" id="detail-btn-approve">
                        ${Icons.check('', 16)} <span>Aprobar</span>
                      </button>
                      <button type="button" class="btn btn-danger-outline btn-detail-action" id="detail-btn-reject">
                        ${Icons.x('', 16)} <span>Rechazar</span>
                      </button>
                    </div>
                  </div>
                ` : ''}

                <!-- Opción 6: Eliminar / Purgar Registro (Admin) -->
                ${currentCanManage ? `
                  <div class="detail-option-card" style="border-left:4px solid #b91c1c;">
                    <div class="opt-icon-box red">
                      ${Icons.trash('', 24)}
                    </div>
                    <div class="opt-content">
                      <h4>Gestión de Base de Datos</h4>
                      <p>${isCancelled ? 'Purgar definitivamente este registro cancelado de la base de datos.' : 'Anular esta entrada y liberar el cupo en el sistema.'}</p>
                    </div>
                    <button type="button" class="btn btn-danger-outline btn-detail-action" id="detail-btn-admin-delete">
                      ${Icons.trash('', 16)} <span>${isCancelled ? 'Purgar Registro' : 'Eliminar Entrada'}</span>
                    </button>
                  </div>
                ` : ''}
              </div>
            </div>
          </div>
        `;

        // ─── Listeners de la Pantalla de Detalle ───────────────────────────
        // 1. Botón Volver
        const backBtn = bodyContainer.querySelector('#btn-back-to-bookings');
        if (backBtn) {
          backBtn.addEventListener('click', () => {
            selectedBookingId = null;
            this._renderList();
            container.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        }

        // 2. Ver Entrada QR (TicketModal)
        const qrBtn = bodyContainer.querySelector('#detail-btn-qr');
        if (qrBtn) {
          qrBtn.addEventListener('click', () => {
            TicketModal.open(booking, course, tutoria, student);
          });
        }

        // 3. Ver Recibo de Pago
        const receiptBtn = bodyContainer.querySelector('#detail-btn-receipt');
        if (receiptBtn && receipt) {
          receiptBtn.addEventListener('click', () => {
            this.openReceiptModal(receipt, booking, currentCanManage);
          });
        }

        // 4. Cancelar Asistencia ("Ya no asistiré")
        const cancelBtn = bodyContainer.querySelector('#detail-btn-cancel');
        if (cancelBtn) {
          cancelBtn.addEventListener('click', () => {
            Modal.confirm({
              title: '¿Confirmar que ya no asistirás?',
              message: `¿Estás seguro de cancelar tu asistencia a <strong>${eventTitle}</strong>?<br><br><small style="color:#64748b;">Tu entrada digital QR será invalidada y tu cupo se liberará automáticamente para otro estudiante.</small>`,
              confirmText: 'Sí, ya no asistiré',
              cancelText: 'Volver atrás',
              danger: true,
              onConfirm: async () => {
                await this.updateStatus(booking.id, 'cancelled');
                this._renderList();
              },
            });
          });
        }

        // 5. Descartar Registro Anulado
        const dismissBtn = bodyContainer.querySelector('#detail-btn-dismiss');
        if (dismissBtn) {
          dismissBtn.addEventListener('click', () => {
            Modal.confirm({
              title: '¿Descartar este registro?',
              message: '¿Deseas borrar este registro anulado de tu lista de entradas?<br><br><small style="color:#64748b;">Ya tienes permitido volver a inscribirte a este curso cuando desees.</small>',
              confirmText: 'Sí, descartar de mi lista',
              cancelText: 'Conservar',
              danger: true,
              onConfirm: async () => {
                try {
                  await api.bookings.delete(booking.id);
                  store.setState({ bookings: store.getState().bookings.filter((x) => x.id !== booking.id) });
                  Toast.success('Registro descartado de tu historial.');
                  selectedBookingId = null;
                  this._renderList();
                } catch (err) {
                  Toast.error(err.message || 'No se pudo descartar el registro.');
                }
              },
            });
          });
        }

        // 6. Aprobar Comprobante (Admin)
        const approveBtn = bodyContainer.querySelector('#detail-btn-approve');
        if (approveBtn) {
          approveBtn.addEventListener('click', () => {
            this.confirmReceiptApproval(booking);
          });
        }

        // 7. Rechazar Comprobante (Admin)
        const rejectBtn = bodyContainer.querySelector('#detail-btn-reject');
        if (rejectBtn) {
          rejectBtn.addEventListener('click', () => {
            this.confirmReceiptRejection(booking);
          });
        }

        // 8. Eliminar / Purgar Registro (Admin)
        const adminDeleteBtn = bodyContainer.querySelector('#detail-btn-admin-delete');
        if (adminDeleteBtn) {
          adminDeleteBtn.addEventListener('click', () => {
            const studentName = student?.name || 'este estudiante';
            const isAlreadyCancelled = booking.status === 'cancelled';

            Modal.confirm({
              title: isAlreadyCancelled ? '¿Eliminar registro definitivamente?' : '¿Eliminar entrada del registro?',
              message: isAlreadyCancelled
                ? `¿Deseas purgar definitivamente este registro de <strong>${studentName}</strong> de la base de datos?`
                : `¿Estás seguro de anular y eliminar la entrada de <strong>${studentName}</strong> para <strong>"${eventTitle}"</strong>?`,
              confirmText: isAlreadyCancelled ? 'Sí, purgar registro' : 'Sí, anular y eliminar',
              cancelText: 'Volver',
              danger: true,
              onConfirm: async () => {
                try {
                  if (isAlreadyCancelled) {
                    await api.bookings.delete(booking.id);
                    store.setState({ bookings: store.getState().bookings.filter((x) => x.id !== booking.id) });
                    Toast.success('Registro eliminado definitivamente de la base de datos.');
                    selectedBookingId = null;
                  } else {
                    const newReceiptUrl = (booking.receiptUrl ? booking.receiptUrl + '###deleted_by_admin' : 'deleted_by_admin');
                    await api.bookings.update(booking.id, {
                      status: 'cancelled',
                      receiptUrl: newReceiptUrl,
                    });
                    const fresh = await api.bookings.getAll();
                    store.setState({ bookings: fresh });
                    Toast.success('Entrada eliminada por administración y cupo liberado.');
                  }
                  this._renderList();
                } catch (err) {
                  Toast.error(err.message || 'Error al procesar la eliminación.');
                }
              },
            });
          });
        }

        return;
      }

      // ─── PANTALLA 1: LISTADO DE RECUADROS DE EVENTOS CON BOTÓN "VER ENTRADA" ─
      // 1. Filtrar según la pestaña seleccionada
      let bookings = allUserBookings;
      if (currentCanManage && filterStatus !== 'all') {
        bookings = bookings.filter((b) => b.status === filterStatus);
      }

      // 2. Filtrar por término de búsqueda (nombre, email o curso)
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        bookings = bookings.filter((b) => {
          const studentName = (b.student?.name || '').toLowerCase();
          const studentEmail = (b.student?.email || '').toLowerCase();
          const courseTitle = (b.course?.title || b.tutoria?.title || '').toLowerCase();
          return studentName.includes(q) || studentEmail.includes(q) || courseTitle.includes(q);
        });
      }

      // Renderizar barra de control superior (Pestañas reordenadas por prioridad + Buscador)
      if (filterTabsContainer) {
        filterTabsContainer.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; gap:0.75rem; margin-bottom:1.15rem; flex-wrap:wrap;">
            <!-- Pestañas por orden de prioridad operativa -->
            <div style="display:flex; gap:0.45rem; flex-wrap:wrap; align-items:center;">
              ${currentCanManage ? `
                <button type="button" class="btn btn-sm ${filterStatus === 'pending' ? 'btn-primary' : 'btn-outline'} btn-filter-tab" data-filter="pending" style="display:inline-flex; align-items:center; gap:0.35rem; font-weight:700;">
                  ${Icons.clock('', 13)} Pendientes de Validación
                  ${countPending > 0 ? `<span style="background:${filterStatus === 'pending' ? '#ef4444' : '#b91c1c'}; color:#ffffff; font-size:0.7rem; font-weight:800; padding:1px 7px; border-radius:10px; margin-left:2px;">${countPending}</span>` : ''}
                </button>
                <button type="button" class="btn btn-sm ${filterStatus === 'confirmed' ? 'btn-primary' : 'btn-outline'} btn-filter-tab" data-filter="confirmed" style="display:inline-flex; align-items:center; gap:0.35rem;">
                  ${Icons.check('', 13)} Aprobadas (${countConfirmed})
                </button>
                <button type="button" class="btn btn-sm ${filterStatus === 'all' ? 'btn-primary' : 'btn-outline'} btn-filter-tab" data-filter="all">
                  Todos los Registros (${countAll})
                </button>
              ` : `
                <span style="font-size:0.9rem; font-weight:800; color:#002855;">Mis Entradas Oficiales (${countAll})</span>
              `}
            </div>

            <!-- Buscador en tiempo real por Nombres / Email / Curso -->
            <div style="position:relative; min-width:260px; flex:1; max-width:360px;">
              <span style="position:absolute; left:0.75rem; top:50%; transform:translateY(-50%); color:#94a3b8; pointer-events:none; display:flex; align-items:center;">
                ${Icons.search('', 15)}
              </span>
              <input 
                type="text" 
                id="bookings-search-input" 
                class="form-control" 
                placeholder="Buscar por curso, taller o fecha..." 
                value="${searchQuery}" 
                style="padding-left:2.2rem; padding-right:2rem; font-size:0.84rem; height:36px; border-radius:8px;" 
              />
              ${searchQuery ? `
                <button type="button" id="btn-clear-bookings-search" style="position:absolute; right:0.6rem; top:50%; transform:translateY(-50%); background:none; border:none; color:#64748b; cursor:pointer; font-size:1.1rem; line-height:1; padding:2px;">
                  &times;
                </button>
              ` : ''}
            </div>
          </div>
        `;

        // Eventos de Pestañas
        filterTabsContainer.querySelectorAll('.btn-filter-tab').forEach((tabBtn) => {
          tabBtn.addEventListener('click', () => {
            filterStatus = tabBtn.getAttribute('data-filter');
            currentPage = 1;
            this._renderList();
          });
        });

        // Evento Buscador
        const searchInput = filterTabsContainer.querySelector('#bookings-search-input');
        if (searchInput) {
          searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            currentPage = 1;
            const start = e.target.selectionStart;
            const end = e.target.selectionEnd;
            this._renderList();
            const reInput = container.querySelector('#bookings-search-input');
            if (reInput) {
              reInput.focus();
              try { reInput.setSelectionRange(start, end); } catch (_) {}
            }
          });
        }

        const clearBtn = filterTabsContainer.querySelector('#btn-clear-bookings-search');
        if (clearBtn) {
          clearBtn.addEventListener('click', () => {
            searchQuery = '';
            currentPage = 1;
            this._renderList();
          });
        }
      }

      if (bookings.length === 0) {
        bodyContainer.innerHTML = '';
        bodyContainer.appendChild(
          EmptyState({
            icon: q ? Icons.search('', 36) : Icons.calendar('', 36),
            title: q
              ? `Sin resultados para "${searchQuery}"`
              : (isCurrentStudent ? 'No tienes entradas activas' : (filterStatus === 'pending' ? 'No hay comprobantes pendientes' : 'No hay reservas registradas')),
            description: q
              ? 'Verifica la ortografía o intenta buscar con otro término de búsqueda.'
              : (isCurrentStudent
                ? 'Inscríbete a bootcamps, talleres prácticos o hackathons para generar tu entrada QR oficial.'
                : (filterStatus === 'pending'
                  ? '¡Excelente! Todos los comprobantes de pago han sido revisados y procesados.'
                  : 'Aquí podrás verificar comprobantes de pago bancarios por QR y validar el acceso de los estudiantes.')),
            actionText: q ? 'Limpiar Búsqueda' : (isCurrentStudent ? 'Explorar Cursos & Talleres' : undefined),
            onAction: q
              ? () => { searchQuery = ''; this._renderList(); }
              : (isCurrentStudent ? () => store.setView('courses') : undefined),
          })
        );
        return;
      }

      // Paginación de Entradas
      const pagination = Pagination.paginate(bookings, currentPage, 5);
      currentPage = pagination.currentPage;

      // Renderizar Recuadros de Eventos Limpios con Botón Único "Ver Entrada"
      bodyContainer.innerHTML = `
        <div class="booking-entries-grid">
          ${pagination.items.map((b) => {
            const course = currentState.courses?.find((c) => c.id === b.courseId) || b.course;
            const tutoria = currentState.tutorias?.find((t) => t.id === b.tutoriaId) || b.tutoria;
            const parsed = course ? parseCourseDescription(course) : null;
            const eventTitle = course?.title || tutoria?.title || 'Evento / Sesión Académica';
            const lowerTitle = eventTitle.toLowerCase();
            const eventPrice = (course && typeof course.price === 'number' && course.price > 0)
              ? course.price
              : (parsed?.price ?? 0);
            const eventCategory = (course && course.category && course.category !== 'Académico')
              ? course.category
              : (lowerTitle.includes('bootcamp') ? 'Bootcamp' : (lowerTitle.includes('hackathon') ? 'Hackathon' : (lowerTitle.includes('ciberseguridad') ? 'Ciberseguridad' : (lowerTitle.includes('taller') ? 'Taller' : 'Académico'))));

            const isCancelled = b.status === 'cancelled';
            const isPending = b.status === 'pending';
            const cardClass = isPending ? 'entry-pending' : (isCancelled ? 'entry-cancelled' : '');
            const modalityText = tutoria?.modality === 'presencial' ? 'Presencial (Campus UPDS)' : 'Virtual en Vivo (Meet)';
            const studentInfo = currentCanManage
              ? `<span style="color:#0284c7; font-weight:700;">${Icons.user('', 13)} ${b.student?.name || 'Estudiante UPDS'}</span>`
              : '';

            return `
              <div class="card booking-entry-card ${cardClass}">
                <div class="booking-entry-left">
                  <div class="booking-entry-icon">
                    ${Icons.ticket('', 22)}
                  </div>
                  <div class="booking-entry-info">
                    <div class="booking-entry-tags">
                      <span class="badge badge-info" style="font-size:0.74rem;">${eventCategory}</span>
                      ${eventPrice > 0 ? `<span class="badge" style="background:#ecfdf5; color:#047857; font-weight:700; border:1px solid #a7f3d0; font-size:0.74rem;">${eventPrice} Bs</span>` : '<span class="badge" style="background:#f1f5f9; color:#475569; font-size:0.74rem;">Gratuito</span>'}
                      ${Badge.bookingStatus(b.status, b.receiptUrl)}
                    </div>
                    <h3 class="booking-entry-title">${eventTitle}</h3>
                    <div class="booking-entry-meta">
                      <span>${Icons.calendar('', 13)} ${Badge.formatDate(b.scheduledAt)}</span>
                      <span>${Icons.building('', 13)} ${modalityText}</span>
                      ${studentInfo}
                    </div>
                  </div>
                </div>

                <div class="booking-entry-right">
                  <button type="button" class="btn btn-primary btn-open-ticket" data-id="${b.id}">
                    ${Icons.ticket('', 16)} <span>Ver Entrada</span>
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        ${Pagination.renderHTML(pagination)}
      `;

      // Eventos de Paginación
      Pagination.bindEvents(bodyContainer, (newPage) => {
        currentPage = newPage;
        this._renderList();
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });

      // Evento: Clic en "Ver Entrada" lleva a la otra pantalla (Pantalla de Detalle)
      bodyContainer.querySelectorAll('.btn-open-ticket').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          selectedBookingId = id;
          this._renderList();
          container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });
    };

    container.innerHTML = `
      <div class="view-header">
        <div>
          <h2 class="view-title">${isAdmin ? 'Gestión y Validación de Entradas' : (isStudent ? 'Mis Entradas QR Oficiales' : 'Entradas & Reservas')}</h2>
          <p class="view-subtitle">${isAdmin ? 'Revisión y validación de comprobantes bancarios por QR, comprobación en banca móvil y aprobación de entradas digitales.' : (isStudent ? 'Tus entradas con código QR, pases oficiales y control de asistencia a cursos y talleres.' : 'Supervisión y control del agendamiento de clases y pases académicos.')}</p>
        </div>
      </div>

      <div id="bookings-filter-tabs"></div>
      <div id="bookings-table-container"></div>
    `;

    setTimeout(() => {
      if (this._renderList) this._renderList();
    }, 0);

    // Sincronizar reservas frescas desde el servidor para reflejar nuevos comprobantes en tiempo real
    api.bookings.getAll().then((fresh) => {
      if (Array.isArray(fresh)) {
        store.setState({ bookings: fresh });
        if (this._renderList) this._renderList();
      }
    }).catch(() => {});

    return container;
  },

  async updateStatus(id, status) {
    try {
      await api.bookings.update(id, { status });
      const currentState = store.getState();
      const booking = currentState.bookings?.find((b) => b.id === id);
      const course = currentState.courses?.find((c) => c.id === booking?.courseId);
      const courseTitle = course?.title || booking?.course?.title || 'tu curso o taller';

      if (status === 'confirmed') {
        // Actualizar comprobante en localStorage si existe
        const receipt = getBookingReceipt(id);
        if (receipt) {
          receipt.status = 'confirmed';
          saveBookingReceipt(id, receipt);
        }

        // Notificar al estudiante
        if (booking?.studentId) {
          try {
            await api.notifications.create({
              userId: booking.studentId,
              title: `¡Inscripción Confirmada! — ${courseTitle}`,
              message: `Tu comprobante de pago por Simple QR fue revisado y validado en la app bancaria por Administración UPDS. Tu entrada digital con Código QR ya se encuentra 100% activa.`,
              type: 'booking_update',
            });
          } catch (notifErr) {
            console.warn('No se pudo enviar notificación:', notifErr);
          }
        }
        Toast.success('¡Comprobante y entrada aprobados! Se notificó al estudiante.');
      } else if (status === 'cancelled') {
        // Notificar al Tutor y Administración sobre el cupo liberado
        try {
          const studentName = booking?.student?.name || currentState.activeUser?.name || 'Un estudiante';
          const targetIds = new Set();
          if (course?.tutorId) targetIds.add(course.tutorId);
          targetIds.add('3b593672-04b3-469b-9ffb-149eb0f317b9'); // Admin UPDS

          for (const targetId of targetIds) {
            if (targetId && targetId !== currentState.activeUser?.id) {
              await api.notifications.create({
                userId: targetId,
                title: `Cupo liberado — ${courseTitle.slice(0, 30)}`,
                message: `El estudiante ${studentName} ha cancelado su asistencia a "${courseTitle}". Se ha liberado 1 cupo en el sistema.`,
                type: 'booking_update',
              }).catch(() => {});
            }
          }
        } catch (notifErr) {
          console.warn('No se pudo enviar notificación de cupo liberado:', notifErr);
        }
        Toast.info('Has cancelado tu asistencia. Tu cupo ha sido liberado.');
      } else {
        Toast.success(`Estado de reserva actualizado a: ${status}`);
      }

      const updated = await api.bookings.getAll();
      store.setBookings(updated);
      if (this._renderList) this._renderList();
    } catch (err) {
      Toast.error(err.message || 'Error al actualizar reserva');
    }
  },

  // Modal para inspeccionar comprobante de pago bancario
  openReceiptModal(receipt, booking, canManage) {
    const isPending = booking?.status === 'pending';
    const uploadDate = new Date(receipt.uploadedAt || Date.now()).toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    Modal.open({
      title: `Comprobante de Pago — ${receipt.studentName || 'Estudiante UPDS'}`,
      size: 'lg',
      content: `
        <div style="font-size:0.9rem; line-height:1.55; color:#334155;">
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:0.75rem 1rem; margin-bottom:1rem; display:grid; grid-template-columns:1fr 1fr; gap:0.5rem;">
            <div>
              <span style="font-size:0.75rem; color:#64748b; text-transform:uppercase; font-weight:700; display:block;">Estudiante Titular</span>
              <strong style="color:var(--primary-navy);">${receipt.studentName}</strong>
              <small style="display:block; color:#64748b;">${receipt.studentEmail}</small>
            </div>
            <div>
              <span style="font-size:0.75rem; color:#64748b; text-transform:uppercase; font-weight:700; display:block;">Programa Académico</span>
              <strong style="color:var(--primary-navy);">${receipt.courseTitle}</strong>
              <span style="display:block; color:#0284c7; font-weight:700;">Arancel: ${receipt.amount}</span>
            </div>
            <div style="grid-column: 1 / -1; font-size:0.78rem; color:#64748b; border-top:1px dashed #e2e8f0; padding-top:0.4rem; margin-top:0.2rem;">
              Fecha de envío del recibo: <strong>${uploadDate}</strong> · Estado: <strong style="color:${isPending ? '#d97706' : '#15803d'};">${isPending ? 'En espera de verificación en banca' : 'Aprobado y Verificado'}</strong>
            </div>
          </div>

          <!-- Previsualización del Comprobante -->
          <div style="text-align:center; background:#0f172a; padding:1.25rem; border-radius:10px; border:1px solid #334155; margin-bottom:1rem;">
            ${receipt.isDemoReceipt ? `
              <div style="background:#1e293b; border:1px dashed #38bdf8; border-radius:8px; padding:1.5rem; text-align:center; color:#f1f5f9; max-width:400px; margin:0 auto;">
                <div style="margin-bottom:0.6rem; color:#38bdf8;">${Icons.wallet('', 36)}</div>
                <h4 style="margin:0 0 0.4rem 0; color:#38bdf8; font-size:1.05rem;">Transferencia Bancaria Simple QR</h4>
                <p style="font-size:0.85rem; color:#cbd5e1; margin:0 0 0.35rem 0;">Banca Origen: <strong>Banca Móvil (Banco Unión / BNB / BCP)</strong></p>
                <p style="font-size:0.85rem; color:#cbd5e1; margin:0 0 0.35rem 0;">Cuenta UPDS Recaudadora: <strong>401089234101</strong></p>
                <p style="font-size:0.85rem; color:#38bdf8; font-family:monospace; margin:0 0 0.65rem 0; font-weight:700;">Ref: TRF-${(booking?.id || 'UPDS').slice(0, 8).toUpperCase()}</p>
                <span style="display:inline-block; background:#0284c7; color:#fff; font-size:0.85rem; font-weight:700; padding:0.35rem 0.85rem; border-radius:6px;">Monto: ${receipt.amount}</span>
              </div>
            ` : `
              <img src="${receipt.receiptImage}" alt="Comprobante Bancario" style="max-width:100%; max-height:480px; object-fit:contain; border-radius:6px; box-shadow:0 4px 12px rgba(0,0,0,0.3); display:inline-block;" />
            `}
          </div>

          ${isPending ? `
            <div style="background:#fffbeb; border:1px solid #fde68a; border-left:4px solid #f59e0b; border-radius:6px; padding:0.65rem 0.85rem; font-size:0.82rem; color:#92400e;">
              <strong>Revisión Administrativa (Banca Móvil):</strong> Comprueba en la app de tu banco que el importe de <strong>${receipt.amount}</strong> coincida con la cuenta UPDS antes de confirmar la inscripción y activar el pase QR del estudiante.
            </div>
            ${canManage ? `
              <div style="display:flex; justify-content:flex-end; margin-top:0.65rem;">
                <button type="button" class="btn btn-xs btn-danger-outline" id="btn-modal-quick-reject" style="font-weight:700; color:#dc2626; border-color:#fca5a5;">
                  ${Icons.x('', 12)} Rechazar con motivo...
                </button>
              </div>
            ` : ''}
          ` : `
            <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-left:4px solid #22c55e; border-radius:6px; padding:0.65rem 0.85rem; font-size:0.82rem; color:#166534; display:flex; align-items:center; gap:0.45rem;">
              ${Icons.check('', 16)} <span>Este comprobante ya fue revisado y validado en la banca. La entrada digital QR se encuentra activa y habilitada para asistencia.</span>
            </div>
          `}
        </div>
      `,
      confirmText: canManage && isPending ? 'Aprobar Comprobante y Activar Entrada' : 'Cerrar',
      cancelText: canManage && isPending ? 'Volver' : false,
      onConfirm: async () => {
        if (canManage && isPending) {
          await this.updateStatus(booking.id, 'confirmed');
        }
      },
    });

    if (canManage && isPending) {
      setTimeout(() => {
        const quickReject = document.getElementById('btn-modal-quick-reject');
        if (quickReject) {
          quickReject.addEventListener('click', () => {
            Modal.close();
            this.confirmReceiptRejection(booking);
          });
        }
      }, 50);
    }
  },

  // Confirmación de aprobación para el Administrador
  confirmReceiptApproval(booking) {
    Modal.confirm({
      title: '¿Aprobar Comprobante Bancario y Activar Entrada?',
      message: `
        <div style="font-size:0.9rem; line-height:1.5;">
          <p>¿Confirmas que el comprobante de pago de <strong>${booking.student?.name || 'el estudiante'}</strong> para <strong>"${booking.course?.title || 'este curso'}"</strong> fue verificado con éxito en la cuenta bancaria de la UPDS?</p>
          <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:6px; padding:0.6rem 0.8rem; margin-top:0.6rem; color:#166534; font-size:0.82rem;">
            Se enviará una notificación al estudiante y su entrada con Código QR quedará 100% activa para el control de asistencia.
          </div>
        </div>
      `,
      confirmText: 'Sí, Aprobar Comprobante',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        await this.updateStatus(booking.id, 'confirmed');
      },
    });
  },

  // Confirmación de rechazo con motivo para el Administrador
  confirmReceiptRejection(booking) {
    const studentName = booking.student?.name || 'el estudiante';
    const courseTitle = booking.course?.title || booking.tutoria?.title || 'este curso';

    const modalContent = document.createElement('div');
    modalContent.innerHTML = `
      <div style="font-size:0.9rem; line-height:1.5; color:#334155;">
        <p>¿Estás seguro de <strong>rechazar el comprobante</strong> de pago de <strong>${studentName}</strong> para el curso <strong>"${courseTitle}"</strong>?</p>
        <div class="form-group" style="margin-top:0.85rem;">
          <label class="form-label" style="font-weight:700; color:var(--primary-navy); font-size:0.83rem;">Motivo del Rechazo (se notificará al estudiante): *</label>
          <select id="rejection-reason-select" class="form-control" style="font-size:0.85rem; margin-top:0.3rem;">
            <option value="Comprobante ilegible o borroso">Comprobante ilegible o borroso</option>
            <option value="Importe transferido no coincide con el arancel">Importe transferido no coincide con el arancel</option>
            <option value="Transacción bancaria no encontrada en la cuenta UPDS">Transacción bancaria no encontrada en la cuenta UPDS</option>
            <option value="Comprobante duplicado o ya utilizado">Comprobante duplicado o ya utilizado</option>
            <option value="otro">Otro motivo personalizado...</option>
          </select>
        </div>
        <div class="form-group" id="custom-reason-group" style="display:none; margin-top:0.5rem;">
          <input type="text" id="custom-reason-input" class="form-control" placeholder="Especifica la causa del rechazo..." style="font-size:0.85rem;" />
        </div>
        <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:6px; padding:0.65rem 0.85rem; margin-top:0.85rem; color:#991b1b; font-size:0.8rem; line-height:1.45;">
          ${Icons.alertTriangle('', 14)} <strong>Atención:</strong> Se invalidará la entrada provisional, se liberará el cupo y el estudiante recibirá una notificación con el motivo para que pueda reenviar un comprobante válido.
        </div>
      </div>
    `;

    const select = modalContent.querySelector('#rejection-reason-select');
    const customGroup = modalContent.querySelector('#custom-reason-group');
    const customInput = modalContent.querySelector('#custom-reason-input');

    select.addEventListener('change', () => {
      customGroup.style.display = select.value === 'otro' ? 'block' : 'none';
      if (select.value === 'otro') customInput.focus();
    });

    Modal.open({
      title: 'Rechazar Comprobante de Pago',
      content: modalContent,
      confirmText: 'Sí, Rechazar Comprobante',
      cancelText: 'Volver',
      danger: true,
      onConfirm: async () => {
        let reason = select.value;
        if (reason === 'otro') {
          reason = customInput.value.trim() || 'Comprobante bancario no válido';
        }

        try {
          await api.bookings.update(booking.id, { status: 'cancelled' });

          // Notificar al estudiante con el motivo explícito
          if (booking.studentId) {
            try {
              await api.notifications.create({
                userId: booking.studentId,
                title: `Comprobante Rechazado — ${courseTitle.slice(0, 30)}`,
                message: `Tu comprobante de pago para "${courseTitle}" no pudo ser validado en la cuenta bancaria UPDS. Motivo: ${reason}. Ingresa a Cursos para volver a enviar tu comprobante correcto.`,
                type: 'booking_update',
              });
            } catch (notifErr) {
              console.warn('Error notificando rechazo:', notifErr);
            }
          }

          Toast.info('Comprobante rechazado. Se notificó al estudiante con el motivo.');
          const updated = await api.bookings.getAll();
          store.setState({ bookings: updated });
          if (this._renderList) this._renderList();
          return true;
        } catch (err) {
          Toast.error(err.message || 'Error al rechazar el comprobante');
          return false;
        }
      },
    });
  },

  openBookingModal() {
    const state = store.getState();
    const canManage = can(state.activeUser?.role, 'bookings.manage');
    const students = canManage
      ? (state.users || []).filter((u) => u.role === 'student')
      : [state.activeUser].filter(Boolean);
    const courses = state.courses || [];
    const tutorias = state.tutorias || [];

    if (students.length === 0 || courses.length === 0) {
      Toast.warning('Debe existir al menos un estudiante y un curso registrado.');
      return;
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(15, 0, 0, 0);
    const defaultDate = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

    Modal.open({
      title: 'Registrar Inscripción / Entrada',
      content: `
        <form id="booking-modal-form" class="modal-form">
          <div class="form-group">
            <label class="form-label" for="booking-student-select">Estudiante *</label>
            <select id="booking-student-select" class="form-control" required ${canManage ? '' : 'disabled'}>
              ${students.map((s) => `
                <option value="${s.id}" ${state.activeUser?.id === s.id ? 'selected' : ''}>
                  ${s.name} (${s.email})
                </option>
              `).join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="booking-course-select">Curso o Taller *</label>
            <select id="booking-course-select" class="form-control" required>
              ${courses.map((c) => `
                <option value="${c.id}">${c.title} (${c.tutor ? `Docente: ${c.tutor.name}` : 'Sin docente asignado'})</option>
              `).join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="booking-tutoria-select">Sesión / Clase Específica (Opcional)</label>
            <select id="booking-tutoria-select" class="form-control">
              <option value="">-- Sesión general del programa --</option>
              ${tutorias.map((t) => `
                <option value="${t.id}">${t.title} [${t.course?.title || ''}] - ${Badge.formatDate(t.date)}</option>
              `).join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="booking-date-input">Fecha y Hora Programada *</label>
            <input type="datetime-local" id="booking-date-input" class="form-control" value="${defaultDate}" required />
          </div>
        </form>
      `,
      confirmText: 'Registrar Entrada',
      onConfirm: async (dialog) => {
        const studentId = dialog.querySelector('#booking-student-select').value;
        const courseId = dialog.querySelector('#booking-course-select').value;
        const tutoriaId = dialog.querySelector('#booking-tutoria-select').value || null;
        const scheduledAt = dialog.querySelector('#booking-date-input').value;

        const validation = Validators.validateBooking({ studentId, courseId, scheduledAt });
        if (!validation.isValid) {
          Toast.error(validation.errors[0]);
          return false;
        }

        try {
          await api.bookings.create({
            studentId,
            courseId,
            tutoriaId,
            scheduledAt: new Date(scheduledAt).toISOString(),
          });
          Toast.success('Entrada/Reserva creada exitosamente.');

          const [updatedBookings, updatedTutorias] = await Promise.all([
            api.bookings.getAll(),
            api.tutorias.getAll(),
          ]);
          store.setBookings(updatedBookings);
          store.setTutorias(updatedTutorias);
          return true;
        } catch (err) {
          Toast.error(err.message || 'Error al crear la reserva');
          return false;
        }
      },
    });
  },

  confirmDelete(booking) {
    Modal.confirm({
      title: '¿Eliminar Entrada / Reserva?',
      message: `¿Estás seguro de eliminar el registro de <strong>${booking.student?.name || 'Estudiante'}</strong> para el programa <strong>${booking.course?.title || 'Curso / Taller'}</strong>?`,
      confirmText: 'Sí, Eliminar',
      danger: true,
      onConfirm: async () => {
        try {
          await api.bookings.delete(booking.id);
          Toast.success('Registro eliminado exitosamente.');
          const updated = await api.bookings.getAll();
          store.setBookings(updated);
          return true;
        } catch (err) {
          Toast.error(err.message || 'Error al eliminar');
          return false;
        }
      },
    });
  },
};
