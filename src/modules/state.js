// ── GLOBAL STATE ──
// This module exports all global state variables used throughout the app
// State can be imported and modified by other modules

export const API = 'https://telier-api.pedroafsmaia.workers.dev';

// Auth & User
export let TOKEN = localStorage.getItem('ea_token');
export let EU = JSON.parse(localStorage.getItem('ea_user') || 'null');

// Navigation & Views
export let PROJETO = null;
export let GRUPO_ATUAL = null;
export let VISTA_ATUAL = 'dash'; // 'dash' | 'projeto' | 'grupo'

// Tasks & Data
export let TAREFAS = [];
export let USUARIOS = [];
export let NEEDS_SETUP = false;

// Admin
export const ADMIN_MODE_KEY = 'ea_admin_mode';
export let ADMIN_MODE = localStorage.getItem(ADMIN_MODE_KEY) || 'admin';
export let ADMIN_TEMPO_FILTRO = { de: '', ate: '', usuario_id: '' };
export let RELATORIO_CACHE = null; // { projetoId, ts, resumoMap }

// Filters - Dashboard
export let FILTRO_STATUS = 'todos';
export let FILTRO_ORIGEM_DASH = 'todos';
export let FILTRO_GRUPO_DASH = 'todos';
export let BUSCA_DASH = '';
export let _projsDash = [];
export let _ativasDash = [];
export let _gruposDash = [];

// Filters - Tasks
export let FILTRO_STATUS_TAREFA = 'todos';
export let FILTRO_ORIGEM_TAREFAS = 'todos';
export let FILTRO_RESP_TAR = '';
export let BUSCA_TAREFA = '';
export let TAREFAS_VIEW = 'kanban'; // 'kanban' | 'lista'
export let LISTA_SORT = { col: null, dir: 'asc' };
export let LISTA_CONCLUIDAS_EXPANDIDA = false;

// Mobile UI State
export let TASK_MOBILE_FILTERS_OPEN = false;
export let GRUPO_TASK_MOBILE_FILTERS_OPEN = false;

// Presence & Notifications
export let COLEGAS_ATIVOS = [];
export let PRESENCE_ABERTO = false;
export let _presenceTick = null;
export let _presenceHintShown = false;
export let NOTIFS = [];
export let _notifTick = null;
export let _lastNotifSeen = 0;
export let NOTIF_TAB = 'compartilhamentos';
export const _prazoNotifShown = new Set();

// Undo/Redo
export let _pendingUndoAction = null;

// UI State
export let FORCE_PASSWORD_CHANGE = false;

// ── CONSTANTS ──
export const STARTDAY_COLLAPSE_KEY = 'telier_startday_collapsed';
export const TIMER_AVISO_HORAS = 4;
export const DASH_FILTERS_KEY = 'telier_dash_filters_v1';
export const DASH_STATUS_OPCOES = new Set(['todos', 'Em andamento', 'A fazer', 'Em revisão', 'Pausado', 'Concluído', 'Arquivado']);
export const REQ_TIMEOUT_MS = 15000;
export const PROJ_CACHE_KEY = 'telier_proj_cache';
export const PROJ_CACHE_TTL = 10000;

// ── SETTER FUNCTIONS ──
export function setToken(t) { TOKEN = t; localStorage.setItem('ea_token', t); }
export function clearToken() { TOKEN = null; localStorage.removeItem('ea_token'); }
export function setEU(user) { EU = user; localStorage.setItem('ea_user', JSON.stringify(user)); }
export function clearEU() { EU = null; localStorage.removeItem('ea_user'); }
export function setProjeto(p) { PROJETO = p; }
export function setGrupoAtual(g) { GRUPO_ATUAL = g; }
export function setVistaAtual(v) { VISTA_ATUAL = v; }
export function setTarefas(t) { TAREFAS = t; }
export function setAdminMode(mode) { ADMIN_MODE = mode; localStorage.setItem(ADMIN_MODE_KEY, mode); }
