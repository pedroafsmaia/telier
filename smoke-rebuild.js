const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const net = require('net');

const TIMEOUT = Number(process.env.SMOKE_TIMEOUT_MS || 20000);
const LOCAL_API_ORIGIN = 'http://127.0.0.1:8787';
const LOCAL_API_BASE_URL = `${LOCAL_API_ORIGIN}/api`;
const LOCAL_APP_ORIGIN = 'http://127.0.0.1:4173';
const LOCAL_STATE_DIR = path.join(os.tmpdir(), 'telier-rebuild-smoke');

const EXTERNAL_BASE_URL = process.env.REBUILD_BASE_URL || process.env.BASE_URL || '';
const EXTERNAL_LOGIN_USER = process.env.LOGIN_USER || '';
const EXTERNAL_LOGIN_PASS = process.env.LOGIN_PASS || '';

async function existsVisible(page, selector) {
  const loc = page.locator(selector).first();
  if (!(await loc.count())) return false;
  return loc.isVisible().catch(() => false);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getCommand(command) {
  return command;
}

function spawnProcess(command, args, options = {}) {
  const spawnOptions = {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
    ...options,
  };

  const child = process.platform === 'win32'
    ? spawn(
        process.env.ComSpec || 'cmd.exe',
        ['/d', '/s', '/c', `${command} ${args.map((arg) => {
          const value = String(arg).replace(/"/g, '\\"');
          return /[\s]/.test(value) ? `"${value}"` : value;
        }).join(' ')}`],
        spawnOptions,
      )
    : spawn(command, args, spawnOptions);

  child.stdout?.on('data', (chunk) => process.stdout.write(chunk));
  child.stderr?.on('data', (chunk) => process.stderr.write(chunk));
  return child;
}

async function killProcessTree(child) {
  if (!child || child.exitCode !== null) return;

  if (process.platform === 'win32') {
    await new Promise((resolve) => {
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
      killer.on('exit', () => resolve());
      killer.on('error', () => resolve());
    });
    return;
  }

  child.kill('SIGTERM');
  await sleep(750);
  if (child.exitCode === null) {
    child.kill('SIGKILL');
  }
}

async function waitForHttp(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { method: 'GET' });
      if (response.ok || response.status === 401 || response.status === 403) {
        return response;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(500);
  }

  throw lastError || new Error(`Timeout aguardando ${url}`);
}

async function waitForPort(port, host, timeoutMs) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const connected = await new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(1000);
      socket.once('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.once('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      socket.once('error', () => resolve(false));
      socket.connect(port, host);
    });

    if (connected) return;
    await sleep(300);
  }

  throw new Error(`Timeout aguardando porta ${host}:${port}`);
}

function uniqueSmokeCredentials() {
  const suffix = `${Date.now()}`;
  return {
    name: `Smoke Rebuild ${suffix}`,
    login: `smoke_rebuild_${suffix}`,
    password: `SmokeTelier!${suffix.slice(-6)}`,
  };
}

async function ensureAdminCredentials(apiBaseUrl, fallbackCredentials) {
  const needsSetupResponse = await fetch(`${apiBaseUrl}/auth/needs-setup`);
  if (!needsSetupResponse.ok) {
    throw new Error(`Falha ao consultar setup da API (${needsSetupResponse.status}).`);
  }

  const setupData = await needsSetupResponse.json();
  if (!setupData.needs_setup) {
    if (!EXTERNAL_LOGIN_USER || !EXTERNAL_LOGIN_PASS) {
      throw new Error('API local ja possui usuario e LOGIN_USER/LOGIN_PASS nao foram informados.');
    }

    return {
      login: EXTERNAL_LOGIN_USER,
      password: EXTERNAL_LOGIN_PASS,
    };
  }

  const registerResponse = await fetch(`${apiBaseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: fallbackCredentials.name,
      login: fallbackCredentials.login,
      senha: fallbackCredentials.password,
    }),
  });

  if (!registerResponse.ok) {
    const errorData = await registerResponse.json().catch(() => ({ error: 'Falha ao registrar usuario para smoke.' }));
    throw new Error(errorData.error || `Falha ao registrar usuario (${registerResponse.status}).`);
  }

  return {
    login: fallbackCredentials.login,
    password: fallbackCredentials.password,
  };
}

async function prepareLocalEnvironment() {
  fs.rmSync(LOCAL_STATE_DIR, { recursive: true, force: true });

  const worker = spawnProcess(getCommand('npx'), ['wrangler', 'dev', '--local', '--port', '8787', '--persist-to', LOCAL_STATE_DIR], {
    cwd: __dirname,
    env: {
      ...process.env,
      ALLOWED_ORIGIN: LOCAL_APP_ORIGIN,
      AUTO_SCHEMA_SYNC: '1',
    },
  });

  await waitForPort(8787, '127.0.0.1', TIMEOUT);
  await waitForHttp(`${LOCAL_API_BASE_URL}/auth/needs-setup`, TIMEOUT);

  const build = spawnProcess(getCommand('npm'), ['run', 'build', '--prefix', 'frontend-v2'], {
    cwd: __dirname,
    env: {
      ...process.env,
      VITE_API_BASE_URL: LOCAL_API_BASE_URL,
    },
  });

  const buildExitCode = await new Promise((resolve, reject) => {
    build.on('exit', resolve);
    build.on('error', reject);
  });

  if (buildExitCode !== 0) {
    throw new Error(`Build local do rebuild falhou com codigo ${buildExitCode}.`);
  }

  const preview = spawnProcess(getCommand('npm'), ['run', 'preview', '--prefix', 'frontend-v2', '--', '--host', '127.0.0.1', '--port', '4173'], {
    cwd: __dirname,
    env: {
      ...process.env,
      VITE_API_BASE_URL: LOCAL_API_BASE_URL,
    },
  });

  await waitForPort(4173, '127.0.0.1', TIMEOUT);
  await waitForHttp(`${LOCAL_APP_ORIGIN}/login`, TIMEOUT);

  const generatedCredentials = uniqueSmokeCredentials();
  const credentials = await ensureAdminCredentials(LOCAL_API_BASE_URL, generatedCredentials);

  return {
    baseUrl: LOCAL_APP_ORIGIN,
    credentials,
    cleanup: async () => {
      await killProcessTree(preview);
      await killProcessTree(worker);
    },
  };
}

async function prepareEnvironment() {
  if (EXTERNAL_BASE_URL) {
    if (!EXTERNAL_LOGIN_USER || !EXTERNAL_LOGIN_PASS) {
      throw new Error('Defina LOGIN_USER e LOGIN_PASS quando usar REBUILD_BASE_URL externo.');
    }

    return {
      baseUrl: EXTERNAL_BASE_URL,
      credentials: {
        login: EXTERNAL_LOGIN_USER,
        password: EXTERNAL_LOGIN_PASS,
      },
      cleanup: async () => undefined,
    };
  }

  return prepareLocalEnvironment();
}

async function run() {
  let environment = null;
  let browser = null;
  try {
    environment = await prepareEnvironment();
    browser = await launchBrowserWithFallback();
    const page = await browser.newPage();

    console.log(`REBUILD SMOKE: abrindo ${environment.baseUrl}`);

    await page.goto(`${environment.baseUrl}/tarefas`, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
    await page.waitForURL(/\/login(?:\?.*)?$/, { timeout: TIMEOUT });
    await page.waitForSelector('input[autocomplete="username"]', { timeout: TIMEOUT });
    await page.waitForSelector('input[autocomplete="current-password"]', { timeout: TIMEOUT });

    console.log('REBUILD SMOKE: realizando login...');
    await page.fill('input[autocomplete="username"]', environment.credentials.login);
    await page.fill('input[autocomplete="current-password"]', environment.credentials.password);
    await page.getByRole('button', { name: 'Entrar no Telier' }).click();

    await page.waitForURL(/\/(?:$|tarefas)/, { timeout: TIMEOUT });
    const sidebarNav = page.locator('aside nav[aria-label="Navegacao estrutural"]').first();
    await sidebarNav.waitFor({ timeout: TIMEOUT });
    await sidebarNav.getByRole('link', { name: 'Tarefas' }).waitFor({ timeout: TIMEOUT });
    await sidebarNav.getByRole('link', { name: 'Projetos' }).waitFor({ timeout: TIMEOUT });
    await sidebarNav.getByRole('link', { name: 'Grupos' }).waitFor({ timeout: TIMEOUT });

    if (await sidebarNav.getByText('Nova tarefa').count()) {
      throw new Error('Sidebar estrutural nao deve conter atalho "Nova tarefa".');
    }
    if ((await sidebarNav.getByText('Ultima tarefa').count()) || (await sidebarNav.getByText('Última tarefa').count())) {
      throw new Error('Sidebar estrutural nao deve conter atalho "Ultima tarefa".');
    }

    await page.getByText(/Timer global/i).first().waitFor({ timeout: TIMEOUT });
    await page
      .getByText(
        /Nenhum timer ativo no momento\.|Seu timer esta ativo em|timer ativo na equipe\.|timers ativos na equipe\.|Nao foi possivel atualizar os timers ativos\./,
      )
      .first()
      .waitFor({ timeout: TIMEOUT });

    if (await existsVisible(page, 'text=Checklist documentado')) {
      throw new Error('Banner de migracao ainda visivel no shell principal.');
    }
    if (await existsVisible(page, 'button:has-text("Abrir legado")')) {
      throw new Error('Acao de migracao ainda visivel no shell principal.');
    }

    console.log('REBUILD SMOKE: navegando para Projetos e Grupos...');
    await page.getByRole('link', { name: 'Projetos' }).click();
    await page.waitForURL(/\/projetos$/, { timeout: TIMEOUT });
    await page.getByRole('link', { name: 'Grupos' }).click();
    await page.waitForURL(/\/grupos$/, { timeout: TIMEOUT });

    const hasAdminLink = await existsVisible(page, 'nav a[href="/admin"]');
    if (hasAdminLink) {
      console.log('REBUILD SMOKE: link de Administracao visivel para este usuario.');
    } else {
      console.log('REBUILD SMOKE: link de Administracao oculto para este usuario (ok).');
    }

    console.log('REBUILD SMOKE: OK');
  } finally {
    if (browser) {
      await browser.close();
    }
    if (environment) {
      await environment.cleanup();
    }
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
      console.log(`REBUILD SMOKE: browser launch ${attempt.mode}`);
      return await chromium.launch(attempt.options);
    } catch (err) {
      lastError = err;
      console.log(`REBUILD SMOKE: fallback ${attempt.mode} falhou (${err.message})`);
    }
  }

  throw lastError || new Error('Nao foi possivel abrir navegador para rebuild smoke test.');
}

run().catch(async (err) => {
  console.error(`REBUILD SMOKE: falhou - ${err.message}`);
  process.exitCode = 1;
});
