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

  // ── Validação simples de e-mail ─────────────────────────

  function isValidEmail(email) {
    const v = (email || '').trim().toLowerCase();
    // Regex suficiente para validar formato básico (usuario@dominio.tld)
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 254;
  }

  // ── Monta payload de usuário no mesmo formato do Google ─

  function buildEmailUserPayload(email, name) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (name || '').trim();
    // Deriva um "given_name" simples a partir do primeiro nome informado
    const givenName = cleanName ? cleanName.split(/\s+/)[0] : cleanEmail.split('@')[0];
    return {
      email: cleanEmail,
      email_verified: true,
      name: cleanName || givenName,
      given_name: givenName,
      family_name: '',
      // Indica origem do login (google | email)
      provider: 'email',
      // Sem picture (não temos foto)
      picture: '',
    };
  }

  // ── Verifica se já existe usuário cadastrado por e-mail ──

  async function emailUserExists(email) {
    try {
      const cleanEmail = (email || '').trim().toLowerCase();
      if (!cleanEmail) return false;
      // Consulta o backend para ver se já há notas/listas vinculadas
      const notas = await BackendUsecase.getHistorico(cleanEmail);
      return Array.isArray(notas) && notas.length > 0;
    } catch (_) {
      return false;
    }
  }

  // ── Cache persistente email → nome (login por e-mail) ───

  function _readEmailNames() {
    try {
      return JSON.parse(localStorage.getItem(Config.STORAGE.EMAIL_NAMES) || '{}');
    } catch (_) {
      return {};
    }
  }

  function _writeEmailNames(map) {
    try {
      localStorage.setItem(Config.STORAGE.EMAIL_NAMES, JSON.stringify(map));
    } catch (_) {}
  }

  function rememberEmailName(email, name) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (name || '').trim();
    if (!cleanEmail || !cleanName) return;
    const map = _readEmailNames();
    map[cleanEmail] = cleanName;
    _writeEmailNames(map);
  }

  function getRememberedName(email) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) return '';
    return _readEmailNames()[cleanEmail] || '';
  }

  // ── Login por e-mail (igual ao Google, pós-validação) ───

  async function loginWithEmail(email, name) {
    const payload = buildEmailUserPayload(email, name);
    // Reseta estado e interface da conta anterior
    resetAllPages();
    saveUser(payload);
    // Lembra o nome para próximos logins (login por e-mail)
    if (payload.name) rememberEmailName(email, payload.name);
    // Provider explícito no payload (usado para diferenciar Google x e-mail)

    // Mostra progresso no login
    const loginProgress = document.getElementById('login-progress');
    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.classList.add('hidden');
    if (loginProgress) loginProgress.classList.remove('hidden');

    try {
      const savedEmail = getEmail();
      const temNotas = await Promise.race([
        ApiService.validarEAtualizarNotas(savedEmail),
        new Promise(resolve => setTimeout(() => resolve(false), 8000))
      ]);
      Router.navigate(temNotas ? 'notas' : 'home');
    } catch (_) {
      Router.navigate('home');
    }
  }

  // ── Fluxo UI de login por e-mail (2 passos) ─────────────

  function _resetEmailLoginUI() {
    const step1 = document.getElementById('email-step-1');
    const step2 = document.getElementById('email-step-2');
    const newFields = document.getElementById('email-new-user-fields');
    const emailInput = document.getElementById('email-input');
    const nameInput = document.getElementById('email-name-input');
    if (step1) step1.classList.remove('hidden');
    if (step2) step2.classList.add('hidden');
    if (newFields) newFields.classList.add('hidden');
    if (emailInput) emailInput.value = '';
    if (nameInput) nameInput.value = '';
  }

  function initEmailLogin() {
    const step1Form = document.getElementById('email-step1-form');
    const step1 = document.getElementById('email-step-1');
    const step2 = document.getElementById('email-step-2');
    const newFields = document.getElementById('email-new-user-fields');
    const emailInput = document.getElementById('email-input');
    const nameInput = document.getElementById('email-name-input');
    const confirmAddr = document.getElementById('email-confirm-addr');
    const btnBack = document.getElementById('btn-email-back');
    const btnConfirm = document.getElementById('btn-email-confirm');
    const loginForm = document.getElementById('login-form');
    const loginProgress = document.getElementById('login-progress');

    if (!step1Form || !step1 || !step2) return;

    // Reset visual ao entrar na tela de login (ex: após logout)
    _resetEmailLoginUI();
    if (loginForm) loginForm.classList.remove('hidden');
    if (loginProgress) loginProgress.classList.add('hidden');

    // Evita registrar os listeners mais de uma vez
    if (step1Form.dataset.emailBound === '1') return;
    step1Form.dataset.emailBound = '1';

    // Passo 1: validar e-mail e ir para o passo 2
    step1Form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = (emailInput?.value || '').trim();
      if (!isValidEmail(email)) {
        UI.showSnack('Digite um e-mail válido.');
        if (emailInput) emailInput.focus();
        return;
      }

      // Monta passo 2: mostramos "Entrar como <email>".
      // Se não houver notas salvas para esse e-mail, pedimos o nome (cadastro).
      const exists = await emailUserExists(email);
      const nomeLembrado = getRememberedName(email);
      const nomeSalvo = AuthService.getUser()?.provider === 'email' && AuthService.getEmail() === email.toLowerCase()
        ? AuthService.getUser()?.name
        : '';

      if (confirmAddr) confirmAddr.textContent = email.toLowerCase();

      if (!exists && !nomeSalvo) {
        // Novo usuário: mostrar campo de nome (pré-preenchido se já lembramos)
        if (newFields) newFields.classList.remove('hidden');
        if (nameInput) { nameInput.value = nomeLembrado || ''; setTimeout(() => nameInput.focus(), 80); }
      } else {
        // Já existe: pode entrar direto, pré-preenche nome se possível
        if (newFields) newFields.classList.add('hidden');
        if (nameInput) nameInput.value = nomeSalvo || nomeLembrado || '';
      }

      step1.classList.add('hidden');
      step2.classList.remove('hidden');
    });

    // Voltar para o passo 1
    if (btnBack) {
      btnBack.addEventListener('click', () => {
        step1.classList.remove('hidden');
        step2.classList.add('hidden');
        if (newFields) newFields.classList.add('hidden');
        if (emailInput) { emailInput.focus(); emailInput.select(); }
      });
    }

    // Confirmar: efetuar login (ou cadastro) com e-mail
    if (btnConfirm) {
      btnConfirm.addEventListener('click', async () => {
        const email = (emailInput?.value || '').trim();
        if (!isValidEmail(email)) {
          UI.showSnack('E-mail inválido. Volte e corrija.');
          return;
        }

        const isNew = !newFields.classList.contains('hidden');
        let name = '';
        if (isNew) {
          name = (nameInput?.value || '').trim();
          if (name.length < 2) {
            UI.showSnack('Digite seu nome para criar a conta.');
            if (nameInput) nameInput.focus();
            return;
          }
        } else {
          // Usuário existente: usa nome digitado, lembrado, ou deixa vazio
          name = (nameInput?.value || '').trim() || getRememberedName(email);
        }

        btnConfirm.disabled = true;
        try {
          await loginWithEmail(email, name);
        } catch (err) {
          console.error('Erro no login por e-mail:', err);
          UI.showSnack('Não foi possível entrar. Tente novamente.');
        } finally {
          btnConfirm.disabled = false;
        }
      });
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
    initEmailLogin,
    loginWithEmail,
    isValidEmail,
  };
})();
