# Telier Visual Grammar

## 1. Propósito
Este documento define regras duráveis de interface para o Telier.

- Serve como contrato operacional para mudanças de UI, CSS, componentes e responsividade.
- A **tarefa** é a unidade central de trabalho do produto.
- **Projeto** e **grupo** existem como contexto organizador da execução.

## 2. Princípios de produto
- **Tarefa como núcleo:** a navegação e os fluxos devem privilegiar execução diária.
- **Projeto/grupo como organização:** ajudam a estruturar, não substituem a unidade de trabalho.
- **Linguagem técnica e institucional:** aparência sóbria, madura, operacional.
- **Evitar cara de template SaaS:** nada de estética genérica, chamativa ou “de vitrine”.

## 3. Gramática visual obrigatória

### Metadados
- Sempre em formato **label + valor**.
- Labels curtos, discretos e consistentes.
- Valores legíveis, sem tokens técnicos.
- Nunca usar pills/badges/chips como estrutura principal de metadado.

**Fazer:** `Status: Em andamento`.
**Não fazer:** `tag-blue`, `.badge`, chips coloridos como conteúdo principal.

### Cor
- Cor é **sinal de estado**, não decoração.
- Use contraste por hierarquia de superfície, borda e tipografia.
- Evite blocos coloridos sem função semântica.

### Cards
- Card é **ficha operacional**: título, contexto, metadados e ações.
- Priorizar leitura técnica e densidade útil.
- Evitar card “hero” decorativo para microinformação.

### Sidebar
- Navegação direta de produto.
- Sem categorias artificiais ou taxonomia decorativa.
- Ordem deve refletir uso real (execução antes de organização).

### Topbar
- Mínima e contextual.
- Contém apenas informações/ações essenciais da tela ativa.
- Evitar barras altas com conteúdo redundante.

## 4. Componentes

### Sidebar
**Deve ser:** estrutural, persistente no desktop, drawer no mobile.
**Evitar:** agrupamentos artificiais, destaque excessivo, ruído visual.

### Topbar
**Deve ser:** compacta, técnica, com ações relevantes no contexto.
**Evitar:** cabeçalho genérico de dashboard e excesso de blocos.

### Page header
**Deve ser:** duas camadas claras quando necessário (contexto+título / ações).
**Evitar:** botões soltos sem alinhamento e descrições longas demais.

### Metric strip
**Deve ser:** faixa horizontal compacta (label pequena + valor forte).
**Evitar:** quatro “mini-cards” grandes para métricas simples.

### Cards de projeto
**Deve ser:** título, contexto, grid técnico de metadados, resumo operacional, responsável/alerta, ações.
**Evitar:** duplicação de informação (ex.: progresso repetido em dois blocos equivalentes).

### Itens de tarefa
**Deve ser:** leitura rápida de status, prazo, responsável e ação.
**Evitar:** excesso de ornamento e variações de anatomia entre listas.

### Listas operacionais
**Deve ser:** densas, escaneáveis e consistentes entre módulos.
**Evitar:** espaçamento irregular, alinhamento quebrado e rótulos instáveis.

### Modais
**Deve ser:** foco em decisão/edição, hierarquia clara, ações no rodapé.
**Evitar:** modal com layout de página completa sem necessidade.

### Botões
**Deve ser:** hierarquia clara (primário, secundário, ghost) e alinhamento coerente.
**Evitar:** mistura de estilos conflitantes na mesma faixa de ação.

### Ícones
**Deve ser:** suporte de leitura e ação, alinhados ao texto.
**Evitar:** ícone decorativo sem função, tamanhos inconsistentes.

### Estados de hover/ativo
**Deve ser:** discreto, profissional, orientado a foco/seleção.
**Evitar:** efeitos chamativos (glow, blur, animação exagerada).
**Regra adicional:** elementos clicáveis devem combinar mais de um sinal perceptivo (ex.: borda + contraste + deslocamento leve), sem depender apenas de cor.

### Loading e feedback operacional
- Listas, cards e painéis devem priorizar skeleton com estrutura estável durante carregamento.
- Spinner é reservado para ações pontuais sem estrutura previsível.
- Ações assíncronas devem ter estado explícito de processamento no próprio controle acionado.

## 5. Tipografia
Papéis tipográficos obrigatórios:
- **Título:** destaque de seção/página com peso consistente (600–700).
- **Label:** pequeno, discreto, sem competir com o valor.
- **Valor:** legível e estável (especialmente dados operacionais).
- **Descrição/auxiliar:** contraste controlado para contexto e apoio.

Regras:
- Consistência obrigatória de escala e pesos.
- Evitar variação arbitrária de `font-size`/`font-weight`.
- Evitar excesso de uppercase; usar apenas quando semântico.

## 6. Layout e densidade
- Evitar UI espalhada com blocos superdimensionados.
- Evitar cards grandes para pouca informação.
- Preferir **strip** para métricas simples.
- Compactação controlada: alta densidade com legibilidade.
- Header, grids e barras de ação devem priorizar fluxo operacional.

## 7. Responsividade
- Mobile não é desktop comprimido.
- Sidebar vira drawer sem perder hierarquia de navegação.
- Metadados empilham em label + valor (sem virar pills).
- Ações principais continuam acessíveis e previsíveis.
- Evitar overflow horizontal em listas, strips e barras de ação.

## 8. Light mode
- Tema claro é de primeira classe, não fallback.
- Contraste, superfícies e bordas devem ser deliberados.
- Não “inverter cores” mecanicamente do dark mode.
- Estados de hover/foco devem manter legibilidade equivalente.

## 9. Anti-padrões proibidos
- `.tag-*` como texto visível de interface.
- `.badge` como estrutura principal de metadado.
- Pills arredondadas como linguagem dominante de informação.
- Chips coloridos decorativos como base da UI.
- Duplicação de informação no mesmo bloco.
- Cards espalhados sem hierarquia técnica.
- Efeitos visuais chamativos (glow, blur, gradiente decorativo).

## 10. Checklist rápido
Antes de concluir qualquer tarefa de UI:
- A informação principal está em **label + valor**?
- O layout evita pills/badges/chips como estrutura base?
- Métricas simples estão em **strip**, não em cards grandes?
- Existe alguma duplicação de informação no mesmo contexto?
- A densidade está compacta e legível?
- Desktop e mobile preservam hierarquia e acesso às ações?
