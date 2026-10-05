# VibeWave

Aplicação web de streaming de música inspirado no Spotify, desenvolvida em **Node.js + Express 5** com **Handlebars**, **MySQL (Sequelize)** e **Passport**.

O projeto tem como alvo ser uma plataforma onde usuários cadastram-se, navegam por um catálogo de músicas e artistas, e um painel administrativo faz o gerenciamento completo do acervo (upload de áudio, capa, metadados via FFmpeg, edição e remoção).

---

## Sumário

- [Funcionalidades](#funcionalidades)
- [Tecnologias Utilizadas](#tecnologias-utilizadas)
- [Requisitos Prévios](#requisitos-prévios)
- [Instalação](#instalação)
- [Configuração do Banco de Dados](#configuração-do-banco-de-dados)
- [Executando o Projeto](#executando-o-projeto)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Rotas da Aplicação](#rotas-da-aplicação)
- [Modelo de Dados](#modelo-de-dados)
- [Painel Administrativo](#painel-administrativo)
- [Upload e Processamento de Áudio](#upload-e-processamento-de-áudio)
- [Player Persistente](#player-persistente)
- [Front-end](#front-end)
- [Autenticação e Autorização](#autenticação-e-autorização)
- [Changelog](#changelog)
- [Testes](#testes)
- [Pontos de Atenção e Melhorias Futuras](#pontos-de-atenção-e-melhorias-futuras)
- [Licença](#licença)

---

## Funcionalidades

### Usuário final
- **Landing page** (`/`) com apresentação do produto.
- **Cadastro e login** de usuários com validação de formulário e senha criptografada com `bcryptjs`.
- **Home** (`/home`) — protegida por login, exibe o catálogo de músicas com capas e artistas.
- **Busca** (`/search`) — busca real por título, gênero e nome do artista, com resultados agrupados e categorias clicáveis.
- **Biblioteca** (`/lybrary`) — lista-artistas e músicas ordenadas, com dados vindos do banco.
- **Player de música** (`/player/:id`) — página dedicada de reprodução com barra de progresso, tempo e seek.
- **Playlists** — Favoritas, Recentes e Workouts Mix (`/playlist`, `/recentemente`, `/treino`) reutilizando a view de lista.
- **Perfil** (`/perfil`) — dados do usuário logado.
- **Player persistente entre páginas** — a reprodução **não para** ao trocar de página, recarregar com F5 ou usar voltar/avançar: o estado (faixa, posição, volume, fila, shuffle/repeat) fica em `localStorage` e é restaurado na navegação seguinte.
- **Player global (rodapé fixo)** — via partial `player-footer`, controlado por `player-core.js`; a página `/player/:id` controla o mesmo elemento de áudio.
- **Media Session** — título, artista e capa são expostos para os controles do sistema operacional.
- **Tema claro/escuro** com persistência em `localStorage`.
- **Menu lateral colapsável** em mobile, com partial `sidebar` e `mobile-nav`.
- **Imagens com fallback** — toda capa e avatar cai em `/img/default.svg` se o arquivo não existir.
- **Páginas de sucesso e erro** — `/sucess`, `/404` e `/403` (acesso negado).

### Administração (somente `isAdmin`)
- **Dashboard** com contadores (músicas, artistas, usuários, pendências), últimas músicas e artistas recentes, tudo em links para as listagens.
- **Listagens paginadas** de músicas, artistas e usuários, com busca e filtros preservados na paginação.
- **CRUD de artistas** — criação (com foto), edição (com troca de imagem) e exclusão (remove arquivo do disco).
- **CRUD de músicas** — upload de áudio com extração automática de duração, edição e exclusão.
- **Upload de capa** de álbum.
- **Gestão de usuários** — promover/revogar administrador, redefinir senha e excluir contas.
- **Troca de senha** do administrador em `/admin/perfil/senha`.

---

## Tecnologias Utilizadas

| Camada | Tecnologia |
| --- | --- |
| Servidor | Node.js, Express 5.1 |
| Template engine | Handlebars (`express-handlebars`) com partials e helpers customizados |
| Banco de dados | MySQL / MariaDB com Sequelize 6 (ORM) |
| Autenticação | Passport.js + `passport-local` + `bcryptjs` + `express-session` + `connect-flash` |
| Upload de arquivos | Multer 2 (disk storage) |
| Processamento de áudio | `fluent-ffmpeg` + `@ffmpeg-installer/ffmpeg` + `@ffprobe-installer/ffprobe` |
| Processamento de imagem | `sharp` (recorte/redimensionamento de fotos) |
| Front-end | HTML/CSS/JS vanilla, Font Awesome 6.4 (CDN), Google Fonts (Poppins) |
| Dependências aux. | `body-parser`, `nodemon` (dev) |

> **Nota:** o projeto utiliza **apenas JavaScript (CommonJS)**, sem etapa de build e sem dependência de front-end. Os assets em `public/` são servidos estaticamente pelo Express.

---

## Requisitos Prévios

- **Node.js** 18 ou superior
- **npm** 9 ou superior
- **MySQL** 8 (ou MariaDB) rodando localmente
- **ffmpeg/ffprobe** — *não precisam ser instalados manualmente*: as dependências `@ffmpeg-installer/ffmpeg` e `@ffprobe-installer/ffprobe` baixam os binários automaticamente via npm.

---

## Instalação

```bash
# 1. Clone o repositório
git clone git@github.com:OtavioMerlo/VibeWave.git
cd VibeWave

# 2. Instale as dependências
npm install

# 3. Suba o projeto
npm run dev
```

---

## Configuração do Banco de Dados

**1. Crie o banco de dados**

```sql
CREATE DATABASE vibewave CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**2. Configure a conexão** por variáveis de ambiente. `config/db.js` lê:

| Variável      | Padrão        | Descrição                  |
| ------------- | ------------- | -------------------------- |
| `DB_NAME`     | `vibewave`    | Nome do banco              |
| `DB_USER`     | `root`        | Usuário do MySQL           |
| `DB_PASSWORD` | —             | Senha do MySQL             |
| `DB_HOST`     | `localhost`   | Host do MySQL              |
| `DB_PORT`     | `3306`        | Porta do MySQL             |

```bash
export DB_NAME=vibewave
export DB_USER=root
export DB_PASSWORD="sua senha"
```

Há valores de fallback no código para facilitar o uso local, mas **em produção defina `DB_PASSWORD` explicitamente** — nunca versione credenciais reais.

O mesmo vale para o segredo da sessão:

```bash
export SESSION_SECRET="uma string longa e aleatória"
```

**3. Sincronização automática**

As tabelas são criadas automaticamente por `sequelize.sync()` na inicialização do `app.js`. Isso cria/ajusta as tabelas `users`, `artists` e `musics`.

> ⚠️ **Cuidado:** `sync()` sem opções não apaga dados existentes, mas em produção é recomendável usar migrações.

**4. Torne um usuário administrador**

Como o registro público sempre cria contas comuns, promova a conta no banco:

```sql
UPDATE users SET isAdmin = 1 WHERE email = 'seu@email.com';
```

Sem `isAdmin = 1`, o acesso a `/admin` responde **403** mesmo com o login feito.

---

## Executando o Projeto

O `package.json` define os scripts de execução:

```bash
# Desenvolvimento (com hot reload via Nodemon)
npm run dev

# Produção
npm start

# Testes (views + player)
npm test
```

Ou, diretamente:

```bash
npx nodemon app.js
node app.js
```

A aplicação sobe na porta **8089** por padrão (configurável via variável de ambiente `PORT`):

```
http://localhost:8089
```

Saída esperada no terminal:

```
Banco de dados sincronizado!
Rodando na porta 8089
```

---

## Estrutura do Projeto

```
VibeWave/
├── app.js                     # Entry point: middlewares, helpers, rotas e servidor
├── package.json
├── config/
│   ├── db.js                  # Conexão Sequelize/MySQL (via variáveis de ambiente)
│   ├── auth.js                # Estratégia local do Passport
│   ├── multerconfig.js        # Factory de storage do Multer (allowlist + limites)
│   ├── upload.js              # Upload em memória + recorte de imagem com sharp
│   ├── opcoes.js              # Listas de gêneros, status, plataformas e países
│   └── analiseaudio.js        # Metadados de áudio via ffprobe
├── helpers/
│   ├── csrf.js                # Token CSRF + verificação de Origin/Referer
│   ├── validacao.js           # Paginação, busca, validação de campos e IDs
│   ├── eLogado.js             # Middleware: exige usuário autenticado
│   └── eAdmin.js              # Middleware: exige perfil de administrador
├── models/
│   ├── Usuario.js             # Model users
│   ├── Artista.js             # Model artists
│   └── Musica.js              # Model musics
├── routes/
│   ├── login.js               # /usuario — cadastro, login, logout
│   └── admin.js               # /admin — CRUD de artistas, músicas, usuários e perfil
├── views/                     # Templates Handlebars
│   ├── layouts/main.handlebars, admin.handlebars
│   ├── partials/              # sidebar, mobile-nav, player-footer, capa, track-*, admin-nav, flash, excluir
│   ├── admin/                 # dashboard, listagens e formulários
│   ├── homes/                 # home, search, lybrary, player, playlist, perfil
│   ├── usuarios/login.handlebars
│   ├── 403/erro.handlebars
│   ├── 404/erro.handlebars
│   └── sucess/sucess.handlebars
├── public/
│   ├── css/                   # vibewave.css, admin.css
│   ├── js/                    # vibewave.js, player-core.js, admin.js
│   ├── img/                   # imagens estáticas (default.svg)
│   └── uploads/               # Sending: musicas/, artistas/, capamusica/, FotoUser/
├── tests/                     # render.test.js (views) e player.test.js (persistência)
└── .gitignore
```

---

## Rotas da Aplicação

### Páginas principais

| Método | Rota | Descrição | Acesso |
| --- | --- | --- | --- |
| GET | `/` | Landing page | Público |
| GET | `/home` | Feed principal com o catálogo | Logado |
| GET | `/search` | Interface de busca | Público |
| GET | `/lybrary` | Biblioteca com artistas e músicas | Público |
| GET | `/player/:id` | Player dedicado da música | Público |
| GET | `/playlist` | Playlist "Favoritas" | Público |
| GET | `/recentemente` | Playlist "Tocadas recentemente" | Público |
| GET | `/treino` | Playlist "Workout Mix" | Público |
| GET | `/perfil` | Perfil do usuário | Logado |
| GET | `/sucess` | Página de sucesso | Público |
| GET | `/404` | Página de erro | Público |
| GET | `/teste` | View de testes | Público |

### API

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/api/player/:id` | Retorna o JSON da música com dados do artista |

### Autenticação (`/usuario`)

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/usuario/login` | Tela de login/cadastro |
| POST | `/usuario/registro` | Cria novo usuário (valida nome, e-mail, senha e confirmação) |
| POST | `/usuario/login` | Autentica via Passport local |
| GET | `/usuario/logout` | Encerra a sessão |

### Administração (`/admin`)

Todas exigem `isAdmin` e, nos POST, um token `_csrf` válido.

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/admin` | Dashboard com contadores e listagens resumidas |
| GET | `/admin/musicas` | Listagem paginada, com busca e filtros |
| GET | `/admin/musicas/nova` | Formulário de nova música |
| POST | `/admin/musicas` | Cadastra música (upload de áudio) |
| GET | `/admin/musicas/:id/editar` | Formulário de edição |
| POST | `/admin/musicas/:id` | Salva alterações e troca o áudio |
| POST | `/admin/musicas/:id/capa` | Troca apenas a capa |
| POST | `/admin/musicas/:id/excluir` | Remove música e arquivos |
| GET | `/admin/artistas` | Listagem paginada, com busca e filtros |
| GET | `/admin/artistas/nova` | Formulário de novo artista |
| POST | `/admin/artistas` | Cadastra artista (upload de foto) |
| GET | `/admin/artistas/:id/editar` | Formulário de edição |
| POST | `/admin/artistas/:id` | Salva alterações e troca a foto |
| POST | `/admin/artistas/:id/excluir` | Remove artista (cascata nas músicas, com confirmação) |
| GET | `/admin/usuarios` | Listagem paginada de usuários |
| POST | `/admin/usuarios/:id/admin` | Promove ou revoga administrador |
| POST | `/admin/usuarios/:id/senha` | Redefine a senha |
| POST | `/admin/usuarios/:id/excluir` | Remove a conta |
| GET | `/admin/perfil` | Perfil do administrador |
| POST | `/admin/perfil/senha` | Troca a própria senha |

As URLs legadas (`/admin/artista/edit/:id`, `/admin/musica/edit/:id`,
`/admin/music/img/:id`, `/admin/artista/novo`, `/admin/artista/delete/:id`,
`/admin/musicas/nova`, `/admin/musica/delete/:id`) continuam existindo como
**redirects** para as novas rotas.

---

## Modelo de Dados

### `users`

| Campo | Tipo | Observações |
| --- | --- | --- |
| `id` | INTEGER | PK, auto-increment |
| `name` | STRING | obrigatório |
| `email` | STRING | obrigatório, único, validado como e-mail |
| `foto` | STRING | default `default.png` |
| `password` | STRING | hash bcrypt, mínimo de 8 caracteres (modelo) |
| `createdAt` | DATE | preenchido no registro |
| `isAdmin` | BOOLEAN | default `false` |

### `artists`

| Campo | Tipo | Observações |
| --- | --- | --- |
| `id` | INTEGER | PK, auto-increment |
| `nome` | STRING | obrigatório |
| `pais` | STRING | obrigatório |
| `genero_musical` | STRING | obrigatório |
| `status` | STRING | obrigatório, default `Ativo` |
| `biografia` | TEXT | opcional |
| `foto` | STRING | default `default.png` |
| `website` | STRING | opcional |
| `datanas` | DATE | opcional |
| `plataforma` | STRING | rede social principal |
| `handle` | STRING | @usuário na rede social |

### `musics`

| Campo | Tipo | Observações |
| --- | --- | --- |
| `id` | INTEGER | PK, auto-increment |
| `titulo` | STRING | obrigatório |
| `artistId` | INTEGER | FK → `artists.id`, obrigatório |
| `genero` | STRING | default `Outro` |
| `duracao` | INTEGER | em segundos, preenchido via ffprobe |
| `audio` | STRING | nome do arquivo em `public/uploads/musicas` |
| `capa` | STRING | nome do arquivo em `public/uploads/capamusica` |
| `letra` | TEXT | opcional |
| `lancamento` | DATE | default `NOW` |
| `status` | STRING | default `Ativa` |

**Relações** (`app.js`):

```js
Artista.hasMany(Musica, { foreignKey: 'artistId', as: 'musicas' });
Musica.belongsTo(Artista, { foreignKey: 'artistId', as: 'artista' });
```

---

## Painel Administrativo

O painel fica em `/admin` e é protegido pelo middleware `eAdmin`. Ele é dividido em três blocos:

1. **Tabelas de gerenciamento** — Músicas (id, título, artista, duração, gênero, status e ações), Artistas (id, nome, gênero, país, status e ações) e Usuários (id, nome, e-mail, flag de admin).
2. **Formulário: adicionar nova música** — título, artista, gênero, arquivo de áudio, letra, data de lançamento e status.
3. **Formulário: adicionar novo artista** — nome, país, gênero, status, biografia, site, data de nascimento, rede social + @handle e upload da foto.

Os cartões de totais do topo são preenchidos pela própria rota do dashboard (`GET /admin`), que consulta o banco em paralelo.

---

## Upload e Processamento de Áudio

**Armazenamento** — `config/multerconfig.js` cria um `multer.diskStorage` que **ignora o nome enviado pelo cliente**, gera um nome seguro e valida extensão **e** MIME antes de gravar:

```js
const TIPOS = {
    audio: {
        ext: ['.mp3', '.m4a', '.aac', '.wav', '.ogg', '.flac'],
        mime: ['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac',
               'audio/wav', 'audio/wave', 'audio/x-wav',
               'audio/ogg', 'audio/flac', 'audio/x-flac'],
        limite: 50 * 1024 * 1024
    },
    imagem: {
        ext: ['.jpg', '.jpeg', '.png', '.webp'],
        mime: ['image/jpeg', 'image/png', 'image/webp'],
        limite: 5 * 1024 * 1024
    }
};

filename: (req, file, callback) => {
    callback(null, `${Date.now()}_${crypto.randomUUID()}${extensao(file)}`);
}
```

O `fileFilter` exige que **a extensão e o MIME coincidam com a allowlist**, e a
extensão usada no nome é extraída do arquivo — nunca vem do campo `filename` do
formulário. Como `.html` e `.svg` não estão na lista, um upload malicioso não
consegue ser servido pela própria origem. Arquivos acima do limite disparam erro
de validação em vez de estourar memória, e `limits.files: 1` impede envio em lote.

Diretórios de destino:

| Tipo | Caminho |
| --- | --- |
| Áudio | `public/uploads/musicas` |
| Foto de artista | `public/uploads/artistas` |
| Capa de álbum | `public/uploads/capamusica` |
| Foto de usuário | `public/uploads/FotoUser` |

**Metadados** — ao subir uma música, `config/analiseaudio.js` usa `ffprobe` (via `fluent-ffmpeg`) para ler duração, bitrate, codec, sample rate, canais e tags, e a duração é salva automaticamente no banco:

```js
const audioPath = path.join(__dirname, '../public/uploads/musicas', req.file.filename);
const meta = await aaudio(audioPath);

duracao: Math.round(meta.duration) || 0
```

**Imagens** — `config/upload.js` mantém uma configuração alternativa com `memoryStorage`, filtro que aceita apenas `jpeg/jpg/png/gif`, limite de 5 MB e recorte com `sharp` para 800×800 em JPEG quality 90.

---

## Player Persistente

Este é o coração da experiência do VibeWave: **a música não para quando você troca de página**.

### Como funciona

Cada página carrega `player-footer.handlebars`, que só traz a *casca* (capa,
título, controles, barra). O `public/js/player-core.js` cria **um único elemento
`<audio>`**, preenche a interface a partir do estado salvo e mantém tudo em
sincronia com a página atual — inclusive com a página `/player/:id`, que
manipula o mesmo áudio.

Ao navegar, o estado é gravado em `localStorage` e lido na inicialização da
próxima página:

| Chave       | Conteúdo                                                        |
| ----------- | --------------------------------------------------------------- |
| `vw-player` | fila, índice, posição (`tempo`), duração, capa, `shuffle`, `repeat` e se está tocando |
| `vw-volume` | volume, separado para não ser sobrescrito ao trocar de faixa       |
| `vw-muted`  | mudo ligado/desligado, para o silêncio continuar na navegação      |
| `vw-theme`  | tema claro/escuro (`vibewave.js`)                                  |

### API pública

`window.VW` expõe o player para o console e para os scripts de página:

```js
VW.play(musica, fila)   // toca uma faixa (aceita objeto ou elemento do DOM)
VW.pause()              // pausa
VW.toggle()             // alterna play/pause
VW.next()               // próxima faixa (respeita shuffle e repeat)
VW.previous()           // faixa anterior
VW.seek(segundos)       // pula para uma posição
VW.volume(0.8)          // define o volume (0 a 1)
VW.state()              // devolve uma cópia do estado atual
VW.clear()              // limpa fila e estado (não apaga o volume)
```

### Controles

- **Play/Pause**, **próxima** e **anterior** no rodapé e na página do player.
- **Barra de progresso** clicável — clique em qualquer ponto para pular para
  aquela posição.
- **Volume** com botão de mudo — **o mudo também sobrevive à navegação**, sem
  perder o nível de volume configurado.
- **Shuffle** (ordem aleatória) e **Repeat** (recomeça a faixa atual em vez de
  encerrar no fim da fila).
- **Fila real** — home, biblioteca, playlists, busca e perfil geram faixas reais
  via partial `dataTrack`, e clicar em qualquer item toca a partir dali.
- **Media Session** — título, artista e capa alimentam os controles do sistema
  operacional (teclado, Bluetooth, notificação).

### Limite conhecido

Quando a página é restaurada, o navegador pode **bloquear o autoplay** se o
usuário ainda não interagiu com a página. Nesse caso a faixa fica carregada e
posicionada no tempo salvo, mas **pausada** — basta apertar play. Isso é
aplicado por todos os navegadores e não pode ser contornado por JavaScript.

### Referência de dados

Cada item de música carrega seus metadados via `dataTrack`:

```html
<a data-track-id="3"
   data-track-src="/uploads/musicas/1712345_ab12….mp3"
   data-track-capa="/uploads/capamusica/capa.jpg"
   data-track-titulo="Levels"
   data-track-artista="Avicii"
   data-track-duracao="215">
```

O helper já resolve o caminho do arquivo a partir do que está no banco, escapa
cada valor e troca a capa por `/img/default.svg` quando ela é nula — por isso os
atributos não são escritos à mão nos templates.

---

## Front-end

- **Layouts e partials** — o Express Handlebars está configurado com `defaultLayout: 'main'` e `partialsDir: views/partials`. Isso permite reutilizar:
  - `sidebar.handlebars` — navegação lateral com logo, links, playlists e card do usuário logado;
  - `mobile-nav.handlebars` — botão hambúrguer para telas pequenas;
  - `player-footer.handlebars` — player fixo no rodapé, **populado por JavaScript** (capa, título/artista, controles, progresso, volume);
  - `track-item.handlebars` / `track-card.handlebars` — itens de música que carregam os atributos `data-track-*`;
  - `capa.handlebars` — capa reutilizável com fallback para `/img/default.svg`;
  - no admin: `admin-nav.handlebars`, `flash.handlebars` e `excluir.handlebars`.
- **Helpers Handlebars** registrados em `app.js`:
  - `{{eq a b}}` e `{{neq a b}}` — comparação condicional de blocos;
  - `{{gt}}`, `{{gte}}`, `{{lt}}` — comparações numéricas;
  - `{{formatDuracao segundos}}` — converte segundos em `m:ss`;
  - `{{inc valor}}` — incremento numérico;
  - `{{concat ...}}` e `{{ternario cond a b}}`;
  - `{{dataTrack musica}}` — emite os atributos `data-track-*` de uma faixa;
  - `{{@root.csrfToken}}` — usado em **todos** os formulários, pois funciona em qualquer nível de contexto.
- **CSS** — `vibewave.css` é o tema principal (com suporte a `body.light-mode` e ao **neon suave**, incluindo o equalizador animado que só roda quando há faixa em reprodução) e `admin.css` o painel administrativo. Estilos que viviam inline nas views foram movidos para cá.
- **JavaScript do cliente** — `player-core.js` centraliza a reprodução e a persistência (ver seção do player); `vibewave.js` cuida de tema, menu mobile e abas; `admin.js` cuida dos uploads com preview e dos diálogos de confirmação.
- **Design responsivo** — a sidebar alterna entre fixa (desktop) e overlay (`≤ 860px`), com `prefers-reduced-motion` respeitado.

---

## Autenticação e Autorização

1. A sessão é criada em `app.js` com `express-session` (`resave: false`, `saveUninitialized: false`, cookie `httpOnly`, `sameSite: 'lax'`, `secure` em produção e validade de 7 dias).
2. O segredo de sessão vem de `SESSION_SECRET` (há um valor de fallback apenas para desenvolvimento local).
3. `config/auth.js` configura a estratégia local usando **e-mail** como usuário e compara a senha via `bcrypt.compare`.
4. `serializeUser`/`deserializeUser` mantêm apenas o `id` na sessão e recuperam o usuário do banco a cada requisição.
5. Mensagens de sucesso/erro são propagadas com `connect-flash` e expostas nas views via `res.locals`.
6. `helpers/eLogado.js` redireciona visitantes para `/usuario/login` preservando o destino em `?redirect=`.
7. `helpers/eAdmin.js` redireciona quem não está autenticado e devolve **403** para quem está autenticado mas não é administrador.
8. **CSRF**: `helpers/csrf.js` gera um token por sessão (`csrfToken`, exposto em `res.locals`) e `csrfVerify` valida o campo `_csrf` em todo POST/PUT/PATCH/DELETE, usando `timingSafeEqual` e conferindo `Origin`/`Referer` quando presentes. Os routers de login e admin aplicam o middleware; GET nunca é bloqueado.
9. O campo que concede acesso ao painel é `users.isAdmin`.

---

## Changelog

### v1.6 — Painel administrativo, player persistente e neon

**Segurança**
- **CSRF próprio** (`helpers/csrf.js`): token por sessão, comparação com `timingSafeEqual` e checagem de `Origin`/`Referer`. Aplicado em `routes/login.js` e `routes/admin.js` via `router.use(csrfVerify)`.
- **Login e cadastro** reescritos: e-mail normalizado, senha mínima de 8 caracteres alinhada ao model e `redirect` validado contra *open redirect*.
- `eAdmin`/`eLogado` reescritos: não autenticado vai para `/usuario/login?redirect=…`; autenticado sem `isAdmin` recebe **403** em vez de erro 500.
- Sessão endurecida (`httpOnly`, `sameSite: 'lax'`, `secure` em produção) e credenciais do banco movidas para variáveis de ambiente.
- Nova view `403/erro.handlebars`.

**Uploads**
- `config/multerconfig.js` reescrito com allowlist de extensão **e** MIME, limite de 50 MB para áudio e 5 MB para imagem, e nomes gerados com `crypto.randomUUID()`.
- Exclusão de registros agora apaga os arquivosassociated do disco e ignora nomes padrão.

**Painel administrativo**
- `routes/admin.js` reorganizado em CRUD completo: dashboard com contadores, listagens paginadas com busca/filtro, formulários de música (criar/editar/áudio/capa) e artista, gestão de usuários (promover/revogar admin, redefinir senha, excluir) e troca de senha do admin — tudo com layouts, partials e diálogos de confirmação.
- `helpers/validacao.js` e `config/opcoes.js` centralizam paginação, busca, validação de campos e listas de opções.
- URLs antigas foram preservadas por redirects.

**Player persistente**
- Novo `public/js/player-core.js`: um único elemento `<audio>` por página, com estado salvo em `localStorage` (`vw-player`) — **a música continua tocando ao trocar de página, recarregar ou usar voltar/avançar**.
- `player-footer.handlebars` foi reescrito para ser populado por JS, com barra de progresso clicável, volume, fila e controles de shuffle/repeat.
- Partial `dataTrack` gera os atributos `data-track-*`; as listas viram filas reais. A página `/player/:id` controla o mesmo áudio do rodapé.
- API pública `window.VW` (`play`, `pause`, `toggle`, `next`, `previous`, `seek`, `volume`, `state`, `clear`) e integração com a **Media Session** do sistema operacional.
- `public/js/vibewave.js` deixou de duplicar a lógica do player.

**Imagens**
- Partial `capa.handlebars` reutilizado no admin e no front, com `onerror` caindo em `/img/default.svg` quando o arquivo não existe.
- `foto` de usuário e artista passa a ser `NULL` quando não há upload (antes gravava `default.png`, arquivo que não existia no diretório de artistas).

**Interface**
- Busca passou a renderizar resultados de verdade (`musicas` e `artistas`) em vez de apenas categorias.
- **Neon suave** em `vibewave.css` e `admin.css`:equalizador animado que só toca quando há faixa em reprodução, brilho em hover/active/progresso e degradação total em `prefers-reduced-motion`.
- Estilos que estavam inline nas views foram movidos para `vibewave.css`.
- Views obsoletas e assets órfãos removidos (`recentemente.handlebars`, `treino.handlebars`, `buscar.css`, `login.css`, `perfil.css`, `style.css`, `login.js`, `main.js`, `player.js`).

**Correções encontradas por teste**
- `estado.src` nunca era atribuído em `player-core.js`, o que impedia a restauração da faixa entre páginas.
- `clear()` do player pausava o áudio e o evento `pause` regravava o estado imediatamente.
- Helper `concat` usava *rest params*, então o Handlebars injetava o objeto `options` e as URLs viravam `/admin/usuarios/2/excluir[object Object]`.
- Partial `excluir` renderizava `_csrf=""` (usava `{{csrfToken}}` no contexto da linha em vez de `@root`), quebrando **todas** as exclusões vindas das listagens.
- `{{#if gt paginacao.paginas 1}}` nunca funcionou: o helper embutido `if` do Handlebars aceita exatamente um argumento. Substituído por `paginacao.temMaisPaginas`.
- `VW.play({...})` quebrava com objetos de faixa, pois `montarFilaDoDom` assumia um elemento do DOM.
- O estado de **mudo não sobrevivia à navegação** (só o volume era salvo); agora há a chave `vw-muted`, gravada no clique e reaplicada no `restaurar`.
- `views/admin/index.handlebars` e `views/admin/musicas.handlebars` renderizavam `{{> flash}}` **em cima** do `{{> flash}}` do layout admin, duplicando toda mensagem de sucesso/erro.
- Formulários de login/cadastro estavam sem `_csrf` e sem `redirect`, o que os teria quebrado com o novo middleware.

**Testes**
- `npm test` passa a existir, com `tests/render.test.js` (renderiza todas as views com os helpers reais e falha em token CSRF vazio) e `tests/player.test.js` (persistência do player com DOM simulado).
- `app.js` passou a exportar o app e só abre a porta quando executado diretamente, permitindo `require('./app')` em testes.

### v1.5 — Migração para Sequelize/MySQL e redesenho da interface

**Persistência**
- Migração completa do MongoDB (Mongoose) para **MySQL com Sequelize** — remoção de `mongoose`, `mysql2` (conexão manual) e dos schemas Mongoose.
- Modelos reescritos com `sequelize.define`: `Usuario`, `Artista` e `Musica`.
- Configuração de `hasMany`/`belongsTo` entre `Artista` e `Musica`.
- `sequelize.sync()` na inicialização para criar as tabelas automaticamente.
- `res.locals.user` normalizado com `.get({ plain: true })` para Instances do Sequelize.

**Autenticação**
- `passport-local` configurado com `usernameField: 'email'`.
- Senhas comparadas com `bcrypt.compare` no login e geradas com `bcrypt.hash` no registro.

**Aplicação**
- Remoção da dupla conexão de banco e do `User.sync({ force: true })` destrutivo.
- Rotas convertidas para `async/await` com tratamento de erro e redirecionamento à página `/404`.
- Helper `formatDuracao` criado para exibir duração de forma consistente em todas as listas.

**Interface**
- Novo design system com `vibewave.css` e `admin.css`.
- Uso de **partials** (`sidebar`, `mobile-nav`, `player-footer`) para eliminar duplicação de markup.
- Player persistente no rodapé em todas as telas internas.
- Tema claro/escuro com alternância e persistência em `localStorage`.
- Layout mobile com menu hambúrguer.
- Nova página de sucesso (`/sucess`) e página 404 redesenhada.
- Simplificação das views: redução de ~2.600 linhas de markup duplicado.

**Arquivos novos no commit anterior**
`public/css/admin.css`, `public/css/vibewave.css`, `public/js/vibewave.js`, `public/img/default.svg`, `views/partials/*`, `views/sucess/sucess.handlebars`.

### Correções de segurança e DX

- **Proteção do painel administrativo** — `router.use(eAdmin)` aplicado a todas as rotas de `/admin` em `routes/admin.js`. Anteriormente o painel era acessível a qualquer visitante.
- **`eAdmin` endurecido** — verificação defensiva de `isAuthenticated` e `req.user`, evitando erro 500 caso o contexto do Passport não esteja disponível.
- **Scripts no `package.json`** — adicionados `npm start` e `npm run dev` (Nodemon), além de `name`, `version`, `description` e `main`.

### v0 — Versão inicial
- Estrutura Express Handlebars com rotas de login, home e player.
- Integração inicial com MongoDB e MySQL.
- Formulários de login e cadastro, player de música básico e views estáticas.

---

## Pontos de Atenção e Melhorias Futuras

Antes de colocar o projeto em produção, considere:

- **Fallbacks de credenciais** — `config/db.js` e o segredo de sessão em `app.js` ainda têm valores de fallback para desenvolvimento local. Em produção, defina `DB_PASSWORD` e `SESSION_SECRET` explicitamente (idealmente via `.env` com `dotenv`, que ainda não foi adotado).
- **Sem store de sessão** — `express-session` usa o `MemoryStore` padrão, que perde as sessões a cada reinício e não escala. Considerar `connect-mysql2` ou similar.
- **Exclusão em cascata de artistas** — a confirmação é feita por diálogo JavaScript que envia `forcar=sim` junto do `_csrf`. Sem JavaScript, a exclusão é bloqueada pela rota e o usuário recebe a instrução de reenviar com confirmação.
- **Recursos ainda estáticos** — favoritos, histórico real e criação de playlists não são persistidos; as páginas `/playlist`, `/recentemente` e `/treino` exibem o catálogo completo como placeholders.
- **Imagem padrão legada** — `public/uploads/FotoUser/default.png` (1,2 MB) continua no repositório por compatibilidade com registros antigos. Novos registros gravam `NULL` e as views caem em `/img/default.svg`; vale remover o arquivo após migrar os registros antigos.
- **Sem migrations** — o schema é criado por `sequelize.sync()` na inicialização. Alterações em models não viram migrations versionadas.
- **Testes** — `npm test` cobre a renderização das views e a persistência do player, mas não há testes de integração com o banco nem cobertura de rotas.

---

## Testes

```bash
npm test
```

- `tests/render.test.js` — carrega os **helpers reais de `app.js`**, renderiza todas as views com dados de exemplo e falha se sobrar Handlebars não processado, `undefined`, `[object Object]` ou **token CSRF vazio** (a causa clássica de formulários que enviam `_csrf=""`).
- `tests/player.test.js` — simula `document`, `localStorage` e `Audio` para validar o ciclo de persistência do `player-core.js`: tocar, salvar, **restaurar em outra navegação**, pausar, mudar volume, buscar posição e limpar o estado.

---

## Licença

Projeto acadêmico/pessoal, developido para fins de estudo. Todos os direitos de uso do nome, logotipo e identidade visual pertencem aos respectivos autores do projeto VibeWave.