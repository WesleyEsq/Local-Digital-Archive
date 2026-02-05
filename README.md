# GoGL Compendium: Tu Archivo Digital Personal

¡Bienvenido!

Este proyecto nace de la necesidad de ir más allá de las simples hojas de cálculo y los marcadores del navegador. Es una aplicación de escritorio robusta, diseñada para ser un "santuario digital" para tu colección personal de medios (Manga, Anime, Novelas Ligeras y más). Es un Archivo digital para la preservación de archivos multimedia.

Construido sobre la potencia de **Go** y la flexibilidad de **React**, GoGL combina la velocidad de una base de datos local con una interfaz moderna estilo "streaming". En base a una lista, es una estantería digital viva diseñada para la preservación, la portabilidad y la estética.

---

## Estructura del Proyecto

El proyecto sigue la arquitectura estándar de **Wails**, separando claramente la lógica de backend (Go) de la interfaz de usuario (JavaScript/React). A continuación, un resumen de los directorios clave:

* **`root /`**: El corazón del backend.
* `main.go`: Punto de entrada. Configura la ventana, los assets y el servidor de archivos.
* `app.go`: El "Controlador". Conecta el frontend con la base de datos y expone métodos a JS.
* `database.go`: Gestión de la conexión SQLite, migraciones y consultas generales.
* `media.go`: Lógica específica para el manejo de archivos multimedia (Jerarquía Series -> Volúmenes -> Capítulos).


* **`frontend/`**: La interfaz de usuario (SPA construida con Vite + React).
* **`src/components/`**: Componentes modulares de React.
* `LibraryGrid.jsx`: La vista de galería estilo "Netflix" con carga diferida (lazy loading).
* `SeriesDetail.jsx`: La página de detalles, gestión de archivos y metadatos.
* `EntryList.jsx`: La vista de tabla clásica para gestión rápida y ranking.


* **`src/styles/`**: Sistema de CSS modular.
* Dividido en archivos específicos (`layout.css`, `library.css`, `variables.css`) para mantener el código limpio y mantenible.


* **`wailsjs/`**: Puente autogenerado entre Go y JavaScript. Aquí residen las promesas que conectan ambos mundos.


* **`build/`**: Artefactos de compilación y configuración de empaquetado para Windows/Mac/Linux.
* **`compendium.db`**: (Generado) El archivo único que contiene toda tu base de datos y archivos guardados.

---

## Propósito y Filosofía del Proyecto

El propósito de GoGL Compendium es resolver el problema de la **preservación digital** con una experiencia de usuario superior.

### 1. Preservación Local ("Local-First")

En la era digital, el contenido en la nube es efímero. Series favoritas pueden desaparecer por licencias o cierres de sitios web. GoGL apuesta por el almacenamiento local:

* **Base de Datos como Sistema de Archivos:** A diferencia de los gestores tradicionales que solo guardan rutas de archivos, GoGL (opcionalmente) ingesta los archivos (PDF, EPUB, Imágenes) directamente en la base de datos SQLite.
* **Portabilidad Total:** Al residir todo en un único archivo `.db`, hacer una copia de seguridad de tu biblioteca entera es tan simple como copiar un archivo.

### 2. Estética y Funcionalidad

Las hojas de cálculo son eficientes, pero aburridas. GoGL busca emular la experiencia de las plataformas de streaming modernas:

* **Navegación Visual:** Portadas grandes, carga progresiva y diseño de cuadrícula.
* **Jerarquía de Medios:** Entiende que una obra no es un solo archivo. Soporta estructuras complejas: *Serie → Temporadas/Volúmenes → Episodios/Capítulos*.
* **Organización Flexible:** Permite clasificar contenido por ranking (Tier Lists), orden numérico o búsqueda instantánea.

### 3. Privacidad y Ética

Este es un software de **uso estrictamente personal**. No se conecta a servidores externos para descargar contenido ilegal ni comparte datos. Es una herramienta pasiva para organizar lo que el usuario ya posee, actuando como una bóveda digital privada y segura.

---

# ⚙️ Arquitectura y Especificaciones Técnicas

GoGL Compendium no es un simple wrapper web; es una aplicación híbrida de alto rendimiento. Esta sección detalla las decisiones de ingeniería, el esquema de datos y los patrones de diseño utilizados para lograr una experiencia fluida manejando archivos multimedia pesados.

## 1. Stack Tecnológico

La elección de tecnologías prioriza tres pilares: **Portabilidad** (un solo binario), **Rendimiento** (bajo consumo de RAM) y **Modernidad** (UI reactiva).

| Capa | Tecnología | Justificación |
| --- | --- | --- |
| **Core / Backend** | **Go (Golang) 1.21+** | Ofrece tipado estático, concurrencia nativa y compilación a código máquina sin dependencias externas (Static linking). |
| **Frontend** | **React 18 + Vite** | Ecosistema robusto para SPAs. Vite proporciona un tiempo de compilación instantáneo y React gestiona el estado complejo de la UI. |
| **Bridge (Puente)** | **Wails v2** | Alternativa ligera a Electron. Utiliza el motor de renderizado nativo del OS (WebView2 en Windows, WebKit en Mac) reduciendo drásticamente el tamaño del ejecutable y el uso de RAM. |
| **Base de Datos** | **SQLite (ModernC)** | Versión de SQLite transpilada a Go puro (sin CGO). Elimina la necesidad de instalar compiladores de C (GCC) en Windows, facilitando la compilación cruzada. |
| **Estilos** | **CSS Modules (Custom)** | Sistema de diseño propio sin frameworks pesados (como Tailwind o Bootstrap) para control total visual. |

---

## 2. Diseño de Base de Datos (Schema)

El corazón de GoGL es su base de datos **SQLite monolítica**. A diferencia de aplicaciones tradicionales que guardan rutas de archivos (`C:/Users/...`), GoGL almacena los archivos binarios (Imágenes, PDFs, EPUBs) directamente dentro de la base de datos como **BLOBS**.

### Estrategia de "Todo en Uno"

* **Ventaja:** Portabilidad absoluta. Mover tu colección a otra PC implica copiar un solo archivo `.db`.
* **Desafío:** El rendimiento de lectura.
* **Solución:** Implementación de **Lazy Loading** (ver sección 4).

### Esquema Relacional

El modelo de datos utiliza una jerarquía estricta con **Integridad Referencial en Cascada** (`ON DELETE CASCADE`).

1. **Tabla `entries` (La Serie)**
* Metadatos de alto nivel: *Título, Autor, Ranking, Descripción (Markdown), Portada*.
* Define el orden manual del usuario mediante la columna `number`.


2. **Tabla `media_groups` (El Contenedor)**
* Agrupación lógica. Representa *Temporadas* (Anime) o *Volúmenes* (Manga).
* `Foreign Key` -> `entries.id`.


3. **Tabla `media_assets` (El Archivo)**
* Contiene el archivo real.
* Columnas críticas: `mime_type` (detecta si es PDF/Video), `file_blob` (el binario), `file_size`.
* `Foreign Key` -> `media_groups.id`.



---

## 3. El Puente Wails (Interoperabilidad)

La comunicación entre Go y JavaScript es asíncrona y segura, gestionada a través de `wailsjs`.

* **Exportación de Métodos:** El struct `App` en `app.go` actúa como el controlador principal. Cualquier método público (ej: `GetEntries()`) se expone automáticamente a JavaScript como una Promesa.
* **Manejo de Tipos:** Wails genera automáticamente definiciones de TypeScript (`models.ts`) basadas en los structs de Go, garantizando que el frontend sepa exactamente qué datos esperar.

**Flujo de Datos:**

> `UI (React)` invoca `SaveMediaAsset()` **➜** `Wails Bridge` serializa JSON **➜** `Go Controller` decodifica Base64 **➜** `SQLite` escribe BLOB **➜** Respuesta al UI.

---

## 4. Algoritmos y Optimizaciones Clave

Para manejar bases de datos que pueden crecer a Gigabytes de tamaño, implementamos varias optimizaciones críticas:

### A. Patrón de Carga Diferida (Lazy Loading)

Un error común es hacer `SELECT *` trayendo imágenes pesadas. GoGL separa la consulta en dos fases:

1. **Fase Ligera:** `GetEntries()` recupera solo texto (ID, Título, Rank). La carga inicial es < 50ms.
2. **Fase Bajo Demanda:** Las imágenes de portada solo se solicitan (`GetEntryImage(id)`) cuando el componente entra en el "Viewport" del usuario, utilizando la API `IntersectionObserver` de JavaScript.

### B. Paginación Virtualizada (El "Magic Number 14")

En la vista de Galería (`LibraryGrid`), no renderizamos toda la colección.

* Se implementó una paginación estricta de **14 elementos por página**.
* Este número está optimizado para pantallas 1080p (cuadrícula 7x2), manteniendo el DOM ligero y la memoria de la GPU baja.

### C. Streaming de Activos (Planificación Phase 3)

Actualmente, los archivos se pasan como cadenas Base64. Para archivos grandes (>50MB), la arquitectura está preparada para transicionar al uso de `AssetServer` de Wails, lo que permitirá:

* Hacer streaming de video (byte-range requests).
* Evitar cargar el archivo entero en la RAM de Go.

---

## 5. Modularidad del Frontend

El código React ha sido refactorizado para evitar la deuda técnica del "CSS Gigante".

* **CSS Modular:** Los estilos se dividen por responsabilidad (`layout.css`, `library.css`, `modals.css`).
* **Componentes Atómicos:** `LibraryGrid`, `SeriesDetail` y `EntryList` funcionan de manera aislada, recibiendo datos solo a través de *props*, facilitando el testing y la depuración.

---

Esta documentación técnica establece la seriedad del proyecto. No es solo un script; es una pieza de ingeniería de software diseñada para escalar y perdurar.