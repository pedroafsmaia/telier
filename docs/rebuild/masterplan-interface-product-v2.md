# Telier — Masterplan de Rebuild de Interface e Produto (v2)

## Objetivo
Traduzir a nova arquitetura do Telier em uma experiência perceptível, clara e coerente para o usuário.

## Diagnóstico consolidado
O produto evoluiu mais em estrutura do que em percepção. As telas ainda falam com vozes visuais muito parecidas e o usuário não percebe com clareza os papéis de cada superfície.

## Princípios definitivos
- Tarefas = bancada operacional principal
- Projetos = tela de localização
- Projeto = contêiner de tarefas
- Grupo = contêiner de projetos
- Administração = camada separada
- Sidebar = lugares
- Tela = ações
- Registros = contexto importante, porém secundário
- Cor = sinal funcional
- Modal = exceção, não padrão

## Correções prioritárias
1. Remover redundâncias da sidebar (`Nova tarefa`, `Última tarefa`)
2. Transformar contexto flutuante de timer em barra global estável
3. Redesenhar Tarefas como superfície operacional real
4. Simplificar Projetos para localização rápida
5. Diferenciar visualmente Projeto e Grupo por foco e escala
6. Rebaixar registros
7. Reduzir modais centrais
8. Reforçar cor funcional e microcopy
9. Tornar Administração mais claramente administrativa
10. Ajustar login e onboarding

## Regra final desta etapa
O trabalho agora não é mais apenas estruturar código. É fazer a interface comunicar com clareza a arquitetura já construída.

## Encerramento do rebuild
Depois da rodada de interface, a migração só poderá ser considerada encerrada quando houver:
- paridade comprovada;
- abandono completo do legado;
- limpeza geral do código;
- remoção de restos de transição.
