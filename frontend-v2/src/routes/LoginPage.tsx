import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { Button, Input, Panel } from '../design/primitives';
import { useAuth } from '../lib/auth';
import http from '../lib/http';

interface LoginPageProps {
  technicalEntry?: boolean;
}

interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete?: string;
  disabled?: boolean;
}

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  disabled,
}: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-text-primary">{label}</label>
      <div className="relative">
        <Input
          type={isVisible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          required
          className="pr-12"
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-text-tertiary transition-colors hover:text-text-primary focus:outline-none focus-visible:text-text-primary"
          onClick={() => setIsVisible((current) => !current)}
          aria-label={isVisible ? 'Ocultar senha' : 'Mostrar senha'}
          title={isVisible ? 'Ocultar senha' : 'Mostrar senha'}
          disabled={disabled}
        >
          {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
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
  }, []);

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
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível autenticar.');
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
      setSetupErrorMessage(error instanceof Error ? error.message : 'Não foi possível concluir o setup inicial.');
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
              <h1 className="text-2xl font-semibold text-text-primary">Acesso técnico inicial</h1>
              <p className="text-sm text-text-secondary">
                Esta entrada é exclusiva para a configuração inicial. O login comum segue em{' '}
                <span className="font-medium text-text-primary">/login</span>.
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
                      label="Usuário"
                      value={setupLogin}
                      onChange={(event) => setSetupLogin(event.target.value)}
                      placeholder="usuario_inicial"
                      autoComplete="username"
                      disabled={isSubmittingSetup}
                      required
                    />
                    <PasswordField
                      label="Senha"
                      value={setupSenha}
                      onChange={setSetupSenha}
                      placeholder="Mínimo de 8 caracteres"
                      autoComplete="new-password"
                      disabled={isSubmittingSetup}
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
                  <p className="text-sm text-text-secondary">Setup inicial já concluído. Use o login padrão.</p>
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
                <h1 className="text-3xl font-semibold tracking-tight text-text-primary">Acesso ao Telier</h1>
                <p className="max-w-xl text-sm leading-6 text-text-secondary">
                  Use sua conta operacional para entrar em tarefas, projetos e grupos.
                </p>
              </div>

              <div className="border-t border-border-secondary pt-4">
                <p className="text-xs uppercase tracking-[0.14em] text-text-tertiary">Fluxo principal</p>
                <p className="mt-2 text-base font-medium text-text-primary">Entrar com conta existente</p>
                <p className="mt-2 text-sm text-text-secondary">
                  Use usuário e senha já cadastrados para acessar o ambiente principal.
                </p>
              </div>

              {needsSetup ? (
                <div className="border-t border-border-secondary pt-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-info-600">Primeiro acesso</p>
                  <p className="mt-2 text-base font-medium text-text-primary">Criar administrador inicial</p>
                  <p className="mt-2 text-sm text-text-secondary">
                    O ambiente ainda não foi inicializado. Conclua o setup técnico antes do primeiro login.
                  </p>
                  <div className="mt-4">
                    <Button type="button" variant="secondary" onClick={() => navigate('/login/setup')}>
                      Criar administrador inicial
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border-t border-border-secondary pt-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-text-tertiary">Cadastro</p>
                  <p className="mt-2 text-base font-medium text-text-primary">Contas novas são liberadas pelo administrador</p>
                  <p className="mt-2 text-sm text-text-secondary">
                    O registro público fica fechado depois do setup inicial. Se você precisa de acesso, peça ao administrador para criar sua conta.
                  </p>
                </div>
              )}
            </div>
          </Panel>

          <Panel className="border-border-primary" padding="lg">
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-text-primary">
                  <LockKeyhole className="h-5 w-5" />
                  <h2 className="text-xl font-semibold">Entrar</h2>
                </div>
                <p className="text-sm text-text-secondary">Informe seu usuário e senha para acessar o Telier.</p>
              </div>

              <Input
                label="Usuário"
                autoComplete="username"
                value={usuarioLogin}
                onChange={(event) => setUsuarioLogin(event.target.value)}
                placeholder="seu_usuario"
                disabled={isSubmitting}
                required
              />

              <PasswordField
                label="Senha"
                value={senha}
                onChange={setSenha}
                placeholder="Digite sua senha"
                autoComplete="current-password"
                disabled={isSubmitting}
              />

              {errorMessage ? (
                <div className="rounded-lg border border-alert-subtle bg-alert-subtle/20 px-4 py-3 text-sm text-alert">
                  {errorMessage}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" variant="primary" loading={isSubmitting} icon={ArrowRight}>
                  Entrar
                </Button>
              </div>
            </form>
          </Panel>
        </div>
      </div>
    </div>
  );
}
