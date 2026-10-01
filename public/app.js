import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

const respostaFirebaseConfig = await fetch("/api/firebase-config", { cache: "no-store" });
if (!respostaFirebaseConfig.ok) {
  throw new Error("Firebase Web não configurado no servidor.");
}
const firebaseConfig = await respostaFirebaseConfig.json();

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provedorGoogle = new GoogleAuthProvider();
provedorGoogle.setCustomParameters({ prompt: "select_account" });

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const el = {
  telaLogin: $("#telaLogin"),
  dashboard: $("#dashboard"),
  areaUsuario: $("#areaUsuario"),
  botaoLoginGoogle: $("#botaoLoginGoogle"),
  botaoSair: $("#botaoSair"),
  botaoLogo: $("#botaoLogo"),
  mensagemLogin: $("#mensagemLogin"),
  nomeUsuario: $("#nomeUsuario"),
  emailUsuario: $("#emailUsuario"),
  fotoUsuario: $("#fotoUsuario"),
  botaoPainelAfiliado: $("#botaoPainelAfiliado"),

  paginaServidores: $("#paginaServidores"),
  paginaAfiliado: $("#paginaAfiliado"),
  voltarDoAfiliado: $("#voltarDoAfiliado"),
  mensagemAfiliado: $("#mensagemAfiliado"),
  codigoPainelAfiliado: $("#codigoPainelAfiliado"),
  comissaoPainelAfiliado: $("#comissaoPainelAfiliado"),
  descontoPainelAfiliado: $("#descontoPainelAfiliado"),
  vendasPainelAfiliado: $("#vendasPainelAfiliado"),
  valorVendidoPainelAfiliado: $("#valorVendidoPainelAfiliado"),
  saldoDisponivelPainelAfiliado: $("#saldoDisponivelPainelAfiliado"),
  saldoPendentePainelAfiliado: $("#saldoPendentePainelAfiliado"),
  comissaoTotalPainelAfiliado: $("#comissaoTotalPainelAfiliado"),
  totalSacadoPainelAfiliado: $("#totalSacadoPainelAfiliado"),
  listaVendasAfiliado: $("#listaVendasAfiliado"),
  statusPixAfiliado: $("#statusPixAfiliado"),
  saldoSaqueAfiliado: $("#saldoSaqueAfiliado"),
  saqueMinimoAfiliado: $("#saqueMinimoAfiliado"),
  tipoPixAfiliado: $("#tipoPixAfiliado"),
  chavePixAfiliado: $("#chavePixAfiliado"),
  botaoSalvarPixAfiliado: $("#botaoSalvarPixAfiliado"),
  valorSaqueAfiliado: $("#valorSaqueAfiliado"),
  botaoSacarAfiliado: $("#botaoSacarAfiliado"),
  mensagemSaqueAfiliado: $("#mensagemSaqueAfiliado"),
  listaSaquesAfiliado: $("#listaSaquesAfiliado"),
  paginaHospedar: $("#paginaHospedar"),
  paginaConfigServidor: $("#paginaConfigServidor"),
  botaoAbrirHospedagem: $("#botaoAbrirHospedagem"),
  voltarDaHospedagem: $("#voltarDaHospedagem"),
  voltarDosDetalhes: $("#voltarDosDetalhes"),
  listaServidores: $("#listaServidores"),
  contadorHospedagens: $("#contadorHospedagens"),
  contaResumo: $("#contaResumo"),
  mensagemServidores: $("#mensagemServidores"),
  mercadoPagoHostingCard: $("#mercadoPagoHostingCard"),
  botaoComprarCodigoMercadoPago: $("#botaoComprarCodigoMercadoPago"),
  precoMercadoPago: $("#precoMercadoPago"),
  mensagemMercadoPago: $("#mensagemMercadoPago"),
  modalPagamentoMercadoPago: $("#modalPagamentoMercadoPago"),
  botaoFecharPagamentoMercadoPago: $("#botaoFecharPagamentoMercadoPago"),
  precoModalMercadoPago: $("#precoModalMercadoPago"),
  precoOriginalModalMercadoPago: $("#precoOriginalModalMercadoPago"),
  codigoAfiliadoMercadoPago: $("#codigoAfiliadoMercadoPago"),
  botaoAplicarCodigoAfiliado: $("#botaoAplicarCodigoAfiliado"),
  resumoCodigoAfiliado: $("#resumoCodigoAfiliado"),
  codigoAfiliadoAplicado: $("#codigoAfiliadoAplicado"),
  descontoAfiliadoAplicado: $("#descontoAfiliadoAplicado"),
  mensagemCodigoAfiliado: $("#mensagemCodigoAfiliado"),
  areaEscolhaPagamento: $("#areaEscolhaPagamento"),
  opcaoCartaoMercadoPago: $("#opcaoCartaoMercadoPago"),
  opcaoPixMercadoPago: $("#opcaoPixMercadoPago"),
  detalhesCartaoMercadoPago: $("#detalhesCartaoMercadoPago"),
  detalhesPixMercadoPago: $("#detalhesPixMercadoPago"),
  formCheckoutMercadoPago: $("#formCheckoutMercadoPago"),
  emailPixMercadoPago: $("#emailPixMercadoPago"),
  botaoPagarMercadoPago: $("#botaoPagarMercadoPago"),
  resultadoPixMercadoPago: $("#resultadoPixMercadoPago"),
  qrCodePixMercadoPago: $("#qrCodePixMercadoPago"),
  codigoPixMercadoPago: $("#codigoPixMercadoPago"),
  botaoCopiarPixMercadoPago: $("#botaoCopiarPixMercadoPago"),
  mensagemModalMercadoPago: $("#mensagemModalMercadoPago"),
  mensagemPixMercadoPago: $("#mensagemPixMercadoPago"),

  nomeHospedagem: $("#nomeHospedagem"),
  emailHospedagem: $("#emailHospedagem"),
  fotoHospedagem: $("#fotoHospedagem"),
  ownerFallback: $("#ownerFallback"),
  formServidor: $("#formServidor"),
  descricaoServidor: $("#descricaoServidor"),
  contadorDescricao: $("#contadorDescricao"),
  mensagemFormulario: $("#mensagemFormulario"),
  databaseUrl: $("#databaseUrl"),
  photonAppIdHospedagem: $("#photonAppId"),
  botaoOlhoDatabaseUrl: $("#botaoOlhoDatabaseUrl"),
  botaoOlhoPhotonHospedagem: $("#botaoOlhoPhotonHospedagem"),

  tituloServidorSelecionado: $("#tituloServidorSelecionado"),
  descricaoServidorSelecionado: $("#descricaoServidorSelecionado"),
  idServidorSelecionado: $("#idServidorSelecionado"),
  botaoStatusServidor: $("#botaoStatusServidor"),
  photonServidorSelecionado: $("#photonServidorSelecionado"),
  botaoOlhoPhoton: $("#botaoOlhoPhoton"),
  botaoEditarPhoton: $("#botaoEditarPhoton"),
  firebaseServidorSelecionado: $("#firebaseServidorSelecionado"),
  botaoOlhoFirebase: $("#botaoOlhoFirebase"),
  botaoEditarFirebase: $("#botaoEditarFirebase"),
  formConexaoServidor: $("#formConexaoServidor"),
  mensagemConexaoServidor: $("#mensagemConexaoServidor"),
  modalEditarConexao: $("#modalEditarConexao"),
  tituloModalEditarConexao: $("#tituloModalEditarConexao"),
  descricaoModalEditarConexao: $("#descricaoModalEditarConexao"),
  formEditarConexao: $("#formEditarConexao"),
  labelNovoValorConexao: $("#labelNovoValorConexao"),
  novoValorConexao: $("#novoValorConexao"),
  ajudaNovoValorConexao: $("#ajudaNovoValorConexao"),
  botaoOlhoNovoValor: $("#botaoOlhoNovoValor"),
  botaoFecharModalConexao: $("#botaoFecharModalConexao"),
  botaoCancelarEdicaoConexao: $("#botaoCancelarEdicaoConexao"),
  botaoSalvarEdicaoConexao: $("#botaoSalvarEdicaoConexao"),
  opcoesTransferenciaFirebase: $("#opcoesTransferenciaFirebase"),
  botaoMudarSemTransferir: $("#botaoMudarSemTransferir"),
  botaoMudarETransferir: $("#botaoMudarETransferir"),
  mensagemModalConexao: $("#mensagemModalConexao"),
  configInicial: $("#configInicial"),

  formConfiguracoes: $("#formConfiguracoes"),
  tipoVisao: $("#tipoVisao"),
  tempoSpawnItens: $("#tempoSpawnItens"),
  checkListMembros: $("#checkListMembros"),
  modoZumbis: $("#modoZumbis"),
  modoJogo: $("#modoJogo"),
  mensagemConfiguracoes: $("#mensagemConfiguracoes"),
  estadoConfiguracoes: $("#estadoConfiguracoes"),
  modoSenha: $("#modoSenha"),
  grupoSenhaConfiguracao: $("#grupoSenhaConfiguracao"),
  senhaServidor: $("#senhaServidor"),
  ajudaSenhaConfiguracao: $("#ajudaSenhaConfiguracao"),

  formEvento: $("#formEvento"),
  tempoHelicrash: $("#tempoHelicrash"),
  mensagemEvento: $("#mensagemEvento"),
  estadoHelicrash: $("#estadoHelicrash"),

  formAdmin: $("#formAdmin"),
  nomeAdmin: $("#nomeAdmin"),
  mensagemAdmin: $("#mensagemAdmin"),
  listaAdmins: $("#listaAdmins"),
  contadorAdmins: $("#contadorAdmins"),

  formChecklist: $("#formChecklist"),
  nomeChecklist: $("#nomeChecklist"),
  mensagemChecklist: $("#mensagemChecklist"),
  listaChecklist: $("#listaChecklist"),
  contadorChecklist: $("#contadorChecklist"),

  mensagemBloqueios: $("#mensagemBloqueios"),
  listaBloqueios: $("#listaBloqueios"),
  contadorBloqueios: $("#contadorBloqueios")
};

let usuarioAtual = null;
let minhasHospedagens = [];
let permissaoHospedagem = {
  codigoAtivo: false,
  podeHospedar: false,
  limiteAtingido: false,
  dataExpiracaoUnixMs: 0
};
let pagamentoMercadoPago = {
  disponivel: false,
  valor: 0.50,
  moeda: 'BRL',
  publicKey: ''
};
let afiliadoAtual = {
  ativo: false,
  dados: null
};
let codigoAfiliadoCompra = {
  aplicado: false,
  codigo: '',
  nome: '',
  descontoPercentual: 0,
  valorOriginal: 0.50,
  valorFinal: 0.50,
  valorDesconto: 0
};
let mercadoPagoSdk = null;
let cardFormMercadoPago = null;
let metodoPagamentoSelecionado = null;
let pagamentoEmProcessamento = false;
let monitorPagamentoTimer = null;

let servidorSelecionado = null;
let configAtual = null;
let campoConexaoEmEdicao = null;

let configServidor = { gerais: null, temSenha: false, helicrash: null, admins: [], checklist: [], bloqueios: [] };

el.botaoLoginGoogle.addEventListener("click", entrarComGoogle);
el.botaoSair.addEventListener("click", sairDaConta);
el.botaoLogo.addEventListener("click", () => usuarioAtual && mostrarMeusServidores());
el.botaoPainelAfiliado?.addEventListener("click", mostrarPainelAfiliado);
el.voltarDoAfiliado?.addEventListener("click", mostrarMeusServidores);
el.botaoSalvarPixAfiliado?.addEventListener("click", salvarChavePixAfiliado);
el.botaoSacarAfiliado?.addEventListener("click", solicitarSaqueAfiliado);
el.botaoAbrirHospedagem.addEventListener("click", mostrarHospedagem);
el.botaoComprarCodigoMercadoPago?.addEventListener("click", abrirPagamentoMercadoPago);
el.botaoAplicarCodigoAfiliado?.addEventListener("click", aplicarCodigoAfiliadoCheckout);
el.codigoAfiliadoMercadoPago?.addEventListener("keydown", (evento) => {
  if (evento.key === 'Enter') {
    evento.preventDefault();
    aplicarCodigoAfiliadoCheckout();
  }
});
el.botaoFecharPagamentoMercadoPago?.addEventListener("click", fecharPagamentoMercadoPago);
el.modalPagamentoMercadoPago?.querySelector("[data-fechar-pagamento]")?.addEventListener("click", fecharPagamentoMercadoPago);
el.opcaoCartaoMercadoPago?.addEventListener("click", () => selecionarMetodoMercadoPago("card"));
el.opcaoPixMercadoPago?.addEventListener("click", () => selecionarMetodoMercadoPago("pix"));
el.botaoPagarMercadoPago?.addEventListener("click", pagarMetodoSelecionadoMercadoPago);
el.botaoCopiarPixMercadoPago?.addEventListener("click", copiarCodigoPixMercadoPago);
el.voltarDaHospedagem.addEventListener("click", mostrarMeusServidores);
el.voltarDosDetalhes.addEventListener("click", mostrarMeusServidores);
el.botaoStatusServidor.addEventListener("click", alternarStatusServidor);
el.botaoOlhoPhoton?.addEventListener("click", alternarVisibilidadePhoton);
el.botaoOlhoFirebase?.addEventListener("click", alternarVisibilidadeFirebase);
el.botaoEditarPhoton?.addEventListener("click", () => abrirEditorConexao("photon"));
el.botaoEditarFirebase?.addEventListener("click", () => abrirEditorConexao("firebase"));
el.botaoFecharModalConexao?.addEventListener("click", fecharEditorConexao);
el.botaoCancelarEdicaoConexao?.addEventListener("click", fecharEditorConexao);
el.formEditarConexao?.addEventListener("submit", (evento) => salvarEdicaoConexao(evento, null));
el.novoValorConexao?.addEventListener("input", atualizarOpcoesTransferenciaFirebase);
el.botaoMudarSemTransferir?.addEventListener("click", () => salvarEdicaoConexao(null, false));
el.botaoMudarETransferir?.addEventListener("click", () => salvarEdicaoConexao(null, true));
el.botaoOlhoNovoValor?.addEventListener("click", alternarVisibilidadeNovoValor);
el.botaoOlhoDatabaseUrl?.addEventListener("click", alternarVisibilidadeDatabaseUrlHospedagem);
el.botaoOlhoPhotonHospedagem?.addEventListener("click", alternarVisibilidadePhotonHospedagem);
el.modalEditarConexao?.querySelector("[data-fechar-editor-conexao]")?.addEventListener("click", fecharEditorConexao);
el.formServidor.addEventListener("submit", criarHospedagem);
el.formConfiguracoes.addEventListener("submit", salvarConfiguracoesRemotas);
el.modoSenha.addEventListener("change", atualizarVisibilidadeSenhaConfiguracao);
el.formEvento.addEventListener("submit", salvarHelicrashRemoto);
el.formAdmin.addEventListener("submit", adicionarAdminRemoto);
el.formChecklist.addEventListener("submit", adicionarChecklistRemota);

el.descricaoServidor.addEventListener("input", () => {
  el.contadorDescricao.textContent = el.descricaoServidor.value.length;
});

$$('.config-tab').forEach((botao) => {
  botao.addEventListener("click", () => abrirConfig(botao.dataset.config));
});

onAuthStateChanged(auth, async (usuario) => {
  usuarioAtual = usuario || null;
  if (!usuarioAtual) {
    mostrarLogin();
    return;
  }

  preencherUsuario(usuarioAtual);
  el.telaLogin.classList.add("hidden");
  el.dashboard.classList.remove("hidden");
  el.areaUsuario.classList.remove("hidden");
  await carregarStatusAfiliado();
  await mostrarMeusServidores();
});

function alternarCampoProtegido(input, botao, mostrarTexto, ocultarTexto) {
  if (!input || !botao) return;
  const mostrar = input.type !== "text";
  input.type = mostrar ? "text" : "password";
  botao.classList.toggle("active", mostrar);
  botao.setAttribute("aria-pressed", mostrar ? "true" : "false");
  botao.setAttribute("aria-label", mostrar ? ocultarTexto : mostrarTexto);
  botao.title = mostrar ? ocultarTexto : mostrarTexto;
}

function ocultarCampoProtegido(input, botao, mostrarTexto) {
  if (!input || !botao) return;
  input.type = "password";
  botao.classList.remove("active");
  botao.setAttribute("aria-pressed", "false");
  botao.setAttribute("aria-label", mostrarTexto);
  botao.title = mostrarTexto;
}

function alternarVisibilidadeDatabaseUrlHospedagem() {
  alternarCampoProtegido(
    el.databaseUrl,
    el.botaoOlhoDatabaseUrl,
    "Mostrar URL do Firebase",
    "Ocultar URL do Firebase"
  );
}

function ocultarDatabaseUrlHospedagem() {
  ocultarCampoProtegido(
    el.databaseUrl,
    el.botaoOlhoDatabaseUrl,
    "Mostrar URL do Firebase"
  );
}

function alternarVisibilidadePhotonHospedagem() {
  alternarCampoProtegido(
    el.photonAppIdHospedagem,
    el.botaoOlhoPhotonHospedagem,
    "Mostrar Photon App ID",
    "Ocultar Photon App ID"
  );
}

function ocultarPhotonHospedagem() {
  ocultarCampoProtegido(
    el.photonAppIdHospedagem,
    el.botaoOlhoPhotonHospedagem,
    "Mostrar Photon App ID"
  );
}

function alternarVisibilidadePhoton() {
  if (!el.photonServidorSelecionado || !el.botaoOlhoPhoton) return;

  const estaVisivel = el.photonServidorSelecionado.type === "text";
  const mostrar = !estaVisivel;

  el.photonServidorSelecionado.type = mostrar ? "text" : "password";
  el.botaoOlhoPhoton.classList.toggle("active", mostrar);
  el.botaoOlhoPhoton.setAttribute("aria-pressed", mostrar ? "true" : "false");
  el.botaoOlhoPhoton.setAttribute(
    "aria-label",
    mostrar ? "Ocultar Photon App ID" : "Mostrar Photon App ID"
  );
  el.botaoOlhoPhoton.title = mostrar ? "Ocultar Photon App ID" : "Mostrar Photon App ID";
}

function ocultarPhotonAppId() {
  if (!el.photonServidorSelecionado || !el.botaoOlhoPhoton) return;

  el.photonServidorSelecionado.type = "password";
  el.botaoOlhoPhoton.classList.remove("active");
  el.botaoOlhoPhoton.setAttribute("aria-pressed", "false");
  el.botaoOlhoPhoton.setAttribute("aria-label", "Mostrar Photon App ID");
  el.botaoOlhoPhoton.title = "Mostrar Photon App ID";
}

function alternarVisibilidadeFirebase() {
  if (!el.firebaseServidorSelecionado || !el.botaoOlhoFirebase) return;

  const mostrar = el.firebaseServidorSelecionado.type !== "text";
  el.firebaseServidorSelecionado.type = mostrar ? "text" : "password";
  el.botaoOlhoFirebase.classList.toggle("active", mostrar);
  el.botaoOlhoFirebase.setAttribute("aria-pressed", mostrar ? "true" : "false");
  el.botaoOlhoFirebase.setAttribute("aria-label", mostrar ? "Ocultar URL do Firebase" : "Mostrar URL do Firebase");
  el.botaoOlhoFirebase.title = mostrar ? "Ocultar URL do Firebase" : "Mostrar URL do Firebase";
}

function ocultarFirebaseUrl() {
  if (!el.firebaseServidorSelecionado || !el.botaoOlhoFirebase) return;

  el.firebaseServidorSelecionado.type = "password";
  el.botaoOlhoFirebase.classList.remove("active");
  el.botaoOlhoFirebase.setAttribute("aria-pressed", "false");
  el.botaoOlhoFirebase.setAttribute("aria-label", "Mostrar URL do Firebase");
  el.botaoOlhoFirebase.title = "Mostrar URL do Firebase";
}

function alternarVisibilidadeNovoValor() {
  if (!el.novoValorConexao || !el.botaoOlhoNovoValor) return;
  const mostrar = el.novoValorConexao.type !== "text";
  el.novoValorConexao.type = mostrar ? "text" : "password";
  el.botaoOlhoNovoValor.classList.toggle("active", mostrar);
}

function normalizarUrlParaComparacao(valor) {
  return String(valor || "").trim().replace(/\/+$/, "").toLowerCase();
}

function firebaseEmEdicaoFoiAlterado() {
  if (campoConexaoEmEdicao !== "firebase") return false;
  const atual = normalizarUrlParaComparacao(servidorSelecionado?.urlFirebase);
  const novo = normalizarUrlParaComparacao(el.novoValorConexao?.value);
  return Boolean(novo) && novo !== atual;
}

function atualizarOpcoesTransferenciaFirebase() {
  const devePerguntar = firebaseEmEdicaoFoiAlterado();

  el.opcoesTransferenciaFirebase?.classList.toggle("hidden", !devePerguntar);
  el.botaoMudarSemTransferir?.classList.toggle("hidden", !devePerguntar);
  el.botaoMudarETransferir?.classList.toggle("hidden", !devePerguntar);
  el.botaoSalvarEdicaoConexao?.classList.toggle("hidden", devePerguntar);
}

function abrirEditorConexao(tipo) {
  if (!servidorSelecionado?.id || !el.modalEditarConexao) return;

  campoConexaoEmEdicao = tipo;
  ocultarMensagem(el.mensagemModalConexao);

  const editandoPhoton = tipo === "photon";
  const valorAtual = editandoPhoton
    ? (servidorSelecionado.photonAppId || "")
    : (servidorSelecionado.urlFirebase || "");

  el.tituloModalEditarConexao.textContent = editandoPhoton
    ? "Editar Photon App ID"
    : "Editar Firebase do servidor";

  el.descricaoModalEditarConexao.textContent = editandoPhoton
    ? "Digite o novo App ID do Photon PUN 2."
    : "Digite a nova URL do Firebase Realtime Database.";

  el.labelNovoValorConexao.textContent = editandoPhoton
    ? "Novo Photon App ID"
    : "Nova URL do Firebase";

  el.ajudaNovoValorConexao.textContent = editandoPhoton
    ? "O novo App ID será salvo em DADOS/AppId Photon no Firebase indicado."
    : "Ao trocar a URL, escolha se deseja apenas mudar o banco ou também copiar os dados do Firebase antigo.";

  el.novoValorConexao.value = valorAtual;
  el.novoValorConexao.maxLength = editandoPhoton ? 100 : 500;
  el.novoValorConexao.type = "password";
  el.botaoOlhoNovoValor?.classList.remove("active");
  el.botaoOlhoNovoValor?.classList.remove("hidden");

  atualizarOpcoesTransferenciaFirebase();

  el.modalEditarConexao.classList.remove("hidden");
  document.body.classList.add("modal-open");

  setTimeout(() => {
    el.novoValorConexao?.focus();
    el.novoValorConexao?.select();
  }, 30);
}

function fecharEditorConexao() {
  campoConexaoEmEdicao = null;
  el.modalEditarConexao?.classList.add("hidden");
  document.body.classList.remove("modal-open");
  ocultarMensagem(el.mensagemModalConexao);
  if (el.novoValorConexao) el.novoValorConexao.value = "";
  el.opcoesTransferenciaFirebase?.classList.add("hidden");
  el.botaoMudarSemTransferir?.classList.add("hidden");
  el.botaoMudarETransferir?.classList.add("hidden");
  el.botaoSalvarEdicaoConexao?.classList.remove("hidden");
}

function definirBotoesTransferenciaOcupados(ocupado, transferindo = false) {
  if (el.botaoMudarSemTransferir) {
    el.botaoMudarSemTransferir.disabled = ocupado;
    el.botaoMudarSemTransferir.textContent = ocupado && !transferindo
      ? "Mudando..."
      : "Mudar sem transferir";
  }

  if (el.botaoMudarETransferir) {
    el.botaoMudarETransferir.disabled = ocupado;
    el.botaoMudarETransferir.textContent = ocupado && transferindo
      ? "Transferindo..."
      : "Mudar e transferir";
  }
}

async function salvarEdicaoConexao(evento, transferirDados = null) {
  evento?.preventDefault();
  if (!servidorSelecionado?.id || !campoConexaoEmEdicao) return;

  const novoValor = el.novoValorConexao.value.trim();
  const editandoPhoton = campoConexaoEmEdicao === "photon";
  const firebaseMudou = !editandoPhoton && firebaseEmEdicaoFoiAlterado();

  if (firebaseMudou && typeof transferirDados !== "boolean") {
    atualizarOpcoesTransferenciaFirebase();
    mostrarMensagem(
      el.mensagemModalConexao,
      "Escolha: Mudar sem transferir ou Mudar e transferir.",
      "error"
    );
    return;
  }

  const photonAppId = editandoPhoton
    ? novoValor
    : (servidorSelecionado.photonAppId || "").trim();

  const urlFirebase = editandoPhoton
    ? (servidorSelecionado.urlFirebase || "").trim()
    : novoValor;

  const erro = validarDadosServidor({
    nome: servidorSelecionado.nome || "Servidor",
    descricao: servidorSelecionado.descricao || "Servidor",
    photonAppId,
    urlFirebase
  });

  if (erro) {
    mostrarMensagem(el.mensagemModalConexao, erro, "error");
    return;
  }

  const botao = el.botaoSalvarEdicaoConexao;
  if (!firebaseMudou) {
    definirBotaoOcupado(botao, true, "Salvando...");
  } else {
    definirBotoesTransferenciaOcupados(true, transferirDados === true);
  }
  ocultarMensagem(el.mensagemModalConexao);

  try {
    const resposta = await fetchAutenticado(
      `/api/hospedagens/${encodeURIComponent(servidorSelecionado.id)}/conexao`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photonAppId,
          urlFirebase,
          transferirDados: firebaseMudou && transferirDados === true
        })
      }
    );

    const dados = await lerJsonSeguro(resposta);
    if (!resposta.ok) throw new Error(dados?.mensagem || `Erro HTTP ${resposta.status}`);

    servidorSelecionado.photonAppId = dados.photonAppId || photonAppId;
    servidorSelecionado.urlFirebase = dados.urlFirebase || urlFirebase;

    el.photonServidorSelecionado.value = servidorSelecionado.photonAppId;
    el.firebaseServidorSelecionado.value = servidorSelecionado.urlFirebase;
    ocultarPhotonAppId();
    ocultarFirebaseUrl();

    let mensagemSucesso = "Photon App ID atualizado com sucesso.";
    if (!editandoPhoton) {
      mensagemSucesso = dados?.dadosTransferidos
        ? "Firebase alterado e dados do banco antigo transferidos com sucesso."
        : "Firebase do servidor alterado sem transferir os dados antigos.";
    }

    mostrarMensagem(
      el.mensagemConexaoServidor,
      mensagemSucesso,
      "success"
    );

    fecharEditorConexao();

    if (!editandoPhoton) {
      await carregarConfigServidor();
    }
  } catch (erroBackend) {
    mostrarMensagem(
      el.mensagemModalConexao,
      erroBackend.message || "Não foi possível atualizar a conexão do servidor.",
      "error"
    );
  } finally {
    if (!firebaseMudou) {
      definirBotaoOcupado(botao, false, "Salvar");
    } else {
      definirBotoesTransferenciaOcupados(false);
    }
  }
}

async function entrarComGoogle() {
  definirBotaoOcupado(el.botaoLoginGoogle, true, "Abrindo Google...");
  ocultarMensagem(el.mensagemLogin);
  try {
    await signInWithPopup(auth, provedorGoogle);
  } catch (erro) {
    mostrarMensagem(el.mensagemLogin, traduzirErroFirebase(erro), "error");
  } finally {
    definirBotaoOcupado(el.botaoLoginGoogle, false, "Entrar com Google");
  }
}

async function sairDaConta() {
  try { await signOut(auth); } catch (erro) { console.error(erro); }
}

function mostrarLogin() {
  usuarioAtual = null;
  servidorSelecionado = null;
  afiliadoAtual = { ativo: false, dados: null };
  el.botaoPainelAfiliado?.classList.add("hidden");
  el.telaLogin.classList.remove("hidden");
  el.dashboard.classList.add("hidden");
  el.areaUsuario.classList.add("hidden");
}

function preencherUsuario(usuario) {
  const nome = usuario.displayName || "Usuário";
  const email = usuario.email || "";
  const foto = usuario.photoURL || "";
  const inicial = nome.trim().charAt(0).toUpperCase() || "U";

  el.nomeUsuario.textContent = nome;
  el.emailUsuario.textContent = email;
  el.contaResumo.textContent = email || nome;
  el.nomeHospedagem.textContent = nome;
  el.emailHospedagem.textContent = email;
  el.ownerFallback.textContent = inicial;
  preencherFoto(el.fotoUsuario, foto);
  preencherFoto(el.fotoHospedagem, foto, el.ownerFallback);
}

function preencherFoto(img, url, fallback = null) {
  if (!url) {
    img.removeAttribute("src");
    img.classList.add("hidden");
    if (fallback) fallback.classList.remove("hidden");
    return;
  }
  img.src = url;
  img.classList.remove("hidden");
  if (fallback) fallback.classList.add("hidden");
}

function trocarPagina(pagina) {
  [el.paginaServidores, el.paginaAfiliado, el.paginaHospedar, el.paginaConfigServidor]
    .filter(Boolean)
    .forEach((p) => p.classList.add("hidden"));
  pagina?.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function navegadorEhBrasileiro() {
  const idiomas = Array.isArray(navigator.languages) && navigator.languages.length
    ? navigator.languages
    : [navigator.language || ''];

  const idiomaBrasileiro = idiomas.some((idioma) => {
    const valor = String(idioma || '').trim();
    if (/^pt-BR$/i.test(valor)) return true;
    try {
      return new Intl.Locale(valor).region === 'BR';
    } catch (_) {
      return false;
    }
  });

  if (idiomaBrasileiro) return true;

  const fuso = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  const fusosBrasil = new Set([
    'America/Sao_Paulo', 'America/Manaus', 'America/Rio_Branco',
    'America/Cuiaba', 'America/Campo_Grande', 'America/Belem',
    'America/Fortaleza', 'America/Recife', 'America/Maceio',
    'America/Bahia', 'America/Santarem', 'America/Porto_Velho',
    'America/Boa_Vista', 'America/Noronha', 'America/Araguaina'
  ]);

  return fusosBrasil.has(fuso);
}

function formatarPercentual(valor) {
  const numero = Number(valor || 0);
  return `${Number.isInteger(numero) ? numero.toFixed(0) : numero.toFixed(2).replace('.', ',')}%`;
}

function formatarDataVenda(unixMs) {
  const numero = Number(unixMs || 0);
  if (!numero) return '—';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(new Date(numero));
  } catch (_) {
    return new Date(numero).toLocaleString('pt-BR');
  }
}

async function carregarStatusAfiliado() {
  if (!usuarioAtual) return;

  try {
    const resposta = await fetchAutenticado('/api/afiliado/me');
    const dados = await lerJsonSeguro(resposta);
    if (!resposta.ok || !dados?.ok) {
      throw new Error(dados?.mensagem || `Erro HTTP ${resposta.status}`);
    }

    afiliadoAtual = {
      ativo: dados.afiliado === true,
      dados: dados.afiliado === true ? dados : null
    };

    el.botaoPainelAfiliado?.classList.toggle('hidden', !afiliadoAtual.ativo);
    if (afiliadoAtual.ativo) renderizarPainelAfiliado(dados);
  } catch (erro) {
    console.error('[Afiliado] não foi possível verificar a conta:', erro);
    afiliadoAtual = { ativo: false, dados: null };
    el.botaoPainelAfiliado?.classList.add('hidden');
  }
}

async function mostrarPainelAfiliado() {
  if (!usuarioAtual) return mostrarLogin();

  trocarPagina(el.paginaAfiliado);
  ocultarMensagem(el.mensagemAfiliado);

  if (el.listaVendasAfiliado) {
    el.listaVendasAfiliado.innerHTML = `
      <div class="empty-state">
        <div class="loading-dot"></div>
        <strong>Atualizando suas vendas...</strong>
      </div>`;
  }

  try {
    const resposta = await fetchAutenticado('/api/afiliado/me');
    const dados = await lerJsonSeguro(resposta);
    if (!resposta.ok || !dados?.ok) {
      throw new Error(dados?.mensagem || `Erro HTTP ${resposta.status}`);
    }

    if (dados.afiliado !== true) {
      afiliadoAtual = { ativo: false, dados: null };
      el.botaoPainelAfiliado?.classList.add('hidden');
      mostrarMensagem(el.mensagemAfiliado, 'Esta conta não está cadastrada como afiliado.', 'error');
      return;
    }

    afiliadoAtual = { ativo: true, dados };
    renderizarPainelAfiliado(dados);
  } catch (erro) {
    mostrarMensagem(
      el.mensagemAfiliado,
      erro.message || 'Não foi possível carregar o painel do afiliado.',
      'error'
    );
  }
}

function renderizarPainelAfiliado(dados) {
  const perfil = dados?.perfil || {};
  const carteira = dados?.carteira || {};
  const estatisticas = dados?.estatisticas || {};
  const vendas = Array.isArray(dados?.vendasRecentes) ? dados.vendasRecentes : [];

  if (el.codigoPainelAfiliado) el.codigoPainelAfiliado.textContent = perfil.codigo || '—';
  if (el.comissaoPainelAfiliado) el.comissaoPainelAfiliado.textContent = formatarPercentual(perfil.comissaoPercentual);
  if (el.descontoPainelAfiliado) el.descontoPainelAfiliado.textContent = formatarPercentual(perfil.descontoPercentual);
  if (el.vendasPainelAfiliado) el.vendasPainelAfiliado.textContent = String(Number(estatisticas.totalVendas || 0));
  if (el.valorVendidoPainelAfiliado) el.valorVendidoPainelAfiliado.textContent = formatarPrecoMercadoPago(estatisticas.valorVendido || 0);
  if (el.saldoDisponivelPainelAfiliado) el.saldoDisponivelPainelAfiliado.textContent = formatarPrecoMercadoPago(carteira.saldoDisponivel || 0);
  if (el.saldoPendentePainelAfiliado) el.saldoPendentePainelAfiliado.textContent = formatarPrecoMercadoPago(carteira.saldoPendente || 0);
  if (el.comissaoTotalPainelAfiliado) el.comissaoTotalPainelAfiliado.textContent = formatarPrecoMercadoPago(carteira.comissaoTotal || 0);
  if (el.totalSacadoPainelAfiliado) el.totalSacadoPainelAfiliado.textContent = formatarPrecoMercadoPago(carteira.totalSacado || 0);

  const pix = dados?.pix || {};
  const saque = dados?.saque || {};
  const saques = Array.isArray(dados?.saquesRecentes) ? dados.saquesRecentes : [];

  if (el.statusPixAfiliado) {
    el.statusPixAfiliado.textContent = pix.configurada ? 'PIX CADASTRADO' : 'PIX NÃO CADASTRADO';
    el.statusPixAfiliado.classList.toggle('active-badge', pix.configurada === true);
  }
  if (el.tipoPixAfiliado && pix.tipo) el.tipoPixAfiliado.value = pix.tipo;
  if (el.chavePixAfiliado) el.chavePixAfiliado.value = pix.chave || '';
  if (el.saldoSaqueAfiliado) el.saldoSaqueAfiliado.textContent = formatarPrecoMercadoPago(carteira.saldoDisponivel || 0);
  if (el.saqueMinimoAfiliado) el.saqueMinimoAfiliado.textContent = `Saque mínimo: ${formatarPrecoMercadoPago(saque.minimo || 0.01)}`;
  if (el.valorSaqueAfiliado) {
    el.valorSaqueAfiliado.min = String(Number(saque.minimo || 0.01));
    el.valorSaqueAfiliado.max = String(Number(carteira.saldoDisponivel || 0));
    if (!el.valorSaqueAfiliado.value) el.valorSaqueAfiliado.value = Number(carteira.saldoDisponivel || 0).toFixed(2);
  }
  if (el.botaoSacarAfiliado) {
    el.botaoSacarAfiliado.disabled = !pix.configurada || Number(carteira.saldoDisponivel || 0) < Number(saque.minimo || 0.01);
  }

  renderizarSaquesAfiliado(saques);

  if (!el.listaVendasAfiliado) return;
  if (!vendas.length) {
    el.listaVendasAfiliado.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">$</div>
        <strong>Nenhuma venda confirmada</strong>
        <span>Compartilhe seu código ${escapeHtml(perfil.codigo || '')}. As vendas aprovadas aparecerão aqui.</span>
      </div>`;
    return;
  }

  el.listaVendasAfiliado.innerHTML = vendas.map((venda) => `
    <article class="affiliate-sale-row">
      <div>
        <span>VENDA CONFIRMADA</span>
        <strong>${escapeHtml(formatarDataVenda(venda.aprovadoEmUnixMs))}</strong>
      </div>
      <div>
        <span>CLIENTE PAGOU</span>
        <strong>${escapeHtml(formatarPrecoMercadoPago(venda.valorPago || 0))}</strong>
      </div>
      <div>
        <span>SUA COMISSÃO</span>
        <strong class="affiliate-sale-commission">+${escapeHtml(formatarPrecoMercadoPago(venda.valorComissao || 0))}</strong>
      </div>
    </article>`).join('');
}

function textoStatusSaque(status) {
  const mapa = {
    solicitado: 'Solicitado',
    processando: 'Processando',
    pago: 'Pago',
    recusado: 'Recusado',
    cancelado: 'Cancelado',
    erro: 'Erro'
  };
  return mapa[String(status || '').toLowerCase()] || String(status || 'Solicitado');
}

function renderizarSaquesAfiliado(saques) {
  if (!el.listaSaquesAfiliado) return;
  if (!saques.length) {
    el.listaSaquesAfiliado.innerHTML = `
      <div class="empty-state compact-state">
        <strong>Nenhum saque solicitado</strong>
        <span>Quando você solicitar um saque, ele aparecerá aqui.</span>
      </div>`;
    return;
  }

  el.listaSaquesAfiliado.innerHTML = saques.map((saque) => `
    <article class="affiliate-withdraw-row">
      <div>
        <span>VALOR</span>
        <strong>${escapeHtml(formatarPrecoMercadoPago(saque.valor || 0))}</strong>
      </div>
      <div>
        <span>DATA</span>
        <strong>${escapeHtml(formatarDataVenda(saque.criadoEmUnixMs))}</strong>
      </div>
      <div>
        <span>STATUS</span>
        <strong>${escapeHtml(textoStatusSaque(saque.status))}</strong>
      </div>
    </article>`).join('');
}

async function salvarChavePixAfiliado() {
  if (!afiliadoAtual.ativo) return;
  const tipo = String(el.tipoPixAfiliado?.value || '').trim();
  const chave = String(el.chavePixAfiliado?.value || '').trim();

  if (!tipo || !chave) {
    return mostrarMensagem(el.mensagemSaqueAfiliado, 'Informe o tipo e a chave Pix.', 'error');
  }

  ocultarMensagem(el.mensagemSaqueAfiliado);
  definirBotaoOcupado(el.botaoSalvarPixAfiliado, true, 'Salvando...');
  try {
    const resposta = await fetchAutenticado('/api/afiliado/pix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo, chave })
    });
    const dados = await lerJsonSeguro(resposta);
    if (!resposta.ok || !dados?.ok) throw new Error(dados?.mensagem || `Erro HTTP ${resposta.status}`);

    mostrarMensagem(el.mensagemSaqueAfiliado, 'Chave Pix salva com sucesso.', 'success');
    await mostrarPainelAfiliado();
  } catch (erro) {
    mostrarMensagem(el.mensagemSaqueAfiliado, erro.message || 'Não foi possível salvar a chave Pix.', 'error');
  } finally {
    definirBotaoOcupado(el.botaoSalvarPixAfiliado, false, 'Salvar chave Pix');
  }
}

async function solicitarSaqueAfiliado() {
  if (!afiliadoAtual.ativo) return;
  const valor = Number(String(el.valorSaqueAfiliado?.value || '').replace(',', '.'));
  if (!Number.isFinite(valor) || valor <= 0) {
    return mostrarMensagem(el.mensagemSaqueAfiliado, 'Digite um valor de saque válido.', 'error');
  }

  ocultarMensagem(el.mensagemSaqueAfiliado);
  definirBotaoOcupado(el.botaoSacarAfiliado, true, 'Solicitando...');
  try {
    const resposta = await fetchAutenticado('/api/afiliado/saques', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ valor })
    });
    const dados = await lerJsonSeguro(resposta);
    if (!resposta.ok || !dados?.ok) throw new Error(dados?.mensagem || `Erro HTTP ${resposta.status}`);

    mostrarMensagem(el.mensagemSaqueAfiliado, dados?.mensagem || 'Saque enviado ao Mercado Pago.', 'success');
    if (el.valorSaqueAfiliado) el.valorSaqueAfiliado.value = '';
    await mostrarPainelAfiliado();
  } catch (erro) {
    mostrarMensagem(el.mensagemSaqueAfiliado, erro.message || 'Não foi possível solicitar o saque.', 'error');
  } finally {
    definirBotaoOcupado(el.botaoSacarAfiliado, false, 'Sacar');
  }
}

function obterValorCheckoutAtual() {
  return codigoAfiliadoCompra.aplicado
    ? Number(codigoAfiliadoCompra.valorFinal || pagamentoMercadoPago.valor)
    : Number(pagamentoMercadoPago.valor || 0);
}

function atualizarPrecoCheckoutAfiliado() {
  const valorFinal = obterValorCheckoutAtual();
  if (el.precoModalMercadoPago) {
    el.precoModalMercadoPago.textContent = formatarPrecoMercadoPago(
      valorFinal,
      pagamentoMercadoPago.moeda
    );
  }

  if (el.precoOriginalModalMercadoPago) {
    const mostrarOriginal = codigoAfiliadoCompra.aplicado &&
      Number(codigoAfiliadoCompra.valorOriginal || 0) > valorFinal;
    el.precoOriginalModalMercadoPago.classList.toggle('hidden', !mostrarOriginal);
    if (mostrarOriginal) {
      el.precoOriginalModalMercadoPago.textContent = formatarPrecoMercadoPago(
        codigoAfiliadoCompra.valorOriginal,
        pagamentoMercadoPago.moeda
      );
    }
  }
}

function bloquearCodigoAfiliadoCheckout(bloquear) {
  if (el.codigoAfiliadoMercadoPago) el.codigoAfiliadoMercadoPago.disabled = bloquear;
  if (el.botaoAplicarCodigoAfiliado) el.botaoAplicarCodigoAfiliado.disabled = bloquear;
}

function resetarCodigoAfiliadoCheckout() {
  codigoAfiliadoCompra = {
    aplicado: false,
    codigo: '',
    nome: '',
    descontoPercentual: 0,
    valorOriginal: Number(pagamentoMercadoPago.valor || 0.50),
    valorFinal: Number(pagamentoMercadoPago.valor || 0.50),
    valorDesconto: 0
  };

  if (el.codigoAfiliadoMercadoPago) el.codigoAfiliadoMercadoPago.value = '';
  el.resumoCodigoAfiliado?.classList.add('hidden');
  ocultarMensagem(el.mensagemCodigoAfiliado);
  bloquearCodigoAfiliadoCheckout(false);
  atualizarPrecoCheckoutAfiliado();
}

async function aplicarCodigoAfiliadoCheckout() {
  if (!usuarioAtual || pagamentoEmProcessamento || metodoPagamentoSelecionado) {
    if (metodoPagamentoSelecionado) {
      mostrarMensagem(
        el.mensagemCodigoAfiliado,
        'Aplique o código antes de escolher Pix ou cartão.',
        'error'
      );
    }
    return;
  }

  const codigo = String(el.codigoAfiliadoMercadoPago?.value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');

  if (!codigo) {
    resetarCodigoAfiliadoCheckout();
    return;
  }

  definirBotaoOcupado(el.botaoAplicarCodigoAfiliado, true, 'Validando...');
  ocultarMensagem(el.mensagemCodigoAfiliado);

  try {
    const resposta = await fetchAutenticado('/api/afiliados/validar-codigo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo })
    });
    const dados = await lerJsonSeguro(resposta);
    if (!resposta.ok || !dados?.ok || dados.valido !== true) {
      throw new Error(dados?.mensagem || 'Código de afiliado inválido.');
    }

    codigoAfiliadoCompra = {
      aplicado: true,
      codigo: String(dados.codigo || codigo),
      nome: String(dados.nome || 'Afiliado'),
      descontoPercentual: Number(dados.descontoPercentual || 0),
      valorOriginal: Number(dados.valorOriginal || pagamentoMercadoPago.valor),
      valorFinal: Number(dados.valorFinal || pagamentoMercadoPago.valor),
      valorDesconto: Number(dados.valorDesconto || 0)
    };

    if (el.codigoAfiliadoMercadoPago) el.codigoAfiliadoMercadoPago.value = codigoAfiliadoCompra.codigo;
    if (el.codigoAfiliadoAplicado) el.codigoAfiliadoAplicado.textContent = codigoAfiliadoCompra.codigo;
    if (el.descontoAfiliadoAplicado) {
      el.descontoAfiliadoAplicado.textContent = `${formatarPercentual(codigoAfiliadoCompra.descontoPercentual)} de desconto`;
    }
    el.resumoCodigoAfiliado?.classList.remove('hidden');
    mostrarMensagem(
      el.mensagemCodigoAfiliado,
      `Código de ${codigoAfiliadoCompra.nome} aplicado. Você economiza ${formatarPrecoMercadoPago(codigoAfiliadoCompra.valorDesconto)}.`,
      'success'
    );
    atualizarPrecoCheckoutAfiliado();
  } catch (erro) {
    resetarCodigoAfiliadoCheckout();
    if (el.codigoAfiliadoMercadoPago) el.codigoAfiliadoMercadoPago.value = codigo;
    mostrarMensagem(
      el.mensagemCodigoAfiliado,
      erro.message || 'Código de afiliado inválido.',
      'error'
    );
  } finally {
    definirBotaoOcupado(el.botaoAplicarCodigoAfiliado, false, 'Aplicar');
  }
}

function formatarPrecoMercadoPago(valor, moeda = 'BRL') {
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: moeda
    }).format(Number(valor || 0));
  } catch (_) {
    return `R$ ${Number(valor || 0).toFixed(2).replace('.', ',')}`;
  }
}

function atualizarCompraMercadoPago(dados) {
  pagamentoMercadoPago = {
    disponivel: dados?.mercadoPago?.disponivel === true,
    valor: Number(dados?.mercadoPago?.valor || 0.50),
    moeda: String(dados?.mercadoPago?.moeda || 'BRL'),
    publicKey: String(dados?.mercadoPago?.publicKey || '')
  };

  if (!el.mercadoPagoHostingCard) return;

  const deveMostrar =
    navegadorEhBrasileiro() &&
    pagamentoMercadoPago.disponivel &&
    !permissaoHospedagem.codigoAtivo &&
    !permissaoHospedagem.limiteAtingido;

  el.mercadoPagoHostingCard.classList.toggle('hidden', !deveMostrar);

  if (el.precoMercadoPago) {
    el.precoMercadoPago.textContent = formatarPrecoMercadoPago(
      pagamentoMercadoPago.valor,
      pagamentoMercadoPago.moeda
    );
  }

  if (!codigoAfiliadoCompra.aplicado) {
    codigoAfiliadoCompra.valorOriginal = pagamentoMercadoPago.valor;
    codigoAfiliadoCompra.valorFinal = pagamentoMercadoPago.valor;
    atualizarPrecoCheckoutAfiliado();
  }
}


async function abrirPagamentoMercadoPago() {
  if (!usuarioAtual) return mostrarLogin();
  if (!navegadorEhBrasileiro()) return;

  if (!pagamentoMercadoPago.disponivel || !pagamentoMercadoPago.publicKey) {
    mostrarMensagem(
      el.mensagemMercadoPago,
      'O Mercado Pago ainda não está disponível.',
      'error'
    );
    return;
  }

  if (permissaoHospedagem.codigoAtivo || permissaoHospedagem.limiteAtingido) {
    return;
  }

  ocultarMensagem(el.mensagemMercadoPago);
  ocultarMensagem(el.mensagemModalMercadoPago);
  ocultarMensagem(el.mensagemPixMercadoPago);
  esconderResultadoPixMercadoPago();
  resetarCodigoAfiliadoCheckout();
  resetarEscolhaPagamentoMercadoPago();

  if (el.emailPixMercadoPago) {
    el.emailPixMercadoPago.value = String(usuarioAtual?.email || '');
  }
  const emailCartao = document.querySelector('#form-checkout__cardholderEmail');
  if (emailCartao) emailCartao.value = String(usuarioAtual?.email || '');

  el.modalPagamentoMercadoPago?.classList.remove('hidden');
  document.body.classList.add('modal-open');
}

function resetarEscolhaPagamentoMercadoPago() {
  metodoPagamentoSelecionado = null;
  pagamentoEmProcessamento = false;
  el.areaEscolhaPagamento?.classList.remove('hidden');
  el.resultadoPixMercadoPago?.classList.add('hidden');
  el.opcaoCartaoMercadoPago?.classList.remove('active');
  el.opcaoPixMercadoPago?.classList.remove('active');
  el.detalhesCartaoMercadoPago?.classList.add('hidden');
  el.detalhesPixMercadoPago?.classList.add('hidden');
  if (el.botaoPagarMercadoPago) {
    el.botaoPagarMercadoPago.disabled = true;
    el.botaoPagarMercadoPago.textContent = '▣  Pagar';
  }
  bloquearCodigoAfiliadoCheckout(false);
}

async function selecionarMetodoMercadoPago(metodo) {
  if (pagamentoEmProcessamento) return;

  metodoPagamentoSelecionado = metodo;
  bloquearCodigoAfiliadoCheckout(true);
  el.opcaoCartaoMercadoPago?.classList.toggle('active', metodo === 'card');
  el.opcaoPixMercadoPago?.classList.toggle('active', metodo === 'pix');
  el.detalhesCartaoMercadoPago?.classList.toggle('hidden', metodo !== 'card');
  el.detalhesPixMercadoPago?.classList.toggle('hidden', metodo !== 'pix');

  if (el.botaoPagarMercadoPago) {
    el.botaoPagarMercadoPago.disabled = false;
  }

  ocultarMensagem(el.mensagemModalMercadoPago);

  if (metodo === 'card') {
    try {
      await prepararCardFormMercadoPago();
    } catch (erro) {
      mostrarMensagem(
        el.mensagemModalMercadoPago,
        erro.message || 'Não foi possível carregar o formulário do cartão.',
        'error'
      );
    }
  }
}

async function prepararCardFormMercadoPago() {
  if (cardFormMercadoPago) return;
  if (!window.MercadoPago) {
    throw new Error('O SDK do Mercado Pago não foi carregado.');
  }
  if (!pagamentoMercadoPago.publicKey) {
    throw new Error('MP_PUBLIC_KEY não configurada.');
  }

  mercadoPagoSdk = mercadoPagoSdk || new window.MercadoPago(pagamentoMercadoPago.publicKey, {
    locale: 'pt-BR'
  });

  cardFormMercadoPago = mercadoPagoSdk.cardForm({
    amount: String(obterValorCheckoutAtual()),
    iframe: true,
    form: {
      id: 'formCheckoutMercadoPago',
      cardNumber: {
        id: 'form-checkout__cardNumber',
        placeholder: 'Número do cartão'
      },
      expirationDate: {
        id: 'form-checkout__expirationDate',
        placeholder: 'MM/AA'
      },
      securityCode: {
        id: 'form-checkout__securityCode',
        placeholder: 'CVV'
      },
      cardholderName: {
        id: 'form-checkout__cardholderName',
        placeholder: 'Nome como está no cartão'
      },
      issuer: {
        id: 'form-checkout__issuer',
        placeholder: 'Banco emissor'
      },
      installments: {
        id: 'form-checkout__installments',
        placeholder: 'Parcelas'
      },
      identificationType: {
        id: 'form-checkout__identificationType',
        placeholder: 'Tipo de documento'
      },
      identificationNumber: {
        id: 'form-checkout__identificationNumber',
        placeholder: 'Número do documento'
      },
      cardholderEmail: {
        id: 'form-checkout__cardholderEmail',
        placeholder: 'E-mail'
      }
    },
    callbacks: {
      onFormMounted: (error) => {
        if (error) {
          console.error('[Mercado Pago CardForm] montagem:', error);
          mostrarMensagem(
            el.mensagemModalMercadoPago,
            'Não foi possível carregar os campos do cartão.',
            'error'
          );
        }
      },
      onSubmit: async (event) => {
        event.preventDefault();
        if (pagamentoEmProcessamento) return;

        try {
          const dadosCartao = cardFormMercadoPago.getCardFormData();
          const formData = {
            token: dadosCartao.token,
            issuer_id: dadosCartao.issuerId,
            payment_method_id: dadosCartao.paymentMethodId,
            installments: Number(dadosCartao.installments || 1),
            payer: {
              email: dadosCartao.cardholderEmail,
              identification: {
                type: dadosCartao.identificationType,
                number: dadosCartao.identificationNumber
              }
            }
          };

          await enviarPagamentoMercadoPago(formData);
        } catch (erro) {
          pagamentoEmProcessamento = false;
          atualizarBotaoPagarMercadoPago();
          mostrarMensagem(
            el.mensagemModalMercadoPago,
            erro.message || 'Não foi possível validar os dados do cartão.',
            'error'
          );
        }
      },
      onFetching: () => {
        if (el.botaoPagarMercadoPago) {
          el.botaoPagarMercadoPago.disabled = true;
          el.botaoPagarMercadoPago.textContent = 'Processando...';
        }
        return () => atualizarBotaoPagarMercadoPago();
      }
    }
  });

  const emailCartao = document.querySelector('#form-checkout__cardholderEmail');
  if (emailCartao && !emailCartao.value) {
    emailCartao.value = String(usuarioAtual?.email || '');
  }
}

function atualizarBotaoPagarMercadoPago() {
  if (!el.botaoPagarMercadoPago) return;
  el.botaoPagarMercadoPago.disabled = pagamentoEmProcessamento || !metodoPagamentoSelecionado;
  el.botaoPagarMercadoPago.textContent = pagamentoEmProcessamento
    ? 'Processando...'
    : '▣  Pagar';
}

async function pagarMetodoSelecionadoMercadoPago() {
  if (pagamentoEmProcessamento || !metodoPagamentoSelecionado) return;
  ocultarMensagem(el.mensagemModalMercadoPago);

  if (metodoPagamentoSelecionado === 'pix') {
    const email = String(el.emailPixMercadoPago?.value || usuarioAtual?.email || '').trim();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      mostrarMensagem(el.mensagemModalMercadoPago, 'Informe um e-mail válido para gerar o Pix.', 'error');
      el.emailPixMercadoPago?.focus();
      return;
    }

    await enviarPagamentoMercadoPago({
      payment_method_id: 'pix',
      payer: { email }
    });
    return;
  }

  if (metodoPagamentoSelecionado === 'card') {
    try {
      await prepararCardFormMercadoPago();
      el.formCheckoutMercadoPago?.requestSubmit();
    } catch (erro) {
      mostrarMensagem(
        el.mensagemModalMercadoPago,
        erro.message || 'Não foi possível preparar o cartão.',
        'error'
      );
    }
  }
}

async function enviarPagamentoMercadoPago(formData) {
  pagamentoEmProcessamento = true;
  atualizarBotaoPagarMercadoPago();
  ocultarMensagem(el.mensagemModalMercadoPago);

  try {
    const resposta = await fetchAutenticado('/api/mercadopago/processar-pagamento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pais: 'BR',
        codigoAfiliado: codigoAfiliadoCompra.aplicado ? codigoAfiliadoCompra.codigo : '',
        formData
      })
    });

    const dados = await lerJsonSeguro(resposta);
    if (!resposta.ok || !dados?.ok) {
      throw new Error(dados?.mensagem || `Erro HTTP ${resposta.status}`);
    }

    if (dados.metodo === 'pix') {
      pagamentoEmProcessamento = false;
      mostrarResultadoPixMercadoPago(dados.pix || {});
      iniciarMonitoramentoCodigoMercadoPago();
      return;
    }

    const status = String(dados.status || '').toLowerCase();
    if (dados.codigoAtivado === true || status === 'approved') {
      pagamentoEmProcessamento = false;
      mostrarMensagem(
        el.mensagemModalMercadoPago,
        'Pagamento aprovado! Sua hospedagem foi liberada por 30 dias.',
        'success'
      );
      await carregarMinhasHospedagens();
      setTimeout(() => fecharPagamentoMercadoPago(), 900);
      return;
    }

    if (status === 'in_process' || status === 'pending' || status === 'authorized') {
      pagamentoEmProcessamento = false;
      atualizarBotaoPagarMercadoPago();
      mostrarMensagem(
        el.mensagemModalMercadoPago,
        'Pagamento em análise. A hospedagem será liberada automaticamente quando for aprovado.',
        'neutral'
      );
      iniciarMonitoramentoCodigoMercadoPago();
      return;
    }

    throw new Error('O pagamento não foi aprovado. Revise os dados ou tente outro meio de pagamento.');
  } catch (erro) {
    pagamentoEmProcessamento = false;
    atualizarBotaoPagarMercadoPago();
    mostrarMensagem(
      el.mensagemModalMercadoPago,
      erro.message || 'Não foi possível processar o pagamento.',
      'error'
    );
    throw erro;
  }
}

function mostrarResultadoPixMercadoPago(pix) {
  const qrCode = String(pix?.qrCode || '');
  const qrBase64 = String(pix?.qrCodeBase64 || '');

  el.areaEscolhaPagamento?.classList.add('hidden');
  el.resultadoPixMercadoPago?.classList.remove('hidden');
  ocultarMensagem(el.mensagemPixMercadoPago);

  if (el.codigoPixMercadoPago) {
    el.codigoPixMercadoPago.value = qrCode;
  }

  if (el.qrCodePixMercadoPago) {
    if (qrBase64) {
      el.qrCodePixMercadoPago.src = `data:image/png;base64,${qrBase64}`;
      el.qrCodePixMercadoPago.classList.remove('hidden');
    } else {
      el.qrCodePixMercadoPago.removeAttribute('src');
      el.qrCodePixMercadoPago.classList.add('hidden');
    }
  }
}

function esconderResultadoPixMercadoPago() {
  el.resultadoPixMercadoPago?.classList.add('hidden');
  el.areaEscolhaPagamento?.classList.remove('hidden');

  if (el.codigoPixMercadoPago) {
    el.codigoPixMercadoPago.value = '';
  }

  if (el.qrCodePixMercadoPago) {
    el.qrCodePixMercadoPago.removeAttribute('src');
    el.qrCodePixMercadoPago.classList.add('hidden');
  }
}

async function copiarCodigoPixMercadoPago() {
  const codigo = String(el.codigoPixMercadoPago?.value || '');
  if (!codigo) return;

  try {
    await navigator.clipboard.writeText(codigo);
    const botao = el.botaoCopiarPixMercadoPago;
    if (botao) {
      const original = botao.textContent;
      botao.textContent = 'COPIADO!';
      setTimeout(() => { botao.textContent = original; }, 1200);
    }
  } catch (_) {
    el.codigoPixMercadoPago?.select();
    document.execCommand('copy');
  }
}

function iniciarMonitoramentoCodigoMercadoPago() {
  pararMonitoramentoCodigoMercadoPago();

  const verificar = async () => {
    if (!usuarioAtual || el.modalPagamentoMercadoPago?.classList.contains('hidden')) {
      pararMonitoramentoCodigoMercadoPago();
      return;
    }

    try {
      const resposta = await fetchAutenticado('/api/mercadopago/status-codigo');
      const dados = await lerJsonSeguro(resposta);

      if (resposta.ok && dados?.ativa === true) {
        pararMonitoramentoCodigoMercadoPago();
        const alvoMensagem = el.resultadoPixMercadoPago?.classList.contains('hidden')
          ? el.mensagemModalMercadoPago
          : el.mensagemPixMercadoPago;
        mostrarMensagem(
          alvoMensagem,
          'Pagamento aprovado! Código de Hospedagem Mensal ativado por 30 dias.',
          'success'
        );
        await carregarMinhasHospedagens();
        setTimeout(() => fecharPagamentoMercadoPago(), 1300);
        return;
      }
    } catch (_) {}

    monitorPagamentoTimer = setTimeout(verificar, 2500);
  };

  monitorPagamentoTimer = setTimeout(verificar, 1800);
}

function pararMonitoramentoCodigoMercadoPago() {
  if (monitorPagamentoTimer) {
    clearTimeout(monitorPagamentoTimer);
    monitorPagamentoTimer = null;
  }
}

async function fecharPagamentoMercadoPago() {
  pararMonitoramentoCodigoMercadoPago();
  esconderResultadoPixMercadoPago();

  if (cardFormMercadoPago && typeof cardFormMercadoPago.unmount === 'function') {
    try { cardFormMercadoPago.unmount(); } catch (_) {}
  }
  cardFormMercadoPago = null;

  resetarEscolhaPagamentoMercadoPago();
  resetarCodigoAfiliadoCheckout();
  ocultarMensagem(el.mensagemModalMercadoPago);
  ocultarMensagem(el.mensagemPixMercadoPago);
  el.modalPagamentoMercadoPago?.classList.add('hidden');
  document.body.classList.remove('modal-open');
}

async function mostrarMeusServidores() {
  servidorSelecionado = null;
  configAtual = null;
  trocarPagina(el.paginaServidores);
  await carregarMinhasHospedagens();
}

function mostrarHospedagem() {
  if (!permissaoHospedagem.codigoAtivo) {
    mostrarMensagem(
      el.mensagemServidores,
      "Você precisa ter o Código de Hospedagem Mensal ativo para hospedar um servidor.",
      "error"
    );
    return;
  }

  if (permissaoHospedagem.limiteAtingido) {
    mostrarMensagem(
      el.mensagemServidores,
      "Sua conta já possui uma hospedagem. O limite atual é de 1 servidor.",
      "error"
    );
    return;
  }

  ocultarMensagem(el.mensagemFormulario);
  ocultarDatabaseUrlHospedagem();
  ocultarPhotonHospedagem();
  trocarPagina(el.paginaHospedar);
}

function atualizarPermissaoHospedagem(dados) {
  permissaoHospedagem = {
    codigoAtivo: dados?.codigoHospedagem?.ativa === true,
    podeHospedar: dados?.podeHospedar === true,
    limiteAtingido: dados?.limiteAtingido === true,
    dataExpiracaoUnixMs: Number(dados?.codigoHospedagem?.dataExpiracaoUnixMs || 0)
  };

  atualizarCompraMercadoPago(dados);

  if (!el.botaoAbrirHospedagem) return;

  el.botaoAbrirHospedagem.disabled = !permissaoHospedagem.podeHospedar;
  el.botaoAbrirHospedagem.classList.toggle("entitlement-disabled", !permissaoHospedagem.podeHospedar);

  if (!permissaoHospedagem.codigoAtivo) {
    el.botaoAbrirHospedagem.textContent = "Código mensal necessário";
    el.botaoAbrirHospedagem.title = "Ative o Código de Hospedagem Mensal na sua conta para hospedar um servidor.";
    return;
  }

  if (permissaoHospedagem.limiteAtingido) {
    el.botaoAbrirHospedagem.textContent = "Limite de 1 servidor atingido";
    el.botaoAbrirHospedagem.title = "Sua conta já possui a hospedagem permitida pelo código mensal.";
    return;
  }

  el.botaoAbrirHospedagem.textContent = "+ Hospedar servidor";
  el.botaoAbrirHospedagem.title = "Código de Hospedagem Mensal ativo.";
}

async function carregarMinhasHospedagens() {
  if (!usuarioAtual) return;
  el.listaServidores.innerHTML = `
    <div class="empty-state">
      <div class="loading-dot"></div>
      <strong>Carregando seus servidores...</strong>
      <span>Consultando os servidores vinculados à sua conta.</span>
    </div>`;
  ocultarMensagem(el.mensagemServidores);

  try {
    const resposta = await fetchAutenticado('/api/minhas-hospedagens');
    const dados = await lerJsonSeguro(resposta);
    if (!resposta.ok) throw new Error(dados?.mensagem || `Erro HTTP ${resposta.status}`);

    minhasHospedagens = Array.isArray(dados?.hospedagens) ? dados.hospedagens : [];
    atualizarPermissaoHospedagem(dados);
    el.contadorHospedagens.textContent = minhasHospedagens.length;
    renderizarServidores();
  } catch (erro) {
    minhasHospedagens = [];
    permissaoHospedagem = {
      codigoAtivo: false,
      podeHospedar: false,
      limiteAtingido: false,
      dataExpiracaoUnixMs: 0
    };
    if (el.mercadoPagoHostingCard) {
      el.mercadoPagoHostingCard.classList.add('hidden');
    }
    if (el.botaoAbrirHospedagem) {
      el.botaoAbrirHospedagem.disabled = true;
      el.botaoAbrirHospedagem.textContent = "Hospedagem indisponível";
      el.botaoAbrirHospedagem.classList.add("entitlement-disabled");
    }
    el.contadorHospedagens.textContent = "0";
    el.listaServidores.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">!</div>
        <strong>Não foi possível carregar</strong>
        <span>${escapeHtml(erro.message || "Erro ao carregar hospedagens.")}</span>
      </div>`;
  }
}

function renderizarServidores() {
  if (!minhasHospedagens.length) {
    el.listaServidores.innerHTML = `
      <div class="empty-state server-empty">
        <div class="empty-icon">▣</div>
        <strong>Nenhum servidor hospedado</strong>
        <span>Use o botão “Hospedar servidor” para cadastrar o primeiro.</span>
      </div>`;
    return;
  }

  el.listaServidores.innerHTML = "";
  minhasHospedagens.forEach((servidor) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "server-card";
    card.innerHTML = `
      <div class="server-card-top">
        <div class="server-icon">DZ</div>
        <span class="server-status"><i></i> Hospedado</span>
      </div>
      <strong>${escapeHtml(servidor.nome || "Servidor sem nome")}</strong>
      <p>${escapeHtml(servidor.descricao || "Sem descrição")}</p>
      <div class="server-card-footer">
        <span>ID: ${escapeHtml(encurtarId(servidor.id))}</span>
        <b>Abrir configurações →</b>
      </div>`;
    card.addEventListener("click", () => abrirServidor(servidor.id));
    el.listaServidores.append(card);
  });
}

async function abrirServidor(serverId) {
  if (!serverId) return;
  ocultarMensagem(el.mensagemServidores);

  try {
    const resposta = await fetchAutenticado(`/api/hospedagens/${encodeURIComponent(serverId)}`);
    const dados = await lerJsonSeguro(resposta);
    if (!resposta.ok) throw new Error(dados?.mensagem || `Erro HTTP ${resposta.status}`);

    servidorSelecionado = dados.hospedagem;
    configServidor = { gerais: null, temSenha: false, helicrash: null, admins: [], checklist: [], bloqueios: [] };
    preencherServidorSelecionado();
    trocarPagina(el.paginaConfigServidor);
    abrirConfig(null);
    await carregarConfigServidor();
  } catch (erro) {
    mostrarMensagem(el.mensagemServidores, erro.message || "Não foi possível abrir este servidor.", "error");
  }
}

function preencherServidorSelecionado() {
  const s = servidorSelecionado;
  if (!s) return;
  el.tituloServidorSelecionado.textContent = s.nome || "Servidor";
  el.descricaoServidorSelecionado.textContent = s.descricao || "";
  el.idServidorSelecionado.textContent = s.id || "—";
  el.photonServidorSelecionado.value = s.photonAppId || "";
  ocultarPhotonAppId();
  el.firebaseServidorSelecionado.value = s.urlFirebase || "";
  ocultarFirebaseUrl();
  ocultarMensagem(el.mensagemConexaoServidor);
  renderizarConfigServidor();
}

function abrirConfig(nome) {
  configAtual = nome || null;
  $$('.config-tab').forEach((b) => b.classList.toggle("active", b.dataset.config === configAtual));
  $$('.config-panel').forEach((p) => p.classList.add("hidden"));
  el.configInicial.classList.toggle("hidden", !!configAtual);
  if (configAtual) $(`#config-${configAtual}`)?.classList.remove("hidden");
  renderizarConfigServidor();
}

async function criarHospedagem(evento) {
  evento.preventDefault();
  if (!usuarioAtual) return mostrarLogin();

  if (!permissaoHospedagem.codigoAtivo) {
    return mostrarMensagem(
      el.mensagemFormulario,
      "Você precisa ter o Código de Hospedagem Mensal ativo para hospedar um servidor.",
      "error"
    );
  }

  if (permissaoHospedagem.limiteAtingido) {
    return mostrarMensagem(
      el.mensagemFormulario,
      "Sua conta já possui uma hospedagem. O limite atual é de 1 servidor.",
      "error"
    );
  }

  const servidor = {
    nome: $("#nomeServidor").value.trim(),
    descricao: $("#descricaoServidor").value.trim(),
    photonAppId: $("#photonAppId").value.trim(),
    urlFirebase: $("#databaseUrl").value.trim()
  };

  const erro = validarDadosServidor(servidor);
  if (erro) return mostrarMensagem(el.mensagemFormulario, erro, "error");

  const botao = el.formServidor.querySelector('button[type="submit"]');
  definirBotaoOcupado(botao, true, "Hospedando...");
  ocultarMensagem(el.mensagemFormulario);

  try {
    const resposta = await fetchAutenticado('/api/hospedagens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(servidor)
    });
    const dados = await lerJsonSeguro(resposta);
    if (!resposta.ok) throw new Error(dados?.mensagem || `Erro HTTP ${resposta.status}`);

    el.formServidor.reset();
    ocultarDatabaseUrlHospedagem();
    ocultarPhotonHospedagem();
    el.contadorDescricao.textContent = "0";
    mostrarMensagem(el.mensagemFormulario, "Servidor hospedado com sucesso.", "success");

    await carregarMinhasHospedagens();
    await abrirServidor(dados.serverId);
  } catch (erroBackend) {
    mostrarMensagem(el.mensagemFormulario, erroBackend.message || "Não foi possível hospedar o servidor.", "error");
  } finally {
    definirBotaoOcupado(botao, false, "Hospedar servidor");
  }
}

function validarDadosServidor(servidor) {
  if (!servidor.nome) return "Informe o nome do servidor.";
  if (!servidor.descricao) return "Informe a descrição do servidor.";
  if (!/^https:\/\/.+firebaseio\.com\/?$/i.test(servidor.urlFirebase) &&
      !/^https:\/\/.+firebasedatabase\.app\/?$/i.test(servidor.urlFirebase)) {
    return "Informe uma URL válida do Firebase Realtime Database.";
  }
  if (servidor.photonAppId.length < 10) return "Informe o Photon App ID.";
  return "";
}

async function carregarConfigServidor() {
  if (!servidorSelecionado?.id) return;

  ocultarMensagem(el.mensagemConfiguracoes);
  ocultarMensagem(el.mensagemEvento);
  ocultarMensagem(el.mensagemAdmin);
  ocultarMensagem(el.mensagemChecklist);
  ocultarMensagem(el.mensagemBloqueios);

  el.estadoConfiguracoes.innerHTML = `
    <div class="loading-dot"></div>
    <strong>Carregando configurações...</strong>
    <span>Lendo os dados salvos no Firebase deste servidor.</span>`;

  el.estadoHelicrash.innerHTML = `
    <div class="loading-dot"></div>
    <strong>Carregando evento...</strong>
    <span>Lendo os dados salvos no Firebase deste servidor.</span>`;
  el.listaAdmins.innerHTML = `
    <div class="empty-state compact-state">
      <div class="loading-dot"></div>
      <strong>Carregando admins...</strong>
      <span>Lendo os dados salvos no Firebase deste servidor.</span>
    </div>`;
  el.listaChecklist.innerHTML = `
    <div class="empty-state compact-state">
      <div class="loading-dot"></div>
      <strong>Carregando CheckList...</strong>
      <span>Lendo os membros permitidos neste servidor.</span>
    </div>`;
  el.listaBloqueios.innerHTML = `
    <div class="empty-state compact-state">
      <div class="loading-dot"></div>
      <strong>Carregando bloqueios...</strong>
      <span>Lendo o nó BLOQUEIOS deste servidor.</span>
    </div>`;

  try {
    const resposta = await fetchAutenticado(
      `/api/hospedagens/${encodeURIComponent(servidorSelecionado.id)}/configuracao`
    );
    const dados = await lerJsonSeguro(resposta);
    if (!resposta.ok) throw new Error(dados?.mensagem || `Erro HTTP ${resposta.status}`);

    configServidor = {
      gerais: dados?.gerais && typeof dados.gerais === "object" ? dados.gerais : null,
      temSenha: dados?.temSenha === true,
      helicrash: dados?.helicrash || null,
      admins: Array.isArray(dados?.admins) ? dados.admins : [],
      checklist: Array.isArray(dados?.checklist) ? dados.checklist : [],
      bloqueios: Array.isArray(dados?.bloqueios) ? dados.bloqueios : []
    };
    renderizarConfigServidor();
  } catch (erro) {
    configServidor = { gerais: null, temSenha: false, helicrash: null, admins: [], checklist: [], bloqueios: [] };
    renderizarConfigServidor();
    const texto = erro.message || "Não foi possível acessar o Firebase deste servidor.";
    mostrarMensagem(el.mensagemConfiguracoes, texto, "error");
    mostrarMensagem(el.mensagemEvento, texto, "error");
    mostrarMensagem(el.mensagemAdmin, texto, "error");
    mostrarMensagem(el.mensagemChecklist, texto, "error");
    mostrarMensagem(el.mensagemBloqueios, texto, "error");
  }
}

function renderizarBotaoStatusServidor(online) {
  const botao = el.botaoStatusServidor;
  if (!botao) return;

  botao.classList.remove("online", "offline", "loading");

  if (online === null) {
    botao.disabled = true;
    botao.classList.add("loading");
    botao.textContent = "CARREGANDO...";
    return;
  }

  botao.disabled = false;
  botao.classList.add(online ? "online" : "offline");
  botao.textContent = online ? "● ONLINE" : "● OFFLINE";
  botao.title = online
    ? "Clique para deixar o servidor offline"
    : "Clique para deixar o servidor online";
}

async function alternarStatusServidor() {
  if (!servidorSelecionado?.id || !configServidor?.gerais) return;

  const atual = configServidor.gerais.servidorOnline !== false;
  const novoStatus = !atual;
  const botao = el.botaoStatusServidor;

  botao.disabled = true;
  botao.textContent = novoStatus ? "ATIVANDO..." : "DESATIVANDO...";

  try {
    const resposta = await fetchAutenticado(
      `/api/hospedagens/${encodeURIComponent(servidorSelecionado.id)}/status-servidor`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ servidorOnline: novoStatus })
      }
    );
    const dados = await lerJsonSeguro(resposta);
    if (!resposta.ok) throw new Error(dados?.mensagem || `Erro HTTP ${resposta.status}`);

    configServidor.gerais.servidorOnline = novoStatus;
    renderizarConfigServidor();
  } catch (erro) {
    renderizarBotaoStatusServidor(atual);
    mostrarMensagem(
      el.mensagemConfiguracoes,
      erro.message || "Não foi possível alterar o status do servidor.",
      "error"
    );
  }
}

async function salvarConfiguracoesRemotas(evento) {
  evento.preventDefault();
  if (!servidorSelecionado?.id) return;

  const tipoVisao = el.tipoVisao.value;
  const tempoSpawnItensMinutos = Number(el.tempoSpawnItens.value);
  const checkListMembros = el.checkListMembros.value === "true";
  const comZumbis = el.modoZumbis.value === "true";
  const servidorOnline = configServidor?.gerais?.servidorOnline !== false;
  const modoJogo = el.modoJogo.value;
  const necessitaSenha = el.modoSenha.value === "true";
  const senha = el.senhaServidor.value.trim();

  if (!["PrimeiraPessoa", "TerceiraPessoa"].includes(tipoVisao)) {
    return mostrarMensagem(el.mensagemConfiguracoes, "Escolha um tipo de visão válido.", "error");
  }

  if (!Number.isInteger(tempoSpawnItensMinutos) || tempoSpawnItensMinutos < 1 || tempoSpawnItensMinutos > 1440) {
    return mostrarMensagem(el.mensagemConfiguracoes, "Informe um tempo de spawn entre 1 e 1440 minutos.", "error");
  }

  if (!["PVP", "PVE"].includes(modoJogo)) {
    return mostrarMensagem(el.mensagemConfiguracoes, "Escolha PvP ou PvE.", "error");
  }

  if (necessitaSenha && !configServidor.temSenha && (senha.length < 4 || senha.length > 32)) {
    return mostrarMensagem(el.mensagemConfiguracoes, "Defina uma senha entre 4 e 32 caracteres para ativar a proteção.", "error");
  }

  if (necessitaSenha && senha.length > 0 && (senha.length < 4 || senha.length > 32)) {
    return mostrarMensagem(el.mensagemConfiguracoes, "A senha deve ter entre 4 e 32 caracteres.", "error");
  }

  const botao = el.formConfiguracoes.querySelector('button[type="submit"]');
  definirBotaoOcupado(botao, true, "Salvando...");
  ocultarMensagem(el.mensagemConfiguracoes);

  try {
    const resposta = await fetchAutenticado(
      `/api/hospedagens/${encodeURIComponent(servidorSelecionado.id)}/configuracoes-gerais`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipoVisao, tempoSpawnItensMinutos, checkListMembros, comZumbis, servidorOnline, modoJogo })
      }
    );
    const dados = await lerJsonSeguro(resposta);
    if (!resposta.ok) throw new Error(dados?.mensagem || `Erro HTTP ${resposta.status}`);

    configServidor.gerais = dados?.configuracoes || { tipoVisao, tempoSpawnItensMinutos, checkListMembros, comZumbis, servidorOnline, modoJogo };

    if (necessitaSenha) {
      if (!configServidor.temSenha || senha.length > 0) {
        const respostaSenha = await fetchAutenticado(
          `/api/hospedagens/${encodeURIComponent(servidorSelecionado.id)}/senha`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ senha })
          }
        );
        const dadosSenha = await lerJsonSeguro(respostaSenha);
        if (!respostaSenha.ok) throw new Error(dadosSenha?.mensagem || `Erro HTTP ${respostaSenha.status}`);
        configServidor.temSenha = true;
      } else {
        configServidor.temSenha = true;
      }
    } else {
      if (configServidor.temSenha) {
        const respostaSemSenha = await fetchAutenticado(
          `/api/hospedagens/${encodeURIComponent(servidorSelecionado.id)}/senha`,
          { method: "DELETE" }
        );
        const dadosSemSenha = await lerJsonSeguro(respostaSemSenha);
        if (!respostaSemSenha.ok) throw new Error(dadosSemSenha?.mensagem || `Erro HTTP ${respostaSemSenha.status}`);
      }
      configServidor.temSenha = false;
    }

    el.senhaServidor.value = "";
    mostrarMensagem(el.mensagemConfiguracoes, "Configurações salvas no Firebase deste servidor.", "success");
    renderizarConfigServidor();
    await carregarConfigServidor();
  } catch (erro) {
    mostrarMensagem(el.mensagemConfiguracoes, erro.message || "Não foi possível salvar as configurações.", "error");
  } finally {
    definirBotaoOcupado(botao, false, "Salvar configurações");
  }
}


async function salvarHelicrashRemoto(evento) {
  evento.preventDefault();
  if (!servidorSelecionado?.id) return;

  const tempo = Number(el.tempoHelicrash.value);
  if (![5, 10, 20].includes(tempo)) {
    return mostrarMensagem(el.mensagemEvento, "Escolha 5, 10 ou 20 minutos.", "error");
  }

  const botao = el.formEvento.querySelector('button[type="submit"]');
  definirBotaoOcupado(botao, true, "Salvando...");
  ocultarMensagem(el.mensagemEvento);

  try {
    const resposta = await fetchAutenticado(
      `/api/hospedagens/${encodeURIComponent(servidorSelecionado.id)}/eventos/helicrash`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intervaloMinutos: tempo })
      }
    );
    const dados = await lerJsonSeguro(resposta);
    if (!resposta.ok) throw new Error(dados?.mensagem || `Erro HTTP ${resposta.status}`);

    configServidor.helicrash = dados?.helicrash || { ativo: true, intervaloMinutos: tempo };
    mostrarMensagem(el.mensagemEvento, `Helicrash salvo no Firebase deste servidor: ${tempo} minutos.`, "success");
    renderizarConfigServidor();
    await carregarConfigServidor();
  } catch (erro) {
    mostrarMensagem(el.mensagemEvento, erro.message || "Não foi possível salvar o Helicrash.", "error");
  } finally {
    definirBotaoOcupado(botao, false, "Salvar Helicrash");
  }
}

async function adicionarAdminRemoto(evento) {
  evento.preventDefault();
  if (!servidorSelecionado?.id) return;

  const nick = el.nomeAdmin.value.trim();
  if (!nick) return mostrarMensagem(el.mensagemAdmin, "Informe o nick do administrador.", "error");

  const jaExiste = configServidor.admins.some((x) => x.toLowerCase() === nick.toLowerCase());
  if (jaExiste) return mostrarMensagem(el.mensagemAdmin, "Esse nick já está na lista.", "error");

  const botao = el.formAdmin.querySelector('button[type="submit"]');
  definirBotaoOcupado(botao, true, "Adicionando...");
  ocultarMensagem(el.mensagemAdmin);

  try {
    const resposta = await fetchAutenticado(
      `/api/hospedagens/${encodeURIComponent(servidorSelecionado.id)}/admins`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nick })
      }
    );
    const dados = await lerJsonSeguro(resposta);
    if (!resposta.ok) throw new Error(dados?.mensagem || `Erro HTTP ${resposta.status}`);

    configServidor.admins.push(dados?.nick || nick);
    el.formAdmin.reset();
    mostrarMensagem(el.mensagemAdmin, `Admin ${nick} salvo no Firebase deste servidor.`, "success");
    renderizarConfigServidor();
    await carregarConfigServidor();
  } catch (erro) {
    mostrarMensagem(el.mensagemAdmin, erro.message || "Não foi possível adicionar o admin.", "error");
  } finally {
    definirBotaoOcupado(botao, false, "Adicionar admin");
  }
}

async function removerAdminRemoto(nick, botao) {
  if (!servidorSelecionado?.id || !nick) return;
  definirBotaoOcupado(botao, true, "Removendo...");
  ocultarMensagem(el.mensagemAdmin);

  try {
    const resposta = await fetchAutenticado(
      `/api/hospedagens/${encodeURIComponent(servidorSelecionado.id)}/admins/${encodeURIComponent(nick)}`,
      { method: "DELETE" }
    );
    const dados = await lerJsonSeguro(resposta);
    if (!resposta.ok) throw new Error(dados?.mensagem || `Erro HTTP ${resposta.status}`);

    configServidor.admins = configServidor.admins.filter((x) => x !== nick);
    mostrarMensagem(el.mensagemAdmin, `Admin ${nick} removido do Firebase deste servidor.`, "success");
    renderizarConfigServidor();
    await carregarConfigServidor();
  } catch (erro) {
    mostrarMensagem(el.mensagemAdmin, erro.message || "Não foi possível remover o admin.", "error");
    definirBotaoOcupado(botao, false, "Remover");
  }
}

async function adicionarChecklistRemota(evento) {
  evento.preventDefault();
  if (!servidorSelecionado?.id) return;

  const nick = el.nomeChecklist.value.trim();
  if (!nick) return mostrarMensagem(el.mensagemChecklist, "Informe o nick do membro.", "error");

  const jaExiste = configServidor.checklist.some((x) => x.toLowerCase() === nick.toLowerCase());
  if (jaExiste) return mostrarMensagem(el.mensagemChecklist, "Esse nick já está na CheckList.", "error");

  const botao = el.formChecklist.querySelector('button[type="submit"]');
  definirBotaoOcupado(botao, true, "Adicionando...");
  ocultarMensagem(el.mensagemChecklist);

  try {
    const resposta = await fetchAutenticado(
      `/api/hospedagens/${encodeURIComponent(servidorSelecionado.id)}/checklist`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nick })
      }
    );
    const dados = await lerJsonSeguro(resposta);
    if (!resposta.ok) throw new Error(dados?.mensagem || `Erro HTTP ${resposta.status}`);

    configServidor.checklist.push(dados?.nick || nick);
    el.formChecklist.reset();
    mostrarMensagem(el.mensagemChecklist, `${nick} adicionado à CheckList deste servidor.`, "success");
    renderizarConfigServidor();
    await carregarConfigServidor();
  } catch (erro) {
    mostrarMensagem(el.mensagemChecklist, erro.message || "Não foi possível adicionar o membro.", "error");
  } finally {
    definirBotaoOcupado(botao, false, "Adicionar à CheckList");
  }
}

async function removerChecklistRemota(nick, botao) {
  if (!servidorSelecionado?.id || !nick) return;
  definirBotaoOcupado(botao, true, "Removendo...");
  ocultarMensagem(el.mensagemChecklist);

  try {
    const resposta = await fetchAutenticado(
      `/api/hospedagens/${encodeURIComponent(servidorSelecionado.id)}/checklist/${encodeURIComponent(nick)}`,
      { method: "DELETE" }
    );
    const dados = await lerJsonSeguro(resposta);
    if (!resposta.ok) throw new Error(dados?.mensagem || `Erro HTTP ${resposta.status}`);

    configServidor.checklist = configServidor.checklist.filter((x) => x !== nick);
    mostrarMensagem(el.mensagemChecklist, `${nick} removido da CheckList deste servidor.`, "success");
    renderizarConfigServidor();
    await carregarConfigServidor();
  } catch (erro) {
    mostrarMensagem(el.mensagemChecklist, erro.message || "Não foi possível remover o membro.", "error");
    definirBotaoOcupado(botao, false, "Remover");
  }
}

async function removerBloqueioRemoto(nick, botao) {
  if (!servidorSelecionado?.id || !nick) return;

  definirBotaoOcupado(botao, true, "...");
  ocultarMensagem(el.mensagemBloqueios);

  try {
    const resposta = await fetchAutenticado(
      `/api/hospedagens/${encodeURIComponent(servidorSelecionado.id)}/bloqueios/${encodeURIComponent(nick)}`,
      { method: "DELETE" }
    );
    const dados = await lerJsonSeguro(resposta);
    if (!resposta.ok) throw new Error(dados?.mensagem || `Erro HTTP ${resposta.status}`);

    configServidor.bloqueios = configServidor.bloqueios.filter((x) => x !== nick);
    mostrarMensagem(el.mensagemBloqueios, `Bloqueio de ${nick} removido.`, "success");
    renderizarConfigServidor();
    await carregarConfigServidor();
  } catch (erro) {
    mostrarMensagem(el.mensagemBloqueios, erro.message || "Não foi possível retirar o bloqueio.", "error");
    botao.disabled = false;
    botao.textContent = "✕";
  }
}

function atualizarVisibilidadeSenhaConfiguracao() {
  const necessitaSenha = el.modoSenha.value === "true";
  el.grupoSenhaConfiguracao.classList.toggle("hidden", !necessitaSenha);

  if (necessitaSenha) {
    el.ajudaSenhaConfiguracao.textContent = configServidor.temSenha
      ? "Esse servidor já tem senha. Digite uma nova senha somente se quiser redefinir."
      : "Crie uma senha de 4 a 32 caracteres para o servidor.";
    el.senhaServidor.placeholder = configServidor.temSenha
      ? "Digite uma nova senha se quiser redefinir"
      : "Digite uma senha de 4 a 32 caracteres";
  } else {
    el.senhaServidor.value = "";
  }
}

function renderizarConfigServidor() {
  const gerais = configServidor?.gerais;
  const tipoVisao = gerais?.tipoVisao;
  const tempoSpawnItensMinutos = Number(gerais?.tempoSpawnItensMinutos);
  const checkListMembros = gerais?.checkListMembros === true;
  const comZumbis = gerais?.comZumbis !== false;
  const servidorOnline = gerais?.servidorOnline !== false;
  const modoJogo = ["PVP", "PVE"].includes(gerais?.modoJogo) ? gerais.modoJogo : "PVP";
  const temSenha = configServidor?.temSenha === true;

  renderizarBotaoStatusServidor(gerais ? servidorOnline : null);

  if (["PrimeiraPessoa", "TerceiraPessoa"].includes(tipoVisao) && Number.isInteger(tempoSpawnItensMinutos) && tempoSpawnItensMinutos > 0) {
    el.tipoVisao.value = tipoVisao;
    el.tempoSpawnItens.value = String(tempoSpawnItensMinutos);
    el.checkListMembros.value = checkListMembros ? "true" : "false";
    el.modoZumbis.value = comZumbis ? "true" : "false";
    el.modoJogo.value = modoJogo;
    const textoVisao = tipoVisao === "PrimeiraPessoa" ? "Somente primeira pessoa" : "Terceira pessoa";
    const textoLista = checkListMembros ? "Check List Membros ativada" : "Check List Membros desativada";
    const textoZumbis = comZumbis ? "Com zumbis" : "Sem zumbis";
    const textoStatus = servidorOnline ? "Online" : "Offline";
    const textoModo = modoJogo === "PVE" ? "PvE" : "PvP";
    el.estadoConfiguracoes.innerHTML = `
      <div class="event-status-icon">✓</div>
      <strong>Configurações salvas</strong>
      <span>${textoStatus} • ${textoModo} • ${textoVisao} • ${textoZumbis} • Itens a cada ${tempoSpawnItensMinutos} minutos • ${textoLista} • ${temSenha ? "Necessita senha" : "Sem senha"}.</span>`;
  } else {
    el.estadoConfiguracoes.innerHTML = `
      <div class="empty-icon">⚙</div>
      <strong>Não configurado</strong>
      <span>Escolha o tipo de visão, modo de jogo, zumbis, spawn, checklist e senha.</span>`;
  }

  el.modoSenha.value = temSenha ? "true" : "false";
  atualizarVisibilidadeSenhaConfiguracao();

  const helicrash = configServidor?.helicrash;
  const intervalo = Number(helicrash?.intervaloMinutos);

  if ([5, 10, 20].includes(intervalo)) {
    el.estadoHelicrash.innerHTML = `
      <div class="event-status-icon">✓</div>
      <strong>Helicrash configurado</strong>
      <span>Spawn a cada ${intervalo} minutos.</span>`;
    el.tempoHelicrash.value = String(intervalo);
  } else {
    el.estadoHelicrash.innerHTML = `
      <div class="empty-icon">◫</div>
      <strong>Não configurado</strong>
      <span>Escolha 5, 10 ou 20 minutos.</span>`;
  }

  const admins = Array.isArray(configServidor?.admins) ? configServidor.admins : [];
  el.contadorAdmins.textContent = admins.length;
  if (!admins.length) {
    el.listaAdmins.innerHTML = `
      <div class="empty-state compact-state">
        <div class="empty-icon">♟</div>
        <strong>Nenhum admin adicionado</strong>
        <span>Os nicks salvos no servidor aparecerão aqui.</span>
      </div>`;
  } else {
    el.listaAdmins.innerHTML = "";
    admins.forEach((nick) => {
      const item = document.createElement("article");
      item.className = "admin-item";

      const avatar = document.createElement("div");
      avatar.className = "mini-avatar";
      avatar.textContent = nick.charAt(0).toUpperCase() || "A";

      const nome = document.createElement("strong");
      nome.textContent = nick;

      const remover = document.createElement("button");
      remover.type = "button";
      remover.className = "button danger mini";
      remover.textContent = "Remover";
      remover.addEventListener("click", () => removerAdminRemoto(nick, remover));

      const texto = document.createElement("div");
      texto.className = "admin-copy";
      texto.append(nome);

      item.append(avatar, texto, remover);
      el.listaAdmins.append(item);
    });
  }

  const checklist = Array.isArray(configServidor?.checklist) ? configServidor.checklist : [];
  el.contadorChecklist.textContent = checklist.length;
  if (!checklist.length) {
    el.listaChecklist.innerHTML = `
      <div class="empty-state compact-state">
        <div class="empty-icon">✓</div>
        <strong>Nenhum membro na CheckList</strong>
        <span>Adicione os nicks que poderão entrar quando a lista estiver ativada.</span>
      </div>`;
  } else {
    el.listaChecklist.innerHTML = "";
    checklist.forEach((nick) => {
      const item = document.createElement("article");
      item.className = "admin-item";

      const avatar = document.createElement("div");
      avatar.className = "mini-avatar";
      avatar.textContent = nick.charAt(0).toUpperCase() || "M";

      const texto = document.createElement("div");
      texto.className = "admin-copy";
      const nome = document.createElement("strong");
      nome.textContent = nick;
      const subtitulo = document.createElement("span");
      subtitulo.textContent = "Permitido para conexão";
      texto.append(nome, subtitulo);

      const remover = document.createElement("button");
      remover.type = "button";
      remover.className = "button danger mini";
      remover.textContent = "Remover";
      remover.addEventListener("click", () => removerChecklistRemota(nick, remover));

      item.append(avatar, texto, remover);
      el.listaChecklist.append(item);
    });
  }

  const bloqueios = Array.isArray(configServidor?.bloqueios) ? configServidor.bloqueios : [];
  el.contadorBloqueios.textContent = bloqueios.length;

  if (!bloqueios.length) {
    el.listaBloqueios.innerHTML = `
      <div class="empty-state compact-state">
        <div class="empty-icon">✓</div>
        <strong>Nenhum jogador bloqueado</strong>
        <span>Os nomes encontrados em BLOQUEIOS aparecerão aqui.</span>
      </div>`;
  } else {
    el.listaBloqueios.innerHTML = "";
    bloqueios.forEach((nick) => {
      const item = document.createElement("article");
      item.className = "admin-item bloqueio-item";

      const avatar = document.createElement("div");
      avatar.className = "mini-avatar bloqueio-avatar";
      avatar.textContent = nick.charAt(0).toUpperCase() || "B";

      const texto = document.createElement("div");
      texto.className = "admin-copy";
      const nome = document.createElement("strong");
      nome.textContent = nick;
      const subtitulo = document.createElement("span");
      subtitulo.textContent = "Bloqueado neste servidor";
      texto.append(nome, subtitulo);

      const remover = document.createElement("button");
      remover.type = "button";
      remover.className = "block-remove-button";
      remover.textContent = "✕";
      remover.title = `Retirar bloqueio de ${nick}`;
      remover.setAttribute("aria-label", `Retirar bloqueio de ${nick}`);
      remover.addEventListener("click", () => removerBloqueioRemoto(nick, remover));

      item.append(avatar, texto, remover);
      el.listaBloqueios.append(item);
    });
  }

}

async function fetchAutenticado(url, opcoes = {}) {
  if (!usuarioAtual) throw new Error('Faça login novamente.');
  const token = await usuarioAtual.getIdToken(true);
  const headers = new Headers(opcoes.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  return fetch(url, { ...opcoes, headers });
}

async function lerJsonSeguro(resposta) {
  try { return await resposta.json(); } catch (_) { return null; }
}

function definirBotaoOcupado(botao, ocupado, texto) {
  botao.disabled = ocupado;
  const span = botao.querySelector("span");
  if (span) span.textContent = texto;
  else botao.textContent = texto;
}

function mostrarMensagem(elemento, texto, tipo = "neutral") {
  elemento.textContent = texto;
  elemento.className = `message ${tipo}`;
}

function ocultarMensagem(elemento) {
  elemento.textContent = "";
  elemento.className = "message hidden";
}

function traduzirErroFirebase(erro) {
  const codigo = erro?.code || "";
  const mensagens = {
    "auth/popup-closed-by-user": "A janela do Google foi fechada antes de concluir o login.",
    "auth/cancelled-popup-request": "A tentativa anterior de login foi cancelada.",
    "auth/popup-blocked": "O navegador bloqueou a janela do Google. Libere pop-ups para localhost.",
    "auth/unauthorized-domain": "localhost não está autorizado no Firebase Authentication.",
    "auth/network-request-failed": "Falha de internet ao conectar com o Google."
  };
  return mensagens[codigo] || `Não foi possível entrar com o Google${codigo ? ` (${codigo})` : ""}.`;
}

function encurtarId(id) {
  if (!id) return "—";
  return id.length > 15 ? `${id.slice(0, 8)}…${id.slice(-5)}` : id;
}

function escapeHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
