# Lambdas WebSocket do AutoAtende

As funções estão organizadas como cinco unidades distintas:

| Diretório | Rota esperada | Responsabilidade |
| --- | --- | --- |
| `authorizer/` | Authorizer de `$connect` | Valida o access token do Cognito |
| `connect/` | `$connect` | Grava a conexão no DynamoDB |
| `disconnect/` | `$disconnect` | Remove a conexão do DynamoDB |
| `message-persist/` | `sendMessage` e `$default` | Valida e persiste a mensagem |
| `message-processor/` | DynamoDB Stream | Consulta o Bedrock, executa tools locais e responde pelo WebSocket |

O processador usa a API Converse do Amazon Bedrock com Claude Haiku 4.5 pelo inference profile geográfico dos EUA. As tools `lookup_lead` e `search_inventory` leem dados demonstrativos de JSONs separados, dentro do bundle da própria Lambda.

## Variáveis de ambiente

Use `.env.example` como referência ao configurar cada Lambda na infraestrutura futuramente.

| Variável | Obrigatória | Uso |
| --- | --- | --- |
| `CONNECTIONS_TABLE` | Sim | Nome parametrizado da tabela DynamoDB |
| `MESSAGES_TABLE` | Message persist + processor | Nome parametrizado da tabela e do histórico da conversa |
| `CONNECTIONS_TTL_HOURS` | Não | Retenção do registro da conexão; padrão de 24 horas |
| `WEBSOCKET_CALLBACK_ENDPOINT` | Não | Endpoint HTTPS de callback para domínio customizado |
| `COGNITO_USER_POOL_ID` | Authorizer | ID do Cognito User Pool |
| `COGNITO_USER_POOL_CLIENT_ID` | Authorizer | ID do App Client público |
| `AUTH_TOKEN_QUERY_PARAM` | Não | Nome do parâmetro de token para navegadores; padrão `token` |
| `BEDROCK_MODEL_ID` | Não | Modelo ou inference profile; padrão Claude Haiku 4.5 US |
| `BEDROCK_MAX_TOKENS` | Não | Máximo de tokens de saída; padrão `600` |
| `BEDROCK_TEMPERATURE` | Não | Temperatura entre 0 e 1; padrão `0.2` |
| `BEDROCK_MAX_TOOL_ROUNDS` | Não | Limite de rodadas de tools; padrão `4` |
| `BEDROCK_GUARDRAIL_ID` | Não | ID de um Guardrail opcional |
| `BEDROCK_GUARDRAIL_VERSION` | Não | Versão do Guardrail; deve acompanhar o ID |

O nome da tabela não está fixado no código. Por exemplo:

```text
CONNECTIONS_TABLE=autoatende-dev-websocket-connections
MESSAGES_TABLE=autoatende-dev-messages
```

A tabela futura deve utilizar `connectionId` como chave primária e habilitar TTL no atributo `expiresAt`. O evento `$disconnect` é entregue em regime de melhor esforço pelo API Gateway; por isso o TTL serve como limpeza de segurança para conexões antigas.

## Build e testes

Requisitos: Node.js 22+ e npm.

```bash
cd lambdas
npm install
npm run validate
```

Esse comando verifica os tipos, executa os testes e gera cinco bundles independentes:

```text
dist/authorizer/index.js
dist/connect/index.js
dist/disconnect/index.js
dist/message-persist/index.js
dist/message-processor/index.js
```

Todas as dependências usadas em execução são empacotadas em cada bundle. Não há template SAM e nenhum desses comandos acessa ou modifica a conta AWS.

Para compilar apenas uma função:

```bash
npm run build:authorizer
npm run build:connect
npm run build:disconnect
npm run build:message-persist
npm run build:message-processor
```

## Contrato da mensagem

O frontend envia:

```json
{
  "action": "sendMessage",
  "conversationId": "uuid-da-conversa",
  "message": "Quero encontrar um SUV"
}
```

O `message-persist` salva o item e o stream aciona o `message-processor`. O processador consulta o Bedrock e responde pela conexão registrada no item:

```json
{
  "type": "assistant.message",
  "content": "Encontrei duas opções de SUV disponíveis. Qual faixa de preço você prefere?",
  "conversationId": "uuid-da-conversa",
  "requestId": "id-da-requisicao",
  "metadata": {
    "modelId": "us.anthropic.claude-haiku-4-5-20251001-v1:0",
    "durationMs": 932,
    "inputTokens": 430,
    "outputTokens": 54,
    "tools": ["search_inventory"]
  },
  "savedMessage": {
    "messageId": "uuid-da-mensagem",
    "content": "Quero encontrar um SUV",
    "status": "RECEIVED"
  }
}
```

Para o endpoint padrão `execute-api`, a Lambda monta o callback como `https://{domainName}/{stage}`. Se um domínio customizado remover o stage da URL, configure `WEBSOCKET_CALLBACK_ENDPOINT`.

## Cognito na API WebSocket

A Lambda `authorizer` implementa um authorizer do tipo `REQUEST` para a rota `$connect`:

1. O frontend autentica com Amplify e Cognito.
2. `fetchAuthSession()` entrega um access token atual.
3. O frontend abre o WebSocket enviando o token no parâmetro de query configurado por `VITE_WEBSOCKET_TOKEN_QUERY_PARAM`.
4. O authorizer aceita `Authorization: Bearer <token>` ou o parâmetro de query e valida assinatura, emissor, expiração, `token_use=access` e App Client.
5. Em caso válido, devolve `Allow`, `principalId` e um contexto contendo pelo menos `sub`.
6. A Lambda `connect` já está preparada para persistir esse `sub` como `userId`.

O authorizer deve ser anexado somente ao `$connect`. A conexão autorizada é reutilizada nas mensagens seguintes; o JWT não precisa ser enviado em cada frame. Como a expiração posterior do token não encerra automaticamente uma conexão aberta, defina no futuro uma duração máxima da conexão ou uma estratégia de reautenticação.

O `WebSocket` nativo do navegador não permite definir livremente o header `Authorization`. Portanto, no API Gateway, escolha apenas uma origem de identidade:

- para a SPA: **Query string**, chave `token`;
- para Postman, wscat ou outro backend: **Header**, chave `Authorization`.

Não configure as duas origens simultaneamente: o API Gateway exigiria que ambas estivessem presentes antes de invocar a Lambda. Como o token passa pela URL na SPA, use sempre `wss://`, evite registrar query strings e nunca coloque client secret no frontend.

### Publicação manual da authorizer

```bash
cd lambdas
npm run build:authorizer
cd dist/authorizer
zip ../authorizer.zip index.js index.js.map
```

Crie a Lambda com Node.js 22.x, handler `index.handler`, faça upload de `dist/authorizer.zip` e configure `COGNITO_USER_POOL_ID`, `COGNITO_USER_POOL_CLIENT_ID` e, opcionalmente, `AUTH_TOKEN_QUERY_PARAM`. A role precisa apenas das permissões básicas de logs; a validação usa as chaves públicas do User Pool.

No authorizer da WebSocket API, selecione essa Lambda e, para o site atual, configure **Query string → token**. Depois selecione a rota `$connect`, associe o authorizer e faça deploy do stage. A alteração só será testada em uma nova conexão WebSocket.

## Fluxo de persistência e processamento

```text
React WebSocket
  -> rota sendMessage
  -> message-persist
  -> tabela de mensagens
  -> DynamoDB Stream
  -> message-processor
  -> Amazon Bedrock Converse
  -> tools locais de lead e inventário
  -> API Gateway Management API
  -> React WebSocket
```

A tabela de mensagens deve ter:

- partition key `conversationId` do tipo String;
- sort key `messageKey` do tipo String;
- DynamoDB Stream habilitado com a visualização **New image**.

O `messageKey` combina data ISO e UUID, permitindo ordenar as mensagens de uma conversa cronologicamente. Cada item também guarda `messageId`, `content`, `role`, `status`, `connectionId`, `domainName`, `stage`, `userId` e datas de criação. A mensagem do usuário usa `role=user`; depois da inferência, o processor salva a resposta com `role=assistant` e `inReplyToMessageId`. O evento dessa resposta volta ao Stream, mas é ignorado pelo código por não ser uma mensagem de usuário.

O processador implementa resposta parcial de lote (`ReportBatchItemFailures`). O consumo do DynamoDB Stream é pelo menos uma vez, então uma futura versão de produção ainda deverá considerar idempotência para evitar respostas duplicadas em cenários de retry.

## Configuração manual no console da AWS

### 1. Criar a tabela de mensagens

No DynamoDB, escolha **Create table**:

- Table name: por exemplo `autoatende-dev-messages`;
- Partition key: `conversationId`, tipo String;
- Sort key: `messageKey`, tipo String;
- Table settings: `On-demand` é suficiente para o início.

Depois abra **Exports and streams → DynamoDB stream details → Turn on** e escolha **New image**.

### 2. Configurar a message-persist

Compile e compacte:

```bash
cd lambdas
npm run build:message-persist
cd dist/message-persist
zip ../message-persist.zip index.js index.js.map
```

Na Lambda use Node.js 22.x, handler `index.handler` e as variáveis `CONNECTIONS_TABLE`, `MESSAGES_TABLE` e, se necessário, `WEBSOCKET_CALLBACK_ENDPOINT`.

Na role conceda:

- `dynamodb:GetItem` na tabela de conexões;
- `dynamodb:PutItem` na tabela de mensagens;
- `dynamodb:DeleteItem` na tabela de conexões;
- `execute-api:ManageConnections` na API WebSocket.

No API Gateway, altere as integrações das rotas `sendMessage` e `$default` para `message-persist` e faça deploy do stage.

### 3. Configurar a message-processor

Compile e compacte:

```bash
cd lambdas
npm run build:message-processor
cd dist/message-processor
zip ../message-processor.zip index.js index.js.map
```

Na processadora configure `CONNECTIONS_TABLE`, `MESSAGES_TABLE`, `BEDROCK_MODEL_ID` e, se necessário, `WEBSOCKET_CALLBACK_ENDPOINT`. Use `us.anthropic.claude-haiku-4-5-20251001-v1:0`, aumente o timeout da função para **60 segundos** e remova qualquer integração direta dela com as rotas `sendMessage` e `$default`.

Na role, anexe `AWSLambdaDynamoDBExecutionRole` para leitura do stream e acrescente permissões para `execute-api:ManageConnections`, `dynamodb:DeleteItem` na tabela de conexões, `dynamodb:Query` e `dynamodb:PutItem` na tabela de mensagens e `bedrock:InvokeModel` para o modelo configurado.

Na página da Lambda processadora, escolha **Add trigger → DynamoDB**:

- DynamoDB table: `autoatende-dev-messages`;
- Batch size: `10`;
- Batch window: `0`;
- Starting position: `Trim horizon` se a tabela for nova e vazia; caso use `Latest`, não grave mensagens até o trigger aparecer como habilitado;
- Split batch on error: habilitado;
- Retry attempts: `3`;
- Maximum age of record: `3600` segundos;
- Report batch item failures: habilitado;
- Filter criteria, se disponível: somente `INSERT` cujo `NewImage.role.S` seja `user`; sem esse filtro, a Lambda também é invocada para a resposta do assistente e a ignora no código;
- Trigger status: habilitado.

O suporte a falhas parciais só funciona quando `ReportBatchItemFailures` também está habilitado no event source mapping.

## Bedrock, prompt e tools

Os pontos editáveis estão separados por responsabilidade:

```text
message-processor/
  prompts/system-prompt.ts     # prompt RGO: Rules, Guard rails e Output
  prompts/user-message.ts      # delimitação e escape da mensagem não confiável
  data/lead.json               # resposta demonstrativa da tool de lead
  data/inventory.json          # estoque demonstrativo da tool de inventário
  tools/lead.ts                # schema, autorização e retorno do lead
  tools/inventory.ts           # schema, filtros e retorno do inventário
  tools/index.ts               # registro e execução das tools
  bedrock.ts                   # loop Converse -> tool_use -> toolResult
  index.ts                     # DynamoDB Stream e callback WebSocket
```

O prompt de sistema segue o padrão RGO pedido:

- **Rules:** domínio do assistente e quando cada tool é obrigatória;
- **Guard rails:** trata o texto do usuário como não confiável, impede troca de papel e evita exposição de dados internos;
- **Output:** português do Brasil, resposta curta e valores em reais.

A mensagem do usuário não é concatenada ao prompt de sistema. Ela segue em uma mensagem de papel `user`, dentro de `<untrusted_user_message>`, com caracteres de marcação escapados. Isso reduz ambiguidades e tentativas simples de prompt injection, mas não oferece garantia absoluta. Os argumentos das tools continuam sendo validados no código. Um Bedrock Guardrail pode ser habilitado configurando `BEDROCK_GUARDRAIL_ID` e `BEDROCK_GUARDRAIL_VERSION` juntos.

O Claude decide quando chamar uma tool. A Lambda executa a implementação local, devolve um `toolResult` e chama o Converse novamente até obter texto ou atingir `BEDROCK_MAX_TOOL_ROUNDS`. Os logs estruturados mostram:

- nome, sucesso e duração de cada tool;
- duração e latência reportada de cada chamada ao Bedrock;
- tokens de entrada e saída;
- duração total da interação;
- IDs de mensagem e conversa, sem registrar o prompt completo nem o conteúdo do lead.

Os JSONs são dados fictícios de aula e ficam empacotados no bundle. Em produção, substitua somente as implementações das tools por consultas reais e mantenha os schemas estáveis para não alterar o contrato com o modelo.

### Tool e orquestrador

Cada tool é dividida em duas partes. `definition.toolSpec` é o contrato mostrado ao modelo: nome, descrição e JSON Schema dos argumentos. `execute` é a implementação que somente a Lambda executa depois de validar os argumentos. O modelo não abre arquivos nem acessa o DynamoDB diretamente; ele apenas solicita uma execução com `tool_use`.

O arquivo `bedrock.ts` funciona como orquestrador: monta system prompt, histórico e catálogo de tools; chama o Converse; inspeciona `stopReason`; executa as tools solicitadas; acrescenta `toolResult` ao histórico da chamada; e repete o ciclo até obter uma resposta final ou atingir o limite configurado. LangChain/LangGraph poderiam abstrair esse loop, mas a responsabilidade arquitetural continuaria existindo.

## Memória curta e contexto da conversa

A API Converse não mantém estado entre chamadas. Antes de cada inferência, a `message-processor` consulta a própria tabela de mensagens usando:

- `conversationId` como partition key;
- `messageKey <= messageKey da mensagem atual` para não incluir mensagens futuras;
- ordem decrescente e `Limit = 10`;
- leitura consistente e inversão do resultado para entregar o histórico em ordem cronológica.

O limite significa **10 mensagens individuais**, incluindo a mensagem atual, e não 10 pares. Usuário e assistente são persistidos na mesma partição. Mensagens consecutivas do mesmo papel são preservadas como blocos do mesmo turno para manter um formato aceito pelo Converse. O log `historyMessageCount` permite conferir quantas mensagens foram enviadas.

Essa implementação é uma sliding window deliberadamente simples para a aula. Uma evolução recomendada é manter um resumo acumulado e gerar um novo checkpoint a cada 12 mensagens ainda não resumidas. Nesse desenho, a entrada do modelo passa a ser:

```text
system prompt + resumo acumulado + últimas 10 mensagens completas
```

O resumo deve preservar fatos confirmados, preferências do cliente, veículos citados, decisões e pendências; não deve substituir as 10 mensagens recentes. Salve também a última `messageKey` incluída no resumo para não resumir o mesmo trecho duas vezes. Essa sumarização ainda não está executando no código atual.

### Implementação direta x LangChain

O projeto atual chama o Bedrock Converse diretamente. Por isso consulta, janela, persistência, loop de tools e observabilidade aparecem explicitamente no código. LangChain e LangGraph fornecem abstrações para modelos, lista de tools, agent loop, estado por thread, checkpointers e políticas de redução de contexto. O modelo ainda escolhe qual tool solicitar a partir do nome, descrição e schema; o framework executa e devolve o resultado. Também continua sendo necessário escolher e configurar o armazenamento durável e a identidade da conversa. Usar um framework não transforma automaticamente a API do modelo em memória persistente.

### Prompt caching

Prompt caching é diferente de memória: ele reaproveita um prefixo idêntico para reduzir latência e custo de processamento; não recupera fatos antigos da conversa. No Converse, os melhores candidatos são os blocos estáveis de `tools` e `system`, antes das mensagens variáveis.

O Claude Haiku 4.5 exige pelo menos 4.096 tokens antes de um cache checkpoint e suporta TTL de 5 minutos ou 1 hora. O prompt RGO e os dois schemas atuais são menores que esse mínimo, então o cache explícito não foi ligado apenas para a demonstração. O processor já registra `cacheReadInputTokens` e `cacheWriteInputTokens`, permitindo avaliar uma ativação futura quando o prefixo estável crescer. Mudanças no conteúdo anterior ao checkpoint invalidam o reaproveitamento.

### Permissão do Claude Haiku 4.5

O padrão `us.anthropic.claude-haiku-4-5-20251001-v1:0` é um inference profile US e pode encaminhar a requisição para `us-east-1`, `us-east-2` ou `us-west-2`. Substitua `<ACCOUNT_ID>` se utilizar esta policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "InvokeHaikuInferenceProfile",
      "Effect": "Allow",
      "Action": "bedrock:InvokeModel",
      "Resource": [
        "arn:aws:bedrock:us-east-1:<ACCOUNT_ID>:inference-profile/us.anthropic.claude-haiku-4-5-20251001-v1:0",
        "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-haiku-4-5-20251001-v1:0",
        "arn:aws:bedrock:us-east-2::foundation-model/anthropic.claude-haiku-4-5-20251001-v1:0",
        "arn:aws:bedrock:us-west-2::foundation-model/anthropic.claude-haiku-4-5-20251001-v1:0"
      ]
    }
  ]
}
```

Se escolher outro modelo, Region ou application inference profile, ajuste `BEDROCK_MODEL_ID` e os ARNs da policy de acordo com o perfil escolhido. SCPs da organização também precisam permitir todas as Regions de destino.

Antes da primeira chamada, um administrador da conta deve concluir o acesso ao modelo no Bedrock Model Catalog/AWS Marketplace e preencher o formulário de primeiro uso da Anthropic. Depois dessa ativação única, a role de execução da Lambda não precisa de permissões para assinar produtos no Marketplace.

## Recuperação do registro da conexão

O DynamoDB funciona como registro das conexões ativas, mas apagar um item da tabela não encerra o WebSocket correspondente no API Gateway. Se o `message-persist` receber uma mensagem de uma conexão ainda aberta cujo item não existe mais, ele usa `DeleteConnection` para encerrar aquela conexão. O frontend recebe `onclose`, reconecta automaticamente e a rota `$connect` grava um novo `connectionId`, preservando o `conversationId` enquanto a tela atual continuar aberta.

A mensagem que disparou a recuperação não é reenviada automaticamente; o usuário deve enviá-la novamente depois que o indicador mostrar que a conexão foi restabelecida.

## Permissões futuras mínimas

- `connect`: `dynamodb:PutItem` na tabela de conexões;
- `disconnect`: `dynamodb:DeleteItem` na tabela;
- `message-persist`: `dynamodb:GetItem`, `dynamodb:PutItem`, `dynamodb:DeleteItem` e `execute-api:ManageConnections` nos recursos necessários;
- `message-processor`: leitura do DynamoDB Stream, `dynamodb:Query` e `dynamodb:PutItem` na tabela de mensagens, `dynamodb:DeleteItem` na tabela de conexões, `execute-api:ManageConnections` restrito à API e ao stage e `bedrock:InvokeModel` no modelo/inference profile;
- `authorizer`: logs no CloudWatch; nenhuma permissão de leitura no Cognito é necessária para verificar o JWT.

Não é necessário conceder acesso ao S3 ou ao DynamoDB para as tools demonstrativas, pois os dois conjuntos de dados são JSONs locais do bundle.
