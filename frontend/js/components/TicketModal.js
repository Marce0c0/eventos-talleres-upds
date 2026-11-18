// Componente de Entrada / Pase Digital Académico UPDS — Sistema-Tutoriales-UPDS
// Genera credencial con Código QR dinámico y botones oficiales para Google Wallet y Apple Wallet
import { Modal } from './Modal.js';
import { Toast } from './Toast.js';
import { Icons } from './Icons.js';
import { QRCode } from '../utils/qrcode.js';

export const TicketModal = {
  open(booking, course, tutoria, student) {
    const ticketId = `UPDS-${(booking?.id || Math.random().toString(36).substring(2, 10)).slice(0, 8).toUpperCase()}`;
    const courseTitle = course?.title || booking?.course?.title || 'Curso / Taller Académico';
    const tutoriaTitle = tutoria?.title || booking?.tutoria?.title || 'Sesión de Clase / Taller Práctico';
    const studentName = student?.name || booking?.student?.name || 'Estudiante UPDS';
    const studentEmail = student?.email || booking?.student?.email || 'estudiante@upds.edu.bo';
    const modality = tutoria?.modality || booking?.tutoria?.modality || 'presencial';
    const location = tutoria?.location || booking?.tutoria?.location || 'Campus Central UPDS - Aula 302';
    const meetingUrl = tutoria?.meetingUrl || booking?.tutoria?.meetingUrl || 'https://meet.google.com/upds-academic';
    const dateRaw = tutoria?.date || booking?.scheduledAt || new Date();
    const formattedDate = new Date(dateRaw).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const isCancelled = booking?.status === 'cancelled';
    const isDeletedByAdmin = isCancelled && typeof booking?.receiptUrl === 'string' && booking.receiptUrl.includes('deleted_by_admin');
    const isPending = booking?.status === 'pending';
    const verifyPayload = JSON.stringify({
      ticket: ticketId,
      student: studentName,
      course: courseTitle,
      date: formattedDate,
      institution: 'Universidad Privada Domingo Savio',
      status: isCancelled ? 'CANCELLED' : isPending ? 'PENDING_VERIFICATION' : 'VERIFIED_ACTIVE',
    });

    const qrSvg = QRCode.generateSvg(verifyPayload, {
      size: 190,
      color: isCancelled ? '#64748b' : isPending ? '#d97706' : '#0F2042',
      bgColor: '#FFFFFF',
      margin: 1,
    });

    const statusLabel = isDeletedByAdmin ? 'ELIMINADO' : (isCancelled ? 'CANCELADO' : isPending ? 'EN VERIFICACIÓN' : 'VÁLIDO');
    const statusClass = isDeletedByAdmin || isCancelled ? 'status-cancelled' : isPending ? 'status-pending' : 'status-valid';

    const content = `
      <div class="ticket-wrapper">
        <!-- Tarjeta del Pase Digital Estilo Boarding Pass / Apple Wallet -->
        <div class="ticket-card ${isCancelled ? 'card-cancelled' : isPending ? 'card-pending' : ''}" id="academic-ticket-card">
          <!-- Cabecera Institucional UPDS -->
          <div class="ticket-header">
            <div class="ticket-brand">
              <div class="ticket-logo-card">
                <img src="img/upds-logo.png" alt="UPDS" class="ticket-logo" />
              </div>
              <div class="ticket-brand-text">
                <span class="ticket-institution">UNIVERSIDAD PRIVADA DOMINGO SAVIO</span>
                <span class="ticket-type-tag">PASE ACADÉMICO OFICIAL</span>
              </div>
            </div>
            <div class="ticket-status-pill ${statusClass}">
              <span class="status-indicator"></span> ${statusLabel}
            </div>
          </div>

          <!-- Cuerpo Principal del Ticket -->
          <div class="ticket-body">
            <div class="ticket-program-block">
              <span class="ticket-label">PROGRAMA / CURSO</span>
              <h3 class="ticket-course-title">${courseTitle}</h3>
              <p class="ticket-session-title">${tutoriaTitle}</p>
            </div>

            <div class="ticket-meta-grid">
              <div class="ticket-meta-col">
                <span class="ticket-label">ESTUDIANTE TITULAR</span>
                <strong class="ticket-val-primary">${studentName}</strong>
                <span class="ticket-val-secondary">${studentEmail}</span>
              </div>
              <div class="ticket-meta-col">
                <span class="ticket-label">FECHA Y HORARIO</span>
                <strong class="ticket-val-primary ticket-nums">${formattedDate}</strong>
                <span class="ticket-val-secondary">Hora Oficial de Bolivia</span>
              </div>
            </div>

            <div class="ticket-venue-row">
              <span class="ticket-label">MODALIDAD Y ACCESO</span>
              <div class="ticket-access-box">
                <span class="modality-chip ${modality === 'presencial' ? 'chip-presencial' : 'chip-virtual'}">
                  ${modality === 'presencial' ? Icons.building('', 12) + ' Presencial' : Icons.laptop('', 12) + ' Virtual'}
                </span>
                <span class="access-detail">
                  ${modality === 'presencial' ? location : `<a href="${meetingUrl}" target="_blank" rel="noopener">${meetingUrl}</a>`}
                </span>
              </div>
            </div>

            <!-- Sección Central del Código QR -->
            <div class="ticket-qr-section">
              ${isPending ? `
                <div class="ticket-pending-notice">
                  ${Icons.clock('', 14)} <span>Comprobante en verificación por Administración. Pase en activación.</span>
                </div>
              ` : ''}

              <div class="qr-container ${isPending ? 'qr-pending' : ''}">
                ${qrSvg}
              </div>

              <div class="ticket-code-badge">
                <span class="code-label">ID ENTRADA</span>
                <strong class="code-value">${ticketId}</strong>
              </div>

              <p class="ticket-help-text">
                ${isPending ? 'Entrada provisional. Presenta tu identificación institucional al ingresar.' : 'Presenta este código QR en el acceso al campus o aula correspondiente.'}
              </p>
            </div>
          </div>

          <!-- Troquelado visual del ticket (corte cóncavo y punteado) -->
          <div class="ticket-perforation">
            <div class="perf-circle perf-left"></div>
            <div class="perf-line"></div>
            <div class="perf-circle perf-right"></div>
          </div>

          <!-- Acciones de Wallet y Descarga -->
          <div class="ticket-wallet-actions">
            ${isCancelled ? `
              <div class="ticket-cancelled-notice">
                ${Icons.x('', 15)} <span>${isDeletedByAdmin ? 'Entrada anulada por Administración. Cupo liberado.' : 'Entrada cancelada. Tu cupo fue liberado.'}</span>
              </div>
            ` : isPending ? `
              <div class="ticket-pending-wallet-hint">
                ${Icons.info('', 14)} <span>Sincronización con Google & Apple Wallet disponible tras la aprobación.</span>
              </div>
            ` : `
              <div class="wallet-buttons-row">
                <!-- Botón Oficial Google Wallet -->
                <button type="button" class="btn-wallet btn-google-wallet" id="btn-add-google-wallet" title="Añadir a Google Wallet">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                  </svg>
                  <span>Google Wallet</span>
                </button>

                <!-- Botón Oficial Apple Wallet -->
                <button type="button" class="btn-wallet btn-apple-wallet" id="btn-add-apple-wallet" title="Añadir a Apple Wallet">
                  <svg width="18" height="18" viewBox="0 0 170 170" fill="currentColor">
                    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.67-7.81-11.96-14.31-7.85-11.85-14.07-25.75-18.66-41.71-4.59-15.96-6.88-30.82-6.88-44.58 0-16.14 3.97-29.67 11.91-40.59 7.94-10.92 18.06-16.5 30.36-16.74 4.8 0 10.22 1.25 16.27 3.75 6.05 2.5 10.05 3.75 12 3.75 1.57 0 5.48-1.2 11.73-3.6 6.25-2.4 11.53-3.55 15.84-3.45 11.98.62 21.6 4.7 28.86 12.24-10.45 6.32-15.54 15.11-15.28 26.37.38 8.87 3.77 16.32 10.18 22.35 6.41 6.03 14.15 9.49 23.22 10.38-2.61 8.05-5.99 16.5-10.14 25.35zM119.22 31.84c0-7.39 2.67-14.51 8.01-21.36 5.34-6.85 12.08-10.48 20.22-10.48.24 1.13.36 2.1.36 2.91 0 7.39-2.78 14.59-8.34 21.6-5.56 7.01-12.37 10.74-20.43 11.19-.13-1.12-.2-2.02-.2-2.7l.38-1.16z"/>
                  </svg>
                  <span>Apple Wallet</span>
                </button>
              </div>
            `}

            <div class="ticket-secondary-actions">
              <button type="button" class="btn-ticket-ghost" id="btn-print-ticket">
                ${Icons.printer('', 14)} <span>Imprimir / Guardar en PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    Modal.open({
      title: 'Comprobante de Entrada y Pase Digital UPDS',
      content,
      confirmText: 'Cerrar',
      cancelText: false,
      onConfirm: () => {},
    });

    // Enlazar eventos de botones de Wallet y Descarga
    setTimeout(() => {
      const dateObj = new Date(dateRaw);
      const validDate = isNaN(dateObj.getTime()) ? new Date() : dateObj;
      const endDate = new Date(validDate.getTime() + 2 * 60 * 60 * 1000);

      const toUtcString = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const startIso = toUtcString(validDate);
      const endIso = toUtcString(endDate);
      const nowIso = toUtcString(new Date());

      const venueDesc = modality === 'presencial' ? location : meetingUrl;
      const passDescriptionText = [
        'UNIVERSIDAD PRIVADA DOMINGO SAVIO (UPDS)',
        'PASE ACADÉMICO DIGITAL Y ENTRADA OFICIAL',
        '----------------------------------------',
        `• Código de Entrada: ${ticketId}`,
        `• Estudiante: ${studentName}`,
        `• Email: ${studentEmail}`,
        `• Programa: ${courseTitle}`,
        `• Sesión / Clase: ${tutoriaTitle}`,
        `• Modalidad: ${modality === 'presencial' ? 'Presencial' : 'Virtual'}`,
        `• Ubicación / Enlace: ${venueDesc}`,
        `• Estado: ${isCancelled ? 'CANCELADO' : 'VÁLIDO Y ACTIVO'}`,
        '',
        'Presenta tu código QR en el ingreso del campus.'
      ].join('\n');

      const downloadIcs = (filename) => {
        const icsLines = [
          'BEGIN:VCALENDAR',
          'VERSION:2.0',
          'PRODID:-//Universidad Privada Domingo Savio//Pase Digital UPDS 2026//ES',
          'CALSCALE:GREGORIAN',
          'METHOD:PUBLISH',
          'X-WR-CALNAME:Pases y Entradas UPDS',
          'X-WR-TIMEZONE:America/La_Paz',
          'BEGIN:VEVENT',
          `UID:${ticketId}@upds.edu.bo`,
          `DTSTAMP:${nowIso}`,
          `DTSTART:${startIso}`,
          `DTEND:${endIso}`,
          `SUMMARY:[UPDS] ${courseTitle} - Entrada ${ticketId}`,
          `DESCRIPTION:${passDescriptionText.replace(/\n/g, '\\n')}`,
          `LOCATION:${venueDesc}`,
          `X-APPLE-STRUCTURED-LOCATION;VALUE=URI;X-TITLE="${modality === 'presencial' ? location : 'UPDS Online'}":geo:-17.3935,-66.1570`,
          'STATUS:CONFIRMED',
          'BEGIN:VALARM',
          'ACTION:DISPLAY',
          'DESCRIPTION:Recordatorio de Clase / Evento UPDS',
          'TRIGGER:-PT1H',
          'END:VALARM',
          'END:VEVENT',
          'END:VCALENDAR'
        ];

        const blob = new Blob([icsLines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 300);
      };

      const gWalletBtn = document.getElementById('btn-add-google-wallet');
      if (gWalletBtn) {
        gWalletBtn.addEventListener('click', () => {
          // 1. Abrir Google Calendar / Google Wallet oficial con la fecha y pase
          const gUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`[UPDS] ${courseTitle} - Entrada ${ticketId}`)}&dates=${startIso}/${endIso}&details=${encodeURIComponent(passDescriptionText)}&location=${encodeURIComponent(venueDesc)}`;
          window.open(gUrl, '_blank', 'noopener,noreferrer');

          // 2. Descargar entrada sincronizable para Android
          downloadIcs(`Entrada_Google_Wallet_${ticketId}.ics`);

          gWalletBtn.innerHTML = `<span style="display:inline-flex; align-items:center; gap:0.35rem;">${Icons.check('', 14)} Guardado en Google Wallet</span>`;
          gWalletBtn.style.background = '#155724';
          gWalletBtn.style.borderColor = '#28a745';
          Toast.success(`¡Pase ${ticketId} vinculado y guardado para Google Wallet!`);
        });
      }

      const aWalletBtn = document.getElementById('btn-add-apple-wallet');
      if (aWalletBtn) {
        aWalletBtn.addEventListener('click', () => {
          // Descargar pase estructurado para Apple Wallet / iOS Calendar
          downloadIcs(`Pase_Apple_Wallet_${ticketId}.ics`);

          aWalletBtn.innerHTML = `<span style="display:inline-flex; align-items:center; gap:0.35rem;">${Icons.check('', 14)} Añadido a Apple Wallet</span>`;
          aWalletBtn.style.background = '#155724';
          aWalletBtn.style.borderColor = '#28a745';
          Toast.success(`¡Pase ${ticketId} descargado para Apple Wallet en tu dispositivo!`);
        });
      }

      const printBtn = document.getElementById('btn-print-ticket');
      if (printBtn) {
        printBtn.addEventListener('click', () => {
          window.print();
        });
      }
    }, 50);
  },
};
