/**
 * ALLMARKET Backend JS — Conexão Direta com Firebase Firestore
 * Conecta-se ao projeto oficial `allmarket-9151b` consultando as coleções:
 *  - tb_notas
 *  - tb_listas
 *  - tb_vinculos
 *
 * Espelha 100% o comportamento de:
 *  - allmarket-api/internal/infrastructure/nota_fiscal_repository.go
 *  - allmarket-api/internal/infrastructure/lista_repository.go
 *  - allmarket-api/internal/infrastructure/vinculo_repository.go
 */

const BackendDB = (() => {

  let _db = null;

  /**
   * Inicializa e retorna a instância do Firestore
   */
  function _getFirestore() {
    if (_db) return _db;

    if (typeof firebase === 'undefined') {
      console.error('Firebase SDK não encontrado. Certifique-se de que os scripts do Firebase estão carregados.');
      return null;
    }

    try {
      // Evita inicialização duplicada do mesmo app Firebase
      if (!firebase.apps.length) {
        firebase.initializeApp(Config.FIREBASE);
      }
      _db = firebase.firestore();
      return _db;
    } catch (err) {
      console.error('Erro ao inicializar Firebase Firestore:', err);
      return null;
    }
  }

  // ── Repositório de Vínculos (tb_vinculos) ─────────────────

  async function obterEmailsRelacionados(email) {
    if (!email) return [];
    const limpo = email.toLowerCase().trim();
    const set = new Set([limpo]);
    const db = _getFirestore();

    if (!db) return [limpo];

    try {
      const col = Config.COLLECTIONS.VINCULOS || 'tb_vinculos';
      
      // Busca onde o usuário é email_a ou email_b
      const [snapA, snapB] = await Promise.all([
        db.collection(col).where('email_a', '==', limpo).get().catch(() => ({ docs: [] })),
        db.collection(col).where('email_b', '==', limpo).get().catch(() => ({ docs: [] }))
      ]);

      snapA.docs.forEach(doc => {
        const d = doc.data();
        if (d.email_b) set.add(d.email_b.toLowerCase().trim());
      });

      snapB.docs.forEach(doc => {
        const d = doc.data();
        if (d.email_a) set.add(d.email_a.toLowerCase().trim());
      });

      return Array.from(set);
    } catch (err) {
      console.warn('Aviso ao consultar vínculos no Firestore:', err.message);
      return [limpo];
    }
  }

  async function vincular(emailDono, emailVinculado) {
    if (!emailDono || !emailVinculado) return;
    const a = emailDono.toLowerCase().trim();
    const b = emailVinculado.toLowerCase().trim();
    if (a === b) return;

    const db = _getFirestore();
    if (!db) return;

    const col = Config.COLLECTIONS.VINCULOS || 'tb_vinculos';
    const docId = `vinc_${a.replace(/[^a-z0-9]/g, '_')}_${b.replace(/[^a-z0-9]/g, '_')}`;

    await db.collection(col).doc(docId).set({
      email_a: a,
      email_b: b,
      data_criacao: new Date().toISOString(),
    }, { merge: true });
  }

  async function desvincular(emailA, emailB) {
    if (!emailA || !emailB) return;
    const a = emailA.toLowerCase().trim();
    const b = emailB.toLowerCase().trim();

    const db = _getFirestore();
    if (!db) return;

    const col = Config.COLLECTIONS.VINCULOS || 'tb_vinculos';
    const [snapA, snapB] = await Promise.all([
      db.collection(col).where('email_a', '==', a).where('email_b', '==', b).get(),
      db.collection(col).where('email_a', '==', b).where('email_b', '==', a).get()
    ]);

    const batch = db.batch();
    snapA.docs.forEach(doc => batch.delete(doc.ref));
    snapB.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }

  // ── Repositório de Notas Fiscais (tb_notas) ───────────────

  /**
   * Consulta notas fiscais no Firestore filtrando pelos e-mails da conta e vínculos
   */
  async function listarNotasPorEmails(emails) {
    if (!emails) return [];
    if (emails && typeof emails.then === 'function') {
      emails = await emails;
    }
    if (typeof emails === 'string') {
      emails = [emails];
    }
    if (!Array.isArray(emails) || emails.length === 0) return [];
    const emailsLimpos = emails.map(e => String(e).toLowerCase().trim());
    const db = _getFirestore();

    if (!db) {
      console.warn('Firestore indisponível');
      return [];
    }

    try {
      const col = Config.COLLECTIONS.NOTAS || 'tb_notas';
      let todasNotas = [];

      // O operador 'in' do Firestore suporta até 10 elementos por consulta
      const lotes = [];
      for (let i = 0; i < emailsLimpos.length; i += 10) {
        lotes.push(emailsLimpos.slice(i, i + 10));
      }

      for (const lote of lotes) {
        let snap;
        try {
          // Tenta ordenar por data de emissão
          snap = await db.collection(col)
            .where('usuario_email', 'in', lote)
            .orderBy('data_emissao', 'desc')
            .get();
        } catch (_) {
          // Fallback caso o índice composto ainda não exista no Firestore
          snap = await db.collection(col)
            .where('usuario_email', 'in', lote)
            .get();
        }

        snap.docs.forEach(doc => {
          const dados = doc.data();
          todasNotas.push({
            chave: doc.id,
            ...dados,
          });
        });
      }

      // Ordena por data decrescente (suporta DD/MM/AAAA HH:mm:ss e ISO)
      todasNotas.sort((a, b) => {
        const parseData = (str) => {
          if (!str || typeof str !== 'string') return 0;
          const match = str.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/);
          if (match) {
            const [, d, m, y, hh = '0', mm = '0', ss = '0'] = match;
            return new Date(y, m - 1, d, hh, mm, ss).getTime();
          }
          const t = Date.parse(str);
          return isNaN(t) ? 0 : t;
        };
        return parseData(b.data_emissao) - parseData(a.data_emissao);
      });

      return todasNotas;
    } catch (err) {
      console.error('Erro ao listar notas no Firestore:', err);
      // Notifica o usuário se for erro de permissão
      if (err.code === 'permission-denied') {
        UI.showSnack('Acesso ao Firestore bloqueado pelas Regras de Segurança.');
      }
      return [];
    }
  }

  /**
   * Salva uma nota fiscal no Firestore (chave como ID do documento)
   */
  async function salvarNota(nota) {
    if (!nota || !nota.chave) {
      throw new Error('Nota fiscal inválida ou sem chave');
    }
    const db = _getFirestore();
    if (!db) throw new Error('Firestore indisponível');

    const col = Config.COLLECTIONS.NOTAS || 'tb_notas';
    await db.collection(col).doc(nota.chave).set(nota, { merge: true });
    return nota;
  }

  /**
   * Verifica se uma nota com a chave informada já existe no Firestore.
   * Retorna os dados da nota existente, ou null se não existir.
   */
  async function notaExiste(chave) {
    if (!chave) return null;
    const db = _getFirestore();
    if (!db) return null;
    try {
      const col = Config.COLLECTIONS.NOTAS || 'tb_notas';
      const snap = await db.collection(col).doc(chave).get();
      return snap.exists ? { chave: snap.id, ...snap.data() } : null;
    } catch (_) {
      return null;
    }
  }

  /**
   * Deleta uma nota fiscal pelo código de chave
   */
  async function deletarNotaPorChave(chave) {
    if (!chave) return;
    const db = _getFirestore();
    if (!db) return;

    const col = Config.COLLECTIONS.NOTAS || 'tb_notas';
    await db.collection(col).doc(chave).delete();
  }

  // ── Repositório de Listas de Compras (tb_listas) ──────────

  async function listarListasPorEmails(emails) {
    if (!emails) return [];
    if (emails && typeof emails.then === 'function') {
      emails = await emails;
    }
    if (typeof emails === 'string') {
      emails = [emails];
    }
    if (!Array.isArray(emails) || emails.length === 0) return [];
    const emailsLimpos = emails.map(e => String(e).toLowerCase().trim());
    const db = _getFirestore();
    if (!db) return [];

    try {
      const col = Config.COLLECTIONS.LISTAS || 'tb_listas';
      const snap = await db.collection(col).where('usuario_email', 'in', emailsLimpos.slice(0, 10)).get();

      const listas = [];
      snap.docs.forEach(doc => {
        listas.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      return listas;
    } catch (err) {
      console.error('Erro ao listar listas no Firestore:', err);
      return [];
    }
  }

  async function salvarLista(lista) {
    if (!lista) throw new Error('Lista inválida');
    const db = _getFirestore();
    if (!db) throw new Error('Firestore indisponível');

    const col = Config.COLLECTIONS.LISTAS || 'tb_listas';
    let docRef;

    if (!lista.id) {
      docRef = db.collection(col).doc();
      lista.id = docRef.id;
    } else {
      docRef = db.collection(col).doc(lista.id);
    }

    await docRef.set(lista, { merge: true });
    return lista;
  }

  async function deletarLista(id) {
    if (!id) return;
    const db = _getFirestore();
    if (!db) return;

    const col = Config.COLLECTIONS.LISTAS || 'tb_listas';
    await db.collection(col).doc(id).delete();
  }

  async function sincronizarListas(email, listas) {
    if (!Array.isArray(listas)) return;
    const db = _getFirestore();
    if (!db) return;

    const col = Config.COLLECTIONS.LISTAS || 'tb_listas';
    const batch = db.batch();

    listas.forEach(l => {
      const id = l.id || db.collection(col).doc().id;
      l.id = id;
      l.usuario_email = email.toLowerCase().trim();
      batch.set(db.collection(col).doc(id), l, { merge: true });
    });

    await batch.commit();
  }

  return {
    obterEmailsRelacionados,
    vincular,
    desvincular,
    listarNotasPorEmails,
    salvarNota,
    notaExiste,
    deletarNotaPorChave,
    listarListasPorEmails,
    salvarLista,
    deletarLista,
    sincronizarListas,
  };
})();
