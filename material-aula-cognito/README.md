# Material de aula — Cognito no AutoAtende

- `cognito-autoatende-corrigido.excalidraw`: quadro com 10 frames editáveis e fundos compatíveis com a importação do Excalidraw.
- `roteiro-aula.md`: explicações, observações técnicas e referências oficiais.
- `generate-deck.mjs`: gerador reproduzível do quadro.
- `render-previews.mjs`: gerador das prévias para revisão visual.

Abra o arquivo `.excalidraw` em [excalidraw.com](https://excalidraw.com). Os frames estão organizados verticalmente, de 01 a 10.

## Identidade visual

- preto `#0B0F19`;
- azul `#2563EB`;
- azul-claro `#38BDF8`;
- branco `#FFFFFF`;
- vermelho apenas para 401 e 403.

Não são usados fundos cinza.

## Regenerar

```bash
node generate-deck.mjs
node render-previews.mjs
```
