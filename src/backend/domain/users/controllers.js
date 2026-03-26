import { ok, fail } from '../../http/responses.js';
import { readJsonBody, getPagination } from '../../http/request.js';
import { uid } from '../../utils/format.js';
import { clampStr } from '../../utils/validation.js';
import { hashSenha, MAX_PASSWORD, MIN_PASSWORD } from '../auth/crypto.js';
import { requireAuth, isAdmin } from '../auth/session.js';

export async function handleGetUsuarios(request, env, url) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  const { pageSize, offset } = getPagination(url, 200, 1000);

  const totalQ = await env.DB.prepare('SELECT COUNT(*) as total FROM usuarios').first();
  const totalRows = totalQ?.total || 0;

  const lista = await env.DB.prepare('SELECT id, nome, login as usuario_login, papel FROM usuarios ORDER BY nome LIMIT ? OFFSET ?').bind(pageSize, offset).all();
  return ok(lista.results, 200, { 'Cache-Control': 'private, max-age=30', 'X-Total-Count': String(totalRows) });
}

export async function handlePostUsuarios(request, env) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  if (!isAdmin(u)) return fail('Sem permissão', 403);

  const _body = await readJsonBody(request);
  const nome = clampStr(_body.nome, 200, 'nome');
  const usuario_login = clampStr(_body.usuario_login, 60, 'usuario_login');
  const senha = clampStr(_body.senha, MAX_PASSWORD, 'senha');
  const papel = clampStr(_body.papel ?? 'membro', 80, 'papel');

  if (!nome || !usuario_login || !senha) return fail('Campos obrigatórios');
  if (senha.length < MIN_PASSWORD) return fail(`A senha deve ter no mínimo ${MIN_PASSWORD} caracteres`, 400);

  const login = usuario_login.toLowerCase().trim().replace(/\s+/g, '_');
  const existing = await env.DB.prepare('SELECT id FROM usuarios WHERE login = ?').bind(login).first();
  if (existing) return fail('Nome de usuário já existe');

  const hash = await hashSenha(senha);
  const id = 'usr_' + uid();
  await env.DB.prepare(
    'INSERT INTO usuarios (id, nome, login, senha_hash, papel, deve_trocar_senha) VALUES (?, ?, ?, ?, ?, 1)'
  ).bind(id, nome.trim(), login, hash, papel).run();

  return ok({ id, nome, usuario_login: login, papel });
}

export async function handlePutUsuarioPapel(request, env, usuarioId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  if (!isAdmin(u)) return fail('Sem permissão', 403);

  const _body = await readJsonBody(request);
  const papel = clampStr(_body.papel, 80, 'papel');
  if (!['admin', 'membro'].includes(papel)) return fail('Papel inválido');

  const alvo = await env.DB.prepare('SELECT id, papel FROM usuarios WHERE id = ?').bind(usuarioId).first();
  if (!alvo) return fail('Usuário não encontrado', 404);
  if (alvo.id === u.uid && papel !== 'admin') return fail('Você não pode remover seu próprio papel admin');

  await env.DB.prepare('UPDATE usuarios SET papel = ? WHERE id = ?').bind(papel, usuarioId).run();
  await env.DB.prepare('DELETE FROM sessoes WHERE usuario_id = ?').bind(usuarioId).run();

  return ok({ ok: true, id: usuarioId, papel });
}

export async function handlePutUsuarioSenha(request, env, usuarioId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  if (!isAdmin(u)) return fail('Sem permissão', 403);

  const _body = await readJsonBody(request);
  const nova_senha = clampStr(_body.nova_senha, MAX_PASSWORD, 'nova_senha');
  const exigir_troca = _body.exigir_troca === undefined ? true : !!_body.exigir_troca;

  if (!nova_senha) return fail('Nova senha é obrigatória', 400);
  if (nova_senha.length < MIN_PASSWORD) return fail(`A senha deve ter no mínimo ${MIN_PASSWORD} caracteres`, 400);

  const alvo = await env.DB.prepare('SELECT id FROM usuarios WHERE id = ?').bind(usuarioId).first();
  if (!alvo) return fail('Usuário não encontrado', 404);

  const hash = await hashSenha(nova_senha);
  await env.DB.batch([
    env.DB.prepare('UPDATE usuarios SET senha_hash = ?, deve_trocar_senha = ? WHERE id = ?').bind(hash, exigir_troca ? 1 : 0, usuarioId),
    env.DB.prepare('DELETE FROM sessoes WHERE usuario_id = ?').bind(usuarioId),
  ]);

  return ok({ ok: true });
}
