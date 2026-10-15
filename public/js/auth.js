/**
 * ALLMARKET — Autenticação
 * Gerencia login/logout via Google Sign-In e persiste sessão no localStorage.
 * Espelha os guards authGuard / notAuthGuard e o componente Login do Angular.
 */

const AuthService = (() => {
  // ── Getters de sessão ───────────────────────────────────

  function getUser() {
    try {
      const raw = localStorage.getItem(Config.STORAGE.USER);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function getEmail() {
    return localStorage.getItem(Config.STORAGE.EMAIL) || '';
  }

  function isLoggedIn() {
    return !!getUser();
  }

  // ── Persistência ────────────────────────────────────────

  function saveUser(payload) {
    localStorage.setItem(Config.STORAGE.USER, JSON.stringify(payload));
    localStorage.setItem(Config.STORAGE.EMAIL, (payload.email || '').toLowerCase());
  }

  function clearUser() {
    localStorage.removeItem(Config.STORAGE.USER);
    localStorage.removeItem(Config.STORAGE.EMAIL);
    localStorage.removeItem(Config.STORAGE.NOTA_FOCUS);
    localStorage.removeItem(Config.STORAGE.LISTA_LOCAL);
  }

  function resetAllPages() {
    if (typeof PageNotas !== 'undefined' && PageNotas.reset) PageNotas.reset();
    if (typeof PageListas !== 'undefined' && PageListas.reset) PageListas.reset();
    if (typeof PageAnalise !== 'undefined' && PageAnalise.reset) PageAnalise.reset();
    if (typeof PageComparador !== 'undefined' && PageComparador.reset) PageComparador.reset();
  }

  // ── Decodificação de JWT Google ─────────────────────────

  function decodeGoogleJWT(credential) {
    if (!credential) return null;
    try {
      const base64 = credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(json);
    } catch (_) {
      try {
        return JSON.parse(atob(credential.split('.')[1]));
      } catch (err) {
        console.error('Falha ao decodificar JWT Google:', err);
        return null;
      }
    }
  }

  // ── Callback do Google Sign-In ──────────────────────────

  async function handleGoogleCredential(response) {
    if (!response || !response.credential) {
      UI.showSnack('Nenhuma credencial recebida do Google.');
      return;
    }

    const payload = decodeGoogleJWT(response.credential);
    if (!payload || !payload.email) {
      UI.showSnack('Erro ao processar credencial do Google.');
      return;
    }

    // Reseta estado e interface da conta anterior
    resetAllPages();
    saveUser(payload);

    // Mostra progresso no login
    const loginProgress = document.getElementById('login-progress');
    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.classList.add('hidden');
    if (loginProgress) loginProgress.classList.remove('hidden');

    try {
      const email = getEmail();
      const temNotas = await Promise.race([
        ApiService.validarEAtualizarNotas(email),
        new Promise(resolve => setTimeout(() => resolve(false), 8000))
      ]);
      Router.navigate(temNotas ? 'notas' : 'home');
    } catch (_) {
      Router.navigate('home');
    }
  }

  // ── Logout ──────────────────────────────────────────────

  function logout() {
    clearUser();
    ApiService.limparEstado();
    resetAllPages();
    Router.navigate('login');
  }

  // ── Inicialização do Google Sign-In ─────────────────────

  function initGoogleSignIn() {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const container = document.getElementById('google-btn-container');
      if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
        try {
          google.accounts.id.initialize({
            client_id: Config.GOOGLE_CLIENT_ID,
            callback: handleGoogleCredential,
            auto_select: true,
          });
          google.accounts.id.prompt();

          if (container) {
            const larguraDinamica = window.innerWidth < 480 ? 240 : 320;
            container.innerHTML = '';
            google.accounts.id.renderButton(container, {
              theme: 'outline',
              size: 'large',
              shape: 'pill',
              width: larguraDinamica,
              text: 'signin_with',
              logo_alignment: 'left',
              locale: 'pt-BR',
            });
          }
          clearInterval(interval);
        } catch (err) {
          console.error('Erro ao inicializar Google Sign-In:', err);
          clearInterval(interval);
        }
      } else if (attempts > 30) {
        clearInterval(interval);
      }
    }, 100);
  }

  return {
    getUser,
    getEmail,
    isLoggedIn,
    logout,
    initGoogleSignIn,
    handleGoogleCredential,
  };
})();
