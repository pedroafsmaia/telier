(function attachThemeTokens(global) {
  const root = global.TelierFrontend = global.TelierFrontend || {};
  root.theme = root.theme || {};

  const tokens = {
    colors: {
      bg: '#f3f4f6',
      surface: '#ffffff',
      surfaceMuted: '#f8fafc',
      surfaceStrong: '#eef2f7',
      border: '#d5dbe3',
      borderStrong: '#b7c0cc',
      text: '#17202b',
      textMuted: '#4b5a6b',
      textSoft: '#6d7b8a',
      brand: '#1f3a5b',
      brandHover: '#172f4c',
      focus: '#1f4f80',
      danger: '#8f2d2d',
      success: '#1f5b3a',
      warning: '#7a4a11',
    },
    type: {
      familyBase: "'Inter', system-ui, -apple-system, sans-serif",
      familyMono: "'DM Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
      sizeXs: '12px',
      sizeSm: '13px',
      sizeMd: '14px',
      sizeLg: '16px',
      sizeXl: '20px',
      size2xl: '24px',
      lineTight: '1.25',
      lineBase: '1.45',
    },
    spacing: { xxs: '2px', xs: '4px', sm: '8px', md: '12px', lg: '16px', xl: '24px', xxl: '32px', xxxl: '40px' },
    radius: { sm: '4px', md: '8px', lg: '12px' },
    border: { width: '1px' },
    shadow: { panel: '0 1px 2px rgba(17,24,39,.05)', panelRaised: '0 4px 10px rgba(17,24,39,.06)' },
    states: { disabledOpacity: '.5' },
    z: { shellHeader: 10, shellSidebar: 5 },
    motion: { quick: '120ms ease', base: '180ms ease' },
  };

  const baseCss = `
:root{
  --v2-bg:${tokens.colors.bg};--v2-surface:${tokens.colors.surface};--v2-surface-muted:${tokens.colors.surfaceMuted};--v2-surface-strong:${tokens.colors.surfaceStrong};
  --v2-border:${tokens.colors.border};--v2-border-strong:${tokens.colors.borderStrong};
  --v2-text:${tokens.colors.text};--v2-text-muted:${tokens.colors.textMuted};--v2-text-soft:${tokens.colors.textSoft};
  --v2-brand:${tokens.colors.brand};--v2-brand-hover:${tokens.colors.brandHover};--v2-focus:${tokens.colors.focus};--v2-danger:${tokens.colors.danger};--v2-success:${tokens.colors.success};--v2-warning:${tokens.colors.warning};
  --v2-ff-base:${tokens.type.familyBase};--v2-ff-mono:${tokens.type.familyMono};
  --v2-fs-xs:${tokens.type.sizeXs};--v2-fs-sm:${tokens.type.sizeSm};--v2-fs-md:${tokens.type.sizeMd};--v2-fs-lg:${tokens.type.sizeLg};--v2-fs-xl:${tokens.type.sizeXl};--v2-fs-2xl:${tokens.type.size2xl};
  --v2-lh-tight:${tokens.type.lineTight};--v2-lh-base:${tokens.type.lineBase};
  --v2-sp-xxs:${tokens.spacing.xxs};--v2-sp-xs:${tokens.spacing.xs};--v2-sp-sm:${tokens.spacing.sm};--v2-sp-md:${tokens.spacing.md};--v2-sp-lg:${tokens.spacing.lg};--v2-sp-xl:${tokens.spacing.xl};--v2-sp-xxl:${tokens.spacing.xxl};--v2-sp-xxxl:${tokens.spacing.xxxl};
  --v2-r-sm:${tokens.radius.sm};--v2-r-md:${tokens.radius.md};--v2-r-lg:${tokens.radius.lg};
  --v2-bw:${tokens.border.width};--v2-shadow-panel:${tokens.shadow.panel};--v2-shadow-panel-raised:${tokens.shadow.panelRaised};
  --v2-opacity-disabled:${tokens.states.disabledOpacity};--v2-z-shell-header:${tokens.z.shellHeader};--v2-z-shell-sidebar:${tokens.z.shellSidebar};
  --v2-motion-quick:${tokens.motion.quick};--v2-motion-base:${tokens.motion.base};
}

#v2-shell-root{background:var(--v2-bg);font-family:var(--v2-ff-base);color:var(--v2-text);min-height:100vh}
.v2-shell{display:grid;grid-template-columns:230px 1fr;min-height:100vh}
.v2-sidebar{background:var(--v2-surface);border-right:var(--v2-bw) solid var(--v2-border);padding:var(--v2-sp-xl) var(--v2-sp-lg);position:sticky;top:0;height:100vh;z-index:var(--v2-z-shell-sidebar)}
.v2-brand{font-size:var(--v2-fs-xl);font-weight:700;letter-spacing:.2px;color:var(--v2-brand);margin-bottom:var(--v2-sp-xl)}
.v2-nav{display:grid;gap:var(--v2-sp-xs)}
.v2-nav-btn{display:flex;align-items:center;gap:var(--v2-sp-sm);padding:10px 12px;border:var(--v2-bw) solid transparent;border-radius:var(--v2-r-md);background:transparent;color:var(--v2-text-muted);font-size:var(--v2-fs-md);cursor:pointer;text-align:left;transition:background var(--v2-motion-base),color var(--v2-motion-base),border-color var(--v2-motion-base)}
.v2-nav-btn:hover{background:var(--v2-surface-muted);color:var(--v2-text)}
.v2-nav-btn.is-active{background:var(--v2-surface-muted);border-color:var(--v2-border);color:var(--v2-text);font-weight:600}
.v2-main{padding:var(--v2-sp-xl);max-width:1200px}
.v2-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--v2-sp-lg);position:sticky;top:0;background:var(--v2-bg);padding:var(--v2-sp-sm) 0;z-index:var(--v2-z-shell-header)}
.v2-title{font-size:var(--v2-fs-2xl);line-height:var(--v2-lh-tight);font-weight:700;color:var(--v2-text)}
.v2-subtitle{font-size:var(--v2-fs-sm);color:var(--v2-text-soft);margin-top:2px}
.v2-grid{display:grid;grid-template-columns:1fr;gap:var(--v2-sp-lg)}
.v2-panel{background:var(--v2-surface);border:var(--v2-bw) solid var(--v2-border);border-radius:var(--v2-r-lg);box-shadow:var(--v2-shadow-panel);padding:var(--v2-sp-lg)}
.v2-panel-title{font-size:var(--v2-fs-lg);font-weight:600;margin:0 0 var(--v2-sp-sm)}
.v2-empty{padding:var(--v2-sp-xl) var(--v2-sp-lg);border:var(--v2-bw) dashed var(--v2-border-strong);border-radius:var(--v2-r-md);background:var(--v2-surface-muted)}
.v2-empty strong{display:block;font-size:var(--v2-fs-md);margin-bottom:6px}
.v2-empty p{margin:0;color:var(--v2-text-muted);font-size:var(--v2-fs-sm)}
.v2-controls{display:flex;gap:var(--v2-sp-sm);flex-wrap:wrap}
.v2-btn,.v2-icon-btn,.v2-input,.v2-select,.v2-search{font-family:var(--v2-ff-base);font-size:var(--v2-fs-sm)}
.v2-btn{height:36px;padding:0 12px;border-radius:var(--v2-r-md);border:var(--v2-bw) solid var(--v2-border-strong);background:var(--v2-surface);color:var(--v2-text);cursor:pointer;transition:border-color var(--v2-motion-base),background var(--v2-motion-base)}
.v2-btn:hover{border-color:var(--v2-brand)}
.v2-btn-primary{background:var(--v2-brand);border-color:var(--v2-brand);color:#fff}
.v2-btn-primary:hover{background:var(--v2-brand-hover);border-color:var(--v2-brand-hover)}
.v2-btn:disabled,.v2-icon-btn:disabled,.v2-input:disabled,.v2-select:disabled{opacity:var(--v2-opacity-disabled);cursor:not-allowed}
.v2-icon-btn{width:36px;height:36px;border-radius:var(--v2-r-md);border:var(--v2-bw) solid var(--v2-border-strong);background:var(--v2-surface);color:var(--v2-text);cursor:pointer}
.v2-input,.v2-select,.v2-search{height:36px;padding:0 10px;border-radius:var(--v2-r-md);border:var(--v2-bw) solid var(--v2-border-strong);background:var(--v2-surface);color:var(--v2-text)}
.v2-input:focus,.v2-select:focus,.v2-search:focus,.v2-btn:focus,.v2-icon-btn:focus,.v2-nav-btn:focus,.v2-tab:focus{outline:2px solid color-mix(in srgb,var(--v2-focus) 50%,transparent);outline-offset:1px}
.v2-tabs{display:flex;gap:var(--v2-sp-xs);border-bottom:var(--v2-bw) solid var(--v2-border);padding-bottom:var(--v2-sp-sm)}
.v2-tab{height:32px;padding:0 10px;border:var(--v2-bw) solid transparent;border-radius:var(--v2-r-sm);background:transparent;color:var(--v2-text-muted);cursor:pointer}
.v2-tab.is-active{border-color:var(--v2-border);background:var(--v2-surface-muted);color:var(--v2-text)}
.v2-filterbar{display:flex;gap:var(--v2-sp-sm);flex-wrap:wrap;padding:var(--v2-sp-sm);background:var(--v2-surface-muted);border:var(--v2-bw) solid var(--v2-border);border-radius:var(--v2-r-md)}
.v2-shell-note{display:block;font-size:var(--v2-fs-xs);color:var(--v2-text-soft);margin-top:var(--v2-sp-xs)}
.v2-placeholder-list{margin:0;padding:0;list-style:none;display:grid;gap:var(--v2-sp-xs)}
.v2-placeholder-list li{display:flex;justify-content:space-between;gap:var(--v2-sp-sm);padding:var(--v2-sp-sm);background:var(--v2-surface-strong);border-radius:var(--v2-r-sm);font-size:var(--v2-fs-sm)}
.v2-status-chip{display:inline-flex;align-items:center;padding:0 6px;height:22px;border-radius:999px;background:var(--v2-surface-strong);color:var(--v2-text-soft);font-size:var(--v2-fs-xs);border:var(--v2-bw) solid var(--v2-border)}
.v2-boot{min-height:100vh;display:flex;align-items:center;justify-content:center;gap:var(--v2-sp-sm);color:var(--v2-text-muted);font-size:var(--v2-fs-sm)}
.v2-table-wrap{overflow:auto;border:var(--v2-bw) solid var(--v2-border);border-radius:var(--v2-r-md);background:var(--v2-surface)}
.v2-table{width:100%;border-collapse:collapse;min-width:900px}
.v2-table th,.v2-table td{padding:10px 12px;border-bottom:var(--v2-bw) solid var(--v2-border);text-align:left;font-size:var(--v2-fs-sm);vertical-align:middle}
.v2-table th{font-size:var(--v2-fs-xs);letter-spacing:.03em;text-transform:uppercase;color:var(--v2-text-soft);background:var(--v2-surface-muted)}
.v2-table tr:last-child td{border-bottom:none}
.v2-link-btn{background:none;border:none;padding:0;margin:0;color:var(--v2-brand);cursor:pointer;font:inherit;text-align:left}
.v2-meta-line{display:block;color:var(--v2-text-soft);font-size:var(--v2-fs-xs);margin-top:2px}
.v2-project-layout{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:var(--v2-sp-lg)}
@media (max-width: 980px){
  .v2-shell{grid-template-columns:1fr}
  .v2-sidebar{height:auto;position:static}
  .v2-main{padding:var(--v2-sp-lg)}
  .v2-header{position:static;padding-top:0}
  .v2-project-layout{grid-template-columns:1fr}
}
`;

  function applyThemeTokens() {
    if (document.getElementById('v2-theme-tokens')) return;
    const style = document.createElement('style');
    style.id = 'v2-theme-tokens';
    style.textContent = baseCss;
    document.head.appendChild(style);
  }

  root.theme.tokens = { tokens, applyThemeTokens };
})(window);
