const path = require('path');
const crypto = require('crypto');
const express = require('express');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');

// Servidor de login já usado pelo jogo. Pode ser alterado no Render.
const LOGIN_SERVER_URL = String(
  process.env.LOGIN_SERVER_URL || 'https://login-874b.onrender.com'
).trim().replace(/\/+$/, '');

app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store');
  next();
});

function carregarServiceAccount() {
  const bruto = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();

  if (bruto) {
    // Aceita JSON puro ou Base64 (muito comum no Render).
    const candidatos = [bruto];
    try {
      candidatos.push(Buffer.from(bruto, 'base64').toString('utf8'));
    } catch (_) {}

    for (const candidato of candidatos) {
      try {
        const conta = JSON.parse(candidato);
        if (conta && conta.project_id && conta.client_email && conta.private_key) {
          return conta;
        }
      } catch (_) {}
    }

    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON existe, mas não é JSON nem Base64 válido.');
  }

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  let privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();

  if (projectId && clientEmail && privateKey) {
    privateKey = privateKey.replace(/\\n/g, '\n');
    return {
      project_id: projectId,
      client_email: clientEmail,
      private_key: privateKey
    };
  }

  return null;
}

let firebasePronto = false;
let db = null;
let serviceAccountGlobal = null;
let databasePrincipalUrl = null;
let credentialGlobal = null;

try {
  const serviceAccount = carregarServiceAccount();
  if (!serviceAccount) {
    console.warn('[Firebase Admin] Credenciais não configuradas. O site abre, mas não poderá hospedar servidores.');
  } else {
    const databaseURL = process.env.FIREBASE_DATABASE_URL?.trim();
    if (!databaseURL) {
      throw new Error('FIREBASE_DATABASE_URL não configurada.');
    }

    serviceAccountGlobal = serviceAccount;
    databasePrincipalUrl = databaseURL;
    credentialGlobal = admin.credential.cert(serviceAccount);

    admin.initializeApp({
      credential: credentialGlobal,
      databaseURL
    });

    db = admin.database();
    firebasePronto = true;
    console.log('[Firebase Admin] Configurado com sucesso.');
  }
} catch (erro) {
  console.error('[Firebase Admin] Falha ao inicializar:', erro.message);
}

function normalizarDatabaseUrl(urlBruta) {
  const url = new URL(String(urlBruta || '').trim());
  const host = url.hostname.toLowerCase();
  const hostValido = host.endsWith('.firebaseio.com') || host.endsWith('.firebasedatabase.app');
  if (url.protocol !== 'https:' || !hostValido) {
    throw new Error('URL do Firebase Realtime Database inválida.');
  }
  return `${url.origin}/`;
}

// ---------------------------------------------------------------------------
// FIREBASE REMOTO DO SERVIDOR HOSPEDADO
//
// Estes bancos são fornecidos pelos donos dos servidores e, por decisão do
// projeto, usam Rules públicas (.read/.write = true). Portanto NÃO usamos a
// Service Account do Firebase principal nesses bancos. O backend apenas:
// 1) valida que o SERVER_ID pertence ao usuário logado no Firebase principal;
// 2) busca a urlFirebase cadastrada; e
// 3) lê/grava diretamente nessa URL via REST público.
// ---------------------------------------------------------------------------
function caminhoRest(pathFirebase) {
  const partes = String(pathFirebase || '')
    .split('/')
    .filter(Boolean)
    .map((parte) => encodeURIComponent(parte));
  return partes.join('/');
}

async function firebaseRemotoRest(urlFirebase, pathFirebase, opcoes = {}) {
  const base = normalizarDatabaseUrl(urlFirebase);
  const caminho = caminhoRest(pathFirebase);
  const endpoint = `${base}${caminho ? `${caminho}.json` : '.json'}`;
  const metodo = String(opcoes.method || 'GET').toUpperCase();
  const timeoutMs = Number(opcoes.timeoutMs || 15000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = { Accept: 'application/json' };
    const fetchOptions = {
      method: metodo,
      headers,
      signal: controller.signal
    };

    if (Object.prototype.hasOwnProperty.call(opcoes, 'body')) {
      headers['Content-Type'] = 'application/json';
      fetchOptions.body = JSON.stringify(opcoes.body);
    }

    const resposta = await fetch(endpoint, fetchOptions);
    const texto = await resposta.text();
    let dados = null;

    if (texto) {
      try { dados = JSON.parse(texto); }
      catch (_) { dados = texto; }
    }

    if (!resposta.ok) {
      const erro = new Error(
        typeof dados === 'object' && dados?.error
          ? String(dados.error)
          : `Firebase remoto respondeu HTTP ${resposta.status}.`
      );
      erro.status = resposta.status;
      erro.code = `HTTP_${resposta.status}`;
      throw erro;
    }

    return dados;
  } catch (erro) {
    if (erro?.name === 'AbortError') {
      const e = new Error('Tempo limite ao acessar o Firebase do servidor.');
      e.code = 'REMOTE_TIMEOUT';
      throw e;
    }
    throw erro;
  } finally {
    clearTimeout(timer);
  }
}

function erroAcessoRemoto(erro) {
  const codigo = String(erro?.code || '');
  const status = Number(erro?.status || 0);
  const mensagem = String(erro?.message || '');

  if (status === 401 || status === 403 || /PERMISSION_DENIED|permission|unauthorized/i.test(`${codigo} ${mensagem}`)) {
    return 'O Firebase deste servidor bloqueou o acesso. Deixe .read e .write como true e desative a aplicação obrigatória do App Check neste Firebase.';
  }

  if (codigo === 'REMOTE_TIMEOUT') {
    return 'O Firebase do servidor demorou demais para responder. Verifique a URL cadastrada e sua conexão.';
  }

  return mensagem || 'Não foi possível acessar o Firebase deste servidor.';
}

async function autenticar(req, res, next) {
  if (!firebasePronto) {
    return res.status(503).json({
      ok: false,
      erro: 'backend_nao_configurado',
      mensagem: 'Firebase Admin ainda não foi configurado no servidor.'
    });
  }

  const authHeader = req.headers.authorization || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return res.status(401).json({ ok: false, mensagem: 'Token de login ausente.' });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(match[1], true);
    req.usuario = decoded;
    next();
  } catch (erro) {
    console.warn('[Auth] Token inválido:', erro.code || erro.message);
    return res.status(401).json({ ok: false, mensagem: 'Login inválido ou expirado.' });
  }
}

function normalizarTexto(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

function normalizarPesquisa(valor) {
  return normalizarTexto(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

async function validarSessaoDoJogo(tokenSessao, idDispositivo) {
  const token = normalizarTexto(tokenSessao);
  const dispositivo = normalizarTexto(idDispositivo);

  if (!token || !dispositivo) {
    const erro = new Error('Faça login novamente.');
    erro.status = 401;
    erro.apagarSessao = true;
    throw erro;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const resposta = await fetch(`${LOGIN_SERVER_URL}/api/login-automatico`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        tokenSessao: token,
        idDispositivo: dispositivo
      }),
      signal: controller.signal
    });

    const texto = await resposta.text();
    let dados = null;

    if (texto) {
      try { dados = JSON.parse(texto); } catch (_) {}
    }

    if (!resposta.ok || !dados?.autenticado || !dados?.uid) {
      const erro = new Error(
        dados?.erro || dados?.mensagem || 'Login inválido ou expirado.'
      );
      erro.status = resposta.status || 401;
      erro.apagarSessao = dados?.apagarSessao === true || resposta.status === 401;
      throw erro;
    }

    return dados;
  } catch (erro) {
    if (erro?.name === 'AbortError') {
      const e = new Error('O servidor de login demorou demais para responder.');
      e.status = 504;
      e.apagarSessao = false;
      throw e;
    }
    throw erro;
  } finally {
    clearTimeout(timer);
  }
}

function validarHospedagem(body) {
  const dados = {
    nome: normalizarTexto(body?.nome),
    descricao: normalizarTexto(body?.descricao),
    photonAppId: normalizarTexto(body?.photonAppId),
    urlFirebase: normalizarTexto(body?.urlFirebase)
  };

  if (!dados.nome || dados.nome.length > 60) {
    return { erro: 'Nome inválido. Use de 1 a 60 caracteres.' };
  }

  if (!dados.descricao || dados.descricao.length > 300) {
    return { erro: 'Descrição inválida. Use de 1 a 300 caracteres.' };
  }

  if (!/^[A-Za-z0-9-]{10,100}$/.test(dados.photonAppId)) {
    return { erro: 'Photon App ID inválido.' };
  }

  try {
    dados.urlFirebase = normalizarDatabaseUrl(dados.urlFirebase);
  } catch (_) {
    return { erro: 'URL do Firebase Realtime Database inválida.' };
  }

  return { dados };
}

async function obterAppIdPhotonRemoto(hospedagem, migrarLegado = false) {
  if (!hospedagem || typeof hospedagem !== 'object') return '';

  const urlFirebase = normalizarTexto(hospedagem.urlFirebase);
  if (!urlFirebase) return '';

  let appIdRemoto = '';
  try {
    const valor = await firebaseRemotoRest(urlFirebase, 'DADOS/AppId Photon');
    appIdRemoto = normalizarTexto(valor);
  } catch (erro) {
    throw erro;
  }

  if (appIdRemoto) {
    return appIdRemoto;
  }

  // Compatibilidade com hospedagens criadas antes desta alteração:
  // se ainda existir photonAppId no Firebase principal, move para o
  // Firebase indicado do servidor e apaga do cadastro principal.
  const appIdLegado = normalizarTexto(hospedagem.photonAppId);
  if (migrarLegado && appIdLegado) {
    await firebaseRemotoRest(urlFirebase, 'DADOS/AppId Photon', {
      method: 'PUT',
      body: appIdLegado
    });

    if (hospedagem.id && serverIdValido(hospedagem.id)) {
      await db.ref(`Hospedagens/${hospedagem.id}/photonAppId`).remove();
    }

    return appIdLegado;
  }

  return '';
}

function serverIdValido(serverId) {
  return typeof serverId === 'string' && /^[A-Za-z0-9_-]{5,128}$/.test(serverId);
}

async function usuarioEhDono(uid, serverId) {
  if (!serverIdValido(serverId)) return false;
  const snap = await db.ref(`contas/${uid}/Hospedagens/${serverId}`).once('value');
  return snap.val() === true;
}

async function obterHospedagemDoDono(uid, serverId) {
  if (!serverIdValido(serverId)) {
    return { status: 400, erro: 'ID do servidor inválido.' };
  }

  const ehDono = await usuarioEhDono(uid, serverId);
  if (!ehDono) {
    return { status: 403, erro: 'Você não possui acesso a este servidor.' };
  }

  const snap = await db.ref(`Hospedagens/${serverId}`).once('value');
  if (!snap.exists()) {
    return { status: 404, erro: 'Servidor não encontrado.' };
  }

  return { hospedagem: { id: serverId, ...snap.val() } };
}

function nickAdminValido(nick) {
  return typeof nick === 'string' && nick.length >= 1 && nick.length <= 40 && !/[.#$\[\]\/\u0000-\u001F\u007F]/.test(nick);
}

app.get('/api/firebase-config', (req, res) => {
  // Para Authentication + Realtime Database no navegador, este painel usa
  // apenas os quatro campos abaixo. appId, messagingSenderId e storageBucket
  // não são obrigatórios para o fluxo atual.
  const config = {
    apiKey: process.env.FIREBASE_WEB_API_KEY?.trim(),
    authDomain: process.env.FIREBASE_WEB_AUTH_DOMAIN?.trim(),
    databaseURL: process.env.FIREBASE_WEB_DATABASE_URL?.trim() || process.env.FIREBASE_DATABASE_URL?.trim(),
    projectId: process.env.FIREBASE_WEB_PROJECT_ID?.trim()
  };

  const obrigatorios = ['apiKey', 'authDomain', 'databaseURL', 'projectId'];
  const faltando = obrigatorios.filter((chave) => !config[chave]);

  if (faltando.length) {
    return res.status(503).json({
      ok: false,
      mensagem: 'Firebase Web não configurado no Render.',
      faltando
    });
  }

  return res.json(config);
});

async function obterStatusCodigoHospedagem(uid) {
  const caminho = `LOGINS_REGISTRADOS/USUARIOS/${uid}/Dados/Compras/Temporarios/Codigo_Hospedagem_Mensal`;
  const snap = await db.ref(caminho).once('value');
  const dados = snap.val();

  if (!dados || typeof dados !== 'object') {
    return {
      ativa: false,
      dataExpiracaoUnixMs: 0,
      motivo: 'nao_adquirido'
    };
  }

  const marcadaAtiva = dados.ativa === true;
  const dataExpiracaoUnixMs = Number(dados.dataExpiracaoUnixMs || 0);
  const agora = Date.now();
  const dentroDaValidade = dataExpiracaoUnixMs > agora;

  return {
    ativa: marcadaAtiva && dentroDaValidade,
    dataExpiracaoUnixMs,
    motivo: !marcadaAtiva
      ? 'inativo'
      : !dentroDaValidade
        ? 'expirado'
        : 'ativo'
  };
}

function obterIdsHospedagensVinculadas(vinculos) {
  if (!vinculos || typeof vinculos !== 'object') return [];
  return Object.keys(vinculos).filter(
    (id) => vinculos[id] === true && serverIdValido(id)
  );
}

app.get('/api/status', (req, res) => {
  res.json({ ok: true, firebaseAdmin: firebasePronto });
});

app.post('/api/hospedagens', autenticar, async (req, res) => {
  const validacao = validarHospedagem(req.body);
  if (validacao.erro) {
    return res.status(400).json({ ok: false, mensagem: validacao.erro });
  }

  const uid = req.usuario.uid;
  const dados = validacao.dados;
  let serverId = '';
  let reservaCriada = false;

  try {
    // A conta só pode criar hospedagem enquanto o Código de Hospedagem Mensal
    // estiver ativo e dentro da validade de 30 dias.
    const statusCodigo = await obterStatusCodigoHospedagem(uid);
    if (!statusCodigo.ativa) {
      return res.status(403).json({
        ok: false,
        codigo: 'codigo_hospedagem_inativo',
        mensagem: 'Você precisa ter o Código de Hospedagem Mensal ativo para hospedar um servidor.'
      });
    }

    const novaRef = db.ref('Hospedagens').push();
    serverId = novaRef.key;

    if (!serverId) {
      throw new Error('Não foi possível gerar o ID da hospedagem.');
    }

    // Reserva atomicamente o único slot de hospedagem desta conta.
    // Isso impede duas requisições simultâneas de criarem dois servidores.
    const vinculosRef = db.ref(`contas/${uid}/Hospedagens`);
    const transacao = await vinculosRef.transaction((atual) => {
      const vinculos = atual && typeof atual === 'object' ? { ...atual } : {};
      const ids = obterIdsHospedagensVinculadas(vinculos);

      if (ids.length >= 1) {
        return; // aborta a transação
      }

      vinculos[serverId] = true;
      return vinculos;
    }, undefined, false);

    if (!transacao.committed) {
      return res.status(409).json({
        ok: false,
        codigo: 'limite_hospedagem_atingido',
        mensagem: 'Sua conta já possui uma hospedagem. O limite atual é de 1 servidor por Código de Hospedagem Mensal.'
      });
    }

    reservaCriada = true;

    // Ao hospedar, já garante uma configuração inicial no Firebase indicado.
    // Se já houver configurações, preserva o que existir e preenche apenas o que faltar.
    const configuracoesPadrao = {
      TipoVisao: 'PrimeiraPessoa',
      TempoSpawnItensMinutos: 10,
      CheckListMembros: false,
      ComZumbis: true,
      ServidorOnline: true,
      ModoJogo: 'PVP'
    };

    const configuracoesExistentes = await firebaseRemotoRest(dados.urlFirebase, 'CONFIGURACOES - SERVE');
    const configuracoesIniciais = configuracoesExistentes && typeof configuracoesExistentes === 'object'
      ? { ...configuracoesPadrao, ...configuracoesExistentes }
      : configuracoesPadrao;

    await firebaseRemotoRest(dados.urlFirebase, 'CONFIGURACOES - SERVE', {
      method: 'PUT',
      body: configuracoesIniciais
    });

    // O Photon App ID fica SOMENTE no Firebase indicado pelo dono do servidor.
    // Caminho: DADOS/AppId Photon
    await firebaseRemotoRest(dados.urlFirebase, 'DADOS/AppId Photon', {
      method: 'PUT',
      body: dados.photonAppId
    });

    // No Firebase principal ficam apenas os dados necessários para localizar
    // a hospedagem. O Photon App ID NÃO é armazenado aqui.
    await db.ref(`Hospedagens/${serverId}`).set({
      nome: dados.nome,
      descricao: dados.descricao,
      urlFirebase: dados.urlFirebase
    });

    console.log(`[Hospedagem] criada ${serverId} por UID ${uid}`);
    return res.status(201).json({ ok: true, serverId });
  } catch (erro) {
    if (reservaCriada && serverId) {
      try {
        await db.ref(`contas/${uid}/Hospedagens/${serverId}`).remove();
      } catch (erroRollback) {
        console.error('[Hospedagem] falha ao desfazer reserva:', erroRollback);
      }
    }

    console.error('[Hospedagem] erro ao criar:', erro);
    return res.status(500).json({ ok: false, mensagem: 'Não foi possível criar a hospedagem.' });
  }
});

app.get('/api/minhas-hospedagens', autenticar, async (req, res) => {
  const uid = req.usuario.uid;

  try {
    const [vinculosSnap, statusCodigo] = await Promise.all([
      db.ref(`contas/${uid}/Hospedagens`).once('value'),
      obterStatusCodigoHospedagem(uid)
    ]);

    const vinculos = vinculosSnap.val() || {};
    const ids = obterIdsHospedagensVinculadas(vinculos);

    const hospedagens = [];
    for (const id of ids.slice(0, 50)) {
      const snap = await db.ref(`Hospedagens/${id}`).once('value');
      if (snap.exists()) {
        const valor = snap.val() || {};
        hospedagens.push({
          id,
          nome: normalizarTexto(valor.nome),
          descricao: normalizarTexto(valor.descricao),
          urlFirebase: normalizarTexto(valor.urlFirebase)
        });
      }
    }

    const limiteAtingido = ids.length >= 1;

    return res.json({
      ok: true,
      hospedagens,
      codigoHospedagem: {
        ativa: statusCodigo.ativa,
        dataExpiracaoUnixMs: statusCodigo.dataExpiracaoUnixMs,
        motivo: statusCodigo.motivo
      },
      limiteHospedagens: 1,
      limiteAtingido,
      podeHospedar: statusCodigo.ativa && !limiteAtingido
    });
  } catch (erro) {
    console.error('[Hospedagem] erro ao listar:', erro);
    return res.status(500).json({ ok: false, mensagem: 'Não foi possível carregar suas hospedagens.' });
  }
});

app.get('/api/hospedagens/:serverId', autenticar, async (req, res) => {
  const uid = req.usuario.uid;
  const serverId = String(req.params.serverId || '');

  try {
    const resultado = await obterHospedagemDoDono(uid, serverId);
    if (resultado.erro) {
      return res.status(resultado.status).json({ ok: false, mensagem: resultado.erro });
    }

    const appIdPhoton = await obterAppIdPhotonRemoto(resultado.hospedagem, true);
    const { photonAppId: _photonLegado, ...hospedagemSemLegado } = resultado.hospedagem;

    return res.json({
      ok: true,
      hospedagem: {
        ...hospedagemSemLegado,
        photonAppId: appIdPhoton
      }
    });
  } catch (erro) {
    console.error('[Hospedagem] erro ao abrir servidor:', erro);
    return res.status(500).json({ ok: false, mensagem: 'Não foi possível abrir este servidor.' });
  }
});

// ---------------------------------------------------------------------------
// CONEXÃO DO SERVIDOR: FIREBASE + PHOTON APP ID
// O App ID fica no Firebase remoto em DADOS/AppId Photon.
// No Firebase principal é atualizada somente a urlFirebase.
//
// Ao TROCAR a URL, o painel pode enviar transferirDados=true.
// Nesse caso o backend COPIA os dados do Firebase antigo para o novo banco
// antes de alterar o vínculo. O banco antigo não é apagado.
// ---------------------------------------------------------------------------
app.put('/api/hospedagens/:serverId/conexao', autenticar, async (req, res) => {
  const uid = req.usuario.uid;
  const serverId = String(req.params.serverId || '');

  let urlFirebase;
  try {
    urlFirebase = normalizarDatabaseUrl(normalizarTexto(req.body?.urlFirebase));
  } catch (_) {
    return res.status(400).json({
      ok: false,
      mensagem: 'URL do Firebase Realtime Database inválida.'
    });
  }

  const photonAppId = normalizarTexto(req.body?.photonAppId);
  if (!/^[A-Za-z0-9-]{10,100}$/.test(photonAppId)) {
    return res.status(400).json({
      ok: false,
      mensagem: 'Photon App ID inválido.'
    });
  }

  const transferirDados = req.body?.transferirDados === true;

  try {
    const resultado = await obterHospedagemDoDono(uid, serverId);
    if (resultado.erro) {
      return res.status(resultado.status).json({ ok: false, mensagem: resultado.erro });
    }

    const urlFirebaseAntiga = normalizarDatabaseUrl(
      normalizarTexto(resultado.hospedagem.urlFirebase)
    );
    const trocouFirebase = urlFirebaseAntiga !== urlFirebase;

    // Se o usuário escolheu transferir, primeiro lê TODO o banco antigo e
    // copia para o novo. Usamos PATCH na raiz para preservar nós extras que
    // já possam existir no banco novo. Nós com o mesmo nome são substituídos
    // pelos valores vindos do banco antigo.
    let dadosTransferidos = false;
    if (trocouFirebase && transferirDados) {
      const dadosAntigos = await firebaseRemotoRest(
        urlFirebaseAntiga,
        '',
        { timeoutMs: 30000 }
      );

      if (dadosAntigos !== null && typeof dadosAntigos === 'object') {
        await firebaseRemotoRest(
          urlFirebase,
          '',
          {
            method: 'PATCH',
            body: dadosAntigos,
            timeoutMs: 30000
          }
        );
      }

      dadosTransferidos = true;
    }

    // Primeiro testa/prepara o Firebase que ficará vinculado. Só depois a URL
    // central é alterada. Se qualquer acesso ao novo banco falhar, o vínculo
    // antigo continua intacto.
    const configuracoesPadrao = {
      TipoVisao: 'PrimeiraPessoa',
      TempoSpawnItensMinutos: 10,
      CheckListMembros: false,
      ComZumbis: true,
      ServidorOnline: true,
      ModoJogo: 'PVP'
    };

    const configuracoesExistentes = await firebaseRemotoRest(
      urlFirebase,
      'CONFIGURACOES - SERVE'
    );

    const configuracoesFinais = configuracoesExistentes && typeof configuracoesExistentes === 'object'
      ? { ...configuracoesPadrao, ...configuracoesExistentes }
      : configuracoesPadrao;

    await Promise.all([
      firebaseRemotoRest(urlFirebase, 'CONFIGURACOES - SERVE', {
        method: 'PUT',
        body: configuracoesFinais
      }),
      firebaseRemotoRest(urlFirebase, 'DADOS/AppId Photon', {
        method: 'PUT',
        body: photonAppId
      })
    ]);

    // Atualiza somente a URL no cadastro central e remove qualquer campo
    // photonAppId legado que ainda possa existir de versões antigas.
    await db.ref(`Hospedagens/${serverId}`).update({
      urlFirebase,
      photonAppId: null
    });

    console.log(
      `[Hospedagem] conexão atualizada em ${serverId}` +
      (dadosTransferidos ? ' com transferência de dados' : '')
    );

    return res.json({
      ok: true,
      urlFirebase,
      photonAppId,
      trocouFirebase,
      dadosTransferidos
    });
  } catch (erro) {
    console.error('[Hospedagem] erro ao atualizar conexão:', erro);
    return res.status(502).json({
      ok: false,
      mensagem: erroAcessoRemoto(erro)
    });
  }
});

// ---------------------------------------------------------------------------
// CONFIGURAÇÕES DO FIREBASE DO SERVIDOR HOSPEDADO
// O navegador envia apenas o SERVER_ID. A URL real é lida do Firebase principal
// depois da checagem de propriedade da conta logada.
// ---------------------------------------------------------------------------
app.get('/api/hospedagens/:serverId/configuracao', autenticar, async (req, res) => {
  const uid = req.usuario.uid;
  const serverId = String(req.params.serverId || '');

  try {
    const resultado = await obterHospedagemDoDono(uid, serverId);
    if (resultado.erro) {
      return res.status(resultado.status).json({ ok: false, mensagem: resultado.erro });
    }

    const [geraisNovas, geraisAntigas, senha, helicrash, adminsObjBruto, checklistObjBruto, bloqueiosObjBruto] = await Promise.all([
      firebaseRemotoRest(resultado.hospedagem.urlFirebase, 'CONFIGURACOES - SERVE'),
      firebaseRemotoRest(resultado.hospedagem.urlFirebase, 'CONFIGURACOES'),
      firebaseRemotoRest(resultado.hospedagem.urlFirebase, 'DADOS/Senha'),
      firebaseRemotoRest(resultado.hospedagem.urlFirebase, 'EVENTOS/Helicrash'),
      firebaseRemotoRest(resultado.hospedagem.urlFirebase, 'ADMINS'),
      firebaseRemotoRest(resultado.hospedagem.urlFirebase, 'CHECKLIST'),
      firebaseRemotoRest(resultado.hospedagem.urlFirebase, 'BLOQUEIOS')
    ]);

    const geraisBrutas = geraisNovas && typeof geraisNovas === 'object'
      ? geraisNovas
      : (geraisAntigas && typeof geraisAntigas === 'object' ? geraisAntigas : null);

    const gerais = geraisBrutas ? {
      tipoVisao: geraisBrutas.TipoVisao ?? geraisBrutas.tipoVisao ?? null,
      tempoSpawnItensMinutos: Number(geraisBrutas.TempoSpawnItensMinutos ?? geraisBrutas.tempoSpawnItensMinutos ?? 0),
      checkListMembros: Boolean(geraisBrutas.CheckListMembros ?? geraisBrutas.checkListMembros ?? false),
      comZumbis: (geraisBrutas.ComZumbis ?? geraisBrutas.comZumbis ?? true) !== false,
      servidorOnline: (geraisBrutas.ServidorOnline ?? geraisBrutas.servidorOnline ?? true) !== false,
      modoJogo: ['PVP', 'PVE'].includes(String(geraisBrutas.ModoJogo ?? geraisBrutas.modoJogo ?? 'PVP').toUpperCase())
        ? String(geraisBrutas.ModoJogo ?? geraisBrutas.modoJogo ?? 'PVP').toUpperCase()
        : 'PVP' 
    } : null;

    const adminsObj = adminsObjBruto && typeof adminsObjBruto === 'object' ? adminsObjBruto : {};
    const admins = Object.entries(adminsObj)
      .filter(([, valor]) => valor === true)
      .map(([nick]) => nick)
      .slice(0, 200);

    const checklistObj = checklistObjBruto && typeof checklistObjBruto === 'object' ? checklistObjBruto : {};
    const checklist = Object.entries(checklistObj)
      .filter(([, valor]) => valor === true)
      .map(([nick]) => nick)
      .slice(0, 500);

    let bloqueios = [];
    if (Array.isArray(bloqueiosObjBruto)) {
      bloqueios = bloqueiosObjBruto
        .filter((valor) => typeof valor === 'string' && valor.trim())
        .map((valor) => valor.trim())
        .slice(0, 500);
    } else if (bloqueiosObjBruto && typeof bloqueiosObjBruto === 'object') {
      bloqueios = Object.entries(bloqueiosObjBruto)
        .filter(([, valor]) => valor !== null && valor !== false)
        .map(([nick, valor]) => /^\d+$/.test(nick) && typeof valor === 'string' ? valor.trim() : nick)
        .filter(Boolean)
        .slice(0, 500);
    }

    return res.json({
      ok: true,
      gerais: gerais && typeof gerais === 'object' ? gerais : null,
      temSenha: typeof senha === 'string' && senha.length > 0,
      helicrash: helicrash && typeof helicrash === 'object' ? helicrash : null,
      admins,
      checklist,
      bloqueios
    });
  } catch (erro) {
    console.error('[Servidor remoto] erro ao ler configuração:', erro);
    return res.status(502).json({ ok: false, mensagem: erroAcessoRemoto(erro) });
  }
});

app.put('/api/hospedagens/:serverId/status-servidor', autenticar, async (req, res) => {
  const uid = req.usuario.uid;
  const serverId = String(req.params.serverId || '');

  if (typeof req.body?.servidorOnline !== 'boolean') {
    return res.status(400).json({ ok: false, mensagem: 'Status do servidor inválido.' });
  }

  const servidorOnline = req.body.servidorOnline;

  try {
    const resultado = await obterHospedagemDoDono(uid, serverId);
    if (resultado.erro) {
      return res.status(resultado.status).json({ ok: false, mensagem: resultado.erro });
    }

    await firebaseRemotoRest(
      resultado.hospedagem.urlFirebase,
      'CONFIGURACOES - SERVE/ServidorOnline',
      { method: 'PUT', body: servidorOnline }
    );

    console.log(`[Servidor remoto] ${serverId} ficou ${servidorOnline ? 'ONLINE' : 'OFFLINE'}`);
    return res.json({ ok: true, servidorOnline });
  } catch (erro) {
    console.error('[Servidor remoto] erro ao alterar status:', erro);
    return res.status(502).json({ ok: false, mensagem: erroAcessoRemoto(erro) });
  }
});

app.put('/api/hospedagens/:serverId/configuracoes-gerais', autenticar, async (req, res) => {
  const uid = req.usuario.uid;
  const serverId = String(req.params.serverId || '');
  const tipoVisao = normalizarTexto(req.body?.tipoVisao);
  const tempoSpawnItensMinutos = Number(req.body?.tempoSpawnItensMinutos);
  const checkListMembros = req.body?.checkListMembros === true;
  const comZumbis = req.body?.comZumbis !== false;
  const servidorOnline = req.body?.servidorOnline !== false;
  const modoJogo = String(req.body?.modoJogo || '').toUpperCase();

  if (!['PrimeiraPessoa', 'TerceiraPessoa'].includes(tipoVisao)) {
    return res.status(400).json({ ok: false, mensagem: 'Tipo de visão inválido.' });
  }

  if (!Number.isInteger(tempoSpawnItensMinutos) || tempoSpawnItensMinutos < 1 || tempoSpawnItensMinutos > 1440) {
    return res.status(400).json({ ok: false, mensagem: 'O tempo de spawn dos itens deve ficar entre 1 e 1440 minutos.' });
  }

  if (!['PVP', 'PVE'].includes(modoJogo)) {
    return res.status(400).json({ ok: false, mensagem: 'Modo de jogo inválido. Use PVP ou PVE.' });
  }

  try {
    const resultado = await obterHospedagemDoDono(uid, serverId);
    if (resultado.erro) {
      return res.status(resultado.status).json({ ok: false, mensagem: resultado.erro });
    }

    const configuracoesFirebase = {
      TipoVisao: tipoVisao,
      TempoSpawnItensMinutos: tempoSpawnItensMinutos,
      CheckListMembros: checkListMembros,
      ComZumbis: comZumbis,
      ServidorOnline: servidorOnline,
      ModoJogo: modoJogo
    };
    await firebaseRemotoRest(resultado.hospedagem.urlFirebase, 'CONFIGURACOES - SERVE', {
      method: 'PUT',
      body: configuracoesFirebase
    });

    const configuracoes = { tipoVisao, tempoSpawnItensMinutos, checkListMembros, comZumbis, servidorOnline, modoJogo };

    console.log(`[Servidor remoto] configurações gerais atualizadas em ${serverId}`);
    return res.json({ ok: true, configuracoes });
  } catch (erro) {
    console.error('[Servidor remoto] erro ao salvar configurações gerais:', erro);
    return res.status(502).json({ ok: false, mensagem: erroAcessoRemoto(erro) });
  }
});

app.put('/api/hospedagens/:serverId/senha', autenticar, async (req, res) => {
  const uid = req.usuario.uid;
  const serverId = String(req.params.serverId || '');
  const senha = String(req.body?.senha || '').trim();

  if (senha.length < 4 || senha.length > 32) {
    return res.status(400).json({ ok: false, mensagem: 'A senha deve ter entre 4 e 32 caracteres.' });
  }

  try {
    const resultado = await obterHospedagemDoDono(uid, serverId);
    if (resultado.erro) {
      return res.status(resultado.status).json({ ok: false, mensagem: resultado.erro });
    }

    await firebaseRemotoRest(resultado.hospedagem.urlFirebase, 'DADOS/Senha', {
      method: 'PUT',
      body: senha
    });

    console.log(`[Servidor remoto] senha de entrada atualizada em ${serverId}`);
    return res.json({ ok: true, temSenha: true });
  } catch (erro) {
    console.error('[Servidor remoto] erro ao salvar senha:', erro);
    return res.status(502).json({ ok: false, mensagem: erroAcessoRemoto(erro) });
  }
});

app.delete('/api/hospedagens/:serverId/senha', autenticar, async (req, res) => {
  const uid = req.usuario.uid;
  const serverId = String(req.params.serverId || '');

  try {
    const resultado = await obterHospedagemDoDono(uid, serverId);
    if (resultado.erro) {
      return res.status(resultado.status).json({ ok: false, mensagem: resultado.erro });
    }

    await firebaseRemotoRest(resultado.hospedagem.urlFirebase, 'DADOS/Senha', {
      method: 'DELETE'
    });

    console.log(`[Servidor remoto] senha de entrada removida de ${serverId}`);
    return res.json({ ok: true, temSenha: false });
  } catch (erro) {
    console.error('[Servidor remoto] erro ao remover senha:', erro);
    return res.status(502).json({ ok: false, mensagem: erroAcessoRemoto(erro) });
  }
});

app.put('/api/hospedagens/:serverId/eventos/helicrash', autenticar, async (req, res) => {
  const uid = req.usuario.uid;
  const serverId = String(req.params.serverId || '');
  const intervaloMinutos = Number(req.body?.intervaloMinutos);

  if (![5, 10, 20].includes(intervaloMinutos)) {
    return res.status(400).json({ ok: false, mensagem: 'O intervalo deve ser 5, 10 ou 20 minutos.' });
  }

  try {
    const resultado = await obterHospedagemDoDono(uid, serverId);
    if (resultado.erro) {
      return res.status(resultado.status).json({ ok: false, mensagem: resultado.erro });
    }

    const valor = { ativo: true, intervaloMinutos };
    await firebaseRemotoRest(resultado.hospedagem.urlFirebase, 'EVENTOS/Helicrash', {
      method: 'PUT',
      body: valor
    });

    console.log(`[Servidor remoto] Helicrash ${intervaloMinutos} min em ${serverId}`);
    return res.json({ ok: true, helicrash: valor });
  } catch (erro) {
    console.error('[Servidor remoto] erro ao salvar Helicrash:', erro);
    return res.status(502).json({ ok: false, mensagem: erroAcessoRemoto(erro) });
  }
});

app.put('/api/hospedagens/:serverId/admins', autenticar, async (req, res) => {
  const uid = req.usuario.uid;
  const serverId = String(req.params.serverId || '');
  const nick = normalizarTexto(req.body?.nick);

  if (!nickAdminValido(nick)) {
    return res.status(400).json({ ok: false, mensagem: 'Nick inválido. Não use . # $ [ ] / e limite a 40 caracteres.' });
  }

  try {
    const resultado = await obterHospedagemDoDono(uid, serverId);
    if (resultado.erro) {
      return res.status(resultado.status).json({ ok: false, mensagem: resultado.erro });
    }

    await firebaseRemotoRest(resultado.hospedagem.urlFirebase, `ADMINS/${nick}`, {
      method: 'PUT',
      body: true
    });

    console.log(`[Servidor remoto] admin ${nick} adicionado em ${serverId}`);
    return res.json({ ok: true, nick });
  } catch (erro) {
    console.error('[Servidor remoto] erro ao adicionar admin:', erro);
    return res.status(502).json({ ok: false, mensagem: erroAcessoRemoto(erro) });
  }
});

app.delete('/api/hospedagens/:serverId/admins/:nick', autenticar, async (req, res) => {
  const uid = req.usuario.uid;
  const serverId = String(req.params.serverId || '');
  const nick = normalizarTexto(req.params.nick);

  if (!nickAdminValido(nick)) {
    return res.status(400).json({ ok: false, mensagem: 'Nick inválido.' });
  }

  try {
    const resultado = await obterHospedagemDoDono(uid, serverId);
    if (resultado.erro) {
      return res.status(resultado.status).json({ ok: false, mensagem: resultado.erro });
    }

    await firebaseRemotoRest(resultado.hospedagem.urlFirebase, `ADMINS/${nick}`, {
      method: 'DELETE'
    });

    console.log(`[Servidor remoto] admin ${nick} removido de ${serverId}`);
    return res.json({ ok: true });
  } catch (erro) {
    console.error('[Servidor remoto] erro ao remover admin:', erro);
    return res.status(502).json({ ok: false, mensagem: erroAcessoRemoto(erro) });
  }
});

app.put('/api/hospedagens/:serverId/checklist', autenticar, async (req, res) => {
  const uid = req.usuario.uid;
  const serverId = String(req.params.serverId || '');
  const nick = normalizarTexto(req.body?.nick);

  if (!nickAdminValido(nick)) {
    return res.status(400).json({ ok: false, mensagem: 'Nick inválido. Não use . # $ [ ] / e limite a 40 caracteres.' });
  }

  try {
    const resultado = await obterHospedagemDoDono(uid, serverId);
    if (resultado.erro) {
      return res.status(resultado.status).json({ ok: false, mensagem: resultado.erro });
    }

    await firebaseRemotoRest(resultado.hospedagem.urlFirebase, `CHECKLIST/${nick}`, {
      method: 'PUT',
      body: true
    });

    console.log(`[Servidor remoto] membro ${nick} adicionado à CheckList em ${serverId}`);
    return res.json({ ok: true, nick });
  } catch (erro) {
    console.error('[Servidor remoto] erro ao adicionar membro à CheckList:', erro);
    return res.status(502).json({ ok: false, mensagem: erroAcessoRemoto(erro) });
  }
});

app.delete('/api/hospedagens/:serverId/checklist/:nick', autenticar, async (req, res) => {
  const uid = req.usuario.uid;
  const serverId = String(req.params.serverId || '');
  const nick = normalizarTexto(req.params.nick);

  if (!nickAdminValido(nick)) {
    return res.status(400).json({ ok: false, mensagem: 'Nick inválido.' });
  }

  try {
    const resultado = await obterHospedagemDoDono(uid, serverId);
    if (resultado.erro) {
      return res.status(resultado.status).json({ ok: false, mensagem: resultado.erro });
    }

    await firebaseRemotoRest(resultado.hospedagem.urlFirebase, `CHECKLIST/${nick}`, {
      method: 'DELETE'
    });

    console.log(`[Servidor remoto] membro ${nick} removido da CheckList de ${serverId}`);
    return res.json({ ok: true });
  } catch (erro) {
    console.error('[Servidor remoto] erro ao remover membro da CheckList:', erro);
    return res.status(502).json({ ok: false, mensagem: erroAcessoRemoto(erro) });
  }
});

app.delete('/api/hospedagens/:serverId/bloqueios/:nick', autenticar, async (req, res) => {
  const uid = req.usuario.uid;
  const serverId = String(req.params.serverId || '');
  const nick = normalizarTexto(req.params.nick);

  if (!nickAdminValido(nick)) {
    return res.status(400).json({ ok: false, mensagem: 'Nick inválido.' });
  }

  try {
    const resultado = await obterHospedagemDoDono(uid, serverId);
    if (resultado.erro) {
      return res.status(resultado.status).json({ ok: false, mensagem: resultado.erro });
    }

    await firebaseRemotoRest(resultado.hospedagem.urlFirebase, `BLOQUEIOS/${nick}`, {
      method: 'DELETE'
    });

    console.log(`[Servidor remoto] bloqueio de ${nick} removido de ${serverId}`);
    return res.json({ ok: true });
  } catch (erro) {
    console.error('[Servidor remoto] erro ao remover bloqueio:', erro);
    return res.status(502).json({ ok: false, mensagem: erroAcessoRemoto(erro) });
  }
});


// ---------------------------------------------------------------------------
// PESQUISA DE SERVIDORES PARA O JOGO
// A Unity envia nome + tokenSessao + idDispositivo.
// A sessão é validada no servidor de login antes da leitura no Firebase.
// Para cada hospedagem encontrada, o backend consulta o Firebase remoto
// cadastrado em urlFirebase e devolve somente os dados necessários ao jogo.
// A urlFirebase continua escondida da Unity.
// ---------------------------------------------------------------------------
app.post('/api/pesquisar-hospedagens', async (req, res) => {
  if (!firebasePronto || !db) {
    return res.status(503).json({
      ok: false,
      mensagem: 'Servidor de hospedagem indisponível.'
    });
  }

  const nomePesquisa = normalizarTexto(req.body?.nome);
  const tokenSessao = normalizarTexto(req.body?.tokenSessao);
  const idDispositivo = normalizarTexto(req.body?.idDispositivo);

  if (!nomePesquisa) {
    return res.status(400).json({
      ok: false,
      mensagem: 'Digite o nome de um servidor.'
    });
  }

  if (nomePesquisa.length > 60) {
    return res.status(400).json({
      ok: false,
      mensagem: 'Pesquisa muito longa.'
    });
  }

  let sessao;
  try {
    sessao = await validarSessaoDoJogo(tokenSessao, idDispositivo);
  } catch (erro) {
    const status = Number(erro?.status) || 401;
    return res.status(status).json({
      ok: false,
      apagarSessao: erro?.apagarSessao === true,
      mensagem: erro?.message || 'Faça login novamente.'
    });
  }

  try {
    const termo = normalizarPesquisa(nomePesquisa);
    const snap = await db.ref('Hospedagens').once('value');
    const dados = snap.val() || {};
    const hospedagens = [];

    for (const [id, hospedagem] of Object.entries(dados)) {
      if (!serverIdValido(id) || !hospedagem || typeof hospedagem !== 'object') {
        continue;
      }

      const nome = normalizarTexto(hospedagem.nome);
      const descricao = normalizarTexto(hospedagem.descricao);

      if (!nome || !normalizarPesquisa(nome).includes(termo)) {
        continue;
      }

      // Consulta SOMENTE os dados que a lista de servidores precisa.
      // A URL do Firebase remoto não é enviada para o cliente.
      let modoJogo = 'PVP';
      let servidorOnline = false;
      let temSenha = false;

      try {
        const [configuracoes, senha] = await Promise.all([
          firebaseRemotoRest(
            hospedagem.urlFirebase,
            'CONFIGURACOES - SERVE',
            { timeoutMs: 7000 }
          ),
          firebaseRemotoRest(
            hospedagem.urlFirebase,
            'DADOS/Senha',
            { timeoutMs: 7000 }
          )
        ]);

        const cfg = configuracoes && typeof configuracoes === 'object'
          ? configuracoes
          : {};

        const modoBruto = String(cfg.ModoJogo ?? cfg.modoJogo ?? 'PVP').toUpperCase();
        modoJogo = modoBruto === 'PVE' ? 'PVE' : 'PVP';

        servidorOnline = (cfg.ServidorOnline ?? cfg.servidorOnline ?? false) === true;

        temSenha = typeof senha === 'string' && senha.trim().length > 0;
      } catch (erroRemoto) {
        // Se o Firebase remoto estiver inacessível, o servidor aparece como offline.
        console.warn(
          `[Pesquisa de hospedagens] não foi possível ler o Firebase remoto de ${id}:`,
          erroRemoto?.message || erroRemoto
        );
        servidorOnline = false;
        temSenha = false;
      }

      hospedagens.push({
        id,
        nome,
        descricao,
        modoJogo,
        servidorOnline,
        temSenha
      });

      if (hospedagens.length >= 20) {
        break;
      }
    }

    return res.json({
      ok: true,
      hospedagens,
      // O endpoint de login automático renova a sessão, então devolvemos o novo
      // token para a Unity salvar e continuar conectada.
      tokenSessao: sessao.tokenSessao || null,
      sessaoExpiraEm: Number(sessao.sessaoExpiraEm) || 0
    });
  } catch (erro) {
    console.error('[Pesquisa de hospedagens] erro:', erro);
    return res.status(500).json({
      ok: false,
      mensagem: 'Não foi possível pesquisar os servidores.'
    });
  }
});


// ---------------------------------------------------------------------------
// ATUALIZAÇÃO EM LOTE DOS SERVIDORES FAVORITOS
//
// A Unity envia todos os favoritos salvos em UMA única requisição.
// O backend valida a sessão uma única vez, consulta cada hospedagem pelo ID,
// lê os dados públicos necessários no Firebase remoto e devolve SOMENTE os
// campos que mudaram. A urlFirebase e a senha real nunca são enviadas à Unity.
// ---------------------------------------------------------------------------
const CACHE_FAVORITOS_TTL_MS = 15000;
const cacheResumoFavoritos = new Map();

async function lerResumoRemotoComCache(serverId, urlFirebase) {
  const chave = `${serverId}|${urlFirebase}`;
  const agora = Date.now();
  const cache = cacheResumoFavoritos.get(chave);

  if (cache && (agora - cache.criadoEm) < CACHE_FAVORITOS_TTL_MS) {
    return cache.dados;
  }

  const [configuracoes, senha] = await Promise.all([
    firebaseRemotoRest(
      urlFirebase,
      'CONFIGURACOES - SERVE',
      { timeoutMs: 7000 }
    ),
    firebaseRemotoRest(
      urlFirebase,
      'DADOS/Senha',
      { timeoutMs: 7000 }
    )
  ]);

  const cfg = configuracoes && typeof configuracoes === 'object'
    ? configuracoes
    : {};

  const modoBruto = String(
    cfg.ModoJogo ?? cfg.modoJogo ?? 'PVP'
  ).toUpperCase();

  const dados = {
    modoJogo: modoBruto === 'PVE' ? 'PVE' : 'PVP',
    servidorOnline: (cfg.ServidorOnline ?? cfg.servidorOnline ?? false) === true,
    temSenha: typeof senha === 'string' && senha.trim().length > 0
  };

  cacheResumoFavoritos.set(chave, {
    criadoEm: agora,
    dados
  });

  // Limpeza simples para impedir crescimento ilimitado do Map.
  if (cacheResumoFavoritos.size > 1000) {
    for (const [k, v] of cacheResumoFavoritos.entries()) {
      if ((agora - v.criadoEm) >= CACHE_FAVORITOS_TTL_MS) {
        cacheResumoFavoritos.delete(k);
      }
    }
  }

  return dados;
}

app.post('/api/atualizar-favoritos', async (req, res) => {
  if (!firebasePronto || !db) {
    return res.status(503).json({
      ok: false,
      mensagem: 'Servidor de hospedagem indisponível.'
    });
  }

  const tokenSessao = normalizarTexto(req.body?.tokenSessao);
  const idDispositivo = normalizarTexto(req.body?.idDispositivo);
  const favoritosBrutos = Array.isArray(req.body?.favoritos)
    ? req.body.favoritos
    : [];

  if (favoritosBrutos.length === 0) {
    return res.json({
      ok: true,
      alteracoes: [],
      verificados: 0,
      falhas: 0
    });
  }

  // Evita abuso e mantém a chamada pequena.
  if (favoritosBrutos.length > 30) {
    return res.status(400).json({
      ok: false,
      mensagem: 'Máximo de 30 servidores favoritos por atualização.'
    });
  }

  let sessao;
  try {
    sessao = await validarSessaoDoJogo(tokenSessao, idDispositivo);
  } catch (erro) {
    const status = Number(erro?.status) || 401;
    return res.status(status).json({
      ok: false,
      apagarSessao: erro?.apagarSessao === true,
      mensagem: erro?.message || 'Faça login novamente.'
    });
  }

  const favoritos = favoritosBrutos
    .map((f) => ({
      idServidor: normalizarTexto(f?.idServidor),
      nome: normalizarTexto(f?.nome),
      descricao: normalizarTexto(f?.descricao),
      modoJogo: String(f?.modoJogo || 'PVP').toUpperCase() === 'PVE' ? 'PVE' : 'PVP',
      servidorOnline: f?.servidorOnline === true,
      temSenha: f?.temSenha === true
    }))
    .filter((f) => serverIdValido(f.idServidor));

  const alteracoes = [];
  let falhas = 0;

  // Processa em pequenos lotes para não abrir conexões demais ao mesmo tempo.
  const TAMANHO_LOTE = 5;

  for (let inicio = 0; inicio < favoritos.length; inicio += TAMANHO_LOTE) {
    const lote = favoritos.slice(inicio, inicio + TAMANHO_LOTE);

    const resultados = await Promise.all(
      lote.map(async (favorito) => {
        try {
          const snap = await db.ref(`Hospedagens/${favorito.idServidor}`).once('value');

          if (!snap.exists()) {
            // Não apaga automaticamente o favorito local.
            // Apenas ignora esta atualização.
            return { falhou: true };
          }

          const hospedagem = snap.val();
          if (!hospedagem || typeof hospedagem !== 'object') {
            return { falhou: true };
          }

          const urlFirebase = normalizarTexto(hospedagem.urlFirebase);
          if (!urlFirebase) {
            return { falhou: true };
          }

          const nomeAtual = normalizarTexto(hospedagem.nome);
          const descricaoAtual = normalizarTexto(hospedagem.descricao);

          const remoto = await lerResumoRemotoComCache(
            favorito.idServidor,
            urlFirebase
          );

          const alteracao = {
            idServidor: favorito.idServidor,

            alterouNome: nomeAtual !== favorito.nome,
            nome: nomeAtual,

            alterouDescricao: descricaoAtual !== favorito.descricao,
            descricao: descricaoAtual,

            alterouModoJogo: remoto.modoJogo !== favorito.modoJogo,
            modoJogo: remoto.modoJogo,

            alterouServidorOnline:
              remoto.servidorOnline !== favorito.servidorOnline,
            servidorOnline: remoto.servidorOnline,

            alterouTemSenha: remoto.temSenha !== favorito.temSenha,
            temSenha: remoto.temSenha
          };

          const mudou =
            alteracao.alterouNome ||
            alteracao.alterouDescricao ||
            alteracao.alterouModoJogo ||
            alteracao.alterouServidorOnline ||
            alteracao.alterouTemSenha;

          return {
            falhou: false,
            alteracao: mudou ? alteracao : null
          };
        } catch (erro) {
          console.warn(
            `[Favoritos] Falha ao atualizar ${favorito.idServidor}:`,
            erro?.message || erro
          );

          return { falhou: true };
        }
      })
    );

    for (const resultado of resultados) {
      if (resultado.falhou) {
        falhas++;
        continue;
      }

      if (resultado.alteracao) {
        alteracoes.push(resultado.alteracao);
      }
    }
  }

  return res.json({
    ok: true,
    alteracoes,
    verificados: favoritos.length,
    falhas,
    tokenSessao: sessao.tokenSessao || null,
    sessaoExpiraEm: Number(sessao.sessaoExpiraEm) || 0
  });
});


// ---------------------------------------------------------------------------
// PREPARAR CONEXÃO DO JOGO AO SERVIDOR HOSPEDADO
//
// Regras antes de liberar AppId Photon + URL Firebase:
// 1) valida a sessão do jogador e usa o NICK vindo da sessão autenticada;
// 2) se BLOQUEIOS/<nick> existir (true ou outro valor não nulo/não false),
//    o jogador é bloqueado;
// 3) se CONFIGURACOES - SERVE/CheckListMembros == true,
//    exige CHECKLIST/<nick> == true;
// 4) só depois verifica senha e libera a conexão.
//
// A Unity NÃO envia o nick para decidir permissão. O backend usa o nick
// autenticado recebido do servidor de login.
// ---------------------------------------------------------------------------
app.post('/api/preparar-conexao-servidor', async (req, res) => {
  if (!firebasePronto || !db) {
    return res.status(503).json({
      ok: false,
      mensagem: 'Servidor de hospedagem indisponível.'
    });
  }

  const idServidor = normalizarTexto(req.body?.idServidor);
  const tokenSessao = normalizarTexto(req.body?.tokenSessao);
  const idDispositivo = normalizarTexto(req.body?.idDispositivo);

  const senhaFoiInformada =
    Object.prototype.hasOwnProperty.call(req.body || {}, 'senha');

  const senhaInformada =
    senhaFoiInformada
      ? String(req.body?.senha ?? '')
      : '';

  if (!serverIdValido(idServidor)) {
    return res.status(400).json({
      ok: false,
      mensagem: 'ID do servidor inválido.'
    });
  }

  // -------------------------------------------------------------------------
  // SESSÃO / CONTA
  // -------------------------------------------------------------------------

  let sessao;

  try {
    sessao = await validarSessaoDoJogo(
      tokenSessao,
      idDispositivo
    );
  } catch (erro) {
    const status = Number(erro?.status) || 401;

    return res.status(status).json({
      ok: false,
      apagarSessao: erro?.apagarSessao === true,
      mensagem: erro?.message || 'Faça login novamente.'
    });
  }

  // O nick usado para CHECKLIST/BLOQUEIOS vem da sessão assinada/validada.
  const nickJogador =
    normalizarTexto(sessao?.nick);

  if (!nickJogador) {
    return res.status(403).json({
      ok: false,
      mensagem: 'Sua conta não possui um nick válido.'
    });
  }

  if (!nickAdminValido(nickJogador)) {
    return res.status(403).json({
      ok: false,
      mensagem:
        'Seu nick possui caracteres que não podem ser usados neste servidor.'
    });
  }

  try {
    // -----------------------------------------------------------------------
    // LOCALIZAR SERVIDOR
    // -----------------------------------------------------------------------

    const snap =
      await db
        .ref(`Hospedagens/${idServidor}`)
        .once('value');

    if (!snap.exists()) {
      return res.status(404).json({
        ok: false,
        mensagem: 'Servidor não encontrado.'
      });
    }

    const hospedagem = snap.val();

    if (!hospedagem || typeof hospedagem !== 'object') {
      return res.status(404).json({
        ok: false,
        mensagem: 'Servidor inválido.'
      });
    }

    const urlFirebase =
      normalizarTexto(hospedagem.urlFirebase);

    if (!urlFirebase) {
      return res.status(502).json({
        ok: false,
        mensagem: 'Este servidor não possui Firebase configurado.'
      });
    }

    // -----------------------------------------------------------------------
    // LER DADOS DO FIREBASE DO SERVIDOR
    // -----------------------------------------------------------------------

    const [
      configuracoes,
      senhaRemotaBruta,
      appIdPhotonBruto,
      bloqueioJogador,
      checklistJogador
    ] = await Promise.all([
      firebaseRemotoRest(
        urlFirebase,
        'CONFIGURACOES - SERVE',
        { timeoutMs: 10000 }
      ),

      firebaseRemotoRest(
        urlFirebase,
        'DADOS/Senha',
        { timeoutMs: 10000 }
      ),

      firebaseRemotoRest(
        urlFirebase,
        'DADOS/AppId Photon',
        { timeoutMs: 10000 }
      ),

      firebaseRemotoRest(
        urlFirebase,
        `BLOQUEIOS/${nickJogador}`,
        { timeoutMs: 10000 }
      ),

      firebaseRemotoRest(
        urlFirebase,
        `CHECKLIST/${nickJogador}`,
        { timeoutMs: 10000 }
      )
    ]);

    const cfg =
      configuracoes &&
      typeof configuracoes === 'object'
        ? configuracoes
        : {};

    // -----------------------------------------------------------------------
    // SERVIDOR ONLINE
    // -----------------------------------------------------------------------

    const servidorOnline =
      (cfg.ServidorOnline ??
       cfg.servidorOnline ??
       false) === true;

    if (!servidorOnline) {
      return res.status(409).json({
        ok: false,
        servidorOnline: false,
        mensagem: 'Este servidor está offline.'
      });
    }

    // -----------------------------------------------------------------------
    // BLOQUEIOS
    // -----------------------------------------------------------------------

    const jogadorBloqueado =
      bloqueioJogador !== null &&
      bloqueioJogador !== false;

    if (jogadorBloqueado) {
      console.log(
        `[Conexão] Entrada BLOQUEADA para "${nickJogador}" em ${idServidor}.`
      );

      return res.status(403).json({
        ok: false,
        bloqueado: true,
        foraChecklist: false,
        checkListAtivada:
          (cfg.CheckListMembros ??
           cfg.checkListMembros ??
           false) === true,
        mensagem: 'Você foi banido deste servidor.'
      });
    }

    // -----------------------------------------------------------------------
    // CHECKLIST
    // -----------------------------------------------------------------------

    const checkListAtivada =
      (cfg.CheckListMembros ??
       cfg.checkListMembros ??
       false) === true;

    if (checkListAtivada) {
      const permitidoChecklist =
        checklistJogador === true;

      if (!permitidoChecklist) {
        console.log(
          `[Conexão] "${nickJogador}" não está na CHECKLIST de ${idServidor}.`
        );

        return res.status(403).json({
          ok: false,
          bloqueado: false,
          foraChecklist: true,
          checkListAtivada: true,
          mensagem:
            'Você não está na lista de membros permitidos deste servidor.'
        });
      }
    }

    // -----------------------------------------------------------------------
    // SENHA
    // -----------------------------------------------------------------------

    const senhaRemota =
      typeof senhaRemotaBruta === 'string'
        ? senhaRemotaBruta
        : '';

    const temSenha =
      senhaRemota.length > 0;

    // Primeiro acesso: depois de passar BLOQUEIOS/CHECKLIST,
    // apenas informa à Unity que deve abrir o painel de senha.
    if (temSenha && !senhaFoiInformada) {
      return res.json({
        ok: true,
        precisaSenha: true,
        servidorOnline: true,
        bloqueado: false,
        foraChecklist: false,
        checkListAtivada,
        nomeServidor:
          normalizarTexto(hospedagem.nome) || 'Servidor',
        tokenSessao: sessao.tokenSessao || null,
        sessaoExpiraEm:
          Number(sessao.sessaoExpiraEm) || 0
      });
    }

    if (temSenha) {
      const esperado =
        Buffer.from(senhaRemota, 'utf8');

      const recebido =
        Buffer.from(senhaInformada, 'utf8');

      const senhaCorreta =
        esperado.length === recebido.length &&
        crypto.timingSafeEqual(
          esperado,
          recebido
        );

      if (!senhaCorreta) {
        return res.status(401).json({
          ok: false,
          precisaSenha: true,
          senhaIncorreta: true,
          bloqueado: false,
          foraChecklist: false,
          checkListAtivada,
          mensagem: 'Senha incorreta.'
        });
      }
    }

    // -----------------------------------------------------------------------
    // PHOTON
    // -----------------------------------------------------------------------

    const appIdPhoton =
      normalizarTexto(appIdPhotonBruto);

    if (!/^[A-Za-z0-9-]{10,100}$/.test(appIdPhoton)) {
      return res.status(502).json({
        ok: false,
        mensagem:
          'O Photon App ID deste servidor não está configurado corretamente.'
      });
    }

    // -----------------------------------------------------------------------
    // LIBERADO
    // -----------------------------------------------------------------------

    console.log(
      `[Conexão] Entrada LIBERADA para "${nickJogador}" em ${idServidor}.`
    );

    return res.json({
      ok: true,
      precisaSenha: false,
      servidorOnline: true,

      bloqueado: false,
      foraChecklist: false,
      checkListAtivada,

      nomeServidor:
        normalizarTexto(hospedagem.nome) || 'Servidor',

      appIdPhoton,
      urlFirebase,

      tokenSessao: sessao.tokenSessao || null,
      sessaoExpiraEm:
        Number(sessao.sessaoExpiraEm) || 0
    });
  } catch (erro) {
    console.error(
      '[Conexão do jogo] erro ao preparar servidor:',
      erro
    );

    return res.status(502).json({
      ok: false,
      mensagem: erroAcessoRemoto(erro)
    });
  }
});

app.use(express.static(PUBLIC_DIR, {
  etag: false,
  lastModified: false,
  setHeaders: (res) => res.setHeader('Cache-Control', 'no-store')
}));

app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ ok: false, mensagem: 'Rota não encontrada.' });
  }

  if (req.method === 'GET') {
    return res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  }

  return res.status(404).end();
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`DayZombi Hospedagem: http://localhost:${PORT}`);
  console.log(`Firebase Admin: ${firebasePronto ? 'configurado' : 'não configurado'}`);
});
