import { mkdirSync, writeFileSync } from 'node:fs'

const OUT_DIR = new URL('./', import.meta.url)
const OUT = new URL('./cognito-autoatende.excalidraw', import.meta.url)
const CORRECTED_OUT = new URL('./cognito-autoatende-corrigido.excalidraw', import.meta.url)
mkdirSync(OUT_DIR, { recursive: true })

const W = 1600
const H = 900
const GAP = 140
const c = {
  black: '#0b0f19',
  navy: '#0f2f70',
  blue: '#2563eb',
  cyan: '#38bdf8',
  pale: '#dbeafe',
  pale2: '#eff6ff',
  white: '#ffffff',
  red: '#dc2626',
  redSoft: '#fee2e2',
}

const elements = []
let sequence = 0
const id = (prefix) => `${prefix}-${String(++sequence).padStart(4, '0')}`

function base(type, x, y, width, height, frameId = null) {
  return {
    id: id(type), type, x, y, width, height, angle: 0,
    strokeColor: c.black, backgroundColor: 'transparent', fillStyle: 'solid',
    strokeWidth: 2, strokeStyle: 'solid', roughness: 0, opacity: 100,
    groupIds: [], frameId, index: `a${String(sequence).padStart(5, '0')}`,
    roundness: null, seed: 17000 + sequence * 97, version: 1,
    versionNonce: 24000 + sequence * 131, isDeleted: false,
    boundElements: [], updated: 1790000000000 + sequence, link: null, locked: false,
  }
}

function frame(order, name, dark = false) {
  const y = order * (H + GAP)
  const e = { ...base('frame', 0, y, W, H), name, strokeColor: c.blue, backgroundColor: dark ? c.black : c.white }
  elements.push(e)
  const f = { id: e.id, x: 0, y, order, dark }
  // Excalidraw frames don't reliably paint their background after import.
  // A real, frame-bound rectangle guarantees the exported colors match the preview.
  rect(f, 0, 0, W, H, { stroke: dark ? c.black : c.white, fill: dark ? c.black : c.white, strokeWidth: 1 })
  return f
}

function rect(f, x, y, width, height, o = {}) {
  const e = {
    ...base('rectangle', f.x + x, f.y + y, width, height, f.id),
    strokeColor: o.stroke ?? c.blue, backgroundColor: o.fill ?? c.white,
    strokeWidth: o.strokeWidth ?? 2, strokeStyle: o.strokeStyle ?? 'solid',
    opacity: o.opacity ?? 100, roundness: o.rounded ? { type: 3 } : null,
  }
  elements.push(e); return e
}

function ellipse(f, x, y, width, height, o = {}) {
  const e = { ...base('ellipse', f.x + x, f.y + y, width, height, f.id), strokeColor: o.stroke ?? c.blue, backgroundColor: o.fill ?? c.white, strokeWidth: o.strokeWidth ?? 2, opacity: o.opacity ?? 100 }
  elements.push(e); return e
}

function diamond(f, x, y, width, height, o = {}) {
  const e = { ...base('diamond', f.x + x, f.y + y, width, height, f.id), strokeColor: o.stroke ?? c.blue, backgroundColor: o.fill ?? c.white, strokeWidth: o.strokeWidth ?? 2, opacity: o.opacity ?? 100 }
  elements.push(e); return e
}

function text(f, x, y, value, o = {}) {
  const fontSize = o.size ?? 24
  const lines = String(value).split('\n')
  const width = o.width ?? Math.max(40, Math.max(...lines.map((line) => line.length)) * fontSize * 0.58)
  const height = o.height ?? lines.length * fontSize * 1.25
  const e = {
    ...base('text', f.x + x, f.y + y, width, height, f.id),
    strokeColor: o.color ?? c.black, backgroundColor: 'transparent', strokeWidth: 1,
    text: value, fontSize, fontFamily: o.mono ? 3 : 2, textAlign: o.align ?? 'left',
    verticalAlign: 'top', containerId: null, originalText: value,
    autoResize: false, lineHeight: 1.25,
  }
  elements.push(e); return e
}

function line(f, x1, y1, x2, y2, o = {}) {
  const e = {
    ...base('line', f.x + x1, f.y + y1, x2 - x1, y2 - y1, f.id),
    strokeColor: o.stroke ?? c.blue, strokeWidth: o.strokeWidth ?? 2,
    strokeStyle: o.strokeStyle ?? 'solid', opacity: o.opacity ?? 100,
    points: [[0, 0], [x2 - x1, y2 - y1]], lastCommittedPoint: null,
    startBinding: null, endBinding: null, startArrowhead: null, endArrowhead: null,
  }
  elements.push(e); return e
}

function arrow(f, x1, y1, x2, y2, o = {}) {
  const e = {
    ...base('arrow', f.x + x1, f.y + y1, x2 - x1, y2 - y1, f.id),
    strokeColor: o.stroke ?? c.blue, strokeWidth: o.strokeWidth ?? 3,
    strokeStyle: o.strokeStyle ?? 'solid', points: [[0, 0], [x2 - x1, y2 - y1]],
    lastCommittedPoint: null, startBinding: null, endBinding: null,
    startArrowhead: o.startArrowhead ?? null, endArrowhead: o.endArrowhead ?? 'arrow', elbowed: false,
  }
  elements.push(e); return e
}

function icon(f, x, y, kind, dark = false) {
  const fg = dark ? c.cyan : c.blue
  const bg = dark ? c.black : c.pale2
  rect(f, x, y, 60, 60, { stroke: fg, fill: bg })
  if (kind === 'user') {
    ellipse(f, x + 21, y + 10, 18, 18, { stroke: fg, fill: 'transparent' })
    line(f, x + 14, y + 49, x + 46, y + 49, { stroke: fg })
    line(f, x + 14, y + 49, x + 20, y + 33, { stroke: fg })
    line(f, x + 46, y + 49, x + 40, y + 33, { stroke: fg })
  } else if (kind === 'pool') {
    ellipse(f, x + 11, y + 9, 38, 15, { stroke: fg, fill: 'transparent' })
    rect(f, x + 11, y + 16, 38, 30, { stroke: fg, fill: 'transparent' })
    ellipse(f, x + 11, y + 39, 38, 15, { stroke: fg, fill: bg })
  } else if (kind === 'shield') {
    diamond(f, x + 13, y + 9, 34, 42, { stroke: fg, fill: 'transparent' })
    text(f, x + 19, y + 19, '✓', { size: 21, color: fg, width: 22, align: 'center' })
  } else if (kind === 'code') {
    text(f, x + 8, y + 17, '</>', { size: 18, color: fg, width: 44, align: 'center', mono: true })
  } else if (kind === 'key') {
    ellipse(f, x + 10, y + 16, 22, 22, { stroke: fg, fill: 'transparent' })
    line(f, x + 31, y + 27, x + 50, y + 27, { stroke: fg, strokeWidth: 3 })
    line(f, x + 43, y + 27, x + 43, y + 38, { stroke: fg, strokeWidth: 3 })
  } else if (kind === 'api') {
    text(f, x + 7, y + 18, 'API', { size: 18, color: fg, width: 46, align: 'center', mono: true })
  } else if (kind === 'lambda') {
    text(f, x + 11, y + 12, 'λ', { size: 32, color: fg, width: 38, align: 'center' })
  } else if (kind === 'google') {
    text(f, x + 12, y + 14, 'G', { size: 28, color: fg, width: 36, align: 'center' })
  } else {
    text(f, x + 8, y + 18, kind.toUpperCase(), { size: 15, color: fg, width: 44, align: 'center', mono: true })
  }
}

function header(f, kicker, heading, subtitle) {
  rect(f, 0, 0, W, 220, { stroke: c.black, fill: c.black })
  text(f, 70, 40, kicker.toUpperCase(), { size: 17, color: c.cyan, width: 800, mono: true })
  line(f, 70, 76, 138, 76, { stroke: c.blue, strokeWidth: 5 })
  text(f, 70, 96, heading, { size: 43, color: c.white, width: 1380 })
  text(f, 70, 160, subtitle, { size: 21, color: c.pale, width: 1400 })
  text(f, 1460, 840, String(f.order + 1).padStart(2, '0'), { size: 18, color: c.blue, width: 70, align: 'right', mono: true })
}

function node(f, x, y, width, height, heading, body, o = {}) {
  const dark = o.dark ?? false
  rect(f, x, y, width, height, { stroke: o.stroke ?? c.blue, fill: o.fill ?? (dark ? c.black : c.white), strokeWidth: o.strokeWidth ?? 2 })
  if (o.kind) icon(f, x + 22, y + 22, o.kind, dark)
  const tx = o.kind ? x + 100 : x + 24
  text(f, tx, y + 22, heading, { size: o.headingSize ?? 25, color: o.headingColor ?? (dark ? c.white : c.black), width: width - (o.kind ? 124 : 48) })
  if (body) text(f, tx, y + 66, body, { size: o.bodySize ?? 18, color: o.bodyColor ?? (dark ? c.pale : c.navy), width: width - (o.kind ? 124 : 48), mono: o.mono })
}

function pill(f, x, y, value, o = {}) {
  const width = o.width ?? 200
  rect(f, x, y, width, 40, { stroke: o.stroke ?? c.blue, fill: o.fill ?? c.pale2 })
  text(f, x + 10, y + 8, value, { size: 16, color: o.color ?? c.navy, width: width - 20, align: 'center', mono: true })
}

function step(f, x, y, n, heading, body, width = 280) {
  ellipse(f, x, y, 52, 52, { stroke: c.blue, fill: c.black, strokeWidth: 2 })
  text(f, x + 14, y + 8, String(n), { size: 23, color: c.cyan, width: 24, align: 'center', mono: true })
  text(f, x + 70, y - 2, heading, { size: 24, width })
  text(f, x + 70, y + 34, body, { size: 18, color: c.navy, width })
}

function check(f, x, y, value, width = 560) {
  ellipse(f, x, y, 30, 30, { stroke: c.blue, fill: c.pale })
  text(f, x + 5, y + 1, '✓', { size: 20, color: c.navy, width: 20, align: 'center' })
  text(f, x + 46, y - 1, value, { size: 21, width })
}

// 01 — visão geral
{
  const f = frame(0, '01 — Cognito no AutoAtende', true)
  for (let x = 0; x <= W; x += 80) line(f, x, 0, x, H, { stroke: c.navy, strokeWidth: 1, opacity: 45 })
  for (let y = 0; y <= H; y += 80) line(f, 0, y, W, y, { stroke: c.navy, strokeWidth: 1, opacity: 45 })
  text(f, 75, 58, 'AUTOATENDE  /  AULA COGNITO', { size: 17, color: c.cyan, width: 700, mono: true })
  text(f, 75, 145, 'Autenticação do chatbot', { size: 58, color: c.white, width: 980 })
  text(f, 75, 220, 'com Cognito + Amplify', { size: 58, color: c.cyan, width: 980 })
  text(f, 78, 305, 'Do login no React até a autorização no API Gateway.', { size: 25, color: c.pale, width: 900 })
  node(f, 70, 505, 285, 170, 'React SPA', 'Amplify Auth\nno navegador', { kind: 'code', dark: true })
  node(f, 450, 505, 285, 170, 'User Pool', 'Usuários, login\ne emissão de JWTs', { kind: 'pool', dark: true })
  node(f, 830, 505, 285, 170, 'API Gateway', 'Valida o token\nantes da integração', { kind: 'api', dark: true })
  node(f, 1210, 505, 285, 170, 'Backend', 'Lambda mock hoje;\nserviço real depois', { kind: 'lambda', dark: true })
  arrow(f, 355, 590, 440, 590, { stroke: c.cyan })
  arrow(f, 735, 590, 820, 590, { stroke: c.cyan })
  arrow(f, 1115, 590, 1200, 590, { stroke: c.cyan })
  pill(f, 75, 740, 'LOGIN', { fill: c.black, color: c.cyan, width: 150 })
  pill(f, 245, 740, 'JWT', { fill: c.black, color: c.cyan, width: 150 })
  pill(f, 415, 740, 'AUTHORIZER', { fill: c.black, color: c.cyan, width: 190 })
  pill(f, 625, 740, '401 / 403', { fill: c.black, color: c.cyan, width: 180 })
}

// 02 — conceitos
{
  const f = frame(1, '02 — As peças do Cognito')
  header(f, 'Fundamentos', 'As peças do Cognito', 'Para o chatbot, o User Pool autentica pessoas; o Identity Pool é opcional.')
  node(f, 70, 290, 455, 365, 'User Pool', 'Diretório de usuários\n• cadastro e login\n• MFA e recuperação\n• grupos e atributos\n• emite ID, access e refresh token', { kind: 'pool', headingSize: 31, bodySize: 21 })
  node(f, 575, 290, 455, 365, 'App Client', 'Configuração por aplicação\n• client ID\n• fluxos de autenticação\n• callbacks e logout\n• scopes e validade de tokens\n• SPA pública: sem secret', { kind: 'code', headingSize: 31, bodySize: 21, fill: c.pale2 })
  node(f, 1080, 290, 440, 365, 'Identity Pool', 'Troca identidades por\ncredenciais AWS temporárias.\n\nÚtil para acessar S3 ou outros\nserviços AWS diretamente.\nNão é necessário para chamar\numa API protegida por JWT.', { kind: 'key', headingSize: 31, bodySize: 21 })
  rect(f, 160, 730, 1280, 78, { stroke: c.blue, fill: c.black })
  text(f, 195, 751, 'NESTA ARQUITETURA:', { size: 19, color: c.cyan, width: 250, mono: true })
  text(f, 455, 748, 'User Pool + App Client público. Identity Pool fica fora do primeiro passo.', { size: 23, color: c.white, width: 900 })
}

// 03 — configuração real
{
  const f = frame(2, '03 — Como o frontend está configurado')
  header(f, 'Configuração real', 'Como o frontend está configurado', 'O AutoAtende usa aws-amplify v6 e lê a configuração do ambiente no carregamento.')
  rect(f, 70, 285, 660, 430, { stroke: c.blue, fill: c.black })
  text(f, 105, 315, '.env', { size: 20, color: c.cyan, width: 120, mono: true })
  text(f, 105, 365, 'VITE_AWS_REGION=us-east-1\n\nVITE_COGNITO_USER_POOL_ID=\nus-east-1_EXEMPLO\n\nVITE_COGNITO_USER_POOL_CLIENT_ID=\nseu_app_client_id', { size: 23, color: c.white, width: 560, mono: true })
  rect(f, 790, 285, 730, 430, { stroke: c.blue, fill: c.pale2 })
  text(f, 825, 315, 'src/config.ts', { size: 20, color: c.blue, width: 220, mono: true })
  text(f, 825, 360, 'Amplify.configure({\n  Auth: { Cognito: {\n    userPoolId,\n    userPoolClientId,\n    loginWith: { email: true }\n  }}\n})', { size: 23, color: c.black, width: 625, mono: true })
  arrow(f, 730, 500, 780, 500, { stroke: c.blue })
  pill(f, 275, 758, 'USER POOL ID', { width: 210 })
  pill(f, 515, 758, 'APP CLIENT ID', { width: 220 })
  pill(f, 765, 758, 'SEM CLIENT SECRET', { width: 260, fill: c.blue, color: c.white })
  text(f, 1070, 756, 'O navegador não consegue guardar segredo.', { size: 20, color: c.navy, width: 420 })
}

// 04 — login
{
  const f = frame(3, '04 — Login passo a passo')
  header(f, 'Autenticação', 'Login passo a passo', 'Amplify abstrai as chamadas, mas o User Pool continua sendo a autoridade de autenticação.')
  step(f, 75, 305, 1, 'Usuário informa', 'e-mail e senha\nna SPA React', 230)
  step(f, 400, 305, 2, 'Amplify Auth', 'signIn({ username,\npassword })', 245)
  step(f, 755, 305, 3, 'Cognito valida', 'usuário, senha, status\ne desafios/MFA', 255)
  step(f, 1125, 305, 4, 'Sessão criada', 'ID token + access token\n+ refresh token', 315)
  arrow(f, 330, 332, 385, 332)
  arrow(f, 685, 332, 740, 332)
  arrow(f, 1055, 332, 1110, 332)
  rect(f, 150, 530, 1300, 190, { stroke: c.blue, fill: c.pale2 })
  text(f, 185, 560, 'No código atual', { size: 20, color: c.blue, width: 240, mono: true })
  text(f, 185, 605, 'signIn()', { size: 27, color: c.black, width: 160, mono: true })
  text(f, 390, 605, '→', { size: 28, color: c.blue, width: 50, align: 'center' })
  text(f, 485, 605, 'getCurrentUser()', { size: 27, color: c.black, width: 260, mono: true })
  text(f, 765, 605, '+', { size: 28, color: c.blue, width: 50, align: 'center' })
  text(f, 835, 605, 'fetchAuthSession()', { size: 27, color: c.black, width: 300, mono: true })
  text(f, 1160, 605, '→ usuário logado', { size: 25, color: c.navy, width: 260 })
  text(f, 185, 668, 'Recuperação de senha: resetPassword() → código → confirmResetPassword().', { size: 21, color: c.navy, width: 1050 })
}

// 05 — tokens
{
  const f = frame(4, '05 — O que existe dentro da sessão')
  header(f, 'JWT', 'ID token, access token e refresh token', 'Os três têm papéis diferentes. Para autorizar APIs, prefira o access token.')
  node(f, 70, 300, 455, 320, 'ID token', 'Identidade do usuário\n• sub, email, name\n• grupos e atributos\n• usado pela interface\n\nNão é a escolha preferida\npara autorização de API.', { kind: 'user', headingSize: 31, bodySize: 21 })
  node(f, 575, 300, 455, 320, 'Access token', 'Autorização da API\n• client_id\n• scope\n• username / groups\n• expiração\n\nEnviar como Bearer token.', { kind: 'shield', headingSize: 31, bodySize: 21, fill: c.pale })
  node(f, 1080, 300, 440, 320, 'Refresh token', 'Renova a sessão sem\npedir a senha novamente.\n\nÉ opaco para a aplicação\ne não deve ser enviado\npara a API de negócio.', { kind: 'key', headingSize: 31, bodySize: 21 })
  rect(f, 165, 700, 1270, 92, { stroke: c.blue, fill: c.black })
  text(f, 200, 725, 'HTTP REQUEST', { size: 18, color: c.cyan, width: 180, mono: true })
  text(f, 405, 719, 'Authorization: Bearer <access_token>', { size: 27, color: c.white, width: 650, mono: true })
  text(f, 1090, 724, 'HTTPS sempre', { size: 22, color: c.cyan, width: 230, mono: true })
}

// 06 — API Gateway
{
  const f = frame(5, '06 — A API intercepta antes do backend')
  header(f, 'Autorização', 'A API intercepta antes do backend', 'O authorizer valida o JWT; a Lambda só executa quando a rota permite.')
  node(f, 40, 305, 220, 160, 'Frontend', 'Bearer\naccess token', { kind: 'code', headingSize: 25, bodySize: 18 })
  node(f, 330, 280, 300, 210, 'API Gateway', 'JWT authorizer\nissuer + audience\nassinatura + expiração', { kind: 'api', fill: c.pale, headingSize: 27, bodySize: 19 })
  diamond(f, 710, 310, 170, 160, { stroke: c.blue, fill: c.pale2, strokeWidth: 3 })
  text(f, 730, 350, 'Token\nválido?', { size: 25, color: c.black, width: 130, align: 'center' })
  diamond(f, 980, 310, 170, 160, { stroke: c.blue, fill: c.pale2, strokeWidth: 3 })
  text(f, 1000, 350, 'Scope /\npermissão?', { size: 23, color: c.black, width: 130, align: 'center' })
  node(f, 1230, 280, 330, 210, 'Lambda / API', 'Recebe claims validados\nsub, scopes, grupos\ne executa a regra de negócio', { kind: 'lambda', headingSize: 26, bodySize: 18 })
  arrow(f, 260, 390, 320, 390)
  arrow(f, 630, 390, 700, 390)
  arrow(f, 880, 390, 970, 390)
  arrow(f, 1150, 390, 1220, 390)
  text(f, 900, 350, 'SIM', { size: 16, color: c.blue, width: 55, mono: true })
  text(f, 1170, 350, 'SIM', { size: 16, color: c.blue, width: 55, mono: true })
  arrow(f, 795, 470, 795, 595, { stroke: c.red })
  arrow(f, 1065, 470, 1065, 595, { stroke: c.red })
  text(f, 810, 520, 'NÃO', { size: 16, color: c.red, width: 55, mono: true })
  text(f, 1080, 520, 'NÃO', { size: 16, color: c.red, width: 55, mono: true })
  rect(f, 310, 615, 530, 135, { stroke: c.red, fill: c.redSoft, strokeWidth: 2 })
  text(f, 345, 641, '401 — UNAUTHENTICATED', { size: 22, color: c.red, width: 350, mono: true })
  text(f, 345, 685, 'Token ausente, expirado ou com\nassinatura/issuer/audience inválidos.', { size: 19, color: c.black, width: 450 })
  rect(f, 880, 615, 530, 135, { stroke: c.red, fill: c.white, strokeWidth: 2 })
  text(f, 915, 641, '403 — FORBIDDEN', { size: 22, color: c.red, width: 300, mono: true })
  text(f, 915, 685, 'Identidade válida, mas sem scope,\ngrupo ou permissão para a operação.', { size: 19, color: c.black, width: 450 })
}

// 07 — websocket
{
  const f = frame(6, '07 — HTTP e WebSocket não são iguais')
  header(f, 'Detalhe importante', 'HTTP e WebSocket não são iguais', 'O navegador aceita Authorization no fetch, mas não permite cabeçalhos arbitrários no WebSocket.')
  rect(f, 70, 290, 690, 390, { stroke: c.blue, fill: c.pale2 })
  text(f, 105, 320, 'HTTP API', { size: 23, color: c.blue, width: 180, mono: true })
  node(f, 110, 385, 250, 140, 'fetch()', 'Authorization:\nBearer <access_token>', { kind: 'code', bodySize: 18 })
  node(f, 470, 385, 250, 140, 'JWT authorizer', 'Validação nativa\npor rota', { kind: 'shield', bodySize: 18 })
  arrow(f, 360, 455, 460, 455)
  text(f, 105, 595, 'Recomendado para endpoints REST/HTTP do chatbot.', { size: 21, color: c.navy, width: 580 })
  rect(f, 840, 290, 690, 390, { stroke: c.blue, fill: c.black })
  text(f, 875, 320, 'WEBSOCKET API — ESTADO ATUAL', { size: 22, color: c.cyan, width: 440, mono: true })
  node(f, 880, 385, 250, 140, 'new WebSocket()', 'token na query do\nhandshake $connect', { kind: 'code', dark: true, bodySize: 18 })
  node(f, 1240, 385, 250, 140, '$connect', 'Lambda authorizer\nvalida o JWT', { kind: 'shield', dark: true, bodySize: 18 })
  arrow(f, 1130, 455, 1230, 455, { stroke: c.cyan })
  text(f, 875, 595, 'Use WSS e token curto. Evite registrar a URL com o token.', { size: 21, color: c.pale, width: 585 })
  rect(f, 250, 740, 1100, 74, { stroke: c.blue, fill: c.blue })
  text(f, 285, 760, 'No AutoAtende: VITE_WEBSOCKET_AUTH_QUERY_PARAM=token', { size: 23, color: c.white, width: 1030, align: 'center', mono: true })
}

// 08 — federação
{
  const f = frame(7, '08 — Login local e identidade externa')
  header(f, 'Federação', 'Login local e identidade externa', 'O User Pool pode aceitar usuários próprios e também atuar como ponte para outros provedores.')
  node(f, 70, 320, 285, 170, 'Login local', 'E-mail + senha\nno User Pool', { kind: 'user' })
  node(f, 70, 555, 285, 170, 'Google / social', 'Google, Apple,\nFacebook, Amazon', { kind: 'google' })
  node(f, 455, 438, 300, 190, 'Cognito User Pool', 'Mapeia claims\ne cria/associa o perfil', { kind: 'pool', fill: c.pale, headingSize: 27, bodySize: 20 })
  node(f, 855, 438, 300, 190, 'Tokens Cognito', 'Mesmo formato de JWT\npara todos os logins', { kind: 'key', fill: c.pale2, headingSize: 27, bodySize: 20 })
  node(f, 1255, 438, 275, 190, 'AutoAtende', 'Frontend e backend\nconsomem uma identidade', { kind: 'code', headingSize: 27, bodySize: 19 })
  arrow(f, 355, 405, 445, 505)
  arrow(f, 355, 640, 445, 560)
  arrow(f, 755, 535, 845, 535)
  arrow(f, 1155, 535, 1245, 535)
  pill(f, 475, 710, 'OIDC', { width: 130 })
  pill(f, 620, 710, 'SAML 2.0', { width: 160 })
  pill(f, 795, 710, 'SOCIAL', { width: 150 })
  text(f, 980, 711, 'Microsoft Entra ID costuma entrar via OIDC ou SAML.', { size: 20, color: c.navy, width: 500 })
}

// 09 — políticas e app clients
{
  const f = frame(8, '09 — Políticas e clientes separados')
  header(f, 'Configuração', 'Políticas e clientes separados', 'A política de senha pertence ao User Pool; cada aplicação pode ter seu próprio App Client.')
  rect(f, 70, 290, 660, 425, { stroke: c.blue, fill: c.pale2 })
  text(f, 105, 320, 'USER POOL — POLÍTICA GLOBAL', { size: 20, color: c.blue, width: 420, mono: true })
  check(f, 110, 385, 'Comprimento mínimo de senha', 480)
  check(f, 110, 448, 'Maiúsculas, minúsculas, números e símbolos', 500)
  check(f, 110, 511, 'MFA e recuperação de conta', 480)
  check(f, 110, 574, 'Auto cadastro ou criação administrativa', 500)
  check(f, 110, 637, 'Atributos, grupos e triggers Lambda', 500)
  rect(f, 790, 290, 730, 425, { stroke: c.blue, fill: c.white })
  text(f, 825, 320, 'UM APP CLIENT POR CONTEXTO', { size: 20, color: c.blue, width: 420, mono: true })
  node(f, 830, 380, 200, 135, 'SPA web', 'Público\nsem secret', { kind: 'code', headingSize: 23, bodySize: 18, fill: c.pale })
  node(f, 1055, 380, 200, 135, 'Mobile', 'Público\ncallbacks\npróprios', { kind: 'code', headingSize: 23, bodySize: 17 })
  node(f, 1280, 380, 200, 135, 'Backend', 'Confidencial\ncom secret', { kind: 'key', headingSize: 22, bodySize: 17 })
  text(f, 830, 570, 'Cada client pode variar:', { size: 22, color: c.black, width: 300 })
  text(f, 830, 615, 'fluxos • IdPs • callbacks • scopes • validade e revogação de tokens', { size: 20, color: c.navy, width: 620 })
  rect(f, 250, 760, 1100, 65, { stroke: c.black, fill: c.black })
  text(f, 280, 778, 'Nunca coloque client secret em React, JavaScript ou aplicativo móvel.', { size: 22, color: c.cyan, width: 1040, align: 'center' })
}

// 10 — laboratório
{
  const f = frame(9, '10 — Laboratório mínimo para a aula')
  header(f, 'Próximo passo', 'Laboratório mínimo para a aula', 'Um backend mock permite validar autenticação e autorização antes da regra de negócio real.')
  step(f, 65, 305, 1, 'User Pool', 'Criar usuários e\npolítica de senha', 220)
  step(f, 360, 305, 2, 'App Client SPA', 'Público, sem secret;\nlogin por e-mail', 240)
  step(f, 690, 305, 3, 'Frontend', 'Preencher .env e\ntestar Amplify Auth', 240)
  step(f, 1020, 305, 4, 'HTTP API', 'JWT authorizer com\nissuer + audience', 240)
  step(f, 1330, 305, 5, 'Lambda mock', '200 + claims\nrecebidos', 200)
  arrow(f, 300, 332, 345, 332)
  arrow(f, 630, 332, 675, 332)
  arrow(f, 960, 332, 1005, 332)
  arrow(f, 1270, 332, 1315, 332)
  rect(f, 115, 545, 1370, 195, { stroke: c.blue, fill: c.pale2 })
  text(f, 150, 575, 'TESTES DA AULA', { size: 20, color: c.blue, width: 220, mono: true })
  text(f, 150, 630, '1. Sem Authorization', { size: 22, color: c.black, width: 330 })
  text(f, 480, 630, '→ 401', { size: 22, color: c.red, width: 100, mono: true })
  text(f, 650, 630, '2. Token válido', { size: 22, color: c.black, width: 280 })
  text(f, 930, 630, '→ 200 + claims', { size: 22, color: c.blue, width: 260, mono: true })
  text(f, 150, 680, '3. Token válido sem scope', { size: 22, color: c.black, width: 360 })
  text(f, 510, 680, '→ 403', { size: 22, color: c.red, width: 100, mono: true })
  text(f, 650, 680, '4. Token expirado/adulterado', { size: 22, color: c.black, width: 380 })
  text(f, 1040, 680, '→ 401', { size: 22, color: c.red, width: 100, mono: true })
  text(f, 250, 790, 'Depois, troque apenas a Lambda mock pelo backend real do chatbot.', { size: 24, color: c.navy, width: 1100, align: 'center' })
}

const document = {
  type: 'excalidraw', version: 2, source: 'https://excalidraw.com', elements,
  appState: {
    gridSize: null, gridStep: 5, gridModeEnabled: false, viewBackgroundColor: c.white,
    currentItemStrokeColor: c.black, currentItemBackgroundColor: 'transparent',
    currentItemFillStyle: 'solid', currentItemStrokeWidth: 2, currentItemStrokeStyle: 'solid',
    currentItemRoughness: 0, currentItemOpacity: 100, currentItemFontFamily: 2,
    currentItemFontSize: 24, currentItemTextAlign: 'left', currentItemStartArrowhead: null,
    currentItemEndArrowhead: 'arrow', scrollX: 90, scrollY: 90, zoom: { value: 0.5 },
  },
  files: {},
}

const serialized = `${JSON.stringify(document, null, 2)}\n`
writeFileSync(OUT, serialized)
writeFileSync(CORRECTED_OUT, serialized)
console.log(`Created ${CORRECTED_OUT.pathname} with ${elements.length} elements across 10 frames.`)
