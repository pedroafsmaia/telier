import { ok, fail, err } from '../../http/responses.js';
import { readJsonBody, getClientIp } from '../../http/request.js';
import { uid, sessaoUid, nowStr } from '../../utils/format.js';
import { clampStr } from '../../utils/validation.js';
import { hashSenha, verificarSenha, MAX_PASSWORD, MIN_PASSWORD } from './crypto.js';
import { checkRateLimit, requireAuth, _rateBuckets } from './session.js';

export async function handleAuthNeedsSetup(request, env, cors) {
  try {
    const existUser = await env.DB.prepare('SELECT 1 FROM usuarios LIMIT 1').first();
    return ok({ needs_setup: !existUser });
  } catch (err) {
    return ok({ needs_setup: false });
  }
}

export async function handleAuthRegister(request, env, cors, responseHeaders) {
  if (!checkRateLimit(request, 'register', 3, 3600000)) {
    return fail('Muitas tentativas de registro. Tente novamente mais tarde.', 429);
  }
  const existUser = await env.DB.prepare('SELECT 1 FROM usuarios LIMIT 1').first();
  if (existUser) {
    return fail('O registro está fechado. Peça ao administrador para criar sua conta.', 403);
  }
  const _body = await readJsonBody(request);
  const nome = clampStr(_body.nome, 200, 'nome');
  const login = clampStr(_body.login, 100, 'login')?.toLowerCase().trim().replace(/\s+/g, '_');
  const senhaStr = clampStr(_body.senha, MAX_PASSWORD, 'senha');
  if (!nome?.trim() || !login || !senhaStr) return fail('Nome, login e senha obrigatórios', 400);

  if (senhaStr.length < MIN_PASSWORD) {
    return fail(`A senha deve ter no mínimo ${MIN_PASSWORD} caracteres`, 400);
  }

  const senhaSalva = await hashSenha(senhaStr);
  const id = 'usr_' + uid();
  await env.DB.prepare(
    'INSERT INTO usuarios (id, nome, login, senha_hash, papel, deve_trocar_senha) VALUES (?, ?, ?, ?, "admin", 0)'
  ).bind(id, nome.trim(), login, senhaSalva).run();

  const sessaoId = sessaoUid();
  const expira = nowStr(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
  await env.DB.prepare(
    'INSERT INTO sessoes (id, usuario_id, criado_em, expira_em) VALUES (?, ?, ?, ?)'
  ).bind(sessaoId, id, nowStr(), expira).run();

  return ok({ 
    token: sessaoId,
    usuario: { id, nome: nome.trim(), usuario_login: login, papel: 'admin' }
  });
}

export async function handleAuthLogin(request, env, cors, responseHeaders) {
  const ip = getClientIp(request);
  const key = `auth_login:${ip}`;
  if (!checkRateLimit(request, 'auth_login', 10)) {
    const bucket = _rateBuckets.get(key);
    const retryAfter = bucket ? Math.ceil((bucket.resetAt - Date.now()) / 1000) : 60;
    return err('Muitas tentativas de login. Aguarde um minuto.', 429, cors, { ...responseHeaders, 'Retry-After': String(retryAfter) });
  }

  const _body = await readJsonBody(request);
  const usuario_login = clampStr(_body.usuario_login, 60, 'usuario_login');
  const senha = clampStr(_body.senha, MAX_PASSWORD, 'senha');
  if (!usuario_login || !senha) return fail('Usuário e senha obrigatórios');

  const login = usuario_login.toLowerCase().trim().replace(/\s+/g, '_');
  const usuario = await env.DB.prepare('SELECT * FROM usuarios WHERE login = ?').bind(login).first();
  if (!usuario) return fail('Credenciais inválidas', 401);
  
  const senhaValida = await verificarSenha(senha, usuario.senha_hash);
  if (!senhaValida.ok) return fail('Credenciais inválidas', 401);

  const needsRehash = !String(usuario.senha_hash || '').startsWith('pbkdf2$');
  if (needsRehash) {
    try {
      const hashNovo = await hashSenha(senha);
      await env.DB.prepare('UPDATE usuarios SET senha_hash = ? WHERE id = ?').bind(hashNovo, usuario.id).run();
    } catch (e) {
      console.error('[auth] password rehash failed', e?.message);
    }
  }

  const sessaoId = sessaoUid();
  const expira = nowStr(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
  await env.DB.prepare(
    'INSERT INTO sessoes (id, usuario_id, criado_em, expira_em) VALUES (?, ?, ?, ?)'
  ).bind(sessaoId, usuario.id, nowStr(), expira).run();

  return ok({
    token: sessaoId,
    must_change_password: Number(usuario.deve_trocar_senha || 0) === 1,
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      usuario_login: usuario.login,
      papel: usuario.papel,
      deve_trocar_senha: Number(usuario.deve_trocar_senha || 0),
    },
  });
}

export async function handleAuthLogout(request, env, cors) {
  const [u] = await requireAuth(request, env);
  if (u) await env.DB.prepare('DELETE FROM sessoes WHERE id = ?').bind(u.sessao_id).run();
  return ok({ ok: true });
}

export async function handleAuthMe(request, env, cors) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  return ok({
    id: u.uid,
    nome: u.nome,
    usuario_login: u.login,
    papel: u.papel,
    deve_trocar_senha: Number(u.deve_trocar_senha || 0),
  });
}

export async function handleAuthTrocarSenha(request, env, cors) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);

  const _body = await readJsonBody(request);
  const senha_atual = clampStr(_body.senha_atual, MAX_PASSWORD, 'senha_atual');
  const nova_senha = clampStr(_body.nova_senha, MAX_PASSWORD, 'nova_senha');

  if (!senha_atual || !nova_senha) return fail('Informe senha atual e nova senha', 400);
  if (nova_senha.length < MIN_PASSWORD) return fail(`A senha deve ter no mínimo ${MIN_PASSWORD} caracteres`, 400);

  const row = await env.DB.prepare('SELECT senha_hash FROM usuarios WHERE id = ?').bind(u.uid).first();
  if (!row) return fail('Usuário não encontrado', 404);

  const senhaValida = await verificarSenha(senha_atual, row.senha_hash);
  if (!senhaValida.ok) return fail('Senha atual inválida', 401);

  const novaHash = await hashSenha(nova_senha);
  await env.DB.batch([
    env.DB.prepare('UPDATE usuarios SET senha_hash = ?, deve_trocar_senha = 0 WHERE id = ?').bind(novaHash, u.uid),
    env.DB.prepare('DELETE FROM sessoes WHERE usuario_id = ? AND id <> ?').bind(u.uid, u.sessao_id),
  ]);
  return ok({ ok: true });
}
