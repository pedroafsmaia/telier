import { getCors, json, err } from './backend/http/responses.js';
import { ensureAllSchemas } from './backend/schema/migrations.js';

// Auth & Users
import { handleAuthRegister, handleAuthLogin, handleAuthLogout, handleAuthMe, handleAuthTrocarSenha } from './backend/domain/auth/controllers.js';
import { handleGetUsuarios, handlePostUsuarios, handlePutUsuarioPapel, handlePutUsuarioSenha } from './backend/domain/users/controllers.js';

// Projects & Groups
import { handleGetProjetos, handlePostProjetos, handleGetProjeto, handlePutProjeto, handlePatchProjeto, handleDeleteProjeto, handlePostPermissoesProjeto, handleDeleteSairProjeto, handleDeletePermissaoProjetoUsuario } from './backend/domain/projects/controllers.js';
import { handleGetDecisoesProjeto, handlePostDecisoesProjeto, handleDeleteDecisao, handlePutDecisao } from './backend/domain/projects/decisions.js';
import { handleGetProjetoRelatorio, handleGetProjetoHorasPorUsuario } from './backend/domain/projects/reports.js';
import { handleGetGrupos, handlePostGrupos, handleGetGrupo, handlePutGrupo, handlePatchGrupo, handleDeleteGrupo, handlePostPermissoesGrupo, handleDeleteSairGrupo, handleDeletePermissaoGrupoUsuario } from './backend/domain/groups/controllers.js';

// Tasks
import { handleGetTarefasProjeto, handlePostTarefasProjeto, handlePutTarefa, handlePatchTarefaStatus, handleDeleteTarefa, handlePostDuplicarTarefa, handlePutTarefaFoco, handleDeleteTarefaFoco, handleGetColaboradoresTarefa, handlePostColaboradoresTarefa, handleDeleteSairTarefa, handleDeleteColaboradorTarefa, handleGetOperacaoHoje, handleGetMinhasTarefas } from './backend/domain/tasks/controllers.js';
import { handleGetTemplatesTarefa, handlePostTemplatesTarefa, handlePutTemplateTarefa, handleDeleteTemplateTarefa } from './backend/domain/tasks/templates.js';

// Time
import { handleGetTempoTarefa, handlePostTempoTarefa, handlePutTempo, handleDeleteTempo, handlePutTempoParar, handleGetTempoResumoHoje, handleGetTempoAtivas } from './backend/domain/time/controllers.js';
import { handleGetTempoResumo, handleGetTempoColegasAtivos, handleGetTempoUltimaSessao, handleGetTempoSessoesRecentes } from './backend/domain/time/reports.js';
import { handlePostIntervalos, handleGetIntervalos, handlePutIntervalos, handleDeleteIntervalos } from './backend/domain/time/intervals.js';

// Admin & Status
import { handleGetStatus, handleGetAdminAgora, handleGetAdminTimelineHoje, handleGetAdminUsuarios, handleGetAdminUsuario, handleGetAdminProjetos, handleGetAdminTempo, handleGetAdminHorasPorGrupo } from './backend/domain/admin/controllers.js';

export default {
  async fetch(request, env, ctx) {
    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'Database binding (DB) is missing. Check wrangler.toml' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const cors = getCors(request, env);
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const reqId = crypto.randomUUID();
    cors['X-Request-Id'] = reqId;

    // Booting schema non-blocking
    ctx.waitUntil(ensureAllSchemas(env).catch(e => console.error(`[schema] [${reqId}]`, e.message)));

    const t0 = performance.now();
    try {
      /* ── AUTH ── */
      if (path === '/api/auth/register' && method === 'POST') return await handleAuthRegister(request, env, cors);
      if (path === '/api/auth/login' && method === 'POST') return await handleAuthLogin(request, env, cors);
      if (path === '/api/auth/logout' && method === 'POST') return await handleAuthLogout(request, env, cors);
      if (path === '/api/auth/me' && method === 'GET') return await handleAuthMe(request, env, cors);
      if (path === '/api/auth/trocar-senha' && method === 'POST') return await handleAuthTrocarSenha(request, env, cors);

      /* ── USUARIOS ── */
      if (path === '/api/usuarios' && method === 'GET') return await handleGetUsuarios(request, env, cors);
      if (path === '/api/usuarios' && method === 'POST') return await handlePostUsuarios(request, env, cors);
      const matchUsuarioPapel = path.match(/^\/api\/usuarios\/(usr_[a-zA-Z0-9]+)\/papel$/);
      if (matchUsuarioPapel && method === 'PUT') return await handlePutUsuarioPapel(request, env, matchUsuarioPapel[1]);
      const matchUsuarioSenha = path.match(/^\/api\/usuarios\/(usr_[a-zA-Z0-9]+)\/senha$/);
      if (matchUsuarioSenha && method === 'PUT') return await handlePutUsuarioSenha(request, env, matchUsuarioSenha[1]);

      /* ── STATUS GERAL GLOBAIS ── */
      if (path === '/api/status' && method === 'GET') return await handleGetStatus(request, env, url);
      if (path === '/api/tarefas/operacao-hoje' && method === 'GET') return await handleGetOperacaoHoje(request, env, url);
      if (path === '/api/tarefas/minhas' && method === 'GET') return await handleGetMinhasTarefas(request, env, url);
      if (path === '/api/tempo/ativas' && method === 'GET') return await handleGetTempoAtivas(request, env, url);
      if (path === '/api/tempo/colegas-ativos' && method === 'GET') return await handleGetTempoColegasAtivos(request, env, url);
      if (path === '/api/tempo/ultima-sessao' && method === 'GET') return await handleGetTempoUltimaSessao(request, env, url);
      if (path === '/api/tempo/sessoes-recentes' && method === 'GET') return await handleGetTempoSessoesRecentes(request, env, url);
      if (path === '/api/tempo/resumo-hoje' && method === 'GET') return await handleGetTempoResumoHoje(request, env, url);
      if (path === '/api/templates-tarefa' && method === 'GET') return await handleGetTemplatesTarefa(request, env, url);
      if (path === '/api/templates-tarefa' && method === 'POST') return await handlePostTemplatesTarefa(request, env);

      /* ── GRUPOS DE PROJETOS ── */
      if (path === '/api/grupos' && method === 'GET') return await handleGetGrupos(request, env, url);
      if (path === '/api/grupos' && method === 'POST') return await handlePostGrupos(request, env);
      const matchGrupo = path.match(/^\/api\/grupos\/(grp_[a-zA-Z0-9]+)$/);
      if (matchGrupo && method === 'GET') return await handleGetGrupo(request, env, matchGrupo[1]);
      if (matchGrupo && method === 'PUT') return await handlePutGrupo(request, env, matchGrupo[1]);
      if (matchGrupo && method === 'PATCH') return await handlePatchGrupo(request, env, matchGrupo[1]);
      if (matchGrupo && method === 'DELETE') return await handleDeleteGrupo(request, env, matchGrupo[1]);
      const matchGrupoPerm = path.match(/^\/api\/grupos\/(grp_[a-zA-Z0-9]+)\/permissoes$/);
      if (matchGrupoPerm && method === 'POST') return await handlePostPermissoesGrupo(request, env, matchGrupoPerm[1]);
      const matchGrupoSair = path.match(/^\/api\/grupos\/(grp_[a-zA-Z0-9]+)\/sair$/);
      if (matchGrupoSair && method === 'DELETE') return await handleDeleteSairGrupo(request, env, matchGrupoSair[1]);
      const matchGrupoPermUid = path.match(/^\/api\/grupos\/(grp_[a-zA-Z0-9]+)\/permissoes\/(usr_[a-zA-Z0-9]+)$/);
      if (matchGrupoPermUid && method === 'DELETE') return await handleDeletePermissaoGrupoUsuario(request, env, matchGrupoPermUid[1], matchGrupoPermUid[2]);

      /* ── PROJETOS ── */
      if (path === '/api/projetos' && method === 'GET') return await handleGetProjetos(request, env, url);
      if (path === '/api/projetos' && method === 'POST') return await handlePostProjetos(request, env);
      const matchProjeto = path.match(/^\/api\/projetos\/(prj_[a-zA-Z0-9]+)$/);
      if (matchProjeto && method === 'GET') return await handleGetProjeto(request, env, matchProjeto[1]);
      if (matchProjeto && method === 'PUT') return await handlePutProjeto(request, env, matchProjeto[1]);
      if (matchProjeto && method === 'PATCH') return await handlePatchProjeto(request, env, matchProjeto[1]);
      if (matchProjeto && method === 'DELETE') return await handleDeleteProjeto(request, env, matchProjeto[1]);
      const matchProjetoTarefas = path.match(/^\/api\/projetos\/(prj_[a-zA-Z0-9]+)\/tarefas$/);
      if (matchProjetoTarefas && method === 'GET') return await handleGetTarefasProjeto(request, env, matchProjetoTarefas[1], url);
      if (matchProjetoTarefas && method === 'POST') return await handlePostTarefasProjeto(request, env, matchProjetoTarefas[1]);
      const matchProjetoDecisoes = path.match(/^\/api\/projetos\/(prj_[a-zA-Z0-9]+)\/decisoes$/);
      if (matchProjetoDecisoes && method === 'GET') return await handleGetDecisoesProjeto(request, env, matchProjetoDecisoes[1], url);
      if (matchProjetoDecisoes && method === 'POST') return await handlePostDecisoesProjeto(request, env, matchProjetoDecisoes[1]);
      const matchProjetoPerm = path.match(/^\/api\/projetos\/(prj_[a-zA-Z0-9]+)\/permissoes$/);
      if (matchProjetoPerm && method === 'POST') return await handlePostPermissoesProjeto(request, env, matchProjetoPerm[1]);
      const matchProjetoSair = path.match(/^\/api\/projetos\/(prj_[a-zA-Z0-9]+)\/sair$/);
      if (matchProjetoSair && method === 'DELETE') return await handleDeleteSairProjeto(request, env, matchProjetoSair[1]);
      const matchProjetoPermUid = path.match(/^\/api\/projetos\/(prj_[a-zA-Z0-9]+)\/permissoes\/(usr_[a-zA-Z0-9]+)$/);
      if (matchProjetoPermUid && method === 'DELETE') return await handleDeletePermissaoProjetoUsuario(request, env, matchProjetoPermUid[1], matchProjetoPermUid[2]);
      const matchProjetoRelatorio = path.match(/^\/api\/projetos\/(prj_[a-zA-Z0-9]+)\/relatorio$/);
      if (matchProjetoRelatorio && method === 'GET') return await handleGetProjetoRelatorio(request, env, matchProjetoRelatorio[1]);
      const matchProjetoHorasUsuario = path.match(/^\/api\/projetos\/(prj_[a-zA-Z0-9]+)\/horas-por-usuario$/);
      if (matchProjetoHorasUsuario && method === 'GET') return await handleGetProjetoHorasPorUsuario(request, env, matchProjetoHorasUsuario[1]);

      /* ── TAREFAS ── */
      const matchTarefa = path.match(/^\/api\/tarefas\/(tsk_[a-zA-Z0-9]+)$/);
      if (matchTarefa && method === 'PUT') return await handlePutTarefa(request, env, matchTarefa[1]);
      if (matchTarefa && method === 'PATCH') return await handlePatchTarefaStatus(request, env, matchTarefa[1]);
      if (matchTarefa && method === 'DELETE') return await handleDeleteTarefa(request, env, matchTarefa[1]);
      const matchTarefaDuplicar = path.match(/^\/api\/tarefas\/(tsk_[a-zA-Z0-9]+)\/duplicar$/);
      if (matchTarefaDuplicar && method === 'POST') return await handlePostDuplicarTarefa(request, env, matchTarefaDuplicar[1]);
      const matchTarefaFoco = path.match(/^\/api\/tarefas\/(tsk_[a-zA-Z0-9]+)\/foco$/);
      if (matchTarefaFoco && method === 'PUT') return await handlePutTarefaFoco(request, env, matchTarefaFoco[1]);
      if (matchTarefaFoco && method === 'DELETE') return await handleDeleteTarefaFoco(request, env, matchTarefaFoco[1]);
      const matchTarefaColab = path.match(/^\/api\/tarefas\/(tsk_[a-zA-Z0-9]+)\/colaboradores$/);
      if (matchTarefaColab && method === 'GET') return await handleGetColaboradoresTarefa(request, env, matchTarefaColab[1]);
      if (matchTarefaColab && method === 'POST') return await handlePostColaboradoresTarefa(request, env, matchTarefaColab[1]);
      const matchTarefaSair = path.match(/^\/api\/tarefas\/(tsk_[a-zA-Z0-9]+)\/sair$/);
      if (matchTarefaSair && method === 'DELETE') return await handleDeleteSairTarefa(request, env, matchTarefaSair[1]);
      const matchTarefaColabUid = path.match(/^\/api\/tarefas\/(tsk_[a-zA-Z0-9]+)\/colaboradores\/(usr_[a-zA-Z0-9]+)$/);
      if (matchTarefaColabUid && method === 'DELETE') return await handleDeleteColaboradorTarefa(request, env, matchTarefaColabUid[1], matchTarefaColabUid[2]);
      const matchTarefaTempo = path.match(/^\/api\/tarefas\/(tsk_[a-zA-Z0-9]+)\/tempo$/);
      if (matchTarefaTempo && method === 'GET') return await handleGetTempoTarefa(request, env, matchTarefaTempo[1]);
      if (matchTarefaTempo && method === 'POST') return await handlePostTempoTarefa(request, env, matchTarefaTempo[1]);
      const matchTarefaTempoResumo = path.match(/^\/api\/tarefas\/(tsk_[a-zA-Z0-9]+)\/tempo\/resumo$/);
      if (matchTarefaTempoResumo && method === 'GET') return await handleGetTempoResumo(request, env, matchTarefaTempoResumo[1]);

      /* ── TEMPLATES DE TAREFA ── */
      const matchTemplate = path.match(/^\/api\/templates-tarefa\/(tpl_[a-zA-Z0-9]+)$/);
      if (matchTemplate && method === 'PUT') return await handlePutTemplateTarefa(request, env, matchTemplate[1]);
      if (matchTemplate && method === 'DELETE') return await handleDeleteTemplateTarefa(request, env, matchTemplate[1]);

      /* ── DECISÕES ── */
      const matchDecisao = path.match(/^\/api\/decisoes\/(dec_[a-zA-Z0-9]+)$/);
      if (matchDecisao && method === 'PUT') return await handlePutDecisao(request, env, matchDecisao[1]);
      if (matchDecisao && method === 'DELETE') return await handleDeleteDecisao(request, env, matchDecisao[1]);

      /* ── SESSÕES DE TEMPO & INTERVALOS ── */
      const matchTempo = path.match(/^\/api\/tempo\/(ste_[a-zA-Z0-9]+)$/);
      if (matchTempo && method === 'PUT') return await handlePutTempo(request, env, matchTempo[1]);
      if (matchTempo && method === 'DELETE') return await handleDeleteTempo(request, env, matchTempo[1]);
      const matchTempoParar = path.match(/^\/api\/tempo\/(ste_[a-zA-Z0-9]+)\/parar$/);
      if (matchTempoParar && method === 'PUT') return await handlePutTempoParar(request, env, matchTempoParar[1]);
      const matchTempoIntervalos = path.match(/^\/api\/tempo\/(ste_[a-zA-Z0-9]+)\/intervalos$/);
      if (matchTempoIntervalos && method === 'POST') return await handlePostIntervalos(request, env, matchTempoIntervalos[1]);
      const matchIntervalos = path.match(/^\/api\/intervalos\/(int_[a-zA-Z0-9]+)$/);
      if (matchIntervalos && method === 'GET') return await handleGetIntervalos(request, env, matchIntervalos[1]);
      if (matchIntervalos && method === 'PUT') return await handlePutIntervalos(request, env, matchIntervalos[1]);
      if (matchIntervalos && method === 'DELETE') return await handleDeleteIntervalos(request, env, matchIntervalos[1]);

      /* ── ADMIN ── */
      if (path === '/api/admin/agora' && method === 'GET') return await handleGetAdminAgora(request, env, url);
      if (path === '/api/admin/timeline-hoje' && method === 'GET') return await handleGetAdminTimelineHoje(request, env, url);
      if (path === '/api/admin/usuarios' && method === 'GET') return await handleGetAdminUsuarios(request, env, url);
      const matchAdminUsuario = path.match(/^\/api\/admin\/usuarios\/(usr_[a-zA-Z0-9]+)$/);
      if (matchAdminUsuario && method === 'GET') return await handleGetAdminUsuario(request, env, matchAdminUsuario[1]);
      if (path === '/api/admin/projetos' && method === 'GET') return await handleGetAdminProjetos(request, env, url);
      if (path === '/api/admin/tempo' && method === 'GET') return await handleGetAdminTempo(request, env, url);
      if (path === '/api/admin/horas-por-grupo' && method === 'GET') return await handleGetAdminHorasPorGrupo(request, env, url);

      /* ── FALLBACK ── */
      if (path.startsWith('/api/')) return err('Endpoint não encontrado', 404, cors);

      return new Response('Telier API Edge (Modular)', { status: 200, headers: { ...cors, 'Content-Type': 'text/plain' } });
    } catch (e) {
      console.error(`[error] [${reqId}] ${path}:`, e.stack || e);
      return err('Erro interno no servidor. ID da requisição: ' + reqId, e.status || 500, cors);
    } finally {
      const t1 = performance.now();
      const duration = t1 - t0;
      if (duration > 100) {
        console.warn(`[perf] [${reqId}] ${method} ${path} levou ${Math.round(duration)}ms`);
      }
    }
  }
};
