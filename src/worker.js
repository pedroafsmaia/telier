// worker.js — Cloudflare Worker v5
// Correções aplicadas:
//   C1 — SQL injection removido: GET /projetos usa binding parametrizado
//   C2 — Senhas em texto puro (modo local)
//   C3 — CORS restrito ao domínio do Pages (configurar ALLOWED_ORIGIN nas env vars)
//   C4 — Email normalizado no setup (toLowerCase + trim)
//   C5 — Stack trace não exposto em produção
//   C6 — Token de sessão com 32 hex chars (128 bits) em vez de 16

// ── CORS DINÂMICO (C3) ──
// Configure a variável ALLOWED_ORIGIN nas env vars do Worker com o domínio do seu Cloudflare Pages
// Ex: https://telier.pages.dev
function getCors(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = env.ALLOWED_ORIGIN || 'https://telier.pages.dev';
  // Permite localhost em desenvolvimento
  const isLocalhost = origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:');
  const allowedOrigin = (origin === allowed || isLocalhost) ? origin : allowed;
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Vary': 'Origin',
  };
}

function json(data, status = 200, cors = {}) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
function err(msg, status = 400, cors = {}) {
  return json({ error: msg }, status, cors);
}

// ── SENHAS EM TEXTO PURO (C2) ──
// Modo local: mantém senha legível no banco para facilitar gestão manual.
async function hashSenha(senha) {
  return String(senha);
}

async function verificarSenha(senha, stored) {
  return String(senha) === String(stored || '');
}

// ── TOKEN COM 128 BITS (C6) ──
function uid() { return crypto.randomUUID().replace(/-/g, ''); } // 32 hex chars = 128 bits

function sessaoUid() { return crypto.randomUUID().replace(/-/g, ''); } // token de sessão = 128 bits

async function getUsuario(request, env) {
  const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  if (!token) return null;
  return await env.DB.prepare(
    `SELECT s.id as sessao_id, u.id as uid, u.nome, u.login, u.papel
     FROM sessoes s JOIN usuarios u ON s.usuario_id = u.id
     WHERE s.id = ? AND s.expira_em > datetime('now')`
  ).bind(token).first();
}

async function requireAuth(request, env) {
  const u = await getUsuario(request, env);
  if (!u) return [null, 401];
  return [u, null];
}

function isAdmin(u) { return u?.papel === 'admin'; }

const STATUS_PROJ_VALIDOS = ['A fazer', 'Em andamento', 'Aguardando aprovação', 'Pausado', 'Concluído', 'Arquivado'];
const STATUS_PROJ_VALIDOS_SET = new Set(STATUS_PROJ_VALIDOS);

function normalizarStatusProjeto(status) {
  if (!status) return status;
  const s = String(status).trim();
  if (s === 'Concluída') return 'Concluído';
  return s;
}

async function podeEditarProjeto(env, projetoId, usuarioId, papel) {
  if (papel === 'admin') return true;
  const proj = await env.DB.prepare('SELECT dono_id FROM projetos WHERE id = ?').bind(projetoId).first();
  if (!proj) return false;
  if (proj.dono_id === usuarioId) return true;
  const perm = await env.DB.prepare(
    'SELECT 1 FROM permissoes_projeto WHERE projeto_id = ? AND usuario_id = ?'
  ).bind(projetoId, usuarioId).first();
  return !!perm;
}

async function podeEditarTarefa(env, tarefaId, usuarioId, papel) {
  if (papel === 'admin') return true;
  const t = await env.DB.prepare('SELECT dono_id, projeto_id FROM tarefas WHERE id = ?').bind(tarefaId).first();
  if (!t) return false;
  if (t.dono_id === usuarioId) return true;
  // Verificar colaboradores da tarefa
  const colab = await env.DB.prepare(
    'SELECT 1 FROM colaboradores_tarefa WHERE tarefa_id = ? AND usuario_id = ?'
  ).bind(tarefaId, usuarioId).first();
  if (colab) return true;
  return await podeEditarProjeto(env, t.projeto_id, usuarioId, papel);
}

// Verifica se usuário pode iniciar cronômetro numa tarefa
async function podeCronometrar(env, tarefaId, usuarioId, papel) {
  if (papel === 'admin') return true;
  const t = await env.DB.prepare('SELECT dono_id FROM tarefas WHERE id = ?').bind(tarefaId).first();
  if (!t) return false;
  if (t.dono_id === usuarioId) return true;
  const colab = await env.DB.prepare(
    'SELECT 1 FROM colaboradores_tarefa WHERE tarefa_id = ? AND usuario_id = ?'
  ).bind(tarefaId, usuarioId).first();
  return !!colab;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const cors = getCors(request, env);

    if (method === 'OPTIONS') return new Response(null, { headers: cors });

    // Helper local para respostas com cors correto
    const ok = (data, status = 200) => json(data, status, cors);
    const fail = (msg, status = 400) => err(msg, status, cors);

    try {

    // ── SETUP ──
    if (path === '/auth/setup' && method === 'POST') {
      const existing = await env.DB.prepare('SELECT id FROM usuarios WHERE papel = "admin"').first();
      if (existing) return fail('Admin já existe', 400);
      const { nome, usuario_login, senha } = await request.json();
      if (!nome || !usuario_login || !senha) return fail('Preencha todos os campos');
      const login = usuario_login.toLowerCase().trim().replace(/\s+/g, '_');
      const loginExiste = await env.DB.prepare('SELECT id FROM usuarios WHERE login = ?').bind(login).first();
      if (loginExiste) return fail('Nome de usuário já existe');
      const hash = await hashSenha(senha);
      await env.DB.prepare(
        'INSERT INTO usuarios (id, nome, login, senha_hash, papel) VALUES (?, ?, ?, ?, "admin")'
      ).bind('usr_' + uid(), nome.trim(), login, hash).run();
      return ok({ ok: true });
    }

    if (path === '/auth/needs-setup' && method === 'GET') {
      const existing = await env.DB.prepare('SELECT id FROM usuarios WHERE papel = "admin"').first();
      return ok({ needs_setup: !existing });
    }

    // ── AUTO CADASTRO (USUÁRIO COMUM) ──
    if (path === '/auth/register' && method === 'POST') {
      const { nome, usuario_login, senha } = await request.json();
      if (!nome || !usuario_login || !senha) return fail('Preencha todos os campos');
      const login = usuario_login.toLowerCase().trim().replace(/\s+/g, '_');
      const existing = await env.DB.prepare('SELECT id FROM usuarios WHERE login = ?').bind(login).first();
      if (existing) return fail('Nome de usuário já existe');
      const senhaSalva = await hashSenha(senha);
      const id = 'usr_' + uid();
      await env.DB.prepare(
        'INSERT INTO usuarios (id, nome, login, senha_hash, papel) VALUES (?, ?, ?, ?, "membro")'
      ).bind(id, nome.trim(), login, senhaSalva).run();
      return ok({ ok: true, id, usuario_login: login, papel: 'membro' });
    }

    // ── LOGIN por usuario_login ──
    if (path === '/auth/login' && method === 'POST') {
      const { usuario_login, senha } = await request.json();
      if (!usuario_login || !senha) return fail('Usuário e senha obrigatórios');
      const login = usuario_login.toLowerCase().trim().replace(/\s+/g, '_');
      const usuario = await env.DB.prepare(
        'SELECT * FROM usuarios WHERE login = ?'
      ).bind(login).first();
      if (!usuario) return fail('Credenciais inválidas', 401);
      const senhaValida = await verificarSenha(senha, usuario.senha_hash);
      if (!senhaValida) return fail('Credenciais inválidas', 401);
      const sessaoId = sessaoUid();
      const expira = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
      await env.DB.prepare(
        'INSERT INTO sessoes (id, usuario_id, expira_em) VALUES (?, ?, ?)'
      ).bind(sessaoId, usuario.id, expira).run();
      return ok({ token: sessaoId, usuario: { id: usuario.id, nome: usuario.nome, usuario_login: usuario.login, papel: usuario.papel } });
    }

    if (path === '/auth/logout' && method === 'POST') {
      const [u] = await requireAuth(request, env);
      if (u) await env.DB.prepare('DELETE FROM sessoes WHERE id = ?').bind(u.sessao_id).run();
      return ok({ ok: true });
    }

    if (path === '/auth/me' && method === 'GET') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      return ok({ id: u.uid, nome: u.nome, usuario_login: u.login, papel: u.papel });
    }

    // ── USUÁRIOS ──
    if (path === '/usuarios' && method === 'GET') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      const lista = await env.DB.prepare('SELECT id, nome, login as usuario_login, papel FROM usuarios ORDER BY nome').all();
      return ok(lista.results);
    }

    if (path === '/usuarios' && method === 'POST') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      if (!isAdmin(u)) return fail('Sem permissão', 403);
      const { nome, usuario_login, senha, papel = 'membro' } = await request.json();
      if (!nome || !usuario_login || !senha) return fail('Campos obrigatórios');
      const login = usuario_login.toLowerCase().trim().replace(/\s+/g, '_');
      const existing = await env.DB.prepare('SELECT id FROM usuarios WHERE login = ?').bind(login).first();
      if (existing) return fail('Nome de usuário já existe');
      const hash = await hashSenha(senha);
      const id = 'usr_' + uid();
      await env.DB.prepare(
        'INSERT INTO usuarios (id, nome, login, senha_hash, papel) VALUES (?, ?, ?, ?, ?)'
      ).bind(id, nome.trim(), login, hash, papel).run();
      return ok({ id, nome, usuario_login: login, papel });
    }

    // ── CENTRAL ADMIN ──
    if (path === '/admin/agora' && method === 'GET') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      if (!isAdmin(u)) return fail('Sem permissão', 403);
      const ativas = await env.DB.prepare(`
        SELECT st.id, st.inicio, st.usuario_id,
          tu.nome as usuario_nome, tu.login as usuario_login,
          t.id as tarefa_id, t.nome as tarefa_nome, t.status as tarefa_status,
          p.id as projeto_id, p.nome as projeto_nome
        FROM sessoes_tempo st
        JOIN usuarios tu ON tu.id = st.usuario_id
        JOIN tarefas t ON t.id = st.tarefa_id
        JOIN projetos p ON p.id = t.projeto_id
        WHERE st.fim IS NULL
        ORDER BY st.inicio ASC
      `).all();
      return ok(ativas.results);
    }

    if (path === '/admin/usuarios' && method === 'GET') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      if (!isAdmin(u)) return fail('Sem permissão', 403);

      const usuarios = await env.DB.prepare(`
        SELECT u.id, u.nome, u.login as usuario_login, u.papel,
          (
            SELECT COUNT(*) FROM projetos p WHERE p.dono_id = u.id
          ) as projetos_como_dono,
          (
            SELECT COUNT(*) FROM permissoes_projeto pp WHERE pp.usuario_id = u.id
          ) as projetos_como_editor,
          (
            SELECT COUNT(*) FROM tarefas t WHERE t.dono_id = u.id
          ) as tarefas_como_dono,
          (
            SELECT COUNT(*) FROM tarefas t WHERE t.dono_id = u.id AND t.status = 'Em andamento'
          ) as tarefas_em_andamento,
          COALESCE((
            SELECT ROUND(SUM(
              (CASE WHEN st.fim IS NULL
                THEN (julianday('now') - julianday(st.inicio)) * 24
                ELSE (julianday(st.fim) - julianday(st.inicio)) * 24
              END)
              -
              COALESCE((
                SELECT SUM(
                  CASE WHEN i.fim IS NULL THEN 0
                  ELSE (julianday(i.fim) - julianday(i.inicio)) * 24
                  END
                ) FROM intervalos i WHERE i.sessao_id = st.id
              ), 0)
            ), 2)
            FROM sessoes_tempo st
            WHERE st.usuario_id = u.id
          ), 0) as horas_totais
        FROM usuarios u
        ORDER BY u.nome
      `).all();

      return ok(usuarios.results);
    }

    const matchAdminUsuario = path.match(/^\/admin\/usuarios\/(usr_\w+)$/);
    if (matchAdminUsuario && method === 'GET') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      if (!isAdmin(u)) return fail('Sem permissão', 403);
      const usuarioId = matchAdminUsuario[1];

      const usuario = await env.DB.prepare(
        'SELECT id, nome, login as usuario_login, papel FROM usuarios WHERE id = ?'
      ).bind(usuarioId).first();
      if (!usuario) return fail('Usuário não encontrado', 404);

      const projetosDashboard = await env.DB.prepare(`
        SELECT p.id, p.nome, p.status, p.prioridade, 'dono' as papel_no_projeto
        FROM projetos p
        WHERE p.dono_id = ?
        UNION ALL
        SELECT p.id, p.nome, p.status, p.prioridade, 'editor' as papel_no_projeto
        FROM projetos p
        JOIN permissoes_projeto pp ON pp.projeto_id = p.id
        WHERE pp.usuario_id = ? AND p.dono_id <> ?
        ORDER BY nome
      `).bind(usuarioId, usuarioId, usuarioId).all();

      const tarefas = await env.DB.prepare(`
        SELECT DISTINCT t.id, t.nome, t.status, t.prioridade, t.dificuldade,
          p.id as projeto_id, p.nome as projeto_nome,
          CASE WHEN t.dono_id = ? THEN 'dono' ELSE 'colaborador' END as papel_na_tarefa
        FROM tarefas t
        JOIN projetos p ON p.id = t.projeto_id
        LEFT JOIN colaboradores_tarefa ct ON ct.tarefa_id = t.id AND ct.usuario_id = ?
        WHERE t.dono_id = ? OR ct.usuario_id = ?
        ORDER BY
          CASE t.status WHEN 'Em andamento' THEN 0 WHEN 'A fazer' THEN 1 WHEN 'Bloqueada' THEN 2 ELSE 3 END,
          t.atualizado_em DESC
      `).bind(usuarioId, usuarioId, usuarioId, usuarioId).all();

      const tempoPorTarefa = await env.DB.prepare(`
        SELECT t.id as tarefa_id, t.nome as tarefa_nome,
          p.id as projeto_id, p.nome as projeto_nome,
          ROUND(SUM(
            (CASE WHEN st.fim IS NULL
              THEN (julianday('now') - julianday(st.inicio)) * 24
              ELSE (julianday(st.fim) - julianday(st.inicio)) * 24
            END)
            -
            COALESCE((
              SELECT SUM(
                CASE WHEN i.fim IS NULL THEN 0
                ELSE (julianday(i.fim) - julianday(i.inicio)) * 24
                END
              ) FROM intervalos i WHERE i.sessao_id = st.id
            ), 0)
          ), 2) as horas_liquidas
        FROM sessoes_tempo st
        JOIN tarefas t ON t.id = st.tarefa_id
        JOIN projetos p ON p.id = t.projeto_id
        WHERE st.usuario_id = ?
        GROUP BY t.id, t.nome, p.id, p.nome
        ORDER BY horas_liquidas DESC
      `).bind(usuarioId).all();

      const ativas = await env.DB.prepare(`
        SELECT st.id, st.inicio, t.id as tarefa_id, t.nome as tarefa_nome,
          p.id as projeto_id, p.nome as projeto_nome
        FROM sessoes_tempo st
        JOIN tarefas t ON t.id = st.tarefa_id
        JOIN projetos p ON p.id = t.projeto_id
        WHERE st.usuario_id = ? AND st.fim IS NULL
        ORDER BY st.inicio ASC
      `).bind(usuarioId).all();

      return ok({
        usuario,
        projetos_dashboard: projetosDashboard.results,
        tarefas: tarefas.results,
        tempo_por_tarefa: tempoPorTarefa.results,
        ativas: ativas.results,
      });
    }

    if (path === '/admin/projetos' && method === 'GET') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      if (!isAdmin(u)) return fail('Sem permissão', 403);

      const projetos = await env.DB.prepare(`
        SELECT p.id, p.nome, p.fase, p.status, p.prioridade, p.prazo,
          pu.nome as dono_nome,
          COUNT(DISTINCT t.id) as total_tarefas,
          SUM(CASE WHEN t.status = 'Concluída' THEN 1 ELSE 0 END) as tarefas_concluidas,
          COALESCE(ROUND(SUM(
            (CASE WHEN st.fim IS NULL
              THEN (julianday('now') - julianday(st.inicio)) * 24
              ELSE (julianday(st.fim) - julianday(st.inicio)) * 24
            END)
            -
            COALESCE((
              SELECT SUM(
                CASE WHEN i.fim IS NULL THEN 0
                ELSE (julianday(i.fim) - julianday(i.inicio)) * 24
                END
              ) FROM intervalos i WHERE i.sessao_id = st.id
            ), 0)
          ), 2), 0) as horas_totais
        FROM projetos p
        LEFT JOIN usuarios pu ON pu.id = p.dono_id
        LEFT JOIN tarefas t ON t.projeto_id = p.id
        LEFT JOIN sessoes_tempo st ON st.tarefa_id = t.id
        GROUP BY p.id, p.nome, p.fase, p.status, p.prioridade, p.prazo, pu.nome
        ORDER BY p.atualizado_em DESC
      `).all();

      return ok(projetos.results);
    }

    if (path === '/admin/tempo' && method === 'GET') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      if (!isAdmin(u)) return fail('Sem permissão', 403);
      const de = url.searchParams.get('de') || null;
      const ate = url.searchParams.get('ate') || null;
      const usuarioId = url.searchParams.get('usuario_id') || null;

      const linhas = await env.DB.prepare(`
        SELECT
          tu.id as usuario_id, tu.nome as usuario_nome,
          p.id as projeto_id, p.nome as projeto_nome,
          t.id as tarefa_id, t.nome as tarefa_nome,
          ROUND(SUM(
            (CASE WHEN st.fim IS NULL
              THEN (julianday('now') - julianday(st.inicio)) * 24
              ELSE (julianday(st.fim) - julianday(st.inicio)) * 24
            END)
            -
            COALESCE((
              SELECT SUM(
                CASE WHEN i.fim IS NULL THEN 0
                ELSE (julianday(i.fim) - julianday(i.inicio)) * 24
                END
              ) FROM intervalos i WHERE i.sessao_id = st.id
            ), 0)
          ), 2) as horas_liquidas
        FROM sessoes_tempo st
        JOIN usuarios tu ON tu.id = st.usuario_id
        JOIN tarefas t ON t.id = st.tarefa_id
        JOIN projetos p ON p.id = t.projeto_id
        WHERE
          (? IS NULL OR tu.id = ?)
          AND
          (? IS NULL OR date(st.inicio) >= date(?))
          AND (? IS NULL OR date(st.inicio) <= date(?))
        GROUP BY tu.id, tu.nome, p.id, p.nome, t.id, t.nome
        ORDER BY horas_liquidas DESC
      `).bind(usuarioId, usuarioId, de, de, ate, ate).all();

      return ok(linhas.results);
    }

    const matchUsuarioPapel = path.match(/^\/usuarios\/(usr_\w+)\/papel$/);
    if (matchUsuarioPapel && method === 'PUT') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      if (!isAdmin(u)) return fail('Sem permissão', 403);
      const usuarioId = matchUsuarioPapel[1];
      const { papel } = await request.json();
      if (!['admin', 'membro'].includes(papel)) return fail('Papel inválido');
      const alvo = await env.DB.prepare('SELECT id, papel FROM usuarios WHERE id = ?').bind(usuarioId).first();
      if (!alvo) return fail('Usuário não encontrado', 404);
      if (alvo.id === u.uid && papel !== 'admin') return fail('Você não pode remover seu próprio papel admin');
      await env.DB.prepare('UPDATE usuarios SET papel = ? WHERE id = ?').bind(papel, usuarioId).run();
      return ok({ ok: true, id: usuarioId, papel });
    }

    // ── PROJETOS ──
    if (path === '/projetos' && method === 'GET') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);

      // C1: filtro de status via binding parametrizado — sem interpolação de string
      const statusFiltroRaw = url.searchParams.get('status') || null;
      const statusFiltro = statusFiltroRaw ? normalizarStatusProjeto(statusFiltroRaw) : null;
      if (statusFiltro && !STATUS_PROJ_VALIDOS_SET.has(statusFiltro)) return fail('Status de projeto inválido', 400);
      const asMember = url.searchParams.get('as_member') === '1';
      const adminScope = (isAdmin(u) && !asMember) ? 1 : 0;
      // Filtra: projetos do usuário (dono) OU compartilhados com ele (permissoes_projeto)
      // Admin vê todos
      const projetos = await env.DB.prepare(`
        SELECT p.*,
          pu.nome as dono_nome,
          COUNT(DISTINCT t.id) as total_tarefas,
          SUM(CASE WHEN t.status = 'Concluída' THEN 1 ELSE 0 END) as tarefas_concluidas,
          (
            SELECT t2.nome FROM tarefas t2
            WHERE t2.projeto_id = p.id AND t2.foco = 1 AND t2.dono_id = ?
            LIMIT 1
          ) as minha_tarefa_foco
        FROM projetos p
        LEFT JOIN usuarios pu ON pu.id = p.dono_id
        LEFT JOIN tarefas t ON t.projeto_id = p.id
        WHERE
          (? = 1 OR p.dono_id = ? OR EXISTS (
            SELECT 1 FROM permissoes_projeto pp WHERE pp.projeto_id = p.id AND pp.usuario_id = ?
          ))
          AND (? IS NULL OR p.status = ?)
        GROUP BY p.id
        ORDER BY
          CASE p.status WHEN 'A fazer' THEN 0 WHEN 'Em andamento' THEN 1 WHEN 'Aguardando aprovação' THEN 2 WHEN 'Pausado' THEN 3 WHEN 'Concluído' THEN 4 WHEN 'Concluída' THEN 4 ELSE 5 END,
          CASE p.prioridade WHEN 'Alta' THEN 0 WHEN 'Média' THEN 1 ELSE 2 END,
          p.prazo ASC NULLS LAST,
          p.atualizado_em DESC
      `).bind(u.uid, adminScope, u.uid, u.uid, statusFiltro, statusFiltro).all();
      return ok(projetos.results);
    }

    if (path === '/projetos' && method === 'POST') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      const { nome, fase, status, prioridade, prazo, area_m2 } = await request.json();
      if (!nome?.trim()) return fail('Nome obrigatório');
      const statusProjeto = normalizarStatusProjeto(status || 'A fazer');
      if (!STATUS_PROJ_VALIDOS_SET.has(statusProjeto)) return fail('Status de projeto inválido', 400);
      const id = 'prj_' + uid();
      await env.DB.prepare(
        'INSERT INTO projetos (id, nome, fase, status, prioridade, prazo, area_m2, dono_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(id, nome.trim(), fase || 'Estudo preliminar', statusProjeto, prioridade || 'Média', prazo || null, area_m2 || null, u.uid).run();
      return ok({ id });
    }

    const matchProjeto = path.match(/^\/projetos\/(prj_\w+)$/);

    if (matchProjeto) {
      const projetoId = matchProjeto[1];

      if (method === 'GET') {
        const [u, e] = await requireAuth(request, env);
        if (e) return fail('Não autorizado', 401);
        const projeto = await env.DB.prepare(
          'SELECT p.*, pu.nome as dono_nome FROM projetos p LEFT JOIN usuarios pu ON pu.id = p.dono_id WHERE p.id = ?'
        ).bind(projetoId).first();
        if (!projeto) return fail('Projeto não encontrado', 404);
        const perms = await env.DB.prepare(
          'SELECT pp.usuario_id, u.nome, u.login as usuario_login FROM permissoes_projeto pp JOIN usuarios u ON u.id = pp.usuario_id WHERE pp.projeto_id = ?'
        ).bind(projetoId).all();
        const podeEditar = await podeEditarProjeto(env, projetoId, u.uid, u.papel);
        return ok({ ...projeto, editores: perms.results, pode_editar: podeEditar });
      }

      if (method === 'PUT') {
        const [u, e] = await requireAuth(request, env);
        if (e) return fail('Não autorizado', 401);
        if (!await podeEditarProjeto(env, projetoId, u.uid, u.papel)) return fail('Sem permissão', 403);
        const { nome, fase, status, prioridade, prazo, area_m2 } = await request.json();
        if (!nome?.trim()) return fail('Nome obrigatório');
        const statusProjeto = normalizarStatusProjeto(status);
        if (!STATUS_PROJ_VALIDOS_SET.has(statusProjeto)) return fail('Status de projeto inválido', 400);
        await env.DB.prepare(
          'UPDATE projetos SET nome=?, fase=?, status=?, prioridade=?, prazo=?, area_m2=?, atualizado_em=datetime("now") WHERE id=?'
        ).bind(nome.trim(), fase, statusProjeto, prioridade, prazo || null, area_m2 || null, projetoId).run();
        return ok({ ok: true });
      }

      if (method === 'DELETE') {
        const [u, e] = await requireAuth(request, env);
        if (e) return fail('Não autorizado', 401);
        const proj = await env.DB.prepare('SELECT dono_id, status FROM projetos WHERE id = ?').bind(projetoId).first();
        if (!proj) return fail('Não encontrado', 404);
        if (proj.dono_id !== u.uid && !isAdmin(u)) return fail('Sem permissão', 403);
        // Só pode excluir projeto arquivado
        if (proj.status !== 'Arquivado' && !isAdmin(u)) {
          return fail('Projeto precisa estar arquivado antes de ser excluído', 400);
        }
        await env.DB.prepare('DELETE FROM projetos WHERE id = ?').bind(projetoId).run();
        return ok({ ok: true });
      }
    }

    // ── PERMISSÕES ──
    const matchPerms = path.match(/^\/projetos\/(prj_\w+)\/permissoes$/);
    if (matchPerms && method === 'POST') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      const projetoId = matchPerms[1];
      const proj = await env.DB.prepare('SELECT dono_id FROM projetos WHERE id = ?').bind(projetoId).first();
      if (!proj) return fail('Não encontrado', 404);
      if (proj.dono_id !== u.uid && !isAdmin(u)) return fail('Sem permissão', 403);
      const { usuario_id } = await request.json();
      if (usuario_id === proj.dono_id) return fail('Usuário já é dono do projeto');
      await env.DB.prepare(
        'INSERT OR REPLACE INTO permissoes_projeto (projeto_id, usuario_id) VALUES (?, ?)'
      ).bind(projetoId, usuario_id).run();
      return ok({ ok: true });
    }

    const matchPerm = path.match(/^\/projetos\/(prj_\w+)\/permissoes\/(usr_\w+)$/);
    if (matchPerm && method === 'DELETE') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      const [, projetoId, usuarioId] = matchPerm;
      const proj = await env.DB.prepare('SELECT dono_id FROM projetos WHERE id = ?').bind(projetoId).first();
      if (!proj) return fail('Não encontrado', 404);
      if (proj.dono_id !== u.uid && !isAdmin(u)) return fail('Sem permissão', 403);
      await env.DB.prepare(
        'DELETE FROM permissoes_projeto WHERE projeto_id = ? AND usuario_id = ?'
      ).bind(projetoId, usuarioId).run();
      return ok({ ok: true });
    }

    // ── TAREFAS ──
    const matchTarefasProj = path.match(/^\/projetos\/(prj_\w+)\/tarefas$/);

    if (matchTarefasProj) {
      const projetoId = matchTarefasProj[1];

      if (method === 'GET') {
        const [u, e] = await requireAuth(request, env);
        if (e) return fail('Não autorizado', 401);
        const tarefas = await env.DB.prepare(
          `SELECT t.*, tu.nome as dono_nome,
           CASE WHEN t.dono_id = ? THEN 1 ELSE 0 END as minha_tarefa
           FROM tarefas t LEFT JOIN usuarios tu ON tu.id = t.dono_id
           WHERE t.projeto_id = ?
           ORDER BY t.foco DESC,
             CASE t.status WHEN 'Em andamento' THEN 0 WHEN 'A fazer' THEN 1 WHEN 'Bloqueada' THEN 2 ELSE 3 END,
             t.criado_em ASC`
        ).bind(u.uid, projetoId).all();
        return ok(tarefas.results);
      }

      if (method === 'POST') {
        const [u, e] = await requireAuth(request, env);
        if (e) return fail('Não autorizado', 401);
        const { nome, status, prioridade, dificuldade, data } = await request.json();
        if (!nome?.trim()) return fail('Nome obrigatório');
        const id = 'tsk_' + uid();
        await env.DB.prepare(
          'INSERT INTO tarefas (id, projeto_id, nome, status, prioridade, dificuldade, data, dono_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(id, projetoId, nome.trim(), status || 'A fazer', prioridade || 'Média', dificuldade || 'Moderada', data || null, u.uid).run();
        return ok({ id });
      }
    }

    const matchTarefa = path.match(/^\/tarefas\/(tsk_\w+)$/);

    if (matchTarefa) {
      const tarefaId = matchTarefa[1];

      if (method === 'PUT') {
        const [u, e] = await requireAuth(request, env);
        if (e) return fail('Não autorizado', 401);
        if (!await podeEditarTarefa(env, tarefaId, u.uid, u.papel)) return fail('Sem permissão', 403);
        const { nome, status, prioridade, dificuldade, data } = await request.json();
        if (!nome?.trim()) return fail('Nome obrigatório');
        await env.DB.prepare(
          'UPDATE tarefas SET nome=?, status=?, prioridade=?, dificuldade=?, data=?, atualizado_em=datetime("now") WHERE id=?'
        ).bind(nome.trim(), status, prioridade, dificuldade, data || null, tarefaId).run();
        return ok({ ok: true });
      }


      // PUT /tarefas/:id/status — muda só o status, restrito a dono e colaboradores
      if (method === 'PATCH') {
        const [u, e] = await requireAuth(request, env);
        if (e) return fail('Não autorizado', 401);
        if (!await podeCronometrar(env, tarefaId, u.uid, u.papel)) {
          return fail('Sem permissão — só o dono e colaboradores podem mudar o status', 403);
        }
        const { status } = await request.json();
        if (!status) return fail('Status obrigatório');
        await env.DB.prepare(
          'UPDATE tarefas SET status=?, atualizado_em=datetime("now") WHERE id=?'
        ).bind(status, tarefaId).run();
        return ok({ ok: true });
      }
      if (method === 'DELETE') {
        const [u, e] = await requireAuth(request, env);
        if (e) return fail('Não autorizado', 401);
        if (!await podeEditarTarefa(env, tarefaId, u.uid, u.papel)) return fail('Sem permissão', 403);
        await env.DB.prepare('DELETE FROM tarefas WHERE id = ?').bind(tarefaId).run();
        return ok({ ok: true });
      }
    }

    // ── FOCO (C — batch para atomicidade) ──
    const matchFoco = path.match(/^\/tarefas\/(tsk_\w+)\/foco$/);

    if (matchFoco) {
      const tarefaId = matchFoco[1];
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);

      if (method === 'PUT') {
        const tarefa = await env.DB.prepare('SELECT projeto_id, dono_id FROM tarefas WHERE id = ?').bind(tarefaId).first();
        if (!tarefa) return fail('Tarefa não encontrada', 404);
        if (tarefa.dono_id !== u.uid && !isAdmin(u)) return fail('Só pode marcar foco nas suas tarefas', 403);
        // Usar batch para atomicidade: remove foco anterior e define novo numa operação
        await env.DB.batch([
          env.DB.prepare('UPDATE tarefas SET foco = 0 WHERE projeto_id = ? AND dono_id = ?').bind(tarefa.projeto_id, u.uid),
          env.DB.prepare('UPDATE tarefas SET foco = 1 WHERE id = ?').bind(tarefaId),
        ]);
        return ok({ ok: true });
      }

      if (method === 'DELETE') {
        const tarefa = await env.DB.prepare('SELECT dono_id FROM tarefas WHERE id = ?').bind(tarefaId).first();
        if (!tarefa) return fail('Tarefa não encontrada', 404);
        if (tarefa.dono_id !== u.uid && !isAdmin(u)) return fail('Sem permissão', 403);
        await env.DB.prepare('UPDATE tarefas SET foco = 0 WHERE id = ?').bind(tarefaId).run();
        return ok({ ok: true });
      }
    }

    // ── DECISÕES ──
    const matchDecisoesProj = path.match(/^\/projetos\/(prj_\w+)\/decisoes$/);

    if (matchDecisoesProj) {
      const projetoId = matchDecisoesProj[1];

      if (method === 'GET') {
        const [, e] = await requireAuth(request, env);
        if (e) return fail('Não autorizado', 401);
        const decisoes = await env.DB.prepare(
          `SELECT d.*, du.nome as dono_nome FROM decisoes d
           LEFT JOIN usuarios du ON du.id = d.dono_id
           WHERE d.projeto_id = ? ORDER BY d.data DESC, d.criado_em DESC`
        ).bind(projetoId).all();
        return ok(decisoes.results);
      }

      if (method === 'POST') {
        const [u, e] = await requireAuth(request, env);
        if (e) return fail('Não autorizado', 401);
        if (!await podeEditarProjeto(env, projetoId, u.uid, u.papel)) return fail('Sem permissão', 403);
        const { descricao, data } = await request.json();
        if (!descricao?.trim()) return fail('Descrição obrigatória');
        const id = 'dec_' + uid();
        await env.DB.prepare(
          'INSERT INTO decisoes (id, projeto_id, descricao, data, dono_id) VALUES (?, ?, ?, ?, ?)'
        ).bind(id, projetoId, descricao.trim(), data || new Date().toISOString().slice(0, 10), u.uid).run();
        return ok({ id });
      }
    }

    const matchDecisao = path.match(/^\/decisoes\/(dec_\w+)$/);
    if (matchDecisao && method === 'DELETE') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      const d = await env.DB.prepare('SELECT dono_id, projeto_id FROM decisoes WHERE id = ?').bind(matchDecisao[1]).first();
      if (!d) return fail('Não encontrado', 404);
      if (d.dono_id !== u.uid && !await podeEditarProjeto(env, d.projeto_id, u.uid, u.papel)) return fail('Sem permissão', 403);
      await env.DB.prepare('DELETE FROM decisoes WHERE id = ?').bind(matchDecisao[1]).run();
      return ok({ ok: true });
    }



    // ── COLABORADORES DE TAREFA ──

    // GET /tarefas/:id/colaboradores
    const matchColabs = path.match(/^\/tarefas\/(tsk_\w+)\/colaboradores$/);
    if (matchColabs) {
      const tarefaId = matchColabs[1];
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);

      if (method === 'GET') {
        const tarefa = await env.DB.prepare('SELECT dono_id FROM tarefas WHERE id = ?').bind(tarefaId).first();
        if (!tarefa) return fail('Tarefa não encontrada', 404);
        const colabs = await env.DB.prepare(
          'SELECT u.id, u.nome, u.login as usuario_login FROM colaboradores_tarefa ct JOIN usuarios u ON u.id = ct.usuario_id WHERE ct.tarefa_id = ?'
        ).bind(tarefaId).all();
        return ok(colabs.results);
      }

      if (method === 'POST') {
        // Só o dono da tarefa ou admin pode adicionar colaboradores
        const tarefa = await env.DB.prepare('SELECT dono_id FROM tarefas WHERE id = ?').bind(tarefaId).first();
        if (!tarefa) return fail('Tarefa não encontrada', 404);
        if (tarefa.dono_id !== u.uid && !isAdmin(u)) return fail('Sem permissão', 403);
        const { usuario_id } = await request.json();
        if (usuario_id === tarefa.dono_id) return fail('Usuário já é dono da tarefa');
        await env.DB.prepare(
          'INSERT OR IGNORE INTO colaboradores_tarefa (tarefa_id, usuario_id) VALUES (?, ?)'
        ).bind(tarefaId, usuario_id).run();
        return ok({ ok: true });
      }
    }

    // DELETE /tarefas/:id/colaboradores/:uid
    const matchColabDel = path.match(/^\/tarefas\/(tsk_\w+)\/colaboradores\/(usr_\w+)$/);
    if (matchColabDel && method === 'DELETE') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      const [, tarefaId, usuarioId] = matchColabDel;
      const tarefa = await env.DB.prepare('SELECT dono_id FROM tarefas WHERE id = ?').bind(tarefaId).first();
      if (!tarefa) return fail('Tarefa não encontrada', 404);
      if (tarefa.dono_id !== u.uid && !isAdmin(u)) return fail('Sem permissão', 403);
      await env.DB.prepare(
        'DELETE FROM colaboradores_tarefa WHERE tarefa_id = ? AND usuario_id = ?'
      ).bind(tarefaId, usuarioId).run();
      return ok({ ok: true });
    }

    // ── CRONÔMETRO ──

    // GET /tarefas/:id/tempo — listar sessões de cronômetro de uma tarefa
    const matchTempo = path.match(/^\/tarefas\/(tsk_\w+)\/tempo$/);
    if (matchTempo) {
      const tarefaId = matchTempo[1];
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);

      if (method === 'GET') {
        // Admin vê sessões de todos; outros veem só as suas
        const filtroUsuario = isAdmin(u) ? null : u.uid;
        const sessoes = await env.DB.prepare(`
          SELECT st.*, tu.nome as usuario_nome,
            ROUND((
              CASE WHEN st.fim IS NULL
                THEN (julianday('now') - julianday(st.inicio)) * 24
                ELSE (julianday(st.fim) - julianday(st.inicio)) * 24
              END
              -
              COALESCE((
                SELECT SUM(
                  CASE WHEN i.fim IS NULL THEN 0
                  ELSE (julianday(i.fim) - julianday(i.inicio)) * 24
                  END
                ) FROM intervalos i WHERE i.sessao_id = st.id
              ), 0)
            ), 4) as horas_liquidas
          FROM sessoes_tempo st
          LEFT JOIN usuarios tu ON tu.id = st.usuario_id
          WHERE st.tarefa_id = ? AND (? IS NULL OR st.usuario_id = ?)
          ORDER BY st.usuario_id, st.inicio DESC
        `).bind(tarefaId, filtroUsuario, filtroUsuario).all();

        // Para cada sessão, buscar intervalos
        const results = [];
        for (const s of sessoes.results) {
          const intervalos = await env.DB.prepare(
            'SELECT * FROM intervalos WHERE sessao_id = ? ORDER BY inicio ASC'
          ).bind(s.id).all();
          results.push({ ...s, intervalos: intervalos.results });
        }
        return ok(results);
      }

      if (method === 'POST') {
        // Verificar se usuário tem permissão para cronometrar esta tarefa
        if (!await podeCronometrar(env, tarefaId, u.uid, u.papel)) {
          return fail('Sem permissão — você precisa ser dono ou colaborador desta tarefa', 403);
        }
        const { inicio } = await request.json();
        const id = 'ste_' + uid();
        const inicioStr = inicio || new Date().toISOString().slice(0, 19).replace('T', ' ');
        await env.DB.prepare(
          'INSERT INTO sessoes_tempo (id, tarefa_id, usuario_id, inicio) VALUES (?, ?, ?, ?)'
        ).bind(id, tarefaId, u.uid, inicioStr).run();
        return ok({ id, inicio: inicioStr });
      }
    }

    // PUT /tempo/:id — atualizar sessão (editar início/fim)
    const matchTempoId = path.match(/^\/tempo\/(ste_\w+)$/);
    if (matchTempoId) {
      const sessaoId = matchTempoId[1];
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      const s = await env.DB.prepare('SELECT usuario_id FROM sessoes_tempo WHERE id = ?').bind(sessaoId).first();
      if (!s) return fail('Sessão não encontrada', 404);
      if (s.usuario_id !== u.uid && !isAdmin(u)) return fail('Sem permissão', 403);

      if (method === 'PUT') {
        const { inicio, fim } = await request.json();
        await env.DB.prepare('UPDATE sessoes_tempo SET inicio=?, fim=? WHERE id=?')
          .bind(inicio, fim || null, sessaoId).run();
        return ok({ ok: true });
      }

      if (method === 'DELETE') {
        await env.DB.prepare('DELETE FROM sessoes_tempo WHERE id = ?').bind(sessaoId).run();
        return ok({ ok: true });
      }
    }

    // PUT /tempo/:id/parar — parar cronômetro (define fim = agora)
    const matchTempoParar = path.match(/^\/tempo\/(ste_\w+)\/parar$/);
    if (matchTempoParar && method === 'PUT') {
      const sessaoId = matchTempoParar[1];
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      const s = await env.DB.prepare('SELECT usuario_id FROM sessoes_tempo WHERE id = ?').bind(sessaoId).first();
      if (!s) return fail('Sessão não encontrada', 404);
      if (s.usuario_id !== u.uid && !isAdmin(u)) return fail('Sem permissão', 403);
      const { fim } = await request.json();
      const fimStr = fim || new Date().toISOString().slice(0, 19).replace('T', ' ');
      await env.DB.prepare('UPDATE sessoes_tempo SET fim=? WHERE id=?').bind(fimStr, sessaoId).run();
      return ok({ ok: true, fim: fimStr });
    }


    // GET /tarefas/:id/tempo/resumo — total de horas por usuário (para relatório)
    const matchTempoResumo = path.match(/^\/tarefas\/(tsk_\w+)\/tempo\/resumo$/);
    if (matchTempoResumo && method === 'GET') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      const tarefaId = matchTempoResumo[1];
      const resumo = await env.DB.prepare(`
        SELECT st.usuario_id, tu.nome as usuario_nome,
          ROUND(SUM(
            (CASE WHEN st.fim IS NULL
              THEN (julianday('now') - julianday(st.inicio)) * 24
              ELSE (julianday(st.fim) - julianday(st.inicio)) * 24
            END)
            -
            COALESCE((
              SELECT SUM(
                CASE WHEN i.fim IS NULL THEN 0
                ELSE (julianday(i.fim) - julianday(i.inicio)) * 24
                END
              ) FROM intervalos i WHERE i.sessao_id = st.id
            ), 0)
          ), 2) as horas_liquidas
        FROM sessoes_tempo st
        LEFT JOIN usuarios tu ON tu.id = st.usuario_id
        WHERE st.tarefa_id = ?
        GROUP BY st.usuario_id, tu.nome
        ORDER BY horas_liquidas DESC
      `).bind(tarefaId).all();
      return ok(resumo.results);
    }

    // GET /tempo/ativas — sessões ativas do usuário (sem fim)
    if (path === '/tempo/ativas' && method === 'GET') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      const asMember = url.searchParams.get('as_member') === '1';
      const adminScope = (isAdmin(u) && !asMember) ? 1 : 0;
      const ativas = await env.DB.prepare(`
        SELECT st.id, st.tarefa_id, st.inicio,
          t.nome as tarefa_nome, p.nome as projeto_nome, p.id as projeto_id,
          tu.nome as usuario_nome, tu.login as usuario_login, st.usuario_id
        FROM sessoes_tempo st
        JOIN tarefas t ON t.id = st.tarefa_id
        JOIN projetos p ON p.id = t.projeto_id
        JOIN usuarios tu ON tu.id = st.usuario_id
        WHERE (? = 1 OR st.usuario_id = ?) AND st.fim IS NULL
        ORDER BY st.inicio ASC
      `).bind(adminScope, u.uid).all();
      return ok(ativas.results);
    }

    // ── INTERVALOS ──

    // POST /tempo/:id/intervalos — adicionar intervalo a uma sessão
    const matchIntervalos = path.match(/^\/tempo\/(ste_\w+)\/intervalos$/);
    if (matchIntervalos && method === 'POST') {
      const sessaoId = matchIntervalos[1];
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      const s = await env.DB.prepare('SELECT usuario_id FROM sessoes_tempo WHERE id = ?').bind(sessaoId).first();
      if (!s) return fail('Sessão não encontrada', 404);
      if (s.usuario_id !== u.uid && !isAdmin(u)) return fail('Sem permissão', 403);
      const { tipo, inicio, fim } = await request.json();
      if (!tipo?.trim()) return fail('Tipo obrigatório');
      const id = 'int_' + uid();
      const inicioStr = inicio || new Date().toISOString().slice(0, 19).replace('T', ' ');
      await env.DB.prepare(
        'INSERT INTO intervalos (id, sessao_id, tipo, inicio, fim) VALUES (?, ?, ?, ?, ?)'
      ).bind(id, sessaoId, tipo.trim(), inicioStr, fim || null).run();
      return ok({ id, tipo, inicio: inicioStr, fim: fim || null });
    }

    // PUT /intervalos/:id — editar intervalo
    const matchIntervalo = path.match(/^\/intervalos\/(int_\w+)$/);
    if (matchIntervalo) {
      const intervaloId = matchIntervalo[1];
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      const iv = await env.DB.prepare(
        'SELECT i.*, st.usuario_id FROM intervalos i JOIN sessoes_tempo st ON st.id = i.sessao_id WHERE i.id = ?'
      ).bind(intervaloId).first();
      if (!iv) return fail('Intervalo não encontrado', 404);
      if (iv.usuario_id !== u.uid && !isAdmin(u)) return fail('Sem permissão', 403);

      if (method === 'PUT') {
        const { tipo, inicio, fim } = await request.json();
        await env.DB.prepare('UPDATE intervalos SET tipo=?, inicio=?, fim=? WHERE id=?')
          .bind(tipo, inicio, fim || null, intervaloId).run();
        return ok({ ok: true });
      }

      if (method === 'DELETE') {
        await env.DB.prepare('DELETE FROM intervalos WHERE id = ?').bind(intervaloId).run();
        return ok({ ok: true });
      }
    }

    return fail('Rota não encontrada', 404);

    } catch (ex) {
      // C5: não expor stack trace ao cliente — logar internamente
      console.error('[Worker Error]', ex.message, ex.stack);
      return err('Erro interno do servidor', 500, getCors(request, env));
    }
  },
};
