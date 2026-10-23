# 💰 Control Financiero

Aplicación web sencilla para registrar ingresos y gastos, ver el saldo disponible y controlar un presupuesto mensual. Los valores se muestran en pesos colombianos (formato `$1.250.000`) y la interfaz está en español.

## Funcionalidades

**Panel principal**
- Total de ingresos, total de gastos y saldo disponible. El saldo se muestra en rojo si queda negativo.
- Presupuesto del mes: barra que compara lo gastado en el mes actual con el presupuesto. Es verde por debajo del 80 %, amarilla entre 80 % y 100 % y roja si se supera.

**Registro (tres formularios en pestañas)**
- **Ingreso:** concepto, valor, categoría (Salario / Otros ingresos), fuente y fecha.
- **Gasto:** concepto, valor, categoría (Alimentación, Transporte, Vivienda, Entretenimiento, Salud) y fecha.
- **Presupuesto:** monto mensual, que se puede guardar, cambiar o quitar.

**Resumen visual**
- Gráfico de dona con los gastos por categoría, con monto y porcentaje.
- Barras de ingresos (verde) contra gastos (rojo).

**Lista de movimientos**
- Ordenada del más reciente al más antiguo, con filtro Todos / Ingresos / Gastos.
- Cada movimiento se puede eliminar, con confirmación previa.

**Validaciones y mensajes**
- No permite campos obligatorios vacíos ni valores menores o iguales a 0.
- Cada error se marca en el campo correspondiente y aparecen mensajes claros al registrar, eliminar o superar el presupuesto.

Todos los totales, gráficos y el presupuesto se actualizan al instante al agregar o eliminar movimientos.

## Tecnología

- **HTML, CSS y JavaScript puro.** Sin frameworks, sin librerías, sin instalación ni compilación.
- **Gráficos dibujados con código propio** (SVG), sin librerías externas.
- **Datos guardados en el navegador** con `localStorage`. No hay servidor, base de datos ni inicio de sesión.
- **Diseño adaptable** a computador y celular.
- **Publicación gratuita** en Vercel como sitio estático, sin configuración adicional.

## Estructura del proyecto

```
index.html   → estructura de la página (secciones, formularios)
styles.css   → diseño visual (colores, tarjetas, adaptación a celular)
app.js       → lógica (cálculos, validaciones, gráficos, guardado)
README.md    → este documento
```

## Cómo abrirla en el computador

1. Descargar o clonar los archivos en una carpeta.
2. Hacer doble clic en `index.html`. Se abre en el navegador (recomendado: Chrome o Edge).

No requiere internet, salvo para cargar la tipografía. Sin conexión se usa la letra del sistema.

## Limitaciones conocidas

- **Los datos se guardan solo en el navegador y el dispositivo donde se usan.** Cada persona que abre el enlace ve su propia aplicación, vacía al inicio. Los datos no se comparten entre personas ni entre dispositivos.
- Si se borran los datos de navegación o se usa una ventana de incógnito, los movimientos se pierden.
- El presupuesto es un único monto mensual y se compara con los gastos del mes en curso. El total de gastos del panel, en cambio, incluye todos los meses.

## Decisiones de diseño

- **Una sola pantalla:** todo está visible sin navegar entre páginas. En celular las secciones se apilan en este orden: totales → formularios → resumen → lista.
- **Colores con significado:** verde para ingresos, rojo para gastos, azul para saldo y acciones principales, amarillo para alertas.
- **Formularios separados por pestañas:** cada uno pide solo lo necesario. Por ejemplo, la fuente se pide solo en los ingresos.
- **Sin dependencias externas:** la aplicación es liviana, rápida y fácil de explicar y de mantener.

## Desarrollo

Aplicación construida con asistencia de IA (Claude), por fases: versión base → pruebas y correcciones → funcionalidades opcionales → pulido → publicación. Cada fase se probó manualmente en computador y en vista de celular.
