import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, ArrowLeftRight, LockKeyhole } from 'lucide-react';
import { Button, Input, Panel } from '../design/primitives';
import { useAuth } from '../lib/auth';
import { useMigration } from '../app/migration/MigrationContext';

function getModeLabel(mode: 'legacy' | 'validation' | 'rebuild'): string {
  if (mode === 'legacy') return 'legado';
  if (mode === 'rebuild') return 'corte final';
  return 'validacao controlada';
}

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, login } = useAuth();
  const { mode, openLegacy } = useMigration();

  const [usuarioLogin, setUsuarioLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nextPath = useMemo(() => {
    const next = searchParams.get('next');
    if (!next || !next.startsWith('/')) {
      return '/tarefas';
    }
    return next;
  }, [searchParams]);

  if (isAuthenticated) {
    return <Navigate to={nextPath} replace />;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await login({
        usuario_login: usuarioLogin.trim(),
        senha,
      });
      navigate(nextPath, { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Nao foi possivel autenticar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-secondary px-6 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Panel className="border-border-primary" padding="lg">
            <div className="space-y-6">
              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-text-tertiary">Telier</p>
                <h1 className="text-3xl font-semibold tracking-tight text-text-primary">Rebuild controlado com acesso real</h1>
                <p className="max-w-xl text-sm leading-6 text-text-secondary">
                  Esta tela libera o checklist minimo de paridade sem alterar contratos do backend. A autenticacao segue o mesmo fluxo de sessao da base legada.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border-primary bg-surface-primary px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-text-tertiary">Modo de migracao</p>
                  <p className="mt-2 text-base font-medium text-text-primary">{getModeLabel(mode)}</p>
                  <p className="mt-2 text-sm text-text-secondary">A nova UI continua reversivel e o legado permanece como fallback imediato.</p>
                </div>
                <div className="rounded-lg border border-border-primary bg-surface-primary px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-text-tertiary">Escopo desta fase</p>
                  <p className="mt-2 text-base font-medium text-text-primary">Flag, paridade e corte seguro</p>
                  <p className="mt-2 text-sm text-text-secondary">Sem remocao prematura de telas antigas durante a validacao.</p>
                </div>
              </div>

              <div className="rounded-lg border border-border-primary bg-surface-primary px-4 py-4 text-sm text-text-secondary">
                Durante a validacao, voce pode alternar para o legado para comparar comportamento sem perder a sessao do backend.
              </div>
            </div>
          </Panel>

          <Panel className="border-border-primary" padding="lg">
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-text-primary">
                  <LockKeyhole className="h-5 w-5" />
                  <h2 className="text-xl font-semibold">Entrar</h2>
                </div>
                <p className="text-sm text-text-secondary">Use a mesma conta operacional do ambiente atual do Telier.</p>
              </div>

              <Input
                label="Usuario"
                autoComplete="username"
                value={usuarioLogin}
                onChange={(event) => setUsuarioLogin(event.target.value)}
                placeholder="seu_usuario"
                disabled={isSubmitting}
                required
              />

              <Input
                label="Senha"
                type="password"
                autoComplete="current-password"
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                placeholder="Digite sua senha"
                disabled={isSubmitting}
                required
              />

              {errorMessage ? (
                <div className="rounded-lg border border-alert-subtle bg-alert-subtle/20 px-4 py-3 text-sm text-alert-DEFAULT">
                  {errorMessage}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" variant="primary" loading={isSubmitting} icon={ArrowRight}>
                  Entrar na nova UI
                </Button>
                <Button type="button" variant="secondary" icon={ArrowLeftRight} onClick={openLegacy}>
                  Abrir legado
                </Button>
              </div>
            </form>
          </Panel>
        </div>
      </div>
    </div>
  );
}

