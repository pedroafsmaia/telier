# Telier Interaction States

## 1. Propósito
- Definir comportamento visual e funcional dos estados de interface.
- Garantir consistência perceptiva entre telas e componentes.
- Eliminar ambiguidade de interação em implementação e revisão.

## 2. Princípios gerais
- Interação deve ser clara, imediata e previsível.
- Toda ação do usuário exige feedback visual explícito.
- Estado nunca pode depender apenas de cor.
- Evitar animações desnecessárias ou decorativas.
- Priorizar sinais discretos, técnicos e funcionais.

## 3. Estados básicos (todos os componentes)

### Default
- Estado neutro, legível e estável.
- Sem destaque excessivo.

### Hover
- Leve mudança de fundo **ou** borda.
- Deve indicar interatividade de forma discreta.
- Não usar efeitos chamativos.

### Active / Pressed
- Resposta imediata ao clique/toque.
- Pequena mudança de contraste/profundidade.
- Nunca remover legibilidade do conteúdo.

### Focus
- Outline/foco visível e consistente.
- Obrigatório para acessibilidade de teclado.
- Mesmo padrão perceptivo em botões, inputs e controles clicáveis.

### Disabled
- Baixa ênfase visual.
- Sem interatividade (clique/teclado).
- Cursor e estilo devem comunicar indisponibilidade.

## 4. Estados de carregamento (Loading)
Padrão de loading:
- usar **skeleton** para listas e cards;
- usar **spinner** apenas quando skeleton não for adequado;
- nunca deixar área sem feedback.

Regras:
- manter a estrutura geral do layout durante o carregamento;
- evitar layout shift significativo;
- sinalizar claramente “carregando”.

## 5. Estados vazios (Empty States)
Padrão:
- mensagem clara e contextual;
- orientação objetiva do próximo passo;
- CTA opcional quando houver ação natural.

Exemplos:
- `Nenhuma tarefa encontrada` + botão `Criar tarefa`.
- `Nenhum projeto neste grupo` + botão `Criar projeto`.

Regras:
- evitar texto genérico sem contexto;
- sempre indicar o que o usuário pode fazer.

## 6. Estados de erro
Cobrir:
- erro de ação (ex.: falha ao salvar);
- erro de carregamento;
- erro de validação.

Regras:
- mensagem clara e não técnica;
- indicar próximo passo (corrigir, tentar novamente, contatar admin);
- oferecer retry quando possível;
- nunca ocultar erro silenciosamente.

## 7. Estados de sucesso
- Feedback deve ser discreto e imediato.
- Não deve bloquear o fluxo do usuário.
- Preferir:
  - toast;
  - confirmação inline contextual.

Evitar:
- modal de sucesso desnecessário para ação simples.

## 8. Estados de seleção
Para listas, tarefas e itens operacionais:
- seleção visível por fundo/borda + reforço textual/ícone quando útil;
- não depender apenas de cor;
- manter consistência entre desktop e mobile.

## 9. Estados específicos por componente

### Botões
- estados obrigatórios: default, hover, active, focus, disabled.
- loading quando a ação for assíncrona.
- label deve continuar compreensível durante loading.

### Inputs
- estados obrigatórios: default, focus, erro, preenchido, disabled.
- placeholder deve ter contraste menor que valor preenchido.
- erro deve combinar texto + estilo, não só cor de borda.

### Cards
- hover leve apenas quando houver ação associada.
- clickable state claro (cursor, borda/fundo, affordance).

### Task row
- hover sutil para leitura escaneável.
- seleção explícita para estado ativo/focado.

### Sidebar
- item ativo claramente destacado.
- hover consistente com restante do shell.
- distinção entre ativo e hover deve ser perceptível.

### Tabs
- aba ativa com destaque claro e persistente.
- hover discreto nas abas inativas.
- mudança de aba deve preservar contexto visual.

## 10. Feedback de ações
Para ações críticas (salvar, deletar, editar, iniciar/parar tarefa):
- definir explicitamente estado de loading;
- definir retorno de sucesso;
- definir retorno de erro com próximo passo.

Regra operacional:
usuário sempre deve saber:
- o que aconteceu;
- se funcionou;
- o que fazer depois.

## 11. Animação
Regras:
- usar animação apenas para melhorar compreensão de estado/transição;
- duração curta e objetiva;
- evitar bounce, efeitos decorativos e transições lentas.

## 12. Anti-padrões
Proibido:
- ausência de feedback após ação;
- loading invisível;
- erro silencioso;
- estados diferentes para a mesma interação em telas distintas;
- múltiplos padrões concorrentes para o mesmo componente;
- dependência exclusiva de cor para comunicar estado.

## 13. Checklist de interação
Antes de concluir qualquer ajuste de UI/comportamento:
- existe hover onde há interatividade?
- existe active/pressed com resposta imediata?
- existe loading visível em ações assíncronas?
- existe tratamento de erro claro?
- existe estado vazio contextual?
- existe feedback de sucesso sem bloquear fluxo?
- o padrão está consistente com o resto do sistema?
