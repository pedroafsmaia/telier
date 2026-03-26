const { chromium } = require('playwright');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const LOGIN_USER = process.env.LOGIN_USER || '';
const LOGIN_PASS = process.env.LOGIN_PASS || '';
const TIMEOUT = Number(process.env.SMOKE_TIMEOUT_MS || 20000);
const SETUP_NAME = process.env.SETUP_NAME || 'Administrador Smoke';
const SETUP_USER = process.env.SETUP_USER || LOGIN_USER || 'admin';
const SETUP_PASS = process.env.SETUP_PASS || LOGIN_PASS || 'admin1234';

async function existsVisible(page, selector) {
  const loc = page.locator(selector).first();
  if (!(await loc.count())) return false;
  return loc.isVisible().catch(() => false);
}

async function run() {
  const browser = await launchBrowserWithFallback();
  const page = await browser.newPage();

  try {
    console.log(`SMOKE: abrindo ${BASE_URL}`);
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
    await page.waitForTimeout(400);

    const hasSetupEntry = await existsVisible(page, '#btn-admin-setup');
    if (hasSetupEntry) {
      console.log('SMOKE: setup inicial detectado, abrindo formulário...');
      await page.click('#btn-admin-setup');
      await page.waitForSelector('#page-setup:not(.hidden)', { timeout: TIMEOUT });
    }

    const hasSetup = await existsVisible(page, '#s-nome')
      && await existsVisible(page, '#s-login')
      && await existsVisible(page, '#s-senha')
      && await existsVisible(page, '#btn-setup');
    if (hasSetup) {
      console.log('SMOKE: executando setup inicial...');
      await page.fill('#s-nome', SETUP_NAME);
      await page.fill('#s-login', SETUP_USER);
      await page.fill('#s-senha', SETUP_PASS);
      await page.click('#btn-setup');
      await page.waitForFunction(() => !document.querySelector('#page-setup') || document.querySelector('#page-setup').classList.contains('hidden'), { timeout: TIMEOUT });
      await page.waitForTimeout(500);
    }

    const hasLogin = await existsVisible(page, '#l-login') && await existsVisible(page, '#l-senha') && await existsVisible(page, '#btn-login');
    if (hasLogin) {
      const loginUser = LOGIN_USER || SETUP_USER;
      const loginPass = LOGIN_PASS || SETUP_PASS;
      if (!loginUser || !loginPass) {
        throw new Error('Tela de login detectada. Defina LOGIN_USER e LOGIN_PASS para rodar o smoke.');
      }
      console.log('SMOKE: realizando login...');
      await page.fill('#l-login', loginUser);
      await page.fill('#l-senha', loginPass);
      await page.click('#btn-login');
    }

    await page.waitForSelector('#page-app:not(.hidden)', { timeout: TIMEOUT });
    await page.waitForSelector('.app-sidebar, .topbar', { timeout: TIMEOUT });
    await page.waitForSelector('.dash-toolbar, #cards-grid-dash, .empty-state, .error-block', { timeout: TIMEOUT });
    const hasErrorBlock = await existsVisible(page, '.error-block');
    if (hasErrorBlock) {
      const msg = await page.locator('.error-block').first().innerText().catch(() => 'Erro interno do dashboard');
      throw new Error(`Dashboard abriu com erro: ${msg}`);
    }
    console.log('SMOKE: dashboard carregado');

    const origemCompartilhados = page.locator('.segmented-btn[data-origem="compartilhados"]').first();
    const origemTodos = page.locator('.segmented-btn[data-origem="todos"]').first();

    if (await origemCompartilhados.count()) {
      await origemCompartilhados.click();
      await page.waitForTimeout(250);
      const ativoCompartilhados = await origemCompartilhados.evaluate((el) => el.classList.contains('ativo'));
      if (!ativoCompartilhados) throw new Error('Filtro "Compartilhados" não ficou ativo.');
    }

    if (await origemTodos.count()) {
      await origemTodos.click();
      await page.waitForTimeout(250);
      const ativoTodos = await origemTodos.evaluate((el) => el.classList.contains('ativo'));
      if (!ativoTodos) throw new Error('Filtro "Todos acessos" não ficou ativo.');
    }

    const firstCard = page.locator('.proj-card').first();
    if (await firstCard.count()) {
      await firstCard.click();
      await page.waitForSelector('.proj-hero, .btn-back', { timeout: TIMEOUT });
      const hasBack = await existsVisible(page, '.btn-back');
      if (!hasBack) throw new Error('Botão de voltar do projeto não encontrado.');
      await page.click('.btn-back');
      await page.waitForSelector('#cards-grid-dash', { timeout: TIMEOUT });
    }

    const hasDropZone = await page.locator('.grupo-section').count();
    if (!hasDropZone) {
      console.log('SMOKE: sem grupos visíveis para validar drop zone (ok).');
    }

    console.log('SMOKE: OK');
  } finally {
    await browser.close();
  }
}

async function launchBrowserWithFallback() {
  const attempts = [
    { mode: 'chrome-channel', options: { headless: true, channel: 'chrome' } },
    { mode: 'msedge-channel', options: { headless: true, channel: 'msedge' } },
    { mode: 'bundled-chromium', options: { headless: true } },
    { mode: 'bundled-chromium-headed', options: { headless: false } },
  ];

  let lastError = null;
  for (const attempt of attempts) {
    try {
      console.log(`SMOKE: browser launch ${attempt.mode}`);
      return await chromium.launch(attempt.options);
    } catch (err) {
      lastError = err;
      console.log(`SMOKE: fallback ${attempt.mode} falhou (${err.message})`);
    }
  }

  throw lastError || new Error('Não foi possível abrir navegador para smoke test.');
}

run().catch((err) => {
  console.error(`SMOKE: falhou - ${err.message}`);
  process.exitCode = 1;
});
