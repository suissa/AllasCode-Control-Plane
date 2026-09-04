# AllasCode Ecosystem Control Plane — Elm PoC

Dashboard inspirado na organização visual do inference.sh, mas reposicionado para o objetivo do AllasCode: permitir que especialistas de domínio configurem, componham e operem sistemas agentic sem precisar entender primeiro o runtime.

## Stack

- Elm 0.19.1
- Tailwind CSS via CDN
- Google Fonts via CDN (`Manrope` + `DM Serif Display`)
- Sem framework JavaScript adicional

## UX

Existem dois modos:

- **Domínio**: prioriza `Solutions`, `Intents` e `Flows`, com descrições de negócio.
- **Técnico**: expõe `Agents`, `Actors`, `Actions`, contratos e detalhes do runtime.

A mesma configuração deve futuramente ser uma projeção de artefatos Everything-as-Code; a UI não deve se tornar uma segunda fonte de verdade.

## Executar

Instale as dependências locais:

```bash
npm install
```

Build de desenvolvimento:

```bash
npm run build:debug
python3 -m http.server 8080
```

Abra `http://localhost:8080`.

Build otimizado:

```bash
npm run build
```

Os dois comandos compilam `src/Main.elm` para `dist/elm.js`, que é carregado por `index.html`.

## CI

O workflow `.github/workflows/elm-ci.yml` executa em pushes e pull requests para `main` e também pode ser iniciado manualmente.

Ele:

1. valida `elm.json`, `src/Main.elm` e `index.html`;
2. instala o compilador Elm 0.19.1 via dependência npm fixada;
3. compila um build normal;
4. compila o bundle otimizado de produção;
5. verifica se `index.html` referencia `dist/elm.js`;
6. publica `index.html` + `dist/elm.js` como artifact do GitHub Actions por 14 dias.

## Próxima integração

A PoC usa dados locais em `Main.elm`. A implementação real deverá substituir esses valores por uma API do Control Plane, sem alterar a semântica da UI:

```text
Central Collaborative Git Repository
        ↓
semantic validation / signatures
        ↓
Registry Index
        ↓
AllasCode Control Plane API
        ↓
Elm UI
        ↓ config mutations / commands
Runtime / Supervisors / Agents
```

As alterações feitas pela UI devem gerar mutações explícitas e auditáveis nos artefatos declarativos, não configurações ocultas no frontend.
