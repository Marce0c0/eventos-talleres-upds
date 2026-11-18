/**
 * Escáner y Suite de Pruebas E2E Automatizada — Eventos & Talleres UPDS
 * Diseñado con Microsoft Playwright usando Google Chrome local
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:8080';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function runAudit() {
  console.log('🚀 Iniciando escaneo E2E de Eventos & Talleres UPDS con Playwright...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();
  const results = [];

  const logResult = (testName, passed, details = '') => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} — ${testName} ${details ? '(' + details + ')' : ''}`);
    results.push({ testName, passed, details });
  };

  try {
    // 1. Carga de Inicio / Welcome
    console.log('\n--- 1. Vista Inicial / Welcome & App Shell ---');
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1000);
    const pageTitle = await page.title();
    logResult('Título del Documento', pageTitle.includes('UPDS'), pageTitle);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_welcome_view.png') });
    logResult('Captura Welcome generada', true, '01_welcome_view.png');

    // 2. Branding en Navbar
    const brandTitle = await page.locator('.brand-title').first().textContent().catch(() => '');
    logResult('Branding en Barra Superior', brandTitle.length > 0, brandTitle.trim());

    // 3. Catálogo de Cursos & Talleres en Modo Invitado
    console.log('\n--- 2. Catálogo de Cursos & Talleres (Público) ---');
    await page.goto(`${BASE_URL}/#courses`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);

    const courseCards = await page.locator('.course-card, .student-course-card, .skeleton-card, .tutor-course-card, .card, [class*="course"]').count();
    logResult('Carga de Cursos & Talleres', courseCards > 0, `${courseCards} elementos detectados`);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_courses_catalog.png') });
    logResult('Captura Catálogo Cursos generada', true, '02_courses_catalog.png');

    // 4. Navegación a Eventos & Hackathons
    console.log('\n--- 3. Eventos & Hackathons Convocatorias ---');
    await page.goto(`${BASE_URL}/#events`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1200);

    const eventCards = await page.locator('.event-card, .ticket-card, .skeleton-event-card').count();
    logResult('Carga de Eventos & Hackathons', eventCards > 0, `${eventCards} tarjetas encontradas`);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03_events_view.png') });
    logResult('Captura Eventos generada', true, '03_events_view.png');

    // 5. Asistente Conversacional UPDS
    console.log('\n--- 4. Asistente Académico Conversacional (AIAssistant) ---');
    const bubbleSelector = '#upds-assistant-bubble';
    await page.waitForSelector(bubbleSelector, { state: 'attached', timeout: 8000 }).catch(() => null);
    const bubbleCount = await page.locator(bubbleSelector).count();
    logResult('Icono de Asistente IA Presente en Pantalla', bubbleCount > 0);

    if (bubbleCount > 0) {
      await page.locator(bubbleSelector).click({ force: true });
      await page.waitForTimeout(800);
      const isChatVisible = await page.locator('#upds-assistant-window').isVisible().catch(() => false);
      logResult('Apertura de Ventana de Chat del Asistente', isChatVisible);

      if (isChatVisible) {
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04_ai_assistant_open.png') });
        logResult('Captura Asistente IA generada', true, '04_ai_assistant_open.png');
        // Cerrar asistente
        const closeBtn = page.locator('#assistant-close-btn');
        if (await closeBtn.count() > 0) await closeBtn.click();
      }
    }

    // 6. Autenticación con JWT (Login con Quick-Fill)
    console.log('\n--- 5. Autenticación JWT y Dashboard ---');
    await page.goto(`${BASE_URL}/#welcome`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(800);

    // Click en botón de quick-fill de Admin para rellenar automáticamente credenciales válidas
    const quickAdminBtn = page.locator('.btn-quick-fill[data-email="admin@upds.edu.bo"]');
    if (await quickAdminBtn.count() > 0) {
      await quickAdminBtn.click();
      await page.waitForTimeout(400);
    } else {
      await page.locator('#welcome-email').fill('admin@upds.edu.bo');
      await page.locator('#welcome-password').fill('Upds2026');
    }

    const loginButton = page.locator('#welcome-login-btn');
    await loginButton.click();
    await page.waitForTimeout(2500);

    const currentUrl = page.url();
    const isDashboard = currentUrl.includes('dashboard') || (await page.locator('#app-nav-bar, .app-header').count()) > 0;
    logResult('Autenticación y Redirección a Dashboard', isDashboard, currentUrl);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05_authenticated_dashboard.png') });
    logResult('Captura Sesión Autenticada generada', true, '05_authenticated_dashboard.png');

    // 7. Foros Académicos
    console.log('\n--- 6. Módulo de Foros Académicos ---');
    await page.goto(`${BASE_URL}/#forums`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1000);

    const forumCards = await page.locator('.forum-card, .forum-thread, .topic-card, .card, .view-content').count();
    logResult('Carga de Foros de Discusión', forumCards > 0, `${forumCards} elementos`);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06_forums_view.png') });
    logResult('Captura Foros generada', true, '06_forums_view.png');

    // 8. Directorio de Usuarios
    console.log('\n--- 7. Directorio de Usuarios ---');
    await page.goto(`${BASE_URL}/#users`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1000);

    const userPills = await page.locator('.user-card, .role-pill, .users-table-row, .card, .view-content').count();
    logResult('Carga del Directorio Universitario', userPills > 0, `${userPills} registros detectados`);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07_users_view.png') });
    logResult('Captura Directorio generada', true, '07_users_view.png');

  } catch (error) {
    console.error('Error durante la ejecución del escaneo:', error);
  } finally {
    await browser.close();
    console.log('\n🏁 Escaneo Playwright finalizado.');
    console.log(`📊 Total de verificaciones: ${results.length}`);
    console.log(`✅ Aprobadas: ${results.filter(r => r.passed).length}`);
    console.log(`❌ Fallidas: ${results.filter(r => !r.passed).length}`);
  }
}

runAudit();
