import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import { Button, Input, Panel } from '../design/primitives';
import { useAuth } from '../lib/auth';
import http from '../lib/http';

interface LoginPageProps {
  technicalEntry?: boolean;
}

export function LoginPage({ technicalEntry = false }: LoginPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, login } = useAuth();

  const [usuarioLogin, setUsuarioLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [setupNome, setSetupNome] = useState('');
  const [setupLogin, setSetupLogin] = useState('');
  const [setupSenha, setSetupSenha] = useState('');
  const [setupErrorMessage, setSetupErrorMessage] = useState<string | null>(null);
  const [isSubmittingSetup, setIsSubmittingSetup] = useState(false);

  const nextPath = useMemo(() => {
    const next = searchParams.get('next');
    if (!next || !next.startsWith('/')) {
      return '/tarefas';
    }
    return next;
  }, [searchParams]);

  useEffect(() => {
    if (!technicalEntry) {
      return;
    }

    let cancelled = false;

    async function fetchNeedsSetup() {
      try {
        const response = await http.get<{ needs_setup?: boolean }>('/auth/needs-setup');
        if (!cancelled) {
          setNeedsSetup(Boolean(response.needs_setup));
        }
      } catch {
        if (!cancelled) {
          setNeedsSetup(false);
        }
      }
    }

    fetchNeedsSetup();

    return () => {
      cancelled = true;
    };
  }, [technicalEntry]);

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

  const handleSetupSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSetupErrorMessage(null);
    setIsSubmittingSetup(true);

    try {
      const normalizedLogin = setupLogin.trim().toLowerCase();

      await http.post('/auth/register', {
        nome: setupNome.trim(),
        login: normalizedLogin,
        senha: setupSenha,
      });

      await login({
        usuario_login: normalizedLogin,
        senha: setupSenha,
      });

      navigate('/tarefas', { replace: true });
    } catch (error) {
      setSetupErrorMessage(error instanceof Error ? error.message : 'Nao foi possivel concluir o setup inicial.');
    } finally {
      setIsSubmittingSetup(false);
    }
  };

  if (technicalEntry) {
    return (
      <div className="min-h-screen bg-surface-secondary px-6 py-10">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl items-center justify-center">
          <Panel className="w-full border-border-secondary" padding="lg">
            <div className="space-y-4">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-text-tertiary">Telier</p>
              <h1 className="text-2xl font-semibold text-text-primary">Acesso tecnico inicial</h1>
              <p className="text-sm text-text-secondary">
                Esta entrada e exclusiva para configuracao inicial. O login comum segue em <span className="font-medium text-text-primary">/login</span>.
              </p>

              {needsSetup ? (
                <div className="rounded-md border border-border-secondary bg-surface-secondary p-4">
                  <p className="text-sm text-text-secondary">Preencha os dados do administrador inicial.</p>
                  <form className="mt-3 space-y-3" onSubmit={handleSetupSubmit}>
                    <Input
                      label="Nome"
                      value={setupNome}
                      onChange={(event) => setSetupNome(event.target.value)}
                      placeholder="Nome completo"
                      disabled={isSubmittingSetup}
                      required
                    />
                    <Input
                      label="Usuario"
                      value={setupLogin}
                      onChange={(event) => setSetupLogin(event.target.value)}
                      placeholder="usuario_inicial"
                      autoComplete="username"
                      disabled={isSubmittingSetup}
                      required
                    />
                    <Input
                      label="Senha"
                      type="password"
                      value={setupSenha}
                      onChange={(event) => setSetupSenha(event.target.value)}
                      placeholder="Minimo de 8 caracteres"
                      autoComplete="new-password"
                      disabled={isSubmittingSetup}
                      required
                    />
                    {setupErrorMessage ? (
                      <div className="rounded-md border border-alert-subtle bg-alert-subtle/20 px-3 py-2 text-sm text-alert">
                        {setupErrorMessage}
                      </div>
                    ) : null}
                    <Button type="submit" variant="primary" loading={isSubmittingSetup}>
                      Criar administrador inicial
                    </Button>
                  </form>
                </div>
              ) : (
                <div className="rounded-md border border-border-secondary bg-surface-secondary p-4">
                  <p className="text-sm text-text-secondary">Setup inicial ja concluido. Use o login padrao.</p>
                </div>
              )}

              <Button type="button" variant="secondary" onClick={() => navigate('/login', { replace: true })}>
                Voltar para login
              </Button>
            </div>
          </Panel>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-secondary px-6 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Panel className="border-border-primary" padding="lg">
            <div className="space-y-6">
              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-text-tertiary">Telier</p>
                <h1 className="text-3xl font-semibold tracking-tight text-text-primary">Acesse o Telier</h1>
                <p className="max-w-xl text-sm leading-6 text-text-secondary">
                  Entre com seu usuario operacional para continuar no ambiente principal.
                </p>
              </div>

              <div className="rounded-lg border border-border-primary bg-surface-primary px-4 py-4">
                <p className="text-xs uppercase tracking-[0.14em] text-text-tertiary">Fluxo principal</p>
                <p className="mt-2 text-base font-medium text-text-primary">Entrar com conta existente</p>
                <p className="mt-2 text-sm text-text-secondary">
                  Use usuario e senha ja cadastrados para acessar tarefas, projetos e grupos.
                </p>
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
                <p className="text-sm text-text-secondary">Informe seu usuario e senha para acessar o Telier.</p>
              </div>

              <Input
                label="Usuario de acesso"
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
                <div className="rounded-lg border border-alert-subtle bg-alert-subtle/20 px-4 py-3 text-sm text-alert">
                  {errorMessage}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" variant="primary" loading={isSubmitting} icon={ArrowRight}>
                  Entrar no Telier
                </Button>
              </div>
            </form>
          </Panel>
        </div>
      </div>
    </div>
  );
}
