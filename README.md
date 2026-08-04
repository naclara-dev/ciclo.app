<div align="center">

# Ciclo

**A web app for managing personal finances.**
**Um app web para gestão de finanças pessoais.**

🌐 **Live:** [ciclo.naclara.dev](https://ciclo.naclara.dev)

</div>

---

> 🇬🇧 English below &nbsp;·&nbsp; 🇧🇷 [Português mais abaixo](#-português)

## 🇬🇧 English

Ciclo helps you track income and expenses, organize them by wallets, categories
and entities, automate recurring entries with templates, and visualize your
finances through a dashboard built around billing cycles.

### Features

- **Transactions** — register income/expenses with title, amount, type, wallet,
  category, entity, payment method and dates (occurrence, due, paid).
- **Wallets, categories & entities** — manage the building blocks of your
  finances.
- **Templates** — define recurring entries (frequency, interval, day of month)
  that drive future transactions.
- **Dashboard** — overview organized by billing cycles, with a printable view.
- **Settings** — per-user defaults (wallet, entity, payment method, type).
- **Authentication** — email-based accounts plus Google OAuth sign-in.

### Tech stack

- **PHP 7.2+** with a small custom MVC structure (Controllers, Services,
  Repositories, DTOs, Presenters) and a file-based router.
- **Twig** templating.
- **MySQL** via PDO, with plain-SQL migrations and seeds.
- **Tailwind CSS v4** (via CDN) plus custom CSS, and Font Awesome.
- **[vlucas/phpdotenv](https://github.com/vlucas/phpdotenv)** for configuration.
- Served on Apache (mod_rewrite via `.htaccess`); developed on XAMPP.

### Project structure

```
config/      bootstrap, constants, helper functions
routes/      web.php — URI → [Controller, method] map
src/
  Controllers/  request handlers
  Services/     business logic (e.g. DashboardService)
  Models/       Entities + Repositories
  DTOs/         data transfer objects
  Presenters/   view-facing formatting
  Views/        Twig templates
database/
  migrations/   schema (-- up / -- down sections)
  seeds/        reference data
  run.php       migration/seed runner
assets/         css, js, img, vendor
index.php       front controller
```

### Getting started

**Requirements:** PHP 7.2+, MySQL, Composer, and a web server with URL rewriting
(Apache/XAMPP recommended).

1. **Clone & install dependencies**

   ```bash
   git clone https://github.com/naclara-dev/ciclo.app.git
   cd ciclo.app
   composer install
   ```

2. **Configure environment** — create a `.env` file in the project root:

   ```dotenv
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=ciclo
   DB_USER=root
   DB_PASS=

   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GOOGLE_REDIRECT_URI=http://localhost/ciclo/login/google/callback/
   ```

3. **Create the database** named to match `DB_NAME`, then run migrations and
   seeds:

   ```bash
   php database/run.php migrate
   php database/run.php seed
   ```

4. **Serve the app** — point your web server's document root at the project
   folder (so `.htaccess` rewrites to `index.php`), then open it in your browser.

### Contributing

Contributions are welcome! Open an issue to discuss a change, or send a pull
request. Please keep changes focused and follow the existing code style.

### License

Released under the [MIT License](LICENSE).

---

## 🇧🇷 Português

O Ciclo ajuda você a acompanhar receitas e despesas, organizá-las por carteiras
(wallets), categorias e entidades, automatizar lançamentos recorrentes com
templates e visualizar suas finanças por meio de um dashboard organizado por
ciclos de cobrança.

### Funcionalidades

- **Transações** — registre receitas/despesas com título, valor, tipo, wallet,
  categoria, entidade, forma de pagamento e datas (ocorrência, vencimento,
  pagamento).
- **Wallets, categorias e entidades** — gerencie os blocos que estruturam suas
  finanças.
- **Templates** — defina lançamentos recorrentes (frequência, intervalo, dia do
  mês) que geram transações futuras.
- **Dashboard** — visão geral organizada por ciclos de cobrança, com versão para
  impressão.
- **Configurações** — padrões por usuário (wallet, entidade, forma de pagamento,
  tipo).
- **Autenticação** — contas por e-mail e login com Google OAuth.

### Tecnologias

- **PHP 7.2+** com uma estrutura MVC enxuta e própria (Controllers, Services,
  Repositories, DTOs, Presenters) e roteador baseado em arquivo.
- **Twig** para os templates.
- **MySQL** via PDO, com migrations e seeds em SQL puro.
- **Tailwind CSS v4** (via CDN) com CSS próprio, e Font Awesome.
- **[vlucas/phpdotenv](https://github.com/vlucas/phpdotenv)** para configuração.
- Servido em Apache (mod_rewrite via `.htaccess`); desenvolvido em XAMPP.

### Estrutura do projeto

```
config/      bootstrap, constantes e funções auxiliares
routes/      web.php — mapa URI → [Controller, método]
src/
  Controllers/  tratadores de requisição
  Services/     regras de negócio (ex.: DashboardService)
  Models/       Entities + Repositories
  DTOs/         objetos de transferência de dados
  Presenters/   formatação voltada à view
  Views/        templates Twig
database/
  migrations/   esquema (seções -- up / -- down)
  seeds/        dados de referência
  run.php       executor de migrations/seeds
assets/         css, js, img, vendor
index.php       front controller
```

### Como rodar

**Requisitos:** PHP 7.2+, MySQL, Composer e um servidor web com reescrita de URL
(Apache/XAMPP recomendado).

1. **Clone e instale as dependências**

   ```bash
   git clone https://github.com/naclara-dev/ciclo.app.git
   cd ciclo
   composer install
   ```

2. **Configure o ambiente** — crie um arquivo `.env` na raiz do projeto:

   ```dotenv
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=ciclo
   DB_USER=root
   DB_PASS=

   GOOGLE_CLIENT_ID=seu-google-client-id
   GOOGLE_CLIENT_SECRET=seu-google-client-secret
   GOOGLE_REDIRECT_URI=http://localhost/ciclo/login/google/callback/
   ```

3. **Crie o banco de dados** com o nome definido em `DB_NAME` e rode as
   migrations e seeds:

   ```bash
   php database/run.php migrate
   php database/run.php seed
   ```

4. **Sirva a aplicação** — aponte a raiz do servidor web para a pasta do projeto
   (para o `.htaccess` reescrever para o `index.php`) e abra no navegador.

### Contribuindo

Contribuições são bem-vindas! Abra uma issue para discutir uma mudança ou envie
um pull request. Mantenha as alterações focadas e siga o estilo de código
existente.

### Licença

Distribuído sob a [Licença MIT](LICENSE).
