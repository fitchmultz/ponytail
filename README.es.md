<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo-dark.png">
    <img src="assets/logo.png" width="220" alt="Ponytail, el senior dev flojo">
  </picture>
</p>

<h1 align="center">Ponytail</h1>

<p align="center">
  <em>No dice nada. Escribe una línea. Funciona.</em>
</p>

Este fork comparte una única política entre adaptadores y añade controles nativos de sesión en Pi. Completa lo solicitado con la implementación correcta más simple. No garantiza seguridad, velocidad ni ahorro universal.

<p align="center">
  <sub>Traducción de la comunidad. La versión de referencia y más reciente es el <a href="README.md">README en inglés</a>.</sub>
</p>

---

<p align="center">
  <a href="https://ponytail.dev/soon"><img src="assets/waitlist-banner-es.png" alt="Algo nuevo está por llegar, únete a la lista" width="760"></a>
</p>

Lo conoces. Cola de caballo larga. Lentes ovalados. Lleva más tiempo en la empresa que el control de versiones. Le muestras cincuenta líneas; las mira, no dice nada, y las reemplaza por una.

Ponytail lo pone dentro de tu agente de IA.

## Antes / después

Le pides un selector de fechas. Tu agente instala flatpickr, escribe un componente wrapper, agrega un stylesheet, y empieza una discusión sobre zonas horarias.

Con ponytail:

```html
<!-- ponytail: el browser ya tiene uno -->
<input type="date">
```

Más sobrevivientes en [examples/](examples/).

## Evidencia

El [benchmark histórico de Haiku 4.5](benchmarks/results/2026-06-18-agentic.md) corresponde a otras tareas, modelo y política. No demuestra el rendimiento de Astra ni la seguridad de esta versión. Menos líneas no bastan para probar que una solución es correcta.

La [evaluación nativa de Pi](benchmarks/pi/README.md) compara tareas completas con y sin Ponytail mediante repeticiones emparejadas y una tarea reservada. Corrección y alcance completo preceden a cualquier comparación de eficiencia. Los costos son estimaciones; el uso no reportado en fallos es desconocido.

## Cómo funciona

Antes de escribir código, el agente se detiene en el primer peldaño que aguanta:

```
1. ¿Está fuera de lo solicitado? → omitir extras especulativos
2. ¿Ya existe en este código?     → reúsalo, no lo reescribas
3. ¿Lo hace la stdlib?            → úsala
4. ¿Es una feature nativa?        → úsala
5. ¿Una dependencia ya instalada? → úsala
6. ¿Implementación simple?       → conservar el comportamiento
7. Solo entonces: el mínimo que funciona
```

La escalera se recorre *después* de entender el problema, no en su lugar: lee el código que toca el cambio y sigue el flujo real antes de elegir un peldaño. Flojo en la solución, nunca en la lectura.

Flojo, no negligente: la validación en límites de confianza, el manejo de pérdida de datos, la seguridad y la accesibilidad nunca están en riesgo.

## Instalación

Este fork se distribuye por GitHub y el instalador Git de Pi. Los paquetes upstream de npm y ClawHub son publicaciones distintas.

Los plugins de Claude Code y Codex ejecutan dos pequeños lifecycle hooks de Node.js, así que `node` debe estar en tu PATH (nota para usuarios de Nix/nvm: debe estar en el PATH del shell no-interactivo). Si no lo está, los skills igualmente funcionan, la activación automática simplemente queda en silencio en vez de lanzar un error en cada prompt.

### Claude Code

```
/plugin marketplace add fitchmultz/ponytail
/plugin install ponytail@ponytail
```

La app de escritorio no tiene el comando `/plugin`. Instálala desde la interfaz: Customize, el + junto a los plugins personales, Create plugin and add marketplace, Add from repository, y luego ingresa la URL del repo (gracias @NiklasDHahn, #98).

### Codex

```bash
codex plugin marketplace add fitchmultz/ponytail
codex
```

Abre `/plugins`, selecciona el marketplace de Ponytail e instala Ponytail. Luego abre `/hooks`, revisa y autoriza sus dos lifecycle hooks, y empieza un nuevo hilo.

Esta misma instalación cubre también la app de escritorio de Codex: reinicia la app después de instalar y detecta el plugin automáticamente.

### GitHub Copilot CLI

```bash
copilot plugin marketplace add fitchmultz/ponytail
copilot plugin install ponytail@ponytail
```

En una sesión interactiva de Copilot CLI, usa los equivalentes con slash:

```
/plugin marketplace add fitchmultz/ponytail
/plugin install ponytail@ponytail
```

Copilot CLI agrupa los comandos del plugin bajo el nombre del plugin. Por ejemplo:

```text
/ponytail:ponytail ultra
/ponytail:ponytail-review
```

### Pi agent harness

Requiere Pi 0.87.0 o posterior.

```bash
pi install git:github.com/fitchmultz/ponytail@v5.0.0
```

Mantén una sola instalación de Ponytail y conserva tus filtros de skills al cambiar de paquete. Recarga Pi después de instalar.

`/ponytail` activa el nivel predeterminado; `/ponytail status` muestra el estado. Los cambios de nivel se aplican en la siguiente llamada al modelo, también durante una tarea. El nivel se conserva por rama de sesión; `/ponytail default <modo>` afecta a sesiones nuevas. Un archivo de configuración inválido se conserva y se reporta.

Los alias conservan sus argumentos, respetan los skills desactivados y se encolan como seguimiento durante una tarea. `off` solo retira la sección de Ponytail: no borra reglas independientes de `AGENTS.md` ni mensajes anteriores. Un reemplazo completo del prompt por otra extensión puede prevalecer sobre las secciones. `/skill:ponytail` carga instrucciones independientes y no cambia el nivel persistente. Consulta los detalles de compatibilidad en el [README en inglés](README.md#pi-agent-harness).

### OpenCode

Usa un checkout de este fork en `opencode.json` (reutiliza `hooks/` y `skills/`):

```json
{ "plugin": ["./.opencode/plugins/ponytail.mjs"] }
```

Inyecta el ruleset en cada turno con el nivel activo; agrega los comandos `/ponytail` (ver [Comandos](#comandos)). OpenCode también carga automáticamente el `AGENTS.md` de este repo, así que las reglas aplican incluso sin el plugin. El plugin agrega los niveles `lite/full/ultra/off`.

El path `./` se resuelve contra el `opencode.json` de tu proyecto; para compartir un único checkout entre proyectos, apunta al path absoluto del `.mjs` (encuentra sus `hooks/` y `skills/` relativo a su propio archivo).

### Gemini CLI

```bash
gemini extensions install https://github.com/fitchmultz/ponytail
```

Carga el ruleset como contexto permanente en cada sesión y registra los comandos `/ponytail`; los `skills/` también se incluyen, activados cuando una tarea los necesita.

### Antigravity CLI

Google está renombrando Gemini CLI a Antigravity CLI (el binario `agy`); la misma extensión se instala ahí:

```bash
agy plugin install https://github.com/fitchmultz/ponytail
```

Reutiliza el `gemini-extension.json` de este repo. Una diferencia: Antigravity convierte los comandos `/ponytail` en skills, así que los escribes en el chat (por ejemplo `/ponytail-review` como mensaje) en vez de seleccionarlos de un menú slash. Hasta que la migración se complete (alrededor del 18 de junio de 2026), `gemini extensions install` también funciona. Para usarlo como regla permanente, coloca el ruleset en `.agents/rules/`.

### CodeWhale

Lee `AGENTS.md` desde la raíz del proyecto, sin configuración. Copia [`AGENTS.md`](AGENTS.md) a tu proyecto, o ejecuta `codewhale` desde un checkout de este repo. Eso es todo.

### Devin CLI

```bash
devin plugins install fitchmultz/ponytail
```

Instala ponytail como plugin de Devin; los skills quedan disponibles como `/ponytail:ponytail`, `/ponytail:ponytail-review`, etc.

### OpenClaw

Copia los directorios de skills que necesites desde [`.openclaw/skills/`](.openclaw/skills/) a `~/.openclaw/skills/`. Son independientes. La colección de ClawHub se publica upstream, no desde este fork.

### Grok Build

```bash
grok plugin install fitchmultz/ponytail --trust
```

Habilita el plugin (está desactivado por defecto): `/plugins` → Plugins → Space en `ponytail`, o en `~/.grok/config.toml`:

```toml
[plugins]
enabled = ["ponytail"]
```

Abre una sesión nueva (o recarga los plugins). Los skills aparecen como `/ponytail`, `/ponytail-review`, `/ponytail-audit`, `/ponytail-debt`, `/ponytail-gain`, `/ponytail-help`. Verifica con `grok inspect`. Grok puede invocar ponytail automáticamente en tareas de código según la descripción del skill; usa `/ponytail` (o `/ponytail lite`, `/ponytail full`, `/ponytail ultra`) cuando necesites activarlo de forma explícita. No se usan hooks de ciclo de vida de Grok: la salida de `SessionStart` no puede inyectar instrucciones.

`AGENTS.md` sigue funcionando solo como instrucciones desde un checkout sin el plugin. Desinstalar: `grok plugin uninstall ponytail`.

### Cursor

```bash
git clone https://github.com/fitchmultz/ponytail
node ponytail/scripts/cursor-hooks.js install
```

Fusiona dos hooks nativos en `~/.cursor/hooks.json` (con `--project` escribe `<proyecto>/.cursor/hooks.json`) y conserva los hooks que ya tengas ahí. Las entradas ejecutan `node` desde ese checkout, así que déjalo donde está o vuelve a correr la instalación si lo mueves. Cursor recarga el archivo al guardarlo; abre un chat nuevo y el ruleset de tu nivel por defecto llega por `sessionStart`. Envía `/ponytail lite`, `/ponytail full`, `/ponytail ultra` o `/ponytail off` como mensaje normal para cambiar el nivel durante el resto de la conversación; `/ponytail` lo reporta. El `subagentStart` de Cursor no puede inyectar contexto, así que los subagentes corren sin el ruleset, y los agentes en la nube nunca disparan `sessionStart`. La regla permanente (`.cursor/rules/ponytail.mdc`) y los hooks son alternativas: mientras la regla esté en el workspace los hooks no inyectan nada y los comandos de modo responden con un aviso; borra la regla para que los hooks manejen el nivel. Contrato, verificación y límites: [docs/cursor-hooks.md](docs/cursor-hooks.md). Desinstalar: `node ponytail/scripts/cursor-hooks.js uninstall`.

Eso fue todo. Él estaría orgulloso. No lo va a decir.

Activo en cada sesión, con un puñado de comandos (ver [Comandos](#comandos)). `/ponytail ultra` existe para cuando el codebase te hizo algo personal. El texto de inicio y de cambio de modo muestra el nivel activo.

Configura el nivel para cada nueva sesión con la variable de entorno `PONYTAIL_DEFAULT_MODE` (`lite`/`full`/`ultra`/`off`), o con un campo `defaultMode` en `~/.config/ponytail/config.json` (`%APPDATA%\ponytail\config.json` en Windows). El default es `full`.

Cursor (solo la regla, alternativa a los [hooks](#cursor)), Windsurf, Cline, GitHub Copilot (editor), Aider, Kiro: copia el archivo de reglas correspondiente de este repo ([`.cursor/rules/`](.cursor/rules/), [`.windsurf/rules/`](.windsurf/rules/), [`.clinerules/`](.clinerules/), [`.github/copilot-instructions.md`](.github/copilot-instructions.md), [`AGENTS.md`](AGENTS.md), [`.kiro/steering/`](.kiro/steering/)).

Kiro: copia `.kiro/steering/ponytail.md` a `~/.kiro/steering/` (global) o `.kiro/steering/` en tu proyecto.

Fallback de GitHub Copilot CLI (modo solo instrucciones): lee `AGENTS.md` y `.github/copilot-instructions.md` en un proyecto, o copia las reglas a `~/.copilot/copilot-instructions.md` para ejecutar ponytail en todos tus proyectos. Esta vía mantiene la guía permanente, pero no agrega switches de modo ni hooks.

VS Code con la extensión Codex lee `AGENTS.md`, que este repo incluye, así que funciona desde la raíz del repo sin configuración adicional (`~/.codex/AGENTS.md` hace a Codex global).

Qué archivos corresponden a qué agente: [Portabilidad de agentes](docs/agent-portability.md).

## Comandos

| Comando | Qué hace |
|---------|----------|
| `/ponytail [lite \| full \| ultra \| off]` | Cambia la intensidad, o apágalo. Sin argumento, depende del host; Pi activa el predeterminado. |
| `/ponytail-review` | Revisa el diff actual en busca de sobre-ingeniería y devuelve una lista de qué eliminar. |
| `/ponytail-audit` | Audita el repo completo en busca de sobre-ingeniería, no solo el diff. |
| `/ponytail-debt` | Recolecta los atajos marcados con `ponytail:` que dejaste pendientes en un registro, para que "después" no se convierta en "nunca". |
| `/ponytail-help` | Referencia rápida de los comandos anteriores. |

Los comandos requieren un host compatible con skills (Claude Code, Codex, Devin CLI, OpenCode, Gemini, pi, Swival). En Codex son skills; se invocan con `@` (`@ponytail-review`). Cursor con los [hooks](#cursor) solo tiene el cambio de nivel con `/ponytail`, escrito como mensaje normal. Los adaptadores de solo instrucciones (la regla de Cursor, Windsurf, Cline, Copilot, Kiro, Antigravity) cargan el ruleset permanente sin los comandos.

## Desarrollo

Edita `hooks/ponytail-core.md` y `hooks/ponytail-modes.json`; genera las copias antes de verificarlas. Los flujos de trabajo se editan en `skills/`:

```bash
npm ci --ignore-scripts
npm install --prefix ponytail-mcp --ignore-scripts
node scripts/build-openclaw-skills.js
node scripts/check-rule-copies.js
node scripts/check-versions.js
npm test
```

El generador produce el skill principal, las reglas estáticas, los comandos y los skills de OpenClaw. Las copias desactualizadas hacen fallar la validación. Consulta la [evaluación nativa](benchmarks/pi/README.md) para ejecutar tareas reales con Astra.

El benchmark de correctness lanza Python para las verificaciones de email y CSV; se prueba `python3` antes que `python`. Las verificaciones de CSV requieren `pandas` instalado localmente.

## FAQ

**¿Puedo usarlo junto con [caveman](https://github.com/JuliusBrussee/caveman)?**
Sí, y deberías. Caveman achica lo que el agente dice; ponytail achica lo que construye. Mitades distintas, sin solapamiento: caveman deja el código intacto byte por byte, ponytail no se mete con la prosa. Charla concisa sobre código mínimo.

**¿Necesita un archivo de configuración?**
No. Un opcional `~/.config/ponytail/config.json` o la variable `PONYTAIL_DEFAULT_MODE` pueden fijar el nivel default, pero nada es obligatorio.

**¿Y si realmente necesito la clase de caché de 120 líneas?**
Si el comportamiento solicitado la necesita, se implementa. La simplicidad nunca cancela un requisito explícito.

**¿Escala?**
Comprueba la carga real. Menos código solo ayuda si conserva el comportamiento requerido.

**¿Por qué "ponytail"?**
Ya sabes exactamente por qué.

## Patrocinadores

<p align="center">
  <a href="https://greenpt.com/">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="assets/logo-greenpt-dark.svg">
      <img src="assets/logo-greenpt.svg" width="260" alt="GreenPT">
    </picture>
  </a>
</p>

## Licencia

[MIT](LICENSE). La licencia más corta que funciona.

## Historial de estrellas

<a href="https://www.star-history.com/fitchmultz/ponytail#history">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=fitchmultz/ponytail&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=fitchmultz/ponytail&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=fitchmultz/ponytail&type=Date" />
 </picture>
</a>
