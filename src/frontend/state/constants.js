(function attachStateInfra(global) {
  const root = global.TelierFrontend = global.TelierFrontend || {};
  root.state = root.state || {};

  const DASH_STATUS_OPCOES = new Set(['todos', 'Em andamento', 'A fazer', 'Em revisão', 'Pausado', 'Concluído', 'Arquivado']);

  const ST = { 'Arquivado':'tag-gray', 'Em andamento':'tag-blue','Concluída':'tag-green','Concluído':'tag-green','Bloqueada':'tag-red','A fazer':'tag-gray','Em revisão':'tag-yellow','Pausado':'tag-gray' };
  const PT = { 'Alta':'tag-orange','Média':'tag-yellow','Baixa':'tag-green' };
  const DT = { 'Simples':'tag-green','Moderada':'tag-yellow','Complexa':'tag-orange' };
  const FT = { 'Estudo preliminar':'tag-purple','Anteprojeto':'tag-blue','Projeto básico':'tag-sky','Projeto executivo':'tag-cyan','Em obra':'tag-green' };
  const PO = { 'Alta':0,'Média':1,'Baixa':2 };
  const DO = { 'Complexa':0,'Moderada':1,'Simples':2 };

  function normalizarStatusProjeto(status) {
    if (status === 'Concluída') return 'Concluído';
    if (status === 'Aguardando aprovação') return 'Em revisão';
    return status;
  }

  function projetoConcluido(status) {
    const s = normalizarStatusProjeto(status);
    return s === 'Concluído';
  }

  root.state.constants = {
    DASH_STATUS_OPCOES,
    ST,
    PT,
    DT,
    FT,
    PO,
    DO,
    normalizarStatusProjeto,
    projetoConcluido,
  };
})(window);
