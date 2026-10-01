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

// ---------------------------------------------------------------------------
// MERCADO PAGO - CÓDIGO DE HOSPEDAGEM MENSAL
//
// Checkout Pro: o Access Token e o segredo do Webhook ficam SOMENTE no Render.
// O navegador recebe apenas a URL de checkout criada pelo backend.
// ---------------------------------------------------------------------------
const MP_ACCESS_TOKEN = String(process.env.MP_ACCESS_TOKEN || '').trim();
const MP_WEBHOOK_SECRET = String(process.env.MP_WEBHOOK_SECRET || '').trim();
const MP_PUBLIC_KEY = String(process.env.MP_PUBLIC_KEY || '').trim();
const PUBLIC_URL = String(process.env.PUBLIC_URL || '').trim().replace(/\/+$/, '');
const MP_HOSTING_PRODUCT_ID = 'monthly_hosting_code';
const MP_HOSTING_DURATION_DAYS = 30;
const MP_HOSTING_PRICE = Number(process.env.MP_HOSTING_PRICE || 0.50);
const MP_HOSTING_CURRENCY = 'BRL';

function mercadoPagoConfigurado() {
  return Boolean(
    MP_ACCESS_TOKEN &&
    MP_PUBLIC_KEY &&
    MP_WEBHOOK_SECRET &&
    PUBLIC_URL &&
    Number.isFinite(MP_HOSTING_PRICE) &&
    MP_HOSTING_PRICE > 0
  );
}


// ---------------------------------------------------------------------------
// AFILIADOS
//
// No Render, cadastre por exemplo:
// AFILIADO_JOAO=joao@gmail.com|JOAO123|20|10
// Formato: email|codigo|comissaoPercentual|descontoPercentual
// ---------------------------------------------------------------------------
function normalizarEmailAfiliado(valor) {
  return String(valor || '').trim().toLowerCase();
}

function normalizarCodigoAfiliado(valor) {
  return String(valor || '').trim().toUpperCase().replace(/\s+/g, '');
}

function arredondarMoeda(valor) {
  return Math.round((Number(valor || 0) + Number.EPSILON) * 100) / 100;
}

function nomeAfiliadoDaChave(chave) {
  const bruto = String(chave || '')
    .replace(/^AFILIADO_/i, '')
    .replace(/_+/g, ' ')
    .trim();

  if (!bruto) return 'Afiliado';
  return bruto
    .toLowerCase()
    .replace(/(^|\s)\p{L}/gu, (letra) => letra.toUpperCase());
}

function carregarAfiliadosDoAmbiente() {
  const lista = [];
  const codigos = new Set();
  const emails = new Set();

  for (const [chave, valorBruto] of Object.entries(process.env)) {
    if (!/^AFILIADO_/i.test(chave)) continue;

    const partes = String(valorBruto || '').split('|').map((v) => v.trim());
    if (partes.length < 4) {
      console.warn(`[Afiliados] ${chave} ignorado. Use email|codigo|comissao|desconto.`);
      continue;
    }

    const email = normalizarEmailAfiliado(partes[0]);
    const codigo = normalizarCodigoAfiliado(partes[1]);
    const comissaoPercentual = Number(String(partes[2]).replace(',', '.'));
    const descontoPercentual = Number(String(partes[3]).replace(',', '.'));

    const valido =
      /^\S+@\S+\.\S+$/.test(email) &&
      /^[A-Z0-9_-]{3,40}$/.test(codigo) &&
      Number.isFinite(comissaoPercentual) && comissaoPercentual >= 0 && comissaoPercentual <= 100 &&
      Number.isFinite(descontoPercentual) && descontoPercentual >= 0 && descontoPercentual < 100;

    if (!valido) {
      console.warn(`[Afiliados] ${chave} ignorado por configuração inválida.`);
      continue;
    }

    if (codigos.has(codigo) || emails.has(email)) {
      console.warn(`[Afiliados] ${chave} ignorado por código ou e-mail duplicado.`);
      continue;
    }

    codigos.add(codigo);
    emails.add(email);
    lista.push({
      chave,
      nome: nomeAfiliadoDaChave(chave),
      email,
      codigo,
      comissaoPercentual,
      descontoPercentual
    });
  }

  return lista;
}

const AFILIADOS_CONFIG = carregarAfiliadosDoAmbiente();
console.log(`[Afiliados] ${AFILIADOS_CONFIG.length} afiliado(s) carregado(s) do Render.`);

function obterAfiliadoConfigPorEmail(email) {
  const alvo = normalizarEmailAfiliado(email);
  return AFILIADOS_CONFIG.find((a) => a.email === alvo) || null;
}

function obterAfiliadoConfigPorCodigo(codigo) {
  const alvo = normalizarCodigoAfiliado(codigo);
  return AFILIADOS_CONFIG.find((a) => a.codigo === alvo) || null;
}

async function resolverAfiliadoPorCodigo(codigo, emailComprador = '') {
  const config = obterAfiliadoConfigPorCodigo(codigo);
  if (!config) {
    const erro = new Error('Código de afiliado inválido.');
    erro.status = 400;
    erro.codigo = 'codigo_afiliado_invalido';
    throw erro;
  }

  if (normalizarEmailAfiliado(emailComprador) === config.email) {
    const erro = new Error('Você não pode usar o próprio código de afiliado.');
    erro.status = 400;
    erro.codigo = 'auto_indicacao';
    throw erro;
  }

  let contaAfiliado;
  try {
    contaAfiliado = await admin.auth().getUserByEmail(config.email);
  } catch (erroFirebase) {
    const erro = new Error('A conta deste afiliado ainda não está disponível no sistema.');
    erro.status = 409;
    erro.codigo = 'afiliado_sem_conta';
    throw erro;
  }

  const valorOriginal = arredondarMoeda(MP_HOSTING_PRICE);
  const valorDesconto = arredondarMoeda(valorOriginal * (config.descontoPercentual / 100));
  const valorFinal = arredondarMoeda(Math.max(0.01, valorOriginal - valorDesconto));
  const valorComissao = arredondarMoeda(valorFinal * (config.comissaoPercentual / 100));

  return {
    uid: contaAfiliado.uid,
    nome: contaAfiliado.displayName || config.nome,
    codigo: config.codigo,
    comissaoPercentual: config.comissaoPercentual,
    descontoPercentual: config.descontoPercentual,
    valorOriginal,
    valorDesconto,
    valorFinal,
    valorComissao
  };
}

async function registrarVendaAfiliadoAprovada(pedidoId, pedido, paymentId) {
  const afiliado = pedido?.afiliado;
  if (!afiliado || !afiliado.uid || !afiliado.codigo) return false;

  const vendaRef = db.ref(`Afiliados/${afiliado.uid}/Vendas/${pedidoId}`);
  const agora = Date.now();

  const transacao = await vendaRef.transaction((atual) => {
    if (atual && typeof atual === 'object' && atual.pagamentoId) {
      return; // já creditada; evita comissão duplicada em webhook repetido
    }

    return {
      pedidoId,
      pagamentoId: String(paymentId || ''),
      codigo: String(afiliado.codigo),
      nomeAfiliado: String(afiliado.nome || 'Afiliado'),
      compradorUid: String(pedido.uid || ''),
      valorOriginal: arredondarMoeda(pedido.valorOriginal ?? MP_HOSTING_PRICE),
      descontoPercentual: Number(afiliado.descontoPercentual || 0),
      valorDesconto: arredondarMoeda(pedido.valorDesconto || 0),
      valorPago: arredondarMoeda(pedido.valorEsperado || 0),
      comissaoPercentual: Number(afiliado.comissaoPercentual || 0),
      valorComissao: arredondarMoeda(afiliado.valorComissao || 0),
      statusPagamento: 'approved',
      statusComissao: 'disponivel',
      aprovadoEmUnixMs: agora,
      aprovadoEmUtc: new Date(agora).toISOString()
    };
  }, undefined, false);

  if (!transacao.committed) return false;

  await db.ref(`Afiliados/${afiliado.uid}/Perfil`).update({
    nome: String(afiliado.nome || 'Afiliado'),
    codigo: String(afiliado.codigo),
    comissaoPercentual: Number(afiliado.comissaoPercentual || 0),
    descontoPercentual: Number(afiliado.descontoPercentual || 0),
    ativo: true,
    atualizadoEmUnixMs: agora
  });

  console.log(`[Afiliados] comissão de R$ ${Number(afiliado.valorComissao || 0).toFixed(2)} registrada para ${afiliado.codigo}.`);
  return true;
}

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

// ---------------------------------------------------------------------------
// API DE AFILIADOS
// ---------------------------------------------------------------------------
app.post('/api/afiliados/validar-codigo', autenticar, async (req, res) => {
  const codigo = normalizarCodigoAfiliado(req.body?.codigo);

  if (!codigo) {
    return res.json({
      ok: true,
      valido: false,
      mensagem: 'Digite um código de afiliado.'
    });
  }

  try {
    const afiliado = await resolverAfiliadoPorCodigo(codigo, req.usuario.email || '');
    return res.json({
      ok: true,
      valido: true,
      codigo: afiliado.codigo,
      nome: afiliado.nome,
      descontoPercentual: afiliado.descontoPercentual,
      valorOriginal: afiliado.valorOriginal,
      valorDesconto: afiliado.valorDesconto,
      valorFinal: afiliado.valorFinal,
      moeda: MP_HOSTING_CURRENCY
    });
  } catch (erro) {
    return res.status(Number(erro?.status) || 400).json({
      ok: false,
      valido: false,
      codigo: erro?.codigo || 'codigo_afiliado_invalido',
      mensagem: erro?.message || 'Código de afiliado inválido.'
    });
  }
});

app.get('/api/afiliado/me', autenticar, async (req, res) => {
  const config = obterAfiliadoConfigPorEmail(req.usuario.email || '');
  if (!config) {
    return res.json({ ok: true, afiliado: false });
  }

  try {
    const uid = req.usuario.uid;
    const agora = Date.now();

    await db.ref(`Afiliados/${uid}/Perfil`).update({
      nome: req.usuario.name || config.nome,
      email: config.email,
      codigo: config.codigo,
      comissaoPercentual: config.comissaoPercentual,
      descontoPercentual: config.descontoPercentual,
      ativo: true,
      atualizadoEmUnixMs: agora
    });

    const [vendasSnap, saquesSnap] = await Promise.all([
      db.ref(`Afiliados/${uid}/Vendas`).once('value'),
      db.ref(`Afiliados/${uid}/Saques`).once('value')
    ]);

    const vendasBrutas = vendasSnap.val() || {};
    const saquesBrutos = saquesSnap.val() || {};

    const vendas = Object.entries(vendasBrutas)
      .map(([id, venda]) => ({ id, ...(venda || {}) }))
      .filter((venda) => venda.statusPagamento === 'approved')
      .sort((a, b) => Number(b.aprovadoEmUnixMs || 0) - Number(a.aprovadoEmUnixMs || 0));

    const totalVendas = vendas.length;
    const valorVendido = arredondarMoeda(vendas.reduce((soma, v) => soma + Number(v.valorPago || 0), 0));
    const comissaoTotal = arredondarMoeda(vendas.reduce((soma, v) => soma + Number(v.valorComissao || 0), 0));
    const saldoPendente = arredondarMoeda(vendas
      .filter((v) => v.statusComissao === 'pendente')
      .reduce((soma, v) => soma + Number(v.valorComissao || 0), 0));
    const comissaoDisponivel = arredondarMoeda(vendas
      .filter((v) => v.statusComissao !== 'pendente' && v.statusComissao !== 'cancelada')
      .reduce((soma, v) => soma + Number(v.valorComissao || 0), 0));

    const saques = Object.values(saquesBrutos).filter((v) => v && typeof v === 'object');
    const totalSacado = arredondarMoeda(saques
      .filter((s) => s.status === 'pago')
      .reduce((soma, saque) => soma + Number(saque.valor || 0), 0));
    const saldoReservado = arredondarMoeda(saques
      .filter((s) => s.status === 'processando' || s.status === 'pago')
      .reduce((soma, saque) => soma + Number(saque.valor || 0), 0));
    const saldoDisponivel = arredondarMoeda(Math.max(0, comissaoDisponivel - saldoReservado));

    return res.json({
      ok: true,
      afiliado: true,
      perfil: {
        nome: req.usuario.name || config.nome,
        codigo: config.codigo,
        comissaoPercentual: config.comissaoPercentual,
        descontoPercentual: config.descontoPercentual
      },
      carteira: {
        saldoDisponivel,
        saldoPendente,
        totalSacado,
        comissaoTotal
      },
      estatisticas: {
        totalVendas,
        valorVendido
      },
      vendasRecentes: vendas.slice(0, 20).map((venda) => ({
        id: venda.id,
        pagamentoId: String(venda.pagamentoId || ''),
        valorPago: arredondarMoeda(venda.valorPago || 0),
        valorComissao: arredondarMoeda(venda.valorComissao || 0),
        descontoPercentual: Number(venda.descontoPercentual || 0),
        aprovadoEmUnixMs: Number(venda.aprovadoEmUnixMs || 0),
        statusComissao: String(venda.statusComissao || 'disponivel')
      }))
    });
  } catch (erro) {
    console.error('[Afiliados] erro ao carregar painel:', erro);
    return res.status(500).json({
      ok: false,
      mensagem: 'Não foi possível carregar o painel do afiliado.'
    });
  }
});

async function mercadoPagoFetch(caminho, opcoes = {}) {
  if (!MP_ACCESS_TOKEN) {
    const erro = new Error('MP_ACCESS_TOKEN não configurado no Render.');
    erro.status = 503;
    throw erro;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);

  try {
    const headers = {
      'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
      'Accept': 'application/json',
      ...(opcoes.headers || {})
    };

    let body = opcoes.body;
    if (body !== undefined && body !== null && typeof body !== 'string') {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(body);
    }

    const resposta = await fetch(`https://api.mercadopago.com${caminho}`, {
      method: opcoes.method || 'GET',
      headers,
      body,
      signal: controller.signal
    });

    const texto = await resposta.text();
    let dados = null;
    if (texto) {
      try { dados = JSON.parse(texto); }
      catch (_) { dados = { mensagem: texto }; }
    }

    if (!resposta.ok) {
      const erro = new Error(
        dados?.message ||
        dados?.error ||
        dados?.mensagem ||
        `Mercado Pago respondeu HTTP ${resposta.status}.`
      );
      erro.status = resposta.status;
      erro.dados = dados;
      throw erro;
    }

    return dados || {};
  } catch (erro) {
    if (erro?.name === 'AbortError') {
      const e = new Error('O Mercado Pago demorou demais para responder.');
      e.status = 504;
      throw e;
    }
    throw erro;
  } finally {
    clearTimeout(timer);
  }
}

function validarAssinaturaWebhookMercadoPago(req, dataId) {
  if (!MP_WEBHOOK_SECRET) return false;

  const assinatura = String(req.headers['x-signature'] || '').trim();
  const requestId = String(req.headers['x-request-id'] || '').trim();
  const id = String(dataId || '').trim().toLowerCase();

  if (!assinatura || !requestId || !id) return false;

  const partes = {};
  for (const parte of assinatura.split(',')) {
    const indice = parte.indexOf('=');
    if (indice <= 0) continue;
    partes[parte.slice(0, indice).trim()] = parte.slice(indice + 1).trim();
  }

  const ts = String(partes.ts || '').trim();
  const v1 = String(partes.v1 || '').trim().toLowerCase();
  if (!ts || !v1) return false;

  const manifest = `id:${id};request-id:${requestId};ts:${ts};`;
  const esperado = crypto
    .createHmac('sha256', MP_WEBHOOK_SECRET)
    .update(manifest, 'utf8')
    .digest('hex');

  const esperadoBuffer = Buffer.from(esperado, 'utf8');
  const recebidoBuffer = Buffer.from(v1, 'utf8');
  return esperadoBuffer.length === recebidoBuffer.length &&
    crypto.timingSafeEqual(esperadoBuffer, recebidoBuffer);
}

async function ativarCodigoHospedagemMercadoPago(uid, paymentId) {
  const caminho = `LOGINS_REGISTRADOS/USUARIOS/${uid}/Dados/Compras/Temporarios/Codigo_Hospedagem_Mensal`;
  const compraRef = db.ref(caminho);
  const agora = Date.now();
  const duracaoMs = MP_HOSTING_DURATION_DAYS * 24 * 60 * 60 * 1000;

  const resultado = await compraRef.transaction((atual) => {
    const anterior = atual && typeof atual === 'object' ? atual : {};

    // Webhook repetido do MESMO pagamento não concede dias novamente.
    if (String(anterior.ultimoPagamentoMercadoPago || '') === String(paymentId)) {
      return anterior;
    }

    // Se, por algum motivo, dois pagamentos diferentes forem aprovados,
    // o segundo soma mais 30 dias em vez de apagar a validade já paga.
    const expiracaoAnterior = Number(anterior.dataExpiracaoUnixMs || 0);
    const baseExpiracao = Math.max(agora, expiracaoAnterior);
    const expiracao = baseExpiracao + duracaoMs;

    return {
      nomeCompra: 'Código de Hospedagem Mensal',
      duracaoDias: MP_HOSTING_DURATION_DAYS,
      ativa: true,
      dataCompraUnixMs: agora,
      dataExpiracaoUnixMs: expiracao,
      dataCompraUtc: new Date(agora).toISOString(),
      dataExpiracaoUtc: new Date(expiracao).toISOString(),
      origem: 'mercadopago_site',
      productId: MP_HOSTING_PRODUCT_ID,
      ultimoPagamentoMercadoPago: String(paymentId)
    };
  }, undefined, false);

  if (!resultado.committed) {
    throw new Error('Não foi possível ativar o Código de Hospedagem Mensal.');
  }

  return resultado.snapshot.val();
}

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

// ---------------------------------------------------------------------------
// MERCADO PAGO - COMPRA DIRETA NO SITE
// ---------------------------------------------------------------------------
app.post('/api/mercadopago/criar-checkout', autenticar, async (req, res) => {
  if (!mercadoPagoConfigurado()) {
    return res.status(503).json({
      ok: false,
      mensagem: 'Mercado Pago ainda não foi configurado completamente no servidor.'
    });
  }

  // A opção é exibida somente para visitantes identificados como Brasil pelo
  // navegador. O backend também exige o marcador BR enviado pelo próprio site.
  if (String(req.body?.pais || '').trim().toUpperCase() !== 'BR') {
    return res.status(403).json({
      ok: false,
      mensagem: 'Esta opção de pagamento está disponível apenas para o Brasil.'
    });
  }

  const uid = req.usuario.uid;
  let pedidoRef = null;

  try {
    let afiliadoCompra = null;
    if (codigoAfiliadoInformado) {
      afiliadoCompra = await resolverAfiliadoPorCodigo(
        codigoAfiliadoInformado,
        req.usuario.email || ''
      );
    }

    const valorOriginal = arredondarMoeda(MP_HOSTING_PRICE);
    const valorEsperado = afiliadoCompra
      ? afiliadoCompra.valorFinal
      : valorOriginal;
    const valorDesconto = afiliadoCompra
      ? afiliadoCompra.valorDesconto
      : 0;

    const [statusCodigo, vinculosSnap] = await Promise.all([
      obterStatusCodigoHospedagem(uid),
      db.ref(`contas/${uid}/Hospedagens`).once('value')
    ]);

    if (statusCodigo.ativa) {
      return res.status(409).json({
        ok: false,
        codigo: 'codigo_ja_ativo',
        mensagem: 'Seu Código de Hospedagem Mensal já está ativo.'
      });
    }

    const ids = obterIdsHospedagensVinculadas(vinculosSnap.val() || {});
    if (ids.length >= 1) {
      return res.status(409).json({
        ok: false,
        codigo: 'limite_hospedagem_atingido',
        mensagem: 'Sua conta já possui uma hospedagem.'
      });
    }

    pedidoRef = db.ref('Pagamentos/MercadoPago/Hospedagem').push();
    const pedidoId = pedidoRef.key;
    if (!pedidoId) throw new Error('Não foi possível gerar o pedido.');

    const agora = Date.now();
    await pedidoRef.set({
      uid,
      produto: MP_HOSTING_PRODUCT_ID,
      valorEsperado: MP_HOSTING_PRICE,
      moeda: MP_HOSTING_CURRENCY,
      status: 'criando_checkout',
      criadoEmUnixMs: agora,
      criadoEmUtc: new Date(agora).toISOString()
    });

    const corpoPreferencia = {
      items: [
        {
          id: MP_HOSTING_PRODUCT_ID,
          title: 'Código de Hospedagem Mensal - Day Zombi Survival',
          description: 'Libera a criação de 1 servidor hospedado por 30 dias.',
          quantity: 1,
          currency_id: MP_HOSTING_CURRENCY,
          unit_price: MP_HOSTING_PRICE
        }
      ],
      external_reference: pedidoId,
      metadata: {
        produto: MP_HOSTING_PRODUCT_ID
      },
      back_urls: {
        success: `${PUBLIC_URL}/?pagamento=sucesso`,
        failure: `${PUBLIC_URL}/?pagamento=falhou`,
        pending: `${PUBLIC_URL}/?pagamento=pendente`
      },
      auto_return: 'approved',
      notification_url: `${PUBLIC_URL}/api/mercadopago/webhook`,
      statement_descriptor: 'DAYZOMBI'
    };

    if (req.usuario.email) {
      corpoPreferencia.payer = { email: String(req.usuario.email) };
    }

    const preferencia = await mercadoPagoFetch('/checkout/preferences', {
      method: 'POST',
      body: corpoPreferencia
    });

    const checkoutUrl = String(preferencia?.init_point || '').trim();
    if (!checkoutUrl || !/^https:\/\//i.test(checkoutUrl)) {
      throw new Error('O Mercado Pago não retornou a URL de pagamento.');
    }

    await pedidoRef.update({
      status: 'aguardando_pagamento',
      preferenceId: String(preferencia.id || ''),
      checkoutUrl
    });

    return res.json({
      ok: true,
      checkoutUrl,
      valor: MP_HOSTING_PRICE,
      moeda: MP_HOSTING_CURRENCY
    });
  } catch (erro) {
    console.error('[Mercado Pago] erro ao criar checkout:', erro?.dados || erro);
    if (pedidoRef) {
      try {
        await pedidoRef.update({
          status: 'erro_checkout',
          erro: String(erro?.message || 'Erro ao criar checkout').slice(0, 500),
          atualizadoEmUnixMs: Date.now()
        });
      } catch (_) {}
    }

    return res.status(Number(erro?.status) || 502).json({
      ok: false,
      mensagem: 'Não foi possível iniciar o pagamento pelo Mercado Pago.'
    });
  }
});


// Checkout transparente usado pelo painel do próprio site (Pix / Cartão).
// O navegador envia apenas o token do cartão gerado pelo MercadoPago.js.
app.post('/api/mercadopago/processar-pagamento', autenticar, async (req, res) => {
  if (!mercadoPagoConfigurado()) {
    return res.status(503).json({
      ok: false,
      mensagem: 'Mercado Pago ainda não foi configurado completamente no servidor.'
    });
  }

  if (String(req.body?.pais || '').trim().toUpperCase() !== 'BR') {
    return res.status(403).json({
      ok: false,
      mensagem: 'Esta opção de pagamento está disponível apenas para o Brasil.'
    });
  }

  const uid = req.usuario.uid;
  const formData = req.body?.formData && typeof req.body.formData === 'object'
    ? req.body.formData
    : {};
  const codigoAfiliadoInformado = normalizarCodigoAfiliado(req.body?.codigoAfiliado);

  const paymentMethodId = String(formData.payment_method_id || '').trim();
  const ehPix = paymentMethodId === 'pix';
  const email = String(formData?.payer?.email || req.usuario.email || '').trim().slice(0, 254);

  if (!paymentMethodId) {
    return res.status(400).json({ ok: false, mensagem: 'Selecione uma forma de pagamento.' });
  }

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ ok: false, mensagem: 'Informe um e-mail válido para o pagamento.' });
  }

  if (!ehPix && !String(formData.token || '').trim()) {
    return res.status(400).json({ ok: false, mensagem: 'O token do cartão não foi gerado.' });
  }

  let pedidoRef = null;

  try {
    const [statusCodigo, vinculosSnap] = await Promise.all([
      obterStatusCodigoHospedagem(uid),
      db.ref(`contas/${uid}/Hospedagens`).once('value')
    ]);

    if (statusCodigo.ativa) {
      return res.status(409).json({
        ok: false,
        codigo: 'codigo_ja_ativo',
        mensagem: 'Seu Código de Hospedagem Mensal já está ativo.'
      });
    }

    const ids = obterIdsHospedagensVinculadas(vinculosSnap.val() || {});
    if (ids.length >= 1) {
      return res.status(409).json({
        ok: false,
        codigo: 'limite_hospedagem_atingido',
        mensagem: 'Sua conta já possui uma hospedagem.'
      });
    }

    pedidoRef = db.ref('Pagamentos/MercadoPago/Hospedagem').push();
    const pedidoId = pedidoRef.key;
    if (!pedidoId) throw new Error('Não foi possível gerar o pedido.');

    const agora = Date.now();
    await pedidoRef.set({
      uid,
      produto: MP_HOSTING_PRODUCT_ID,
      valorOriginal,
      valorDesconto,
      valorEsperado,
      moeda: MP_HOSTING_CURRENCY,
      metodo: paymentMethodId,
      afiliado: afiliadoCompra ? {
        uid: afiliadoCompra.uid,
        nome: afiliadoCompra.nome,
        codigo: afiliadoCompra.codigo,
        comissaoPercentual: afiliadoCompra.comissaoPercentual,
        descontoPercentual: afiliadoCompra.descontoPercentual,
        valorComissao: afiliadoCompra.valorComissao
      } : null,
      status: 'criando_pagamento',
      criadoEmUnixMs: agora,
      criadoEmUtc: new Date(agora).toISOString()
    });

    const corpoPagamento = {
      transaction_amount: valorEsperado,
      description: 'Código de Hospedagem Mensal - Day Zombi Survival',
      payment_method_id: paymentMethodId,
      payer: { email },
      external_reference: pedidoId,
      notification_url: `${PUBLIC_URL}/api/mercadopago/webhook`,
      metadata: {
        produto: MP_HOSTING_PRODUCT_ID,
        codigo_afiliado: afiliadoCompra?.codigo || ''
      }
    };

    const identificacaoTipo = String(formData?.payer?.identification?.type || '').trim();
    const identificacaoNumero = String(formData?.payer?.identification?.number || '').trim();
    if (identificacaoTipo && identificacaoNumero) {
      corpoPagamento.payer.identification = {
        type: identificacaoTipo.slice(0, 20),
        number: identificacaoNumero.slice(0, 40)
      };
    }

    if (!ehPix) {
      corpoPagamento.token = String(formData.token || '').trim();
      corpoPagamento.installments = Math.max(1, Math.min(24, Number(formData.installments || 1)));

      const issuerId = String(formData.issuer_id || '').trim();
      if (issuerId) corpoPagamento.issuer_id = issuerId;
    }

    const pagamento = await mercadoPagoFetch('/v1/payments', {
      method: 'POST',
      headers: {
        'X-Idempotency-Key': `dz-hosting-${pedidoId}`
      },
      body: corpoPagamento
    });

    const paymentId = String(pagamento?.id || '').trim();
    const status = String(pagamento?.status || '').trim().toLowerCase();

    await pedidoRef.update({
      paymentId,
      statusMercadoPago: status || 'desconhecido',
      status: status === 'approved' ? 'aprovado' : 'aguardando_pagamento',
      atualizadoEmUnixMs: Date.now()
    });

    let codigoAtivado = false;
    if (status === 'approved') {
      await ativarCodigoHospedagemMercadoPago(uid, paymentId || pedidoId);
      const pedidoAprovadoSnap = await pedidoRef.once('value');
      const pedidoAprovado = pedidoAprovadoSnap.val() || {};
      await registrarVendaAfiliadoAprovada(
        pedidoId,
        pedidoAprovado,
        paymentId || pedidoId
      );
      codigoAtivado = true;
      await pedidoRef.update({
        status: 'aprovado_codigo_ativado',
        processadoEmUnixMs: Date.now(),
        processadoEmUtc: new Date().toISOString()
      });
    }

    if (ehPix) {
      const transacao = pagamento?.point_of_interaction?.transaction_data || {};
      const qrCode = String(transacao?.qr_code || '');
      const qrCodeBase64 = String(transacao?.qr_code_base64 || '');

      if (!qrCode) {
        console.error('[Mercado Pago] Pix criado sem qr_code:', pagamento);
        return res.status(502).json({
          ok: false,
          mensagem: 'O Mercado Pago criou o pagamento, mas não retornou o código Pix.'
        });
      }

      return res.json({
        ok: true,
        metodo: 'pix',
        paymentId,
        status,
        codigoAtivado,
        valorCobrado: valorEsperado,
        codigoAfiliado: afiliadoCompra?.codigo || '',
        pix: {
          qrCode,
          qrCodeBase64
        }
      });
    }

    return res.json({
      ok: true,
      metodo: 'card',
      paymentId,
      status,
      statusDetail: String(pagamento?.status_detail || ''),
      codigoAtivado,
      valorCobrado: valorEsperado,
      codigoAfiliado: afiliadoCompra?.codigo || ''
    });
  } catch (erro) {
    console.error('[Mercado Pago] erro ao processar pagamento:', erro?.dados || erro);

    if (pedidoRef) {
      try {
        await pedidoRef.update({
          status: 'erro_pagamento',
          erro: String(erro?.message || 'Erro ao processar pagamento').slice(0, 500),
          atualizadoEmUnixMs: Date.now()
        });
      } catch (_) {}
    }

    const detalhe = erro?.dados && typeof erro.dados === 'object'
      ? (erro.dados.message || erro.dados.error || erro.dados.cause?.[0]?.description || '')
      : '';

    const erroAfiliado = String(erro?.codigo || '').startsWith('codigo_afiliado') ||
      erro?.codigo === 'auto_indicacao' ||
      erro?.codigo === 'afiliado_sem_conta';

    return res.status(Number(erro?.status) || 502).json({
      ok: false,
      codigo: erro?.codigo || '',
      mensagem: erroAfiliado
        ? String(erro?.message || 'Código de afiliado inválido.')
        : detalhe
          ? `Mercado Pago: ${String(detalhe).slice(0, 300)}`
          : 'Não foi possível processar o pagamento pelo Mercado Pago.'
    });
  }
});

app.get('/api/mercadopago/status-codigo', autenticar, async (req, res) => {
  try {
    const status = await obterStatusCodigoHospedagem(req.usuario.uid);
    return res.json({
      ok: true,
      ativa: status.ativa === true,
      dataExpiracaoUnixMs: Number(status.dataExpiracaoUnixMs || 0),
      motivo: status.motivo || ''
    });
  } catch (erro) {
    console.error('[Mercado Pago] erro ao consultar status do código:', erro);
    return res.status(500).json({
      ok: false,
      mensagem: 'Não foi possível verificar a ativação da hospedagem.'
    });
  }
});

app.post('/api/mercadopago/webhook', async (req, res) => {
  const dataId =
    req.query?.['data.id'] ||
    req.body?.data?.id ||
    req.query?.id ||
    '';

  if (!validarAssinaturaWebhookMercadoPago(req, dataId)) {
    console.warn('[Mercado Pago] Webhook recusado: assinatura inválida.');
    return res.status(401).json({ ok: false });
  }

  // Confirma rapidamente eventos que não são de pagamento.
  const tipo = String(req.body?.type || req.query?.type || req.query?.topic || '').toLowerCase();
  if (tipo && tipo !== 'payment') {
    return res.status(200).json({ ok: true });
  }

  try {
    const paymentId = String(dataId).trim();
    const pagamento = await mercadoPagoFetch(`/v1/payments/${encodeURIComponent(paymentId)}`);
    const pedidoId = String(pagamento?.external_reference || '').trim();

    if (!pedidoId) {
      console.warn('[Mercado Pago] Pagamento sem external_reference:', paymentId);
      return res.status(200).json({ ok: true });
    }

    const pedidoRef = db.ref(`Pagamentos/MercadoPago/Hospedagem/${pedidoId}`);
    const pedidoSnap = await pedidoRef.once('value');
    const pedido = pedidoSnap.val();

    if (!pedido || pedido.produto !== MP_HOSTING_PRODUCT_ID || !pedido.uid) {
      console.warn('[Mercado Pago] Pedido desconhecido:', pedidoId);
      return res.status(200).json({ ok: true });
    }

    const statusPagamento = String(pagamento?.status || '').toLowerCase();
    const moeda = String(pagamento?.currency_id || '').toUpperCase();
    const valor = Number(pagamento?.transaction_amount || 0);
    const valorEsperado = Number(pedido.valorEsperado || 0);

    await pedidoRef.update({
      paymentId,
      statusMercadoPago: statusPagamento || 'desconhecido',
      atualizadoEmUnixMs: Date.now()
    });

    if (statusPagamento !== 'approved') {
      return res.status(200).json({ ok: true });
    }

    if (moeda !== String(pedido.moeda || MP_HOSTING_CURRENCY).toUpperCase()) {
      console.error('[Mercado Pago] Moeda divergente no pagamento:', paymentId);
      return res.status(200).json({ ok: true });
    }

    if (!Number.isFinite(valor) || Math.abs(valor - valorEsperado) > 0.001) {
      console.error('[Mercado Pago] Valor divergente no pagamento:', paymentId, valor, valorEsperado);
      return res.status(200).json({ ok: true });
    }

    await ativarCodigoHospedagemMercadoPago(String(pedido.uid), paymentId);
    await registrarVendaAfiliadoAprovada(pedidoId, pedido, paymentId);

    await pedidoRef.update({
      status: 'aprovado_codigo_ativado',
      processadoEmUnixMs: Date.now(),
      processadoEmUtc: new Date().toISOString()
    });

    console.log(`[Mercado Pago] pagamento ${paymentId} aprovado e código ativado para UID ${pedido.uid}.`);
    return res.status(200).json({ ok: true });
  } catch (erro) {
    console.error('[Mercado Pago] erro no webhook:', erro?.dados || erro);
    // 500 faz o Mercado Pago tentar a notificação novamente.
    return res.status(500).json({ ok: false });
  }
});

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
      podeHospedar: statusCodigo.ativa && !limiteAtingido,
      mercadoPago: {
        disponivel: mercadoPagoConfigurado(),
        valor: MP_HOSTING_PRICE,
        moeda: MP_HOSTING_CURRENCY,
        publicKey: MP_PUBLIC_KEY
      }
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
  console.log(`Mercado Pago: ${mercadoPagoConfigurado() ? 'configurado' : 'não configurado'}`);
  console.log(`Mercado Pago Public Key: ${MP_PUBLIC_KEY ? 'carregada' : 'ausente'}`);
});
