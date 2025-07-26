# Sistema de Orçamentos para Fabricação de Produtos Personalizados

Este projeto implementa um sistema de backend para gerenciar e automatizar o processo de orçamentação para a fabricação de produtos personalizados, utilizando Next.js, TypeScript e Supabase.

## Funcionalidades

- **Gerenciamento de produtos e matérias-primas**
  - Visualização hierárquica em árvore com expansão/colapso
  - Criação inteligente de produtos com seleção de dependências
  - Filtros por tipo (produto final / matéria-prima)
  - Busca por nome/descrição mantendo hierarquia
- **Definição de dependências entre produtos**
  - Interface visual para visualizar relações entre produtos
  - Criação automática de dependências durante criação de matérias-primas
  - Prevenção de dependências circulares
- **Configuração de processos de fabricação**
- **Gestão de mão de obra**
- **Criação de pedidos**
- **Geração de orçamentos detalhados**
- **API RESTful para integração com sistemas frontend**
- **Cálculo de dependências recursivas para materiais**
- **Cálculo de custos de produção e tempo estimado**

## Tecnologias Utilizadas

- **Frontend**: Next.js 14 com TypeScript e TailwindCSS
- **Backend**: API Routes do Next.js
- **Banco de Dados**: Supabase (PostgreSQL)
- **Autenticação**: Supabase Auth
- **Logging**: Winston
- **Testes**: Vitest

## Requisitos

- Node.js 18 ou superior
- NPM 8 ou superior
- Conta no Supabase

## Configuração

1. Clone o repositório
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Crie um arquivo `.env.local` na raiz do projeto com as seguintes variáveis:
   ```
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima

   # Ambiente
   NODE_ENV=development

   # Configurações da aplicação
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```
4. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
5. Execute os testes:
   ```bash
   npm test
   ```

## Estrutura do Projeto

- `/src/app`: Rotas e páginas da aplicação
- `/src/app/api`: Endpoints da API
- `/src/components`: Componentes React reutilizáveis
- `/src/hooks`: Custom hooks React
- `/src/lib/supabase`: Configuração e integrações com o Supabase
- `/src/types`: Definições de tipos TypeScript
- `/src/utils`: Utilitários e funções auxiliares
- `/tests`: Testes unitários e de integração

## Lógicas de Negócio

### Calculadora de Orçamentos

O sistema implementa diversas lógicas de negócio para cálculos automatizados:

1. **Cálculo de Dependências Recursivas**: 
   - Percorre a árvore de dependências de um produto para identificar todas as matérias-primas necessárias
   - Evita ciclos infinitos de dependências
   - Gerencia múltiplos níveis de componentes

2. **Cálculo de Requisitos de Matérias-Primas**:
   - Determina todas as matérias-primas necessárias para fabricar um produto
   - Calcula quantidades considerando a estrutura de dependências
   - Verifica disponibilidade no estoque

3. **Cálculo de Custos de Processos**:
   - Calcula o custo de cada processo de fabricação necessário
   - Considera quantidade e preço por unidade de cada processo

4. **Cálculo de Custos de Mão de Obra**:
   - Determina o custo de cada tipo de mão de obra necessário
   - Considera horas necessárias e preço por hora

5. **Cálculo de Tempo de Produção**:
   - Estima o tempo total necessário para fabricação
   - Considera tempo de cada processo e quantidade

6. **Geração de Orçamento Completo**:
   - Integra todos os cálculos anteriores
   - Fornece uma visão detalhada de custos e requisitos
   - Inclui subtotais e total geral

## API

### Autenticação

- `POST /api/auth/login`: Login com email e senha
- `POST /api/auth/register`: Registro de novo usuário
- `POST /api/auth/logout`: Logout do usuário atual

### Produtos

- `GET /api/produtos`: Lista todos os produtos
- `POST /api/produtos`: Cria um novo produto
- `GET /api/produtos/:id`: Obtém detalhes de um produto
- `PUT /api/produtos/:id`: Atualiza um produto
- `DELETE /api/produtos/:id`: Remove um produto

### Dependências

- `GET /api/dependencias`: Lista todas as dependências
- `POST /api/dependencias`: Cria uma nova dependência
- `GET /api/dependencias/:id`: Obtém detalhes de uma dependência
- `PUT /api/dependencias/:id`: Atualiza uma dependência
- `DELETE /api/dependencias/:id`: Remove uma dependência

### Processos

- `GET /api/processos`: Lista todos os processos
- `POST /api/processos`: Cria um novo processo
- `GET /api/processos/:id`: Obtém detalhes de um processo
- `PUT /api/processos/:id`: Atualiza um processo
- `DELETE /api/processos/:id`: Remove um processo

### Mão de Obra

- `GET /api/mao-de-obra`: Lista todos os tipos de mão de obra
- `POST /api/mao-de-obra`: Cria um novo tipo de mão de obra
- `GET /api/mao-de-obra/:id`: Obtém detalhes de um tipo de mão de obra
- `PUT /api/mao-de-obra/:id`: Atualiza um tipo de mão de obra
- `DELETE /api/mao-de-obra/:id`: Remove um tipo de mão de obra

### Pedidos

- `GET /api/pedidos`: Lista todos os pedidos
- `POST /api/pedidos`: Cria um novo pedido
- `GET /api/pedidos/:id`: Obtém detalhes de um pedido
- `PUT /api/pedidos/:id`: Atualiza um pedido
- `DELETE /api/pedidos/:id`: Remove um pedido

### Orçamentos

- `GET /api/orcamentos?pedido_id=XXX`: Gera um orçamento detalhado para um pedido
- `GET /api/orcamentos/exportar?pedido_id=XXX`: Exporta um orçamento em formato estruturado
- `PATCH /api/orcamentos/precos`: Atualiza preços em lote

## Contribuição

Para contribuir com o projeto, siga os passos:

1. Faça um fork do repositório
2. Crie uma branch para sua feature
3. Faça suas alterações
4. Envie um pull request

## Licença

Este projeto é licenciado sob a licença MIT.
