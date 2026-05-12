# Deploy em Apache (Intranet) — subpasta `/dashboardpessoal/`

## 1. Gerar o build de produção

No ambiente onde estiver o código (pode ser local ou um runner CI):

```bash
npm install
npm run build
```

Isso gera a pasta `dist/` com todos os arquivos estáticos (HTML, CSS, JS,
imagens). O Vite já está configurado para usar `base: "/dashboardpessoal/"`
em modo `production`, então todos os caminhos de assets ficam corretos.

## 2. Copiar para o servidor Apache

Copie **o conteúdo** da pasta `dist/` (não a pasta em si) para:

```
/var/www/html/dashboardpessoal/
```

Estrutura final esperada:

```
/var/www/html/dashboardpessoal/
├── index.html
├── .htaccess          (já incluído, vem de public/.htaccess)
├── assets/
│   ├── index-XXXX.js
│   ├── index-XXXX.css
│   └── ...
└── ...
```

> Dica: `rsync -av --delete dist/ usuario@servidor:/var/www/html/dashboardpessoal/`

## 3. Configurar Apache

Garanta que estes módulos estão habilitados:

```bash
sudo a2enmod rewrite
sudo a2enmod expires
sudo a2enmod deflate
sudo systemctl reload apache2
```

No `VirtualHost` (ou no `apache2.conf`), permita `.htaccess` na pasta:

```apache
<Directory /var/www/html/dashboardpessoal>
    Options -Indexes +FollowSymLinks
    AllowOverride All
    Require all granted
</Directory>
```

Recarregue o Apache:

```bash
sudo systemctl reload apache2
```

## 4. Acessar

```
http://<ip-ou-host-da-intranet>/dashboardpessoal/
```

O React Router vai cuidar das rotas internas (`/login`, `/dashboard-om`,
etc.) graças ao `.htaccess` que redireciona qualquer rota desconhecida
para `index.html`.

## 5. Backend (Lovable Cloud)

A aplicação continua usando o **Lovable Cloud** (Supabase gerenciado) como
backend. As variáveis em `.env` (`VITE_SUPABASE_URL`,
`VITE_SUPABASE_PUBLISHABLE_KEY`) são embutidas no build.

> **Importante:** se a intranet for **isolada da internet**, o backend
> Lovable Cloud não será acessível. Nesse caso será necessário migrar o
> backend para um Postgres local + API própria — o que é um projeto à parte.

## 6. Atualizações

A cada nova versão:

```bash
npm run build
rsync -av --delete dist/ usuario@servidor:/var/www/html/dashboardpessoal/
```

O Apache serve os novos arquivos imediatamente. Os usuários só precisam
recarregar a página (Ctrl+F5 se houver cache agressivo).
