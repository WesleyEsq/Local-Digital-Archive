# Compendium | Prototipo de sistema de almacenamiento con enfasís en metadatos.

### ¡Te doy la bienvenida!

El proposito de este proyecto es el desarrollar un Archivero digital completamente local, para la preservación y organización automática de archivos multimedia.

El proyecto esta diseñado para la preservación personal de tanto los archivos como de una gran cantidad de metadatos acerca de ellos. Se basa en la organización de gigantes como Youtube, S3 y Google Drive, solo que completamente de manera local y compacta.

---
## Soporte para la visualización de archivos.

| Medio     |Formatos que pueden ser visualizados| Futuras agregaciones     |
| ---       |---                                 | ---                      |
| Audio     |                                    | wav, mp3, AIFF, AAC, OGG |
| Imagenes  | PNG, JPEG, WebP, GIF, TIFF         | SVG                      |
| Videos    | MP4, WebM                          |                          |
| Documentos| PDF, Epub                          | Docx, HTML               |
| Ebooks    | Epub                               | Secuencias de Imagenes   |

Cualquier otro formato de archivos puede ser almacenado y descargado en el sistema, pero solo se provee soporte para visualizar estos archivos con la interfaz.

---
## Acerca de compendium.
Este proyecto nace de la necesidad de ir más allá de las simples hojas de cálculo y los marcadores del navegador. Es una aplicación de escritorio robusta, diseñada para ser un "santuario digital" para tu colección personal de medios (Libros, Trabajos de artistas, Series, Novelas Ligeras y más).

Construido sobre la potencia de Go y la flexibilidad de React, este prototipo combina la velocidad de una base de datos embebida con una interfaz moderna estilo "streaming" mediante streaming. Es una estantería digital viva diseñada para la preservación, la portabilidad y la estética.

Los elementos multimedia y los metadatos acerca de ellos son organizados de manera automática en una estructura jerarquica, para facilitar la recolección e integridad de los mismos a gran escala.

---

## Metas de este proyecto.
Se espera continuar con este prototipo con la implementación de las siguientes metas, para permitir un uso práctico del almacenamiento que provee:

**Metas**
1. Compatibilidad con almacenamiento personal en la nube de Google Drive y OneDrive
2. Almacenamientode backups mediante S3
3. Mejor operabilidad con el sistema operativo para observar multimedia fuera de la aplicación de react con las siguientes herramientas:
    - Adobe Acrobat
    - VLC
4. Funcionalidad para exportar todos los datos de la base de datos en un directorio de manera jerarquica como en el sistema.
5. Sistema robusto de backups.

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

El proyecto mantiene como su principal meta a la **compactabilidad**, proveyendo una solución altamente escalable sin la necesidad de contenedores, servidores de bases de datos, pods u servicios por parte de terceros, siendo una alternativa segura para un usuario.


### 1. Preservación Local ("Local-First")

En la era digital, el contenido en la nube es efímero. Series favoritas pueden desaparecer por licencias o cierres de sitios web. GoGL apuesta por el almacenamiento local:

* **Base de Datos como Sistema de Archivos:** A diferencia de los gestores tradicionales que solo guardan rutas de archivos, se ingestan los archivos (PDF, EPUB, Imágenes) directamente en la base de datos SQLite.
* **Portabilidad Total:** Al residir todo en un único archivo `.db`, hacer una copia de seguridad de tu biblioteca entera es tan simple como copiar un archivo.

### 2. Estética y Funcionalidad

Las hojas de cálculo son eficientes, pero aburridas. GoGL busca emular la experiencia de las plataformas de streaming modernas:

* **Navegación Visual:** Portadas grandes, carga progresiva y diseño de cuadrícula.
* **Jerarquía de Medios:** Entiende que una obra no es un solo archivo. Soporta estructuras complejas: *Serie → Temporadas/Volúmenes → Episodios/Capítulos*.
* **Organización Flexible:** Permite clasificar contenido por ranking (Tier Lists), orden numérico o búsqueda instantánea.

### 3. Privacidad y Ética

Este es un software de **uso estrictamente personal** para la organización de archivos locales. No se conecta a ninguna red ni comparte sus datos con otros usuarios. Es una herramienta pasiva para organizar lo que el usuario ya posee, actuando como una estanteria digital personal y segura. 

Por lo que se han tomado decisiones para garantizar una mejor experiencia local en una máquina, a coste de una arquitectura hostíl contra el streaming de los datos a otros dispositivos.

---
# Arquitectura y Especificaciones Técnicas

Compendium es una aplicación híbrida de alto rendimiento. Esta sección detalla las decisiones de ingeniería, el esquema de datos y los patrones de diseño utilizados para lograr una experiencia fluida manejando archivos multimedia pesados.

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

El corazón del proyecto es su base de datos **SQLite**. A diferencia de aplicaciones tradicionales que guardan rutas de archivos (`C:/Users/...`), Compendium almacena los archivos binarios (Imágenes, PDFs, EPUBs) directamente dentro de la base de datos como **BLOBS**.

### Estrategia de "Todo en Uno"

* **Ventaja:** Portabilidad absoluta. Mover tu colección a otra PC implica copiar un solo archivo `.db`.
* **Desafío:** El rendimiento de lectura es inferior al uso del sistema de archivos para el almacenamiento de blobs mayores 100Kb.
* **Solución:** Implementación de un servidor sidecar en Go para la lectura y obtención  de objetos multimedia en la base de datos. Funcionando de manera muy simil a los servicios de S3.


## 3. Wails y la relación entre Go y React

La comunicación entre Go y JavaScript es asíncrona y segura, gestionada a través de `wailsjs`.

* **Exportación de Métodos:** El struct `App` en `app.go` actúa como el controlador principal. Cualquier método público (ej: `GetEntries()`) se expone automáticamente a JavaScript como una Promesa.
* **Manejo de Tipos:** Wails genera automáticamente definiciones de TypeScript (`models.ts`) basadas en los structs de Go, garantizando que el frontend sepa exactamente qué datos esperar.

**Flujo de Datos:**

> `UI (React)` invoca `SaveMediaAsset()` **➜** `Wails Bridge` serializa JSON **➜** `Go Controller` decodifica Base64 **➜** `SQLite` escribe BLOB **➜** Respuesta al UI.

---

## 4. Modularidad del Frontend

El código React demanda una gran especialización en cuanto a los estilos de cada componente, se organizan según cada elemento reutilizable en la estructura del proyecto. Pueden compartir estilos entre sí o usar un estilo global definido para todo el proyecto. Para el proposito de este proyecto se tiene la siguiente dispocisión de los elementos de UI:

* **CSS Modular:** Los estilos se dividen por responsabilidad (`layout.css`, `library.css`, `modals.css`).
* **Componentes Atómicos:** `LibraryGrid`, `SeriesDetail` y `EntryList` funcionan de manera aislada, recibiendo datos solo a través de *props*, facilitando el testing y la depuración.

---

Esta documentación técnica requiere ser expandida para futuras iteraciones de este prototipo.