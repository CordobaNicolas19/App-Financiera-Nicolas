'use strict';

/* =========================================================
   Control Financiero — lógica de la aplicación
   Todo se guarda en el navegador (localStorage), sin servidor.
   ========================================================= */

// ----- Configuración -----
const CLAVE_MOVIMIENTOS = 'controlFinanciero.movimientos';
const CLAVE_PRESUPUESTO = 'controlFinanciero.presupuesto';

const CATEGORIAS = {
  gasto: ['Alimentación', 'Transporte', 'Vivienda', 'Entretenimiento', 'Salud'],
  ingreso: ['Salario', 'Otros ingresos'],
};

const COLORES_CATEGORIA = {
  'Alimentación': '#f59e0b',
  'Transporte': '#3b82f6',
  'Vivienda': '#8b5cf6',
  'Entretenimiento': '#ec4899',
  'Salud': '#14b8a6',
  'Salario': '#16a34a',
  'Otros ingresos': '#65a30d',
};

const ICONOS_CATEGORIA = {
  'Alimentación': '🍽️',
  'Transporte': '🚌',
  'Vivienda': '🏠',
  'Entretenimiento': '🎬',
  'Salud': '💊',
  'Salario': '💼',
  'Otros ingresos': '💵',
};

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// Campos de cada formulario. Los id del HTML son "<formulario>-<campo>", por ejemplo "ingreso-fuente".
const CAMPOS = {
  ingreso: ['concepto', 'valor', 'categoria', 'fuente', 'fecha'],
  gasto: ['concepto', 'valor', 'categoria', 'fecha'],
  presupuesto: ['monto'],
};

// A partir de este porcentaje del presupuesto se muestra la alerta amarilla.
const LIMITE_ALERTA = 0.8;

// ----- Elementos de la página -----
const formIngreso = document.getElementById('form-ingreso');
const formGasto = document.getElementById('form-gasto');
const formPresupuesto = document.getElementById('form-presupuesto');
const botonQuitarPresupuesto = document.getElementById('quitar-presupuesto');
const pestanas = [...document.querySelectorAll('.pestana')];
const panelPresupuesto = document.getElementById('presupuesto-panel');
const lista = document.getElementById('lista');
const listaVacia = document.getElementById('lista-vacia');
const contador = document.getElementById('contador');
const contenedorGrafico = document.getElementById('grafico-gastos');
const contenedorComparacion = document.getElementById('comparacion');
const contenedorNotificaciones = document.getElementById('notificaciones');
const modal = document.getElementById('modal');
const modalTitulo = document.getElementById('modal-titulo');
const modalTexto = document.getElementById('modal-texto');
const modalCancelar = document.getElementById('modal-cancelar');
const modalConfirmar = document.getElementById('modal-confirmar');

// ----- Estado -----
let movimientos = cargarMovimientos();
let presupuesto = cargarPresupuesto();
let filtroActual = 'todos';
let accionPorConfirmar = null;
let elementoAntesDelModal = null;

/* =========================================================
   Guardado en el navegador
   ========================================================= */
function cargarMovimientos() {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE_MOVIMIENTOS));
    return Array.isArray(datos) ? datos.map(actualizarFormato).filter(esMovimientoValido) : [];
  } catch {
    return [];
  }
}

// La primera versión guardaba "descripcion"; ahora el campo se llama "concepto".
function actualizarFormato(m) {
  if (m && m.concepto === undefined && typeof m.descripcion === 'string') {
    const { descripcion, ...resto } = m;
    return { ...resto, concepto: descripcion };
  }
  return m;
}

function esMovimientoValido(m) {
  return Boolean(m)
    && (m.tipo === 'ingreso' || m.tipo === 'gasto')
    && typeof m.concepto === 'string'
    && typeof m.valor === 'number' && m.valor > 0
    && typeof m.categoria === 'string'
    && typeof m.fecha === 'string';
}

function cargarPresupuesto() {
  try {
    const valor = Number(localStorage.getItem(CLAVE_PRESUPUESTO));
    return valor > 0 ? valor : null;
  } catch {
    return null;
  }
}

// Guarda un valor en el navegador; con null lo borra. Devuelve false si no se pudo.
function guardarEnNavegador(clave, valor) {
  try {
    if (valor === null) localStorage.removeItem(clave);
    else localStorage.setItem(clave, JSON.stringify(valor));
    return true;
  } catch {
    mostrarNotificacion('No se pudieron guardar los datos en este navegador. Revisa que no estés en modo incógnito.', 'error');
    return false;
  }
}

/* =========================================================
   Formatos (pesos colombianos y fechas)
   ========================================================= */
function separarMiles(numero) {
  return String(numero).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function formatearPesos(valor) {
  const signo = valor < 0 ? '-' : '';
  return `${signo}$${separarMiles(Math.round(Math.abs(valor)))}`;
}

function formatearFecha(fechaIso) {
  const [anio, mes, dia] = fechaIso.split('-');
  return `${Number(dia)} ${MESES[Number(mes) - 1]} ${anio}`;
}

function fechaDeHoy() {
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${hoy.getFullYear()}-${mes}-${dia}`;
}

// Mes actual en formato "2026-10".
function mesActual() {
  return fechaDeHoy().slice(0, 7);
}

function nombreDelMes(anioMes) {
  const [anio, mes] = anioMes.split('-');
  return `${MESES_LARGOS[Number(mes) - 1]} ${anio}`;
}

/* =========================================================
   Formularios
   ========================================================= */
function campo(formulario, nombre) {
  return document.getElementById(`${formulario}-${nombre}`);
}

function llenarCategorias(tipo) {
  const select = campo(tipo, 'categoria');
  select.replaceChildren(new Option('Selecciona una categoría', ''));
  for (const categoria of CATEGORIAS[tipo]) {
    select.append(new Option(categoria, categoria));
  }
}

// Convierte el texto de un campo de dinero en número. Devuelve null si está vacío.
function leerValor(texto) {
  const limpio = texto.trim();
  if (!limpio) return null;
  const numero = Number(limpio.replace(/\D/g, ''));
  return limpio.startsWith('-') ? -numero : numero;
}

function validarMovimiento(datos) {
  const errores = {};
  if (!datos.concepto) {
    errores.concepto = 'Escribe el concepto.';
  }
  if (datos.valor === null) {
    errores.valor = 'Escribe el valor.';
  } else if (!(datos.valor > 0)) {
    errores.valor = 'El valor debe ser mayor a 0.';
  }
  if (!datos.categoria) {
    errores.categoria = 'Selecciona una categoría.';
  } else if (!CATEGORIAS[datos.tipo].includes(datos.categoria)) {
    errores.categoria = 'La categoría no corresponde a este formulario.';
  }
  if (datos.tipo === 'ingreso' && !datos.fuente) {
    errores.fuente = 'Escribe de dónde viene el ingreso.';
  }
  if (!datos.fecha) {
    errores.fecha = 'Selecciona una fecha.';
  }
  return errores;
}

function mostrarError(formulario, nombre, mensaje) {
  const elemento = campo(formulario, nombre);
  elemento.closest('.campo').classList.toggle('campo--error', Boolean(mensaje));
  elemento.setAttribute('aria-invalid', mensaje ? 'true' : 'false');
  document.getElementById(`error-${formulario}-${nombre}`).textContent = mensaje || '';
}

// Marca los errores en pantalla. Devuelve true si hay alguno.
function hayErrores(formulario, errores) {
  for (const nombre of CAMPOS[formulario]) mostrarError(formulario, nombre, errores[nombre]);

  const conError = Object.keys(errores);
  if (conError.length === 0) return false;

  const mensaje = conError.length === 1 ? errores[conError[0]] : 'Revisa los campos marcados en rojo.';
  mostrarNotificacion(mensaje, 'error');
  campo(formulario, conError[0]).focus();
  return true;
}

function registrarMovimiento(evento) {
  evento.preventDefault();
  const tipo = evento.currentTarget.dataset.tipo;

  const datos = {
    tipo,
    concepto: campo(tipo, 'concepto').value.trim(),
    valor: leerValor(campo(tipo, 'valor').value),
    categoria: campo(tipo, 'categoria').value,
    fecha: campo(tipo, 'fecha').value,
  };
  if (tipo === 'ingreso') datos.fuente = campo(tipo, 'fuente').value.trim();

  if (hayErrores(tipo, validarMovimiento(datos))) return;

  const gastadoAntes = gastadoEnElMes();
  movimientos.push({ id: crearId(), ...datos, creado: Date.now() });
  if (!guardarEnNavegador(CLAVE_MOVIMIENTOS, movimientos)) {
    movimientos.pop();
    return;
  }
  render();

  const nombreTipo = tipo === 'ingreso' ? 'Ingreso' : 'Gasto';
  mostrarNotificacion(`${nombreTipo} registrado: "${datos.concepto}" por ${formatearPesos(datos.valor)}.`, 'exito');
  if (tipo === 'gasto') avisarCambioDePresupuesto(gastadoAntes, gastadoEnElMes());

  // Se limpian los campos pero se conserva la fecha para registrar varios seguidos.
  for (const nombre of CAMPOS[tipo]) {
    if (nombre !== 'fecha') campo(tipo, nombre).value = '';
  }
  campo(tipo, 'concepto').focus();
}

function crearId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* =========================================================
   Presupuesto mensual
   ========================================================= */
function gastadoEnElMes(anioMes = mesActual()) {
  return movimientos
    .filter((m) => m.tipo === 'gasto' && m.fecha.startsWith(anioMes))
    .reduce((suma, m) => suma + m.valor, 0);
}

function guardarPresupuesto(evento) {
  evento.preventDefault();
  const monto = leerValor(campo('presupuesto', 'monto').value);

  const errores = {};
  if (monto === null) {
    errores.monto = 'Escribe el monto del presupuesto.';
  } else if (!(monto > 0)) {
    errores.monto = 'El presupuesto debe ser mayor a 0.';
  }
  if (hayErrores('presupuesto', errores)) return;

  const anterior = presupuesto;
  presupuesto = monto;
  if (!guardarEnNavegador(CLAVE_PRESUPUESTO, presupuesto)) {
    presupuesto = anterior;
    return;
  }
  render();
  mostrarNotificacion(`Presupuesto guardado: ${formatearPesos(monto)} al mes.`, 'exito');
}

function quitarPresupuesto() {
  pedirConfirmacion({
    titulo: '¿Quitar el presupuesto?',
    texto: `Se borrará el presupuesto mensual de ${formatearPesos(presupuesto)}. Tus movimientos no se modifican.`,
    textoBoton: 'Sí, quitar',
    alConfirmar: () => {
      const anterior = presupuesto;
      presupuesto = null;
      if (!guardarEnNavegador(CLAVE_PRESUPUESTO, null)) {
        presupuesto = anterior;
        return;
      }
      campo('presupuesto', 'monto').value = '';
      render();
      mostrarNotificacion('Presupuesto eliminado.', 'exito');
    },
  });
}

// Avisa cuando un gasto nuevo hace cruzar el 80 % o el 100 % del presupuesto.
function avisarCambioDePresupuesto(antes, despues) {
  if (!presupuesto) return;
  const limiteAlerta = presupuesto * LIMITE_ALERTA;
  if (antes <= presupuesto && despues > presupuesto) {
    mostrarNotificacion(`Superaste tu presupuesto de ${nombreDelMes(mesActual())} por ${formatearPesos(despues - presupuesto)}.`, 'alerta');
  } else if (antes < limiteAlerta && despues >= limiteAlerta && despues <= presupuesto) {
    mostrarNotificacion(`Ya usaste el ${Math.round((despues / presupuesto) * 100)}% de tu presupuesto del mes.`, 'alerta');
  }
}

function abrirFormularioPresupuesto() {
  activarPestana('presupuesto');
  document.getElementById('seccion-formularios').scrollIntoView({ behavior: 'smooth', block: 'start' });
  campo('presupuesto', 'monto').focus({ preventScroll: true });
}

/* =========================================================
   Pestañas de los formularios
   ========================================================= */
function activarPestana(nombre, enfocar = false) {
  for (const pestana of pestanas) {
    const activa = pestana.dataset.pestana === nombre;
    pestana.setAttribute('aria-selected', String(activa));
    pestana.tabIndex = activa ? 0 : -1;
    document.getElementById(pestana.getAttribute('aria-controls')).hidden = !activa;
    if (activa && enfocar) pestana.focus();
  }
}

/* =========================================================
   Pintar la pantalla
   ========================================================= */
function render() {
  const totales = calcularTotales();
  renderTotales(totales);
  renderPresupuesto();
  renderGrafico();
  renderComparacion(totales);
  renderLista();
  botonQuitarPresupuesto.hidden = !presupuesto;
}

function calcularTotales() {
  let ingresos = 0;
  let gastos = 0;
  for (const m of movimientos) {
    if (m.tipo === 'ingreso') ingresos += m.valor;
    else gastos += m.valor;
  }
  return { ingresos, gastos, saldo: ingresos - gastos };
}

function renderTotales({ ingresos, gastos, saldo }) {
  document.getElementById('total-ingresos').textContent = formatearPesos(ingresos);
  document.getElementById('total-gastos').textContent = formatearPesos(gastos);
  document.getElementById('total-saldo').textContent = formatearPesos(saldo);
  document.getElementById('tarjeta-saldo').classList.toggle('saldo-negativo', saldo < 0);
}

// Tarjeta del panel: gastos del mes actual comparados con el presupuesto.
function renderPresupuesto() {
  const titulo = document.createElement('h2');
  titulo.textContent = `Presupuesto de ${nombreDelMes(mesActual())}`;

  if (!presupuesto) {
    const texto = document.createElement('div');
    const ayuda = document.createElement('p');
    ayuda.textContent = 'Aún no defines cuánto quieres gastar este mes.';
    texto.append(titulo, ayuda);
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'boton boton--secundario boton--pequeno';
    boton.textContent = 'Definir presupuesto';
    boton.addEventListener('click', abrirFormularioPresupuesto);
    const contenido = document.createElement('div');
    contenido.className = 'presupuesto__vacio';
    contenido.append(texto, boton);
    panelPresupuesto.replaceChildren(contenido);
    return;
  }

  const gastado = gastadoEnElMes();
  const porcentaje = (gastado / presupuesto) * 100;
  let estado = 'ok';
  if (porcentaje > 100) estado = 'excedido';
  else if (porcentaje >= LIMITE_ALERTA * 100) estado = 'alerta';

  const encabezado = document.createElement('div');
  const subtitulo = document.createElement('p');
  subtitulo.className = 'presupuesto__sub';
  subtitulo.textContent = 'Gastado este mes vs. lo planeado';
  encabezado.append(titulo, subtitulo);

  const cifras = document.createElement('strong');
  cifras.className = 'presupuesto__cifras';
  cifras.textContent = `${formatearPesos(gastado)} `;
  const deTotal = document.createElement('span');
  deTotal.textContent = `de ${formatearPesos(presupuesto)}`;
  cifras.append(deTotal);

  const cabecera = document.createElement('div');
  cabecera.className = 'presupuesto__cabecera';
  cabecera.append(encabezado, cifras);

  const barra = document.createElement('div');
  barra.className = 'barra barra--grande';
  barra.setAttribute('role', 'progressbar');
  barra.setAttribute('aria-label', 'Porcentaje del presupuesto usado');
  barra.setAttribute('aria-valuemin', '0');
  barra.setAttribute('aria-valuemax', '100');
  barra.setAttribute('aria-valuenow', String(Math.min(Math.round(porcentaje), 100)));
  const relleno = document.createElement('div');
  relleno.className = `barra__relleno barra__relleno--${estado}`;
  relleno.style.width = `${Math.min(porcentaje, 100)}%`;
  barra.append(relleno);

  const nota = document.createElement('p');
  nota.className = `presupuesto__nota presupuesto__nota--${estado}`;
  const restante = presupuesto - gastado;
  if (estado === 'excedido') {
    nota.textContent = `⚠️ Te pasaste del presupuesto por ${formatearPesos(-restante)} (${Math.round(porcentaje)}% usado).`;
  } else if (estado === 'alerta') {
    nota.textContent = `Cuidado: ya usaste el ${Math.round(porcentaje)}%. Te quedan solo ${formatearPesos(restante)}.`;
  } else {
    nota.textContent = `Vas bien: usaste el ${Math.round(porcentaje)}%. Te quedan ${formatearPesos(restante)} para este mes.`;
  }

  panelPresupuesto.replaceChildren(cabecera, barra, nota);
}

// Gráfico de dona dibujado con SVG (sin librerías externas).
function renderGrafico() {
  const porCategoria = CATEGORIAS.gasto
    .map((categoria) => ({
      categoria,
      total: movimientos
        .filter((m) => m.tipo === 'gasto' && m.categoria === categoria)
        .reduce((suma, m) => suma + m.valor, 0),
    }))
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total);

  const totalGastos = porCategoria.reduce((suma, item) => suma + item.total, 0);

  if (totalGastos === 0) {
    contenedorGrafico.replaceChildren(crearTextoVacio('Aún no hay gastos. Cuando registres uno, verás aquí en qué se va tu dinero.'));
    return;
  }

  // Un círculo de radio 15.9155 mide 100 de perímetro: así cada porcentaje
  // se dibuja directamente como longitud del trazo.
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 42 42');
  svg.setAttribute('class', 'dona');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Gráfico de gastos por categoría');

  const crearCirculo = (color) => {
    const circulo = document.createElementNS(NS, 'circle');
    circulo.setAttribute('cx', '21');
    circulo.setAttribute('cy', '21');
    circulo.setAttribute('r', '15.9155');
    circulo.setAttribute('fill', 'none');
    circulo.setAttribute('stroke', color);
    circulo.setAttribute('stroke-width', '6');
    return circulo;
  };

  svg.append(crearCirculo('#eef2f7'));

  const leyenda = document.createElement('ul');
  leyenda.className = 'leyenda';

  let acumulado = 0;
  for (const { categoria, total } of porCategoria) {
    const porcentaje = (total / totalGastos) * 100;
    const color = COLORES_CATEGORIA[categoria];

    const segmento = crearCirculo(color);
    segmento.setAttribute('stroke-dasharray', `${porcentaje} ${100 - porcentaje}`);
    segmento.setAttribute('stroke-dashoffset', String(25 - acumulado));
    const titulo = document.createElementNS(NS, 'title');
    titulo.textContent = `${categoria}: ${formatearPesos(total)}`;
    segmento.append(titulo);
    svg.append(segmento);
    acumulado += porcentaje;

    const fila = document.createElement('li');
    const punto = document.createElement('span');
    punto.className = 'leyenda__punto';
    punto.style.background = color;
    const nombre = document.createElement('span');
    nombre.textContent = `${ICONOS_CATEGORIA[categoria]} ${categoria}`;
    const valor = document.createElement('span');
    valor.className = 'leyenda__valor';
    valor.textContent = formatearPesos(total);
    const pct = document.createElement('span');
    pct.className = 'leyenda__pct';
    pct.textContent = porcentaje < 1 ? '<1%' : `${Math.round(porcentaje)}%`;
    valor.append(pct);
    fila.append(punto, nombre, valor);
    leyenda.append(fila);
  }

  const dona = document.createElement('div');
  dona.className = 'dona-contenedor';
  const centro = document.createElement('div');
  centro.className = 'dona-centro';
  const etiqueta = document.createElement('small');
  etiqueta.textContent = 'Total gastos';
  const monto = document.createElement('strong');
  monto.textContent = formatearPesos(totalGastos);
  centro.append(etiqueta, monto);
  dona.append(svg, centro);

  const grafico = document.createElement('div');
  grafico.className = 'grafico';
  grafico.append(dona, leyenda);
  contenedorGrafico.replaceChildren(grafico);
}

// Barras horizontales: ingresos (verde) contra gastos (rojo).
function renderComparacion({ ingresos, gastos }) {
  const maximo = Math.max(ingresos, gastos);

  const crearFila = (nombre, valor, tipo) => {
    const fila = document.createElement('div');
    fila.className = 'barra-fila';
    const cabecera = document.createElement('div');
    cabecera.className = 'barra-fila__cabecera';
    const etiqueta = document.createElement('span');
    etiqueta.textContent = nombre;
    const monto = document.createElement('strong');
    monto.textContent = formatearPesos(valor);
    cabecera.append(etiqueta, monto);
    const barra = document.createElement('div');
    barra.className = 'barra';
    const relleno = document.createElement('div');
    relleno.className = `barra__relleno barra__relleno--${tipo}`;
    relleno.style.width = maximo > 0 ? `${(valor / maximo) * 100}%` : '0%';
    barra.append(relleno);
    fila.append(cabecera, barra);
    return fila;
  };

  const nota = document.createElement('p');
  nota.className = 'comparacion__nota';
  if (ingresos > 0) {
    nota.textContent = `Has gastado el ${Math.round((gastos / ingresos) * 100)}% de tus ingresos.`;
  } else if (gastos > 0) {
    nota.textContent = 'Tienes gastos pero aún no registras ingresos.';
  } else {
    nota.textContent = 'Registra movimientos para ver la comparación.';
  }

  contenedorComparacion.replaceChildren(
    crearFila('Ingresos', ingresos, 'ingreso'),
    crearFila('Gastos', gastos, 'gasto'),
    nota,
  );
}

function renderLista() {
  const visibles = movimientos
    .filter((m) => filtroActual === 'todos' || m.tipo === filtroActual)
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.creado - a.creado);

  lista.replaceChildren(...visibles.map(crearElementoMovimiento));
  contador.textContent = String(visibles.length);

  listaVacia.hidden = visibles.length > 0;
  if (movimientos.length === 0) {
    listaVacia.textContent = 'Aún no tienes movimientos. Registra el primero con el formulario.';
  } else {
    listaVacia.textContent = filtroActual === 'ingreso'
      ? 'No hay ingresos registrados.'
      : 'No hay gastos registrados.';
  }
}

function crearElementoMovimiento(m) {
  const item = document.createElement('li');
  item.className = `movimiento movimiento--${m.tipo}`;

  const icono = document.createElement('span');
  icono.className = 'movimiento__icono';
  icono.style.setProperty('--color', COLORES_CATEGORIA[m.categoria] || '#94a3b8');
  icono.setAttribute('aria-hidden', 'true');
  icono.textContent = ICONOS_CATEGORIA[m.categoria] || '•';

  const info = document.createElement('div');
  info.className = 'movimiento__info';
  const concepto = document.createElement('p');
  concepto.className = 'movimiento__descripcion';
  concepto.textContent = m.concepto;
  const meta = document.createElement('p');
  meta.className = 'movimiento__meta';
  const detalles = [m.categoria];
  if (m.fuente) detalles.push(`Fuente: ${m.fuente}`);
  detalles.push(formatearFecha(m.fecha));
  meta.textContent = detalles.join(' · ');
  info.append(concepto, meta);

  const valor = document.createElement('span');
  valor.className = 'movimiento__valor';
  valor.textContent = `${m.tipo === 'ingreso' ? '+' : '-'}${formatearPesos(m.valor)}`;

  const botonEliminar = document.createElement('button');
  botonEliminar.type = 'button';
  botonEliminar.className = 'boton-eliminar';
  botonEliminar.dataset.id = m.id;
  botonEliminar.setAttribute('aria-label', `Eliminar ${m.concepto}`);
  botonEliminar.title = 'Eliminar';
  botonEliminar.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';

  item.append(icono, info, valor, botonEliminar);
  return item;
}

function crearTextoVacio(texto) {
  const p = document.createElement('p');
  p.className = 'vacio';
  p.textContent = texto;
  return p;
}

/* =========================================================
   Eliminar movimientos
   ========================================================= */
function pedirEliminarMovimiento(id) {
  const movimiento = movimientos.find((m) => m.id === id);
  if (!movimiento) return;
  pedirConfirmacion({
    titulo: '¿Eliminar movimiento?',
    texto: `Vas a eliminar "${movimiento.concepto}" por ${formatearPesos(movimiento.valor)}. Esta acción no se puede deshacer.`,
    textoBoton: 'Sí, eliminar',
    alConfirmar: () => {
      const anteriores = movimientos;
      movimientos = movimientos.filter((m) => m.id !== id);
      if (!guardarEnNavegador(CLAVE_MOVIMIENTOS, movimientos)) {
        movimientos = anteriores;
        return;
      }
      render();
      mostrarNotificacion(`Movimiento eliminado: "${movimiento.concepto}".`, 'exito');
    },
  });
}

/* =========================================================
   Ventana de confirmación
   ========================================================= */
function pedirConfirmacion({ titulo, texto, textoBoton, alConfirmar }) {
  accionPorConfirmar = alConfirmar;
  elementoAntesDelModal = document.activeElement;
  modalTitulo.textContent = titulo;
  modalTexto.textContent = texto;
  modalConfirmar.textContent = textoBoton;
  modal.hidden = false;
  modalCancelar.focus();
}

function cerrarModal() {
  modal.hidden = true;
  accionPorConfirmar = null;
  if (elementoAntesDelModal && document.contains(elementoAntesDelModal)) {
    elementoAntesDelModal.focus();
  }
  elementoAntesDelModal = null;
}

function confirmarModal() {
  const accion = accionPorConfirmar;
  cerrarModal();
  if (accion) accion();
}

/* =========================================================
   Mensajes emergentes
   ========================================================= */
function mostrarNotificacion(mensaje, tipo = 'exito') {
  const notificacion = document.createElement('div');
  notificacion.className = `notificacion notificacion--${tipo}`;
  notificacion.setAttribute('role', tipo === 'exito' ? 'status' : 'alert');

  const icono = document.createElement('span');
  icono.className = 'notificacion__icono';
  icono.setAttribute('aria-hidden', 'true');
  icono.textContent = tipo === 'exito' ? '✓' : '!';
  const texto = document.createElement('span');
  texto.textContent = mensaje;
  notificacion.append(icono, texto);

  contenedorNotificaciones.append(notificacion);
  setTimeout(() => {
    notificacion.classList.add('notificacion--saliendo');
    setTimeout(() => notificacion.remove(), 300);
  }, tipo === 'alerta' ? 5000 : 3500);
}

/* =========================================================
   Eventos
   ========================================================= */
formIngreso.addEventListener('submit', registrarMovimiento);
formGasto.addEventListener('submit', registrarMovimiento);
formPresupuesto.addEventListener('submit', guardarPresupuesto);
botonQuitarPresupuesto.addEventListener('click', quitarPresupuesto);

// Pestañas: clic y flechas del teclado.
for (const pestana of pestanas) {
  pestana.addEventListener('click', () => activarPestana(pestana.dataset.pestana));
}
document.querySelector('.pestanas').addEventListener('keydown', (evento) => {
  const actual = pestanas.indexOf(document.activeElement);
  if (actual === -1) return;
  let siguiente = null;
  if (evento.key === 'ArrowRight') siguiente = (actual + 1) % pestanas.length;
  else if (evento.key === 'ArrowLeft') siguiente = (actual - 1 + pestanas.length) % pestanas.length;
  else if (evento.key === 'Home') siguiente = 0;
  else if (evento.key === 'End') siguiente = pestanas.length - 1;
  if (siguiente === null) return;
  evento.preventDefault();
  activarPestana(pestanas[siguiente].dataset.pestana, true);
});

// Mientras se escribe un valor se agregan los puntos de miles: 1250000 → 1.250.000
for (const input of document.querySelectorAll('.campo-dinero')) {
  input.addEventListener('input', () => {
    const texto = input.value;
    const negativo = texto.trim().startsWith('-');
    const digitos = texto.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 12);
    input.value = (negativo ? '-' : '') + (digitos ? separarMiles(digitos) : '');
  });
}

// Al corregir un campo se quita su mensaje de error.
for (const [formulario, nombres] of Object.entries(CAMPOS)) {
  for (const nombre of nombres) {
    const elemento = campo(formulario, nombre);
    const evento = elemento.tagName === 'SELECT' || elemento.type === 'date' ? 'change' : 'input';
    elemento.addEventListener(evento, () => mostrarError(formulario, nombre, ''));
  }
}

lista.addEventListener('click', (evento) => {
  const boton = evento.target.closest('.boton-eliminar');
  if (boton) pedirEliminarMovimiento(boton.dataset.id);
});

document.querySelectorAll('.filtro').forEach((boton) => {
  boton.addEventListener('click', () => {
    filtroActual = boton.dataset.filtro;
    document.querySelectorAll('.filtro').forEach((b) => {
      b.setAttribute('aria-pressed', String(b === boton));
    });
    renderLista();
  });
});

modalCancelar.addEventListener('click', cerrarModal);
modalConfirmar.addEventListener('click', confirmarModal);
modal.addEventListener('click', (evento) => {
  if (evento.target === modal) cerrarModal();
});
document.addEventListener('keydown', (evento) => {
  if (modal.hidden) return;
  if (evento.key === 'Escape') {
    cerrarModal();
  } else if (evento.key === 'Tab') {
    // Mantiene el foco dentro de la ventana de confirmación.
    if (evento.shiftKey && document.activeElement === modalCancelar) {
      evento.preventDefault();
      modalConfirmar.focus();
    } else if (!evento.shiftKey && document.activeElement === modalConfirmar) {
      evento.preventDefault();
      modalCancelar.focus();
    }
  }
});

// Si la app está abierta en dos pestañas del navegador, ambas se mantienen sincronizadas.
window.addEventListener('storage', (evento) => {
  if (evento.key === CLAVE_MOVIMIENTOS || evento.key === CLAVE_PRESUPUESTO || evento.key === null) {
    movimientos = cargarMovimientos();
    presupuesto = cargarPresupuesto();
    render();
  }
});

/* =========================================================
   Inicio
   ========================================================= */
llenarCategorias('ingreso');
llenarCategorias('gasto');
campo('ingreso', 'fecha').value = fechaDeHoy();
campo('gasto', 'fecha').value = fechaDeHoy();
if (presupuesto) campo('presupuesto', 'monto').value = separarMiles(presupuesto);
activarPestana('gasto');
render();
