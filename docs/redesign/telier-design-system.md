# Telier — Design System de Implementação

> Documento consolidado a partir do redesign gerado no Google Stitch.
> Use este arquivo como referência para o Claude Code implementar o novo visual.

---

## 1. Conceito Visual: "The Architectural Monolith"

O Telier adota uma linguagem visual de **precisão sóbria**, inspirada no ambiente de trabalho de arquitetura — pranchetas, viewports CAD, blueprints. Todo elemento deve parecer intencional, estrutural e sem decoração supérflua.

**Regras absolutas:**
- Zero glassmorphism (sem `backdrop-filter: blur`)
- Zero gradientes (sem `linear-gradient`, sem `radial-gradient`)
- Zero sombras ambientes (sem `box-shadow` decorativo)
- Profundidade apenas por mudança tonal de background + bordas de 1px
- Animações mínimas: 150ms ease-out, sem bounce, sem spring

---

## 2. Paleta de Cores — Tema Escuro (primário)

### Superfícies (hierarquia por tons)
| Nível | Variável CSS | Hex | Uso |
|-------|-------------|-----|-----|
| Level 0 — Base | `--bg` | `#0e0e0e` | Background geral da aplicação |
| Level 1 — Sidebar/Nav | `--bg-low` | `#131313` | Sidebar, backgrounds secundários |
| Level 2 — Cards | `--bg-card` | `#191a1a` | Cards, containers de conteúdo |
| Level 3 — Modais/Popovers | `--bg-elevated` | `#1f2020` | Modais, painéis laterais, menus |
| Level 4 — Hover | `--bg-hover` | `#252626` | Estado hover em linhas e items |

### Bordas
| Variável CSS | Hex | Uso |
|-------------|-----|-----|
| `--border` | `#2A2A2A` | Borda padrão de containers, inputs, cards |
| `--border-strong` | `#484848` | Borda de destaque, separadores fortes |

### Texto
| Variável CSS | Hex | Uso |
|-------------|-----|-----|
| `--text` | `#e7e5e4` | Texto principal (títulos, nomes) |
| `--text-secondary` | `#acabaa` | Texto secundário (labels, descrições) |
| `--text-muted` | `#767575` | Texto terciário (hints, placeholders) |
| `--text-dim` | `#888888` | Metadata de baixa prioridade |

### Cores funcionais
| Variável CSS | Hex | Uso |
|-------------|-----|-----|
| `--accent` | `#0055FF` | Ações primárias, status "Em andamento", foco, links |
| `--green` | `#22c55e` | Sucesso, "Concluído", timers ativos |
| `--yellow` | `#FACC15` | Alerta, prazos próximos, "Em revisão" |
| `--red` | `#EF4444` | Erro, "Bloqueada", ações destrutivas, prazos vencidos |
| `--red-soft` | `#ec7c8a` | Alertas suaves (badges, indicadores) |
| `--gray` | `#767575` | Status neutro, "A fazer" |

### Cores de tag (background em opacidade baixa)
| Status | Background | Texto | Borda |
|--------|-----------|-------|-------|
| Em andamento | `rgba(0,85,255,.10)` | `#0055FF` | `rgba(0,85,255,.20)` |
| A fazer | `rgba(118,117,117,.10)` | `#767575` | `rgba(118,117,117,.20)` |
| Concluído | `rgba(34,197,94,.10)` | `#22c55e` | `rgba(34,197,94,.20)` |
| Bloqueada | `rgba(239,68,68,.10)` | `#EF4444` | `rgba(239,68,68,.20)` |
| Em revisão | `rgba(250,204,21,.10)` | `#FACC15` | `rgba(250,204,21,.20)` |
| Pausado | `rgba(118,117,117,.10)` | `#767575` | `rgba(118,117,117,.20)` |
| Arquivado | `rgba(118,117,117,.08)` | `#767575` | `rgba(118,117,117,.15)` |

---

## 3. Tipografia

### Fontes
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### Variáveis
```css
--ff-sans: 'Inter', sans-serif;
--ff-mono: 'DM Mono', monospace;
```

### Escala tipográfica (simplificada de 15 para 7 tamanhos)
| Token | Tamanho | Uso |
|-------|---------|-----|
| `--fs-xs` | `0.6875rem` (11px) | Eyebrows, contadores, badges |
| `--fs-sm` | `0.75rem` (12px) | Labels de seção (uppercase), metadata |
| `--fs-base` | `0.8125rem` (13px) | Texto de corpo, labels de form, botões |
| `--fs-md` | `0.875rem` (14px) | Nomes de tarefa, texto principal |
| `--fs-lg` | `1rem` (16px) | Nomes de card, subtítulos |
| `--fs-xl` | `1.25rem` (20px) | Títulos de página |
| `--fs-2xl` | `1.5rem` (24px) | Nome de projeto (hero) |

### Pesos
| Peso | Uso |
|------|-----|
| 400 (Regular) | Texto de corpo, descrições |
| 500 (Medium) | Labels de formulário, nomes em listas, botões |
| 600 (Semi-Bold) | Labels de seção (uppercase), subtítulos |
| 700 (Bold) | Títulos de página, nome do projeto, wordmark |

**NUNCA usar weight 300 (light).**

### Regras de aplicação
- **Inter** → todo texto de interface (labels, headers, corpo, botões)
- **DM Mono** → todo número (horas, contadores, datas, handles @usuario, KPIs, timers)
- **Labels de seção** (th, eyebrows, headers de grupo) → Inter 600, uppercase, `letter-spacing: 0.06em`
- **Labels de formulário** → Inter 500, normal case (sem uppercase), sem letter-spacing extra
- **Títulos de página** → Inter 700, `letter-spacing: -0.02em`

---

## 4. Espaçamentos

Grid base de 4px. Usar apenas estes valores:

| Token | Valor | Uso |
|-------|-------|-----|
| `--space-1` | `4px` | Gaps mínimos entre badges, micro-espaçamentos |
| `--space-2` | `8px` | Gap entre items em listas, padding interno de badges |
| `--space-3` | `12px` | Gap entre cards, padding interno de items de lista |
| `--space-4` | `16px` | Padding interno de cards, gap entre seções menores |
| `--space-5` | `24px` | Gap entre seções maiores, padding de containers |
| `--space-6` | `32px` | Margem entre blocos de página |
| `--space-7` | `48px` | Padding vertical da área de conteúdo |

---

## 5. Border-radius

| Token | Valor | Uso |
|-------|-------|-----|
| `--r-sm` | `4px` | Inputs inline, mini-componentes |
| `--r` | `6px` | Botões, inputs, selects, badges, rows de tabela |
| `--r-lg` | `8px` | Cards, modais, containers de seção |
| `--r-xl` | `12px` | Hero do projeto, containers grandes, painel lateral |
| `--r-full` | `999px` | Pills, tags, avatares |

**NUNCA usar border-radius > 12px em containers.**

---

## 6. Componentes

### Botões
```css
/* Primário */
.btn-primary {
  background: #0055FF;
  color: #ffffff;
  border: none;
  border-radius: var(--r);
  padding: 0 16px;
  min-height: 36px;
  font-weight: 500;
  font-size: var(--fs-base);
}
.btn-primary:hover { background: #0044cc; }

/* Secundário */
.btn {
  background: transparent;
  color: var(--text);
  border: 1px solid var(--border-strong);
  border-radius: var(--r);
  padding: 0 16px;
  min-height: 36px;
  font-weight: 500;
}
.btn:hover { border-color: var(--text-muted); color: #ffffff; }

/* Ghost */
.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
  border: none;
}
.btn-ghost:hover { color: var(--text); }

/* Danger */
.btn-danger { color: var(--red); border-color: var(--red); }
```

### Inputs
```css
input, select, textarea {
  background: var(--bg-low);
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: var(--r);
  padding: 8px 12px;
  font-size: var(--fs-base);
}
input:focus, select:focus, textarea:focus {
  border-color: var(--accent);
  outline: none;
  /* SEM box-shadow glow, SEM backdrop-filter */
}
```

### Tags / Pills de status
```css
.tag {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 10px;
  border-radius: var(--r-full);
  font-size: var(--fs-xs);
  font-weight: 600;
  /* background e color definidos pela variante: tag-blue, tag-green, etc. */
}
```

### Cards de projeto
```css
.proj-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  padding: 16px;
  cursor: pointer;
  position: relative;
  /* SEM box-shadow, SEM gradiente */
}
.proj-card::before {
  /* Faixa lateral de 3px colorida por status */
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
}
.proj-card:hover {
  border-color: var(--border-strong);
  background: var(--bg-hover);
  /* SEM transform, SEM box-shadow hover */
}
```

### Tabelas
```css
th {
  font-size: var(--fs-sm);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-card);
}
td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-card);
}
tr:hover td { background: var(--bg-hover); }
```

### Modais e painéis laterais
```css
/* Painel lateral (criação/edição) */
.side-panel {
  position: fixed;
  top: 0; right: 0;
  width: 480px;
  height: 100vh;
  background: var(--bg-elevated);
  border-left: 1px solid var(--border);
  z-index: 1000;
  animation: slideIn 150ms ease-out;
  /* SEM backdrop-filter, SEM gradiente */
}

/* Modal centralizado (permissões, confirmações) */
.modal {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--r-xl);
  padding: 24px;
  max-width: 600px;
  animation: fadeScale 150ms ease-out;
  /* SEM bounce, SEM backdrop-filter */
}

/* Overlay */
.modal-overlay {
  background: rgba(0,0,0,0.6);
  /* SEM backdrop-filter: blur */
}

@keyframes slideIn {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
@keyframes fadeScale {
  from { opacity: 0; transform: scale(0.97); }
  to { opacity: 1; transform: scale(1); }
}
```

### Avatares
```css
.avatar {
  width: 22px; height: 22px;
  border-radius: var(--r-full);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: var(--fs-xs);
  font-weight: 500;
  font-family: var(--ff-mono);
  text-transform: uppercase;
}
```

---

## 7. Layout

### Estrutura global
```
┌─────────────────────────────────────────────┐
│ Sidebar (220px)  │  Topbar (48px)           │
│                  ├──────────────────────────│
│  Logo            │  Conteúdo               │
│  Nav links       │  (max-width: 1200px)    │
│  Timers ativos   │  (margin: 0 auto)       │
│  ─────           │  (padding: 48px 24px)   │
│  Perfil          │                          │
│  Logout          │                          │
└─────────────────────────────────────────────┘
```

### Sidebar
- Largura: 220px expandida, 56px colapsada
- Background: `--bg-low` (#131313)
- Borda direita: 1px solid `--border` (#2A2A2A)
- Logo: Inter 700, uppercase, tracking tight
- Links: Inter 500, 14px, cor `--text-muted` com hover `--text`
- Link ativo: cor `--accent`, borda esquerda 2px `--accent`

### Topbar
- Altura: 48px
- Background: `--bg` (#0e0e0e)
- Borda inferior: 1px solid `--border`
- Conteúdo: max-width 1200px, centralizado

### Conteúdo
- max-width: 1200px
- margin: 0 auto
- padding: 48px 24px

---

## 8. Responsividade (Mobile ≤768px)

- Sidebar desaparece → menu hamburger na topbar
- Conteúdo: padding 16px
- Cards: coluna única
- Tabelas: scroll horizontal ou layout de cards empilhados
- Touch targets: mínimo 44px
- Timer flutuante: rodapé da tela

---

## 9. Mapeamento das 22 telas geradas

Cada tela tem um `code.html` de referência e um `screen.png` de preview:

| Tela | Pasta no zip |
|------|-------------|
| Dashboard | `telier_dashboard/` |
| Dashboard Mobile | `telier_dashboard_mobile/` |
| Login | `telier_entrar/` |
| Projeto - Kanban | `telier_resid_ncia_silva_details/` |
| Projeto - Lista | `telier_resid_ncia_silva_lista/` |
| Projeto - Mapa de Foco | `telier_mapa_de_foco_resid_ncia_silva/` |
| Projeto - Relatório | `telier_relat_rio_resid_ncia_silva/` |
| Grupo - Projetos | `telier_residencial_alto_da_serra_projetos/` |
| Grupo - Tarefas | `telier_residencial_alto_da_serra_tarefas/` |
| Grupo - Mapa de Foco | `telier_mapa_de_foco_grupo/` |
| Grupo - Relatório | `telier_relat_rio_grupo/` |
| Grupo - Ao vivo | `telier_ao_vivo_grupo/` |
| Admin - Agora | `telier_central_admin_agora/` |
| Admin - Equipe | `telier_central_admin_equipe/` |
| Admin - Projetos | `telier_central_admin_projetos/` |
| Admin - Tempo | `telier_central_admin_tempo/` |
| Admin - Grupos | `telier_central_admin_grupos/` |
| Modal - Nova tarefa | `telier_nova_tarefa_painel/` |
| Modal - Editar projeto | `telier_editar_projeto_painel/` |
| Modal - Colaboradores | `telier_colaboradores_do_projeto_modal/` |
| Painel - Notificações | `telier_notifica_es_painel/` |
| DESIGN.md | `telier_drafting_system/` |

---

## 10. Checklist de implementação

- [ ] Substituir todas as variáveis CSS do `:root` pelas cores deste documento
- [ ] Remover TODOS os `backdrop-filter` exceto topbar sticky
- [ ] Remover TODOS os `linear-gradient` e `radial-gradient` decorativos
- [ ] Remover TODAS as `box-shadow` decorativas (manter apenas em dropdown menus se necessário)
- [ ] Substituir animação `popIn` com bounce por `fadeScale` de 150ms ease-out
- [ ] Reduzir border-radius conforme seção 5
- [ ] Títulos de página: weight 700 (era 300)
- [ ] Labels de formulário: normal case, weight 500 (era uppercase com tracking)
- [ ] Conteúdo: max-width 1200px com margin auto
- [ ] Implementar sidebar com navegação persistente
- [ ] Cards sem hover com transform/shadow (apenas mudança de border e background)
- [ ] Botão primário: background sólido #0055FF, sem gradiente
- [ ] Inputs: background sólido, sem inset shadow, sem backdrop-filter
- [ ] Modais de criação/edição → painéis laterais (480px, slide-in da direita)
- [ ] Todos os temas (claro e escuro) funcionando
