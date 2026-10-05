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
- [Front-end](#front-end)
- [Autenticação e Autorização](#autenticação-e-autorização)
- [Changelog](#changelog)
- [Pontos de Atenção e Melhorias Futuras](#pontos-de-atenção-e-melhorias-futuras)
- [Licença](#licença)

---

## Funcionalidades

### Usuário final
- **Landing page** (`/`) com apresentação do produto.
- **Cadastro e login** de usuários com validação de formulário e senha criptografada com `bcryptjs`.
- **Home** (`/home`) — protegida por login, exibe o catálogo de músicas com capas e artistas.
- **Busca** (`/search`) — interface de busca por músicas e artistas.
- **Biblioteca** (`/lybrary`) — lista-artistas e músicas ordenadas, com dados vindos do banco.
- **Player de música** (`/player/:id`) — página dedicada de reprodução com barra de progresso, tempo e seek.
- **Playlists** — Favoritas, Recentes e Workouts Mix (`/playlist`, `/recentemente`, `/treino`) reutilizando a view de lista.
- **Perfil** (`/perfil`) — dados do usuário logado.
- **Player global (rodapé fixo)** — barra de reprodução persistente via partial `player-footer`.
- **Tema claro/escuro** com persistência em `localStorage`.
- **Menu lateral colapsável** em mobile, com partial `sidebar` e `mobile-nav`.
- **Páginas de sucesso e erro** — `/sucess` e `/404`.

### Administração (somente `isAdmin`)
- **Dashboard** com tabelas de músicas, artistas e usuários e contadores.
- **CRUD de artistas** — criação (com foto), edição (com troca de imagem) e exclusão (remove arquivo do disco).
- **CRUD de músicas** — upload de áudio com extração automática de duração, edição e exclusão.
- **Upload de capa** de álbum.
- **API interna de contadores** (`/admin/api/artista/cont`, `/admin/api/musica/cont`) usada pelo dashboard.

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
```

---

## Configuração do Banco de Dados

**1. Crie o banco de dados**

```sql
CREATE DATABASE vibewave CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**2. Configure a conexão** em `config/db.js`:

```js
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('vibewave', 'otavio', 'SuaSenhaForte', {
    host: 'localhost',
    dialect: 'mysql',
    logging: false
});

module.exports = sequelize;
```

Ajuste `database`, `username`, `password` e `host` conforme seu ambiente. **Nunca versione credenciais reais** — considere usar variáveis de ambiente (`.env`) em produção.

**3. Sincronização automática**

As tabelas são criadas automaticamente por `sequelize.sync()` na inicialização do `app.js`. Isso cria/ajusta as tabelas `users`, `artists` e `musics`.

> ⚠️ **Cuidado:** `sync()` sem opções não apaga dados existentes, mas em produção é recomendável usar migrações.

**4. Torne um usuário administrador**

Após criar a conta pelo formulário de registro, promova-a no banco:

```sql
UPDATE users SET isAdmin = true WHERE email = 'seu@email.com';
```

---

## Executando o Projeto

O `package.json` ainda não define scripts, então utilize o Nodemon diretamente:

```bash
npx nodemon app.js
```

Ou, sem hot reload:

```bash
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

<details>
<summary><b>Adicionando scripts ao package.json (recomendado)</b></summary>

```json
{
  "scripts": {
    "start": "node app.js",
    "dev": "nodemon app.js"
  }
}
```

Depois basta usar `npm start` / `npm run dev`.

</details>

---

## Estrutura do Projeto

```
VibeWave/
├── app.js                     # Entry point: middlewares, helpers, rotas e servidor
├── package.json
├── config/
│   ├── db.js                  # Conexão Sequelize/MySQL
│   ├── auth.js                # Estratégia local do Passport
│   ├── multerconfig.js        # Factory de storage do Multer (nome: timestamp_originalname)
│   ├── upload.js              # Upload em memória + recorte de imagem com sharp
│   └── analiseaudio.js        # Metadados de áudio via ffprobe
├── helpers/
│   ├── eLogado.js             # Middleware: exige usuário autenticado
│   └── eAdmin.js              # Middleware: exige perfil de administrador
├── models/
│   ├── Usuario.js             # Model users
│   ├── Artista.js             # Model artists
│   └── Musica.js              # Model musics
├── routes/
│   ├── login.js               # /usuario — cadastro, login, logout
│   └── admin.js               # /admin — CRUD de artistas, músicas e contadores
├── views/                     # Templates Handlebars
│   ├── layouts/main.handlebars
│   ├── partials/              # sidebar, mobile-nav, player-footer
│   ├── admin/                 # dashboard e formulários
│   ├── homes/                 # home, search, lybrary, player, playlist, perfil
│   ├── usuarios/login.handlebars
│   ├── 404/erro.handlebars
│   └── sucess/sucess.handlebars
├── public/
│   ├── css/                   # vibewave.css, admin.css, login.css, perfil.css, buscar.css, style.css
│   ├── js/                    # vibewave.js, admin.js, login.js, player.js, main.js
│   ├── img/                   # imagens estáticas (default.svg)
│   └── uploads/               # Sending: musicas/, artistas/, capamusica/, FotoUser/
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
| GET | `/admin/api/artista/cont` | Total de artistas cadastrados |
| GET | `/admin/api/musica/cont` | Total de músicas cadastradas |

### Autenticação (`/usuario`)

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/usuario/login` | Tela de login/cadastro |
| POST | `/usuario/registro` | Cria novo usuário (valida nome, e-mail, senha e confirmação) |
| POST | `/usuario/login` | Autentica via Passport local |
| GET | `/usuario/logout` | Encerra a sessão |

### Administração (`/admin`)

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/admin` | Dashboard com tabelas e contadores |
| POST | `/admin/artista/novo` | Cadastra artista (upload de foto) |
| GET | `/admin/artista/edit/:id` | Formulário de edição de artista |
| POST | `/admin/artista/edit` | Salva alterações do artista |
| POST | `/admin/artista/delete/:id` | Remove artista e arquivo de imagem |
| POST | `/admin/musicas/nova` | Cadastra música (upload de áudio + extração de duração) |
| GET | `/admin/musica/edit/:id` | Formulário de edição de música |
| POST | `/admin/musica/edit/:id` | Atualiza a capa da música |
| GET | `/admin/music/img/:id` | Formulário de upload de capa |
| POST | `/admin/musica/delete/:id` | Remove música |

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

As rotas `/admin/api/artista/cont` e `/admin/api/musica/cont` alimentam os cartões de totais exibidos no topo do painel.

---

## Upload e Processamento de Áudio

**Armazenamento** — `config/multerconfig.js` cria um `multer.diskStorage` com o arquivo renomeado para `{timestamp}_{nomeOriginal}`, evitando colisões e sobrescritas:

```js
filename: (req, file, callback) => {
    const time = new Date().getTime();
    callback(null, `${time}_${file.originalname}`);
}
```

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

## Front-end

- **Layouts e partials** — o Express Handlebars está configurado com `defaultLayout: 'main'` e `partialsDir: views/partials`. Isso permite reutilizar:
  - `sidebar.handlebars` — navegação lateral com logo, links, playlists e card do usuário logado;
  - `mobile-nav.handlebars` — botão hambúrguer para telas pequenas;
  - `player-footer.handlebars` — player fixo no rodapé com capa, título/artista, controles, barra de progresso, volume e elemento `<audio id="global-audio">`.
- **Helpers Handlebars** registrados em `app.js`:
  - `{{eq a b}}` — comparação condicional de blocos;
  - `{{formatDuracao segundos}}` — converte segundos em `m:ss`;
  - `{{inc valor}}` — incremento numérico.
- **CSS** — `vibewave.css` é o tema principal da aplicação (com suporte a `body.light-mode`), `admin.css` o painel administrativo. Os demais arquivos (`login.css`, `perfil.css`, `buscar.css`, `style.css`) atendem às telas específicas.
- **JavaScript do cliente** — `vibewave.js` concentra a lógica de tema claro/escuro, menu mobile, abas, player e volume; `player.js` controla a reprodução da página de player; `main.js`, `admin.js` e `login.js` atendem às telas correspondentes.
- **Design responsivo** — a sidebar alterna entre fixa (desktop) e overlay (`≤ 860px`).

---

## Autenticação e Autorização

1. A sessão é criada em `app.js` com `express-session` (segredo, `resave: false`, `saveUninitialized: false`, cookie não seguro para HTTP local).
2. `config/auth.js` configura a estratégia local usando **e-mail** como usuário e compara a senha via `bcrypt.compare`.
3. `serializeUser`/`deserializeUser` mantêm apenas o `id` na sessão e recuperam o usuário do banco a cada requisição.
4. Mensagens de sucesso/erro são propagadas com `connect-flash` e expostas nas views via `res.locals`.
5. `helpers/eLogado.js` redireciona visitantes para `/usuario/login`; `helpers/eAdmin.js` bloqueia quem não tem `isAdmin = 1`.

---

## Changelog

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

### v0 — Versão inicial
- Estrutura Express Handlebars com rotas de login, home e player.
- Integração inicial com MongoDB e MySQL.
- Formulários de login e cadastro, player de música básico e views estáticas.

---

## Pontos de Atenção e Melhorias Futuras

Antes de colocar o projeto em produção, considere:

- **Credenciais no código** — `config/db.js` e o segredo de sessão em `app.js` estão versionados. Migrar para variáveis de ambiente (`.env` com `dotenv`) e rotacionar o segredo de sessão.
- **`eAdmin` sem uso** — o helper existe e está correto, mas não está aplicado às rotas de `/admin`; qualquer visitante consegue acessar o painel. Adicionar `router.use(eAdmin)` em `routes/admin.js`.
- **Uploads sem limite de tamanho** — `multerconfig.js` não define `limits.fileSize` nem filtro de mimetype para o áudio.
- **Exclusão de registros** — usar formulários com `POST` já evita *method override*, mas não há verificação de posse do recurso nem confirmação.
- **Senha do usuário validada em dois lugares** — o modelo exige 8–100 caracteres, enquanto o formulário de registro aceita 4+. Alinhar as regras.
- **Sem store de sessão** — `express-session` usa o `MemoryStore` padrão, que perde as sessões a cada reinício e não escala. Considerar `connect-mysql2` ou similar.
- **Nenhuma biblioteca de testes** — não há suíte automatizada configurada.
- **Scripts de npm ausentes** — adicionados manualmente via `npx`; vale incluir `start` e `dev` no `package.json`.
- **Recursos ainda estáticos** — favoritos, histórico de reprodução e playlists não são persistidos; as páginas `/playlist`, `/recentemente` e `/treino` exibem o catálogo completo como placeholders.
- **Código legado** — `public/js/main.js` ainda contém dados mockados e não é carregado pelas views atuais; pode ser removido.

---

## Licença

Projeto acadêmico/pessoal, developido para fins de estudo. Todos os direitos de uso do nome, logotipo e identidade visual pertencem aos respectivos autores do projeto VibeWave.