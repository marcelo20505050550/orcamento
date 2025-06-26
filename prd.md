# PRD: Sistema de Orçamentos para Fabricação de Produtos Personalizados

## 1. Product overview

### 1.1 Document title and version

* PRD: Sistema de Orçamentos para Fabricação de Produtos Personalizados
* Version: 1.0.0

### 1.2 Product summary

Este sistema de backend é projetado para gerenciar e automatizar o processo de orçamentação para a fabricação de produtos personalizados. Utilizando um banco de dados Supabase, o sistema calcula os custos envolvidos na produção, incluindo matérias-primas, processos de fabricação (como usinagem, corte e dobra, laser e oxicorte) e mão de obra (tanto para produção quanto para desenho/projeto).

O sistema permite identificar dependências entre produtos, onde um produto personalizado (Produto X) pode requerer outros produtos ou componentes (Produto Y, Z, etc.), facilitando um cálculo preciso dos custos totais e dos recursos necessários. Isso proporciona uma visão clara e detalhada do orçamento para cada pedido.

## 2. Goals

### 2.1 Business goals

* Automatizar o processo de orçamentação para reduzir erros e inconsistências
* Padronizar o cálculo de custos para todos os pedidos de fabricação

### 2.2 User goals

* Gerar orçamentos detalhados e precisos para produtos personalizados
* Identificar facilmente todos os componentes e processos necessários para fabricação
* Visualizar o custo detalhado de cada elemento envolvido na produção
* Acompanhar o status dos pedidos em andamento

### 2.3 Non-goals

* Não incluirá interface de usuário frontend (apenas API)
* Não gerenciará logística de entrega ou expedição
* Não incluirá sistema de pagamentos ou faturamento
* Não gerenciará recursos humanos ou escala de funcionários
* Não controlará o processo de produção 


## 3. Functional requirements

* **Gerenciamento de Produtos** (Prioridade: Alta)
  * Cadastro de produtos e matérias-primas
  * Definição de dependências entre produtos
  * Atualização de preços unitários

* **Configuração de Processos de Fabricação** (Prioridade: Alta)
  * Cadastro de processos disponíveis "Usinagem, Corte, Dobra, Laser, Oxicorte".
  * Definição de custos por unidade para cada processo
  * Estimativa de tempo para cada processo (será preenchido no envio do pedido)

* **Gestão de Mão de Obra** (Prioridade: Alta)
  * Cadastro de tipos de mão de obra (fabricação, desenho/projeto)
  * Definição de custo por hora para cada tipo

* **Criação de Pedidos** (Prioridade: Alta)
  * Criação de pedidos com produtos personalizados
  * Seleção de processos necessários para fabricação
  * Definição de horas de mão de obra para cada tipo
  * Cálculo automático de dependências de produtos

* **Geração de Orçamentos** (Prioridade: Alta)
  * Cálculo detalhado de custos de materiais
  * Cálculo de custos de processos
  * Cálculo de custos de mão de obra
  * Geração de orçamento total com detalhamento por categoria

* **API Robusta** (Prioridade: Alta)
  * Endpoints para todas as funcionalidades necessárias
  * Validações de entrada para garantir dados consistentes
  * Resposta estruturada com informações detalhadas

## 5. User experience

### 5.1 Entry points & first-time user flow

* Acesso via API endpoints utilizando ferramentas como Postman ou integração com frontend
* Primeiro fluxo: cadastro de produtos base e suas matérias-primas
* Configuração inicial de processos e valores de mão de obra
* Criação de relacionamentos de dependência entre produtos
* Primeiro pedido de teste para validar o fluxo completo

### 5.2 Core experience

* **Cadastro de Produtos**: Administradores
  * O sistema permite facilmente definir que um produto é composto de outros produtos ou matérias-primas.

* **Configuração de Processos**: Administradores definem processos disponíveis e seus custos.
  * Cada processo tem um valor por unidade e tempo estimado claramente definidos.

* **Criação de Pedidos**: Administradores criam pedidos para produtos personalizados.
  * O sistema automaticamente identifica todas as dependências necessárias para produção.
  * Os processos relevantes são selecionados e quantificados.
  * As horas de mão de obra são estimadas para fabricação e projeto.

* **Visualização de Orçamentos**: O sistema calcula e apresenta o orçamento detalhado.
  * Todos os custos são categorizados e apresentados de forma clara.
  * O tempo total de produção é estimado com base nos processos selecionados.

### 5.3 Advanced features & edge cases

* Dependências recursivas entre produtos (produto que depende de outro que também tem dependências)
* Cálculo de eficiência de uso de matérias-primas
* Identificação de possíveis gargalos de produção baseados em tempos estimados
* Sugestões automáticas de processos com base no produto solicitado
* Tratamento de indisponibilidade de matérias-primas ou componentes

### 5.4 UI/UX highlights

* API com documentação clara e exemplos de uso
* Respostas estruturadas em JSON para fácil integração com frontends
* Validações claras com mensagens de erro informativas
* Cálculos consistentes e rastreáveis


## 8. Technical considerations

### 8.1 Integration points

* API RESTful para integração com sistemas frontend
* Integração com banco de dados Supabase

### 8.2 Data storage & privacy

* Todos os dados sensíveis armazenados no Supabase
* Separação clara entre dados de diferentes clientes/pedidos
* Backup regular dos dados de orçamento e pedidos
* Retenção de dados históricos para análise de tendências

### 8.3 Scalability & performance

* Arquitetura baseada em API para permitir escala horizontal
* Índices otimizados para consultas frequentes
* Cálculos complexos realizados de forma assíncrona quando necessário
* Cache de resultados para orçamentos recentes com mesmos parâmetros

### 8.4 Potential challenges

* Complexidade no cálculo de dependências recursivas de produtos
* Manutenção da consistência de dados em atualizações concorrentes
* Garantia de precisão em cálculos complexos de orçamento
* Tratamento adequado de situações de indisponibilidade de componentes
* Adaptação para diferentes tipos de processos de fabricação


## 10. User stories

### 10.1. Cadastrar produtos e matérias-primas

* **ID**: US-001
* **Descrição**: Como administrador, quero cadastrar produtos e matérias-primas no sistema para que possam ser utilizados nos orçamentos.
* **Acceptance criteria**:
  * Deve ser possível cadastrar um novo produto com nome, descrição, quantidade em estoque e preço unitário
  * Deve ser possível marcar um produto como matéria-prima
  * O sistema deve validar campos obrigatórios e tipos de dados
  * O sistema deve gerar um ID único para cada produto cadastrado
  * Produtos cadastrados devem estar imediatamente disponíveis para uso

### 10.2. Definir dependências entre produtos

* **ID**: US-002
* **Descrição**: Como administrador, quero definir quais produtos são necessários para fabricar outros produtos para que o sistema calcule corretamente os requisitos de materiais.
* **Acceptance criteria**:
  * Deve ser possível relacionar um produto pai (produto final) com produtos filhos (componentes)
  * Deve ser possível especificar a quantidade necessária de cada produto filho
  * O sistema deve suportar relações recursivas (um componente que também tem componentes)
  * As dependências devem ser consideradas automaticamente no cálculo de orçamentos
  * Deve ser possível visualizar todas as dependências de um produto

### 10.3. Cadastrar processos de fabricação

* **ID**: US-003
* **Descrição**: Como administrador, quero cadastrar os diferentes processos de fabricação disponíveis para que possam ser associados aos pedidos.
* **Acceptance criteria**:
  * Deve ser possível cadastrar processos como usinagem, corte e dobra, laser, oxicorte
  * Cada processo deve ter um nome, preço por unidade e tempo estimado em minutos
  * Os processos devem estar disponíveis para seleção na criação de pedidos
  * Deve ser possível atualizar valores e tempos estimados dos processos

### 10.4. Cadastrar tipos de mão de obra

* **ID**: US-004
* **Descrição**: Como administrador, quero cadastrar os diferentes tipos de mão de obra para que seus custos sejam incluídos nos orçamentos.
* **Acceptance criteria**:
  * Deve ser possível cadastrar tipos de mão de obra (fabricação, desenho/projeto)
  * Cada tipo deve ter um preço por hora configurável
  * Os tipos de mão de obra devem estar disponíveis para seleção na criação de pedidos
  * Deve ser possível atualizar o valor por hora de cada tipo de mão de obra

### 10.5. Criar novo pedido

* **ID**: US-005
* **Descrição**: Como administrador, quero criar um novo pedido de fabricação para um produto personalizado.
* **Acceptance criteria**:
  * Deve ser possível selecionar um produto a ser fabricado
  * Deve ser possível especificar a quantidade desejada
  * O sistema deve automaticamente identificar todos os produtos dependentes necessários
  * O pedido deve receber um status inicial "pendente"
  * O pedido deve receber um timestamp de criação

### 10.6. Adicionar processos ao pedido

* **ID**: US-006
* **Descrição**: Como administrador, quero adicionar os processos necessários a um pedido para que sejam considerados no orçamento.
* **Acceptance criteria**:
  * Deve ser possível selecionar um ou mais processos para o pedido
  * Deve ser possível especificar a quantidade de unidades para cada processo
  * O sistema deve calcular o custo total de cada processo com base na quantidade
  * O sistema deve estimar o tempo total de cada processo com base na quantidade

### 10.7. Adicionar mão de obra ao pedido

* **ID**: US-007
* **Descrição**: Como administrador, quero especificar as horas de mão de obra necessárias para um pedido.
* **Acceptance criteria**:
  * Deve ser possível selecionar um ou mais tipos de mão de obra para o pedido
  * Deve ser possível especificar a quantidade de horas para cada tipo
  * O sistema deve calcular o custo total de mão de obra com base nas horas e no valor por hora

### 10.8. Gerar orçamento detalhado

* **ID**: US-008
* **Descrição**: Como administrador, quero visualizar um orçamento detalhado para um pedido para apresentar ao cliente.
* **Acceptance criteria**:
  * O orçamento deve incluir o custo total de todos os materiais necessários
  * O orçamento deve detalhar o custo de cada processo separadamente
  * O orçamento deve mostrar o custo de mão de obra por tipo
  * O orçamento deve apresentar o custo total somando todas as categorias
  * O orçamento deve incluir uma estimativa de tempo total de produção

### 10.9. Listar todos os produtos

* **ID**: US-009
* **Descrição**: Como administrador, quero listar todos os produtos e matérias-primas disponíveis.
* **Acceptance criteria**:
  * A listagem deve incluir todos os produtos cadastrados
  * Deve ser possível filtrar apenas matérias-primas
  * A listagem deve mostrar informações básicas como nome, preço e estoque
  * A listagem deve ser paginada se houver muitos itens

### 10.10. Atualizar status do pedido

* **ID**: US-010
* **Descrição**: Como administrador, quero atualizar o status de um pedido para acompanhar seu progresso.
* **Acceptance criteria**:
  * Deve ser possível alterar o status de um pedido para "em_producao" ou "finalizado"
  * A mudança de status deve ser registrada com data e hora
  * O histórico de mudanças de status deve ser acessível


### 10.12. Calcular requisitos de matéria-prima

* **ID**: US-012
* **Descrição**: Como administrador, quero que o sistema calcule automaticamente todas as matérias-primas necessárias para um pedido.
* **Acceptance criteria**:
  * O sistema deve percorrer todas as dependências recursivamente
  * O cálculo deve considerar a quantidade solicitada do produto final
  * O resultado deve listar todas as matérias-primas com suas quantidades totais
  * O sistema deve alertar se houver matérias-primas insuficientes no estoque

### 10.13. Consultar histórico de pedidos

* **ID**: US-013
* **Descrição**: Como administrador quero consultar o histórico de pedidos para análise de desempenho.
* **Acceptance criteria**:
  * Deve ser possível listar todos os pedidos criados
  * Deve ser possível filtrar pedidos por status
  * Deve ser possível filtrar pedidos por período
  * A listagem deve incluir informações básicas como produto, quantidade e data

### 10.14. Exportar orçamento

* **ID**: US-014
* **Descrição**: Como administrador, quero exportar um orçamento em formato estruturado para compartilhar com clientes.
* **Acceptance criteria**:
  * O sistema deve fornecer o orçamento em formato JSON estruturado
  * Todas as categorias de custo devem estar claramente separadas
  * O orçamento deve incluir informações do produto, processos e mão de obra
  * O orçamento deve incluir data de geração e validade

### 10.15. Atualizar preços de produtos e processos

* **ID**: US-015
* **Descrição**: Como administrador, quero atualizar os preços de produtos, processos e mão de obra para manter o sistema atualizado.
* **Acceptance criteria**:
  * Deve ser possível atualizar o preço unitário de produtos e matérias-primas
  * Deve ser possível atualizar o preço por unidade de processos
  * Deve ser possível atualizar o preço por hora de tipos de mão de obra
  * As atualizações devem ser aplicadas imediatamente aos novos orçamentos
  * Orçamentos já gerados não devem ser afetados por mudanças de preço 