# Leads Manager

Sistema para acompanhar metas, leads, seguidores, vendas, receita e posts.

## Versoes do projeto

- `main`: versao local original, salvando em `data/leads-db.json`.
- `codex/vercel-supabase`: versao adaptada para Vercel + Supabase.

## Rodar localmente

```bash
npm install
npm run dev
```

Para usar o servidor local com JSON:

```bash
npm run build
npm run start
```

## Deploy gratuito com Vercel + Supabase

### 1. Criar o banco no Supabase

1. Acesse [supabase.com](https://supabase.com).
2. Crie uma conta ou entre na sua conta.
3. Clique em **New project**.
4. Escolha nome, senha do banco e regiao.
5. Depois que o projeto abrir, va em **SQL Editor**.
6. Copie o conteudo de `supabase.sql`.
7. Cole no SQL Editor e clique em **Run**.

Isso cria a tabela `leads_store` com RLS ligado e sem policy publica.

### 2. Pegar as chaves do Supabase

No Supabase:

1. Va em **Project Settings**.
2. Entre em **API**.
3. Copie:
   - **Project URL**
   - **service_role key**

Importante: nunca coloque a `service_role key` no frontend. Ela deve ficar apenas nas variaveis de ambiente da Vercel.

### 3. Criar o deploy na Vercel

1. Acesse [vercel.com](https://vercel.com).
2. Entre com GitHub.
3. Clique em **Add New > Project**.
4. Selecione o repo `hericlesferreira/Leads-Manager`.
5. Em **Framework Preset**, deixe como **Vite**.
6. Configure:
   - Build Command: `npm run build`
   - Output Directory: `dist`
7. Em **Environment Variables**, adicione:
   - `SUPABASE_URL`: URL do projeto Supabase.
   - `SUPABASE_SERVICE_ROLE_KEY`: service role key do Supabase.
   - `APP_ACCESS_CODE`: um codigo forte para abrir o sistema.
8. Clique em **Deploy**.

### 4. Como fica a seguranca

O sistema online nao usa o Supabase diretamente no navegador.

O navegador chama `/api/db`, uma funcao serverless da Vercel. Essa funcao:

- exige o `APP_ACCESS_CODE`;
- usa a `SUPABASE_SERVICE_ROLE_KEY` somente no servidor;
- grava e le os dados na tabela `leads_store`;
- mantem RLS ligado no Supabase e sem policies publicas.

Na pratica, quem tiver somente a URL ainda precisa do codigo de acesso definido em `APP_ACCESS_CODE`.

### 5. Atualizar o codigo no futuro

Depois de alterar o projeto:

```bash
npm run build
git add .
git commit -m "Descricao da alteracao"
git push
```

A Vercel faz novo deploy automaticamente.
