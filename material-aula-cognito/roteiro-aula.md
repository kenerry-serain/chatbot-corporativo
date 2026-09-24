# Aula — Cognito no AutoAtende

## 01. Visão geral

O frontend React usa Amplify Auth para autenticar no Cognito User Pool. Depois do login, chamadas HTTP protegidas enviam um access token JWT ao API Gateway. O authorizer valida o token antes de permitir a integração com a Lambda ou com o backend definitivo.

## 02. User Pool, App Client e Identity Pool

- **User Pool:** diretório e provedor de identidade. Mantém usuários, atributos, grupos, MFA, recuperação e emite tokens.
- **App Client:** representa uma aplicação que autentica no User Pool. Cada frontend, app móvel ou backend pode ter configurações próprias.
- **Identity Pool:** fornece credenciais AWS temporárias. É opcional e não é necessário para o fluxo básico `frontend → API Gateway → backend` protegido por JWT.

## 03. Configuração real do frontend

O projeto usa `aws-amplify` v6. `src/config.ts` lê:

```env
VITE_AWS_REGION=us-east-1
VITE_COGNITO_USER_POOL_ID=us-east-1_EXEMPLO
VITE_COGNITO_USER_POOL_CLIENT_ID=seu_app_client_id
```

A SPA é um cliente público: o App Client não deve possuir segredo embutido no JavaScript.

## 04. Login

1. Usuário informa e-mail e senha.
2. `signIn()` inicia a autenticação.
3. Cognito valida credenciais, estado do usuário e desafios adicionais.
4. `fetchAuthSession()` recupera os tokens da sessão.
5. `getCurrentUser()` recupera o usuário autenticado.

O projeto também implementa `resetPassword()` e `confirmResetPassword()`.

## 05. Tokens

- **ID token:** claims de identidade para a interface, como `sub`, `email` e `name`.
- **Access token:** autorização de APIs, grupos e scopes. Preferir este token em `Authorization: Bearer ...`.
- **Refresh token:** renova a sessão; não é enviado à API de negócio.

Observação para a aula: o código atual possui `getIdToken()`. Para uma HTTP API protegida por scopes, criar também `getAccessToken()` e usar `session.tokens?.accessToken`.

## 06. API Gateway e respostas

Em uma HTTP API, configurar um JWT authorizer com:

- issuer do User Pool;
- audience/client ID apropriado;
- scopes exigidos em cada rota.

Regra didática:

- **401:** não foi possível autenticar — token ausente, expirado, adulterado ou com issuer/audience incompatível.
- **403:** identidade válida, mas sem o scope, grupo ou permissão exigida.

A Lambda deve receber as claims já validadas e ainda aplicar autorização de negócio quando necessário.

## 07. WebSocket

O browser não permite adicionar cabeçalhos arbitrários no construtor `WebSocket`. O AutoAtende atualmente inclui o token na query string durante o handshake. No API Gateway WebSocket, o `$connect` pode usar um Lambda authorizer para validar o JWT.

Boas práticas: usar `wss://`, token de curta duração, não registrar a URL completa e não reaproveitar refresh token como credencial da conexão.

## 08. Identidade externa

O User Pool pode federar com Google, Apple, Facebook e Amazon, além de provedores OIDC e SAML — incluindo cenários corporativos com Microsoft Entra ID. Cognito mapeia as claims externas para o perfil e emite seus próprios tokens, padronizando o que frontend e backend recebem.

## 09. Senhas e App Clients

A política de senha é configurada no User Pool e vale para usuários locais. Pode definir comprimento, composição, recuperação e outros controles. Usuários federados autenticam no provedor externo.

Criar App Clients separados para contextos diferentes:

- SPA web: cliente público, sem secret;
- aplicativo móvel: cliente público, callbacks próprios;
- backend ou machine-to-machine: cliente confidencial com secret protegido no servidor.

## 10. Laboratório sugerido

1. Criar User Pool e usuário de teste.
2. Criar App Client público para a SPA.
3. Preencher `.env` e testar login/recuperação.
4. Criar HTTP API com JWT authorizer.
5. Criar Lambda mock que devolve as claims recebidas.
6. Demonstrar respostas 401, 200 e 403.
7. Substituir a Lambda mock pelo backend real quando estiver disponível.

## Referências oficiais

- [Understanding user pool JSON web tokens](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-with-identity-providers.html)
- [Application-specific settings with app clients](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-client-apps.html)
- [Control access to HTTP APIs with JWT authorizers](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html)
- [User pool sign-in with third-party identity providers](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-identity-federation.html)
- [Passwords, account recovery, and password policies](https://docs.aws.amazon.com/cognito/latest/developerguide/managing-users-passwords.html)
- [Security best practices for Cognito user pools](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-security-best-practices.html)
