export function uid() { return crypto.randomUUID().replace(/-/g, ''); }
export function sessaoUid() { return crypto.randomUUID().replace(/-/g, ''); }
export function nowStr(d = new Date()) { return d.toISOString().slice(0, 19).replace('T', ' '); }
