const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const net = require('net');

const TIMEOUT = Number(process.env.SMOKE_TIMEOUT_MS || 25000);
const UI_READY_TIMEOUT = Number(process.env.SMOKE_UI_READY_TIMEOUT_MS || 15000);
const SCALE_PROJECT_COUNT = Math.max(3, Number(process.env.SCALE_PROJECT_COUNT || 12));
const SCALE_TASKS_PER_PROJECT = Math.max(8, Number(process.env.SCALE_TASKS_PER_PROJECT || 16));

const LOCAL_API_ORIGIN = 'http://127.0.0.1:8787';
const LOCAL_API_BASE_URL = `${LOCAL_API_ORIGIN}/api`;
const LOCAL_APP_ORIGIN = 'http://127.0.0.1:4173';
const LOCAL_STATE_DIR = path.join(os.tmpdir(), 'telier-rebuild-smoke-scale');

const EXTERNAL_BASE_URL = process.env.REBUILD_BASE_URL || process.env.BASE_URL || '';
const EXTERNAL_API_BASE_URL = process.env.REBUILD_API_BASE_URL || '';
const EXTERNAL_LOGIN_USER = process.env.LOGIN_USER || '';
const EXTERNAL_LOGIN_PASS = process.env.LOGIN_PASS || '';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getCommand(command) {
  return command;
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function dateDaysFromToday(offsetDays) {
  const value = new Date();
  value.setDate(value.getDate() + offsetDays);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function existsVisible(page, selector) {
  const loc = page.locator(selector).first();
  if (!(await loc.count())) return false;
  return loc.isVisible().catch(() => false);
}

async function jsonRequest(url, options = {}) {
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const rawText = await response.text();
  let data = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = rawText;
  }

  if (!response.ok) {
    const detail =
      data && typeof data === 'object' && 'error' in data
        ? data.error
        : rawText || `HTTP ${response.status}`;
    throw new Error(`${options.method || 'GET'} ${url} falhou: ${detail}`);
  }

  return data;
}

function spawnProcess(command, args, options = {}) {
  const spawnOptions = {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
    ...options,
  };

  const child =
    process.platform === 'win32'
      ? spawn(
          process.env.ComSpec || 'cmd.exe',
          [
            '/d',
            '/s',
            '/c',
            `${command} ${args
              .map((arg) => {
                const value = String(arg).replace(/"/g, '\\"');
                return /[\s]/.test(value) ? `"${value}"` : value;
              })
              .join(' ')}`,
          ],
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
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
        stdio: 'ignore',
      });
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
    name: `Smoke Scale ${suffix}`,
    login: `smoke_scale_${suffix}`,
    password: `SmokeTelier!${suffix.slice(-6)}`,
  };
}

async function ensureAdminCredentials(apiBaseUrl, fallbackCredentials) {
  const setupData = await jsonRequest(`${apiBaseUrl}/auth/needs-setup`);
  if (!setupData.needs_setup) {
    if (!EXTERNAL_LOGIN_USER || !EXTERNAL_LOGIN_PASS) {
      throw new Error('API ja possui usuario e LOGIN_USER/LOGIN_PASS nao foram informados.');
    }
    return {
      login: EXTERNAL_LOGIN_USER,
      password: EXTERNAL_LOGIN_PASS,
    };
  }

  await jsonRequest(`${apiBaseUrl}/auth/register`, {
    method: 'POST',
    body: {
      nome: fallbackCredentials.name,
      login: fallbackCredentials.login,
      senha: fallbackCredentials.password,
    },
  });

  return {
    login: fallbackCredentials.login,
    password: fallbackCredentials.password,
  };
}

async function fetchAuthToken(apiBaseUrl, credentials) {
  const data = await jsonRequest(`${apiBaseUrl}/auth/login`, {
    method: 'POST',
    body: {
      usuario_login: credentials.login,
      senha: credentials.password,
    },
  });

  if (!data?.token) {
    throw new Error('Login da API nao retornou token.');
  }

  return data.token;
}

async function seedScaleData(apiBaseUrl, token) {
  const authHeaders = { Authorization: `Bearer ${token}` };
  const prefix = `scale_${Date.now()}`;
  const projectNames = [];
  const projectIds = [];

  let totalTasks = 0;
  let taskWithActiveTimerId = null;

  async function createProjectWithTasks(projectName, projectTag, taskCount) {
    const project = await jsonRequest(`${apiBaseUrl}/projetos`, {
      method: 'POST',
      headers: authHeaders,
      body: {
        nome: projectName,
        fase: 'Projeto executivo',
        status: 'Em andamento',
        prioridade: 'Media',
      },
    });

    if (!project?.id) {
      throw new Error(`Criacao de projeto sem id retornado (${projectName}).`);
    }

    projectNames.push(projectName);
    projectIds.push(project.id);

    for (let taskIndex = 1; taskIndex <= taskCount; taskIndex += 1) {
      const statusCycle = ['Em andamento', 'Bloqueada', 'A fazer', 'Concluida'];
      const priorityCycle = ['Alta', 'Media', 'Baixa', 'Urgente'];
      const complexityCycle = ['Simples', 'Moderada', 'Complexa'];

      const status = statusCycle[(taskIndex - 1) % statusCycle.length];
      const priority = priorityCycle[(taskIndex - 1) % priorityCycle.length];
      const complexity = complexityCycle[(taskIndex - 1) % complexityCycle.length];
      const dueDate = dateDaysFromToday((taskIndex % 9) - 4);
      const taskName = `${prefix} [${projectTag}] [T${pad2(taskIndex)}]`;

      const payload = {
        nome: taskName,
        status,
        prioridade: priority,
        complexidade: complexity,
        data: dueDate,
        descricao: `Carga de validacao visual para ${taskName}`,
      };

      if (status === 'Bloqueada') {
        payload.observacao_espera = `Bloqueio de teste para ${taskName}`;
      }

      const task = await jsonRequest(`${apiBaseUrl}/projetos/${project.id}/tarefas`, {
        method: 'POST',
        headers: authHeaders,
        body: payload,
      });

      if (!task?.id) {
        throw new Error(`Criacao de tarefa sem id retornado (${taskName}).`);
      }

      totalTasks += 1;

      if (!taskWithActiveTimerId && status === 'Em andamento') {
        taskWithActiveTimerId = task.id;
      }
    }
  }

  for (let projectIndex = 1; projectIndex <= SCALE_PROJECT_COUNT; projectIndex += 1) {
    const projectName = `${prefix} projeto P${pad2(projectIndex)}`;
    await createProjectWithTasks(projectName, `P${pad2(projectIndex)}`, SCALE_TASKS_PER_PROJECT);
  }

  const duplicateProjectName = `${prefix} projeto homonimo`;
  await createProjectWithTasks(duplicateProjectName, 'D01', 4);
  await createProjectWithTasks(duplicateProjectName, 'D02', 4);

  if (taskWithActiveTimerId) {
    await jsonRequest(`${apiBaseUrl}/tarefas/${taskWithActiveTimerId}/tempo`, {
      method: 'POST',
      headers: authHeaders,
      body: {},
    });
  } else {
    throw new Error('Seed nao produziu tarefa elegivel para timer ativo.');
  }

  return {
    prefix,
    projectIds,
    projectNames,
    totalTasks,
    totalProjects: projectIds.length,
    filterProjectId: projectIds[0],
    filterProjectName: projectNames[0],
    filterProjectTag: '[P01]',
    duplicateProjectName,
    duplicateProjectTaskCount: 4,
    duplicateProjectExpectedSections: 2,
  };
}

async function prepareLocalEnvironment() {
  fs.rmSync(LOCAL_STATE_DIR, { recursive: true, force: true });

  const worker = spawnProcess(
    getCommand('npx'),
    ['wrangler', 'dev', '--local', '--port', '8787', '--persist-to', LOCAL_STATE_DIR],
    {
      cwd: __dirname,
      env: {
        ...process.env,
        ALLOWED_ORIGIN: LOCAL_APP_ORIGIN,
        AUTO_SCHEMA_SYNC: '1',
      },
    },
  );

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

  const preview = spawnProcess(
    getCommand('npm'),
    ['run', 'preview', '--prefix', 'frontend-v2', '--', '--host', '127.0.0.1', '--port', '4173'],
    {
      cwd: __dirname,
      env: {
        ...process.env,
        VITE_API_BASE_URL: LOCAL_API_BASE_URL,
      },
    },
  );

  await waitForPort(4173, '127.0.0.1', TIMEOUT);
  await waitForHttp(`${LOCAL_APP_ORIGIN}/login`, TIMEOUT);

  const generatedCredentials = uniqueSmokeCredentials();
  const credentials = await ensureAdminCredentials(LOCAL_API_BASE_URL, generatedCredentials);

  return {
    baseUrl: LOCAL_APP_ORIGIN,
    apiBaseUrl: LOCAL_API_BASE_URL,
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

    const apiBaseUrl =
      EXTERNAL_API_BASE_URL ||
      `${EXTERNAL_BASE_URL.replace(/\/$/, '')}/api`;

    return {
      baseUrl: EXTERNAL_BASE_URL,
      apiBaseUrl,
      credentials: {
        login: EXTERNAL_LOGIN_USER,
        password: EXTERNAL_LOGIN_PASS,
      },
      cleanup: async () => undefined,
    };
  }

  return prepareLocalEnvironment();
}

async function getVisibleSeedTitles(page, prefix) {
  const titles = await page.locator('h3').evaluateAll((nodes, pfx) => {
    return nodes
      .map((node) => (node.textContent || '').trim())
      .filter((text) => text.includes(pfx));
  }, prefix);
  return titles;
}

async function getSectionHeaderTitlesFromButtons(page) {
  return page
    .locator('button h3')
    .evaluateAll((nodes) =>
      nodes
        .map((node) => (node.textContent || '').trim())
        .filter((text) => text.length > 0),
    );
}

async function getProjectSectionSummaries(page) {
  return page
    .locator('div.rounded-lg.border.border-border-primary.mb-6 > div:first-child button')
    .evaluateAll((nodes) =>
      nodes.map((node) => {
        const title = (node.querySelector('h3')?.textContent || '').trim();
        const subtitle = (node.querySelector('p')?.textContent || '').trim();
        const rawText = (node.textContent || '').replace(/\s+/g, ' ').trim();
        const countSource = subtitle || rawText;
        const countMatch = countSource.match(/(\d+)\s+tarefa/i);
        const taskCount = countMatch ? Number(countMatch[1]) : null;
        return {
          title,
          subtitle,
          rawText,
          taskCount,
        };
      }),
    );
}

async function verifyStatusSectionOrder(page) {
  const expectedOrder = ['Em andamento', 'Em espera', 'A fazer', 'Concluídas'];
  const yPositions = [];

  for (const label of expectedOrder) {
    const heading = page.getByRole('heading', { name: label }).first();
    await heading.waitFor({ timeout: UI_READY_TIMEOUT });
    const box = await heading.boundingBox();
    if (!box) {
      throw new Error(`Nao foi possivel obter posicao da secao "${label}".`);
    }
    yPositions.push(box.y);
  }

  for (let index = 1; index < yPositions.length; index += 1) {
    if (yPositions[index] <= yPositions[index - 1]) {
      throw new Error('Ordem visual dos blocos de status esta incorreta.');
    }
  }
}

async function verifyNoTransitionCopy(page) {
  const forbiddenTexts = [
    'Checklist documentado',
    'Abrir legado',
    'Criacao acima da lista',
    'Estado operacional',
    'Bancada operacional',
  ];

  for (const text of forbiddenTexts) {
    if (await existsVisible(page, `text=${text}`)) {
      throw new Error(`Texto de transicao ainda visivel: "${text}".`);
    }
  }
}

async function verifyFiltersAndGrouping(page, seedInfo) {
  const projectFilter = page.locator('select[aria-label="Filtrar por projeto"]');
  await projectFilter.waitFor({ timeout: UI_READY_TIMEOUT });

  await projectFilter.selectOption(seedInfo.filterProjectId);
  await page.waitForTimeout(450);

  const filteredTitles = await getVisibleSeedTitles(page, seedInfo.prefix);
  if (filteredTitles.length === 0) {
    throw new Error('Filtro por projeto nao exibiu tarefas esperadas.');
  }

  const hasForeignProjectTitle = filteredTitles.some(
    (title) => !title.includes(seedInfo.filterProjectTag),
  );
  if (hasForeignProjectTitle) {
    throw new Error('Filtro por projeto exibiu tarefas de outro projeto.');
  }

  await page.getByRole('button', { name: 'Limpar' }).click();
  await page.waitForTimeout(450);
  await page.waitForFunction(
    () => {
      const select = document.querySelector('select[aria-label="Filtrar por projeto"]');
      return !!select && select.value === '';
    },
    { timeout: UI_READY_TIMEOUT },
  );

  let duplicateProjectSections = 0;
  let totalProjectSections = 0;
  let foundProjectGrouping = false;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await page.getByRole('button', { name: 'Por projeto' }).first().click();
    await page.waitForTimeout(450);

    const sectionSummaries = await getProjectSectionSummaries(page);
    totalProjectSections = sectionSummaries.length;
    duplicateProjectSections = sectionSummaries.filter(
      (section) => section.taskCount === seedInfo.duplicateProjectTaskCount,
    ).length;

    if (totalProjectSections > 0) {
      foundProjectGrouping = true;
      break;
    }
  }

  if (!foundProjectGrouping) {
    const visibleSectionHeaders = await getSectionHeaderTitlesFromButtons(page);
    const visibleButtons = await page.locator('button').evaluateAll((nodes) =>
      nodes.map((node) => (node.textContent || '').trim()).slice(0, 10),
    );
    throw new Error(
      `Nao foi possivel entrar no modo Por projeto para validar homonimos. Secoes visiveis: ${visibleSectionHeaders.join(' | ')}. Botoes visiveis: ${visibleButtons.join(' | ')}`,
    );
  }

  if (totalProjectSections !== seedInfo.totalProjects) {
    throw new Error(
      `Agrupamento por projeto colidiu secoes: esperado ${seedInfo.totalProjects} secoes, obtido ${totalProjectSections}.`,
    );
  }

  if (duplicateProjectSections !== seedInfo.duplicateProjectExpectedSections) {
    throw new Error(
      `Agrupamento por projeto colidiu projetos homonimos: esperado ${seedInfo.duplicateProjectExpectedSections} secoes com ${seedInfo.duplicateProjectTaskCount} tarefas, obtido ${duplicateProjectSections}.`,
    );
  }

  await page.getByRole('button', { name: 'Por status' }).click();
  await page.getByRole('heading', { name: 'Em andamento' }).first().waitFor({
    timeout: UI_READY_TIMEOUT,
  });
}

async function verifyTimerVisibilityAndSwitchFlow(page) {
  await page
    .getByText(
      /Seu timer esta ativo em|Atualizacao de rede instavel|timer ativo na equipe|timers ativos na equipe|Nenhum timer ativo no momento\./,
    )
    .first()
    .waitFor({ timeout: UI_READY_TIMEOUT });

  const stopButtons = page.getByRole('button', { name: 'Parar timer' });
  if ((await stopButtons.count()) === 0) {
    throw new Error('Nao foi encontrado botao "Parar timer" em nenhuma linha.');
  }

  const startButtons = page.getByRole('button', { name: 'Iniciar timer' });
  if ((await startButtons.count()) === 0) {
    throw new Error('Nao foi encontrado botao "Iniciar timer" para validar troca de sessao.');
  }

  await startButtons.first().click();

  await page
    .getByRole('heading', { name: /Trocar tarefa com timer ativo|Trocar timer ativo/ })
    .waitFor({ timeout: UI_READY_TIMEOUT });

  await page.getByRole('button', { name: 'Cancelar' }).first().click();
}

async function run() {
  let environment = null;
  let browser = null;
  try {
    environment = await prepareEnvironment();
    const token = await fetchAuthToken(environment.apiBaseUrl, environment.credentials);

    console.log(
      `REBUILD SCALE: semeando ${SCALE_PROJECT_COUNT} projetos x ${SCALE_TASKS_PER_PROJECT} tarefas...`,
    );
    const seedInfo = await seedScaleData(environment.apiBaseUrl, token);
    console.log(
      `REBUILD SCALE: dataset pronto (${seedInfo.totalProjects} projetos, ${seedInfo.totalTasks} tarefas).`,
    );

    browser = await launchBrowserWithFallback();
    const page = await browser.newPage();

    console.log(`REBUILD SCALE: abrindo ${environment.baseUrl}`);
    await page.goto(`${environment.baseUrl}/tarefas`, {
      waitUntil: 'domcontentloaded',
      timeout: TIMEOUT,
    });
    await page.waitForURL(/\/login(?:\?.*)?$/, { timeout: TIMEOUT });

    await page.fill('input[autocomplete="username"]', environment.credentials.login);
    await page.fill('input[autocomplete="current-password"]', environment.credentials.password);
    await page.getByRole('button', { name: 'Entrar no Telier' }).click();

    await page.waitForURL(/\/(?:$|tarefas)/, { timeout: TIMEOUT });
    await page.getByRole('heading', { name: 'Tarefas' }).first().waitFor({
      timeout: UI_READY_TIMEOUT,
    });

    const uiReadyStart = Date.now();
    await page.waitForFunction((prefix) => {
      return document.body.innerText.includes(prefix);
    }, seedInfo.prefix, { timeout: UI_READY_TIMEOUT });
    const uiReadyMs = Date.now() - uiReadyStart;
    console.log(`REBUILD SCALE: primeira renderizacao com dataset em ${uiReadyMs}ms.`);

    await verifyNoTransitionCopy(page);
    await verifyStatusSectionOrder(page);
    await verifyFiltersAndGrouping(page, seedInfo);
    await verifyTimerVisibilityAndSwitchFlow(page);

    console.log('REBUILD SCALE: OK');
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
      console.log(`REBUILD SCALE: browser launch ${attempt.mode}`);
      return await chromium.launch(attempt.options);
    } catch (err) {
      lastError = err;
      console.log(`REBUILD SCALE: fallback ${attempt.mode} falhou (${err.message})`);
    }
  }

  throw lastError || new Error('Nao foi possivel abrir navegador para scale smoke test.');
}

run().catch((err) => {
  console.error(`REBUILD SCALE: falhou - ${err.message}`);
  process.exitCode = 1;
});
