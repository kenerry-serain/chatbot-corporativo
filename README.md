# AutoAtende Chat

SPA em React + TypeScript para atendimento de clientes de uma loja de veículos. O projeto já inclui tela de login, recuperação de senha pelo Amazon Cognito, interface de chat responsiva, adaptador WebSocket com reconexão e uma rotina de publicação em S3/CloudFront.

## Executar localmente

Requisitos: Node.js 22+ e npm.

```bash
cp .env.example .env
npm install
npm run dev
```

Sem credenciais reais, use **Acessar demonstração**. O modo demonstração simula respostas do assistente e permite validar toda a experiência visual.

## Configuração

As variáveis ficam em `.env`. Use `.env.example` como referência.

| Variável | Uso |
| --- | --- |
| `VITE_APP_NAME` | Nome exibido no aplicativo |
| `VITE_AWS_REGION` | Região do User Pool |
| `VITE_COGNITO_USER_POOL_ID` | ID do User Pool do Cognito |
| `VITE_COGNITO_USER_POOL_CLIENT_ID` | App Client público, sem client secret |
| `VITE_WEBSOCKET_URL` | Endpoint `wss://` do backend |
| `VITE_WEBSOCKET_ACTION` | Ação enviada no payload; padrão `sendMessage` |
| `VITE_WEBSOCKET_AUTH_QUERY_PARAM` | Nome do parâmetro usado para enviar o ID token; padrão `token` |
| `VITE_ENABLE_DEMO_MODE` | Exibe ou oculta o acesso de demonstração |

Variáveis Vite são públicas no bundle do navegador. Não coloque client secrets, chaves privadas ou credenciais AWS nelas. O App Client do Cognito deve ser criado **sem client secret**.

## Contrato WebSocket atual

Como o backend ainda será criado, a integração está isolada em `src/hooks/useChatSocket.ts`. Hoje o frontend:

- abre `VITE_WEBSOCKET_URL` com o ID token do Cognito no parâmetro configurado;
- adiciona `conversationId` à URL;
- envia mensagens no formato abaixo;
- aceita respostas em texto puro ou JSON com `content`, `message` ou `text`.

```json
{
  "action": "sendMessage",
  "conversationId": "uuid",
  "message": "Quero encontrar um SUV"
}
```

Quando o contrato do backend for definido, apenas esse adaptador precisa ser ajustado.

## Build e publicação em S3/CloudFront

Gere os arquivos estáticos:

```bash
npm run build
```

O resultado fica em `dist/`. Para publicar com AWS CLI:

```bash
export AWS_S3_BUCKET=nome-do-bucket
export AWS_CLOUDFRONT_DISTRIBUTION_ID=E1234567890
npm run deploy:s3
```

No CloudFront, use o bucket privado como origem com Origin Access Control (OAC). Como é uma SPA, configure as respostas de erro 403 e 404 para retornar `/index.html` com status 200. Mantenha `index.html` sem cache e os assets versionados com cache longo; o script de publicação já aplica essa política.

## Estrutura principal

```text
src/
  hooks/useChatSocket.ts  # conexão, autenticação e reconexão WebSocket
  services/auth.ts        # login, sessão e recuperação de senha Cognito
  App.tsx                 # telas e fluxo da aplicação
  config.ts               # leitura das variáveis e configuração do Amplify
  styles.css              # identidade visual e responsividade
```
