export interface ProjectColor {
  name: string;
  light: string;
  dark: string;
  bg: string;
  bgDark: string;
}

const PROJECT_COLORS: ProjectColor[] = [
  { name: 'indigo',  light: '#6366f1', dark: '#818cf8', bg: '#eef2ff', bgDark: '#312e81' },
  { name: 'teal',    light: '#0d9488', dark: '#2dd4bf', bg: '#f0fdfa', bgDark: '#134e4a' },
  { name: 'amber',   light: '#d97706', dark: '#fbbf24', bg: '#fffbeb', bgDark: '#78350f' },
  { name: 'rose',    light: '#e11d48', dark: '#fb7185', bg: '#fff1f2', bgDark: '#881337' },
  { name: 'cyan',    light: '#0891b2', dark: '#22d3ee', bg: '#ecfeff', bgDark: '#164e63' },
  { name: 'violet',  light: '#7c3aed', dark: '#a78bfa', bg: '#f5f3ff', bgDark: '#4c1d95' },
  { name: 'emerald', light: '#059669', dark: '#34d399', bg: '#ecfdf5', bgDark: '#064e3b' },
  { name: 'orange',  light: '#ea580c', dark: '#fb923c', bg: '#fff7ed', bgDark: '#7c2d12' },
  { name: 'sky',     light: '#0284c7', dark: '#38bdf8', bg: '#f0f9ff', bgDark: '#0c4a6e' },
  { name: 'fuchsia', light: '#c026d3', dark: '#e879f9', bg: '#fdf4ff', bgDark: '#701a75' },
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getProjectColor(projectId: string): ProjectColor {
  const index = hashString(projectId) % PROJECT_COLORS.length;
  return PROJECT_COLORS[index];
}
