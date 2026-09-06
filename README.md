# AllasCode Ecosystem Control Plane — Elm PoC

Dashboard inspirado na organização visual do inference.sh, mas reposicionado para o objetivo do AllasCode: permitir que especialistas de domínio configurem, componham e operem sistemas agentic sem precisar entender primeiro o runtime.

## Stack

- Elm 0.19.1
- Tailwind CSS via CDN
- Google Fonts via CDN (`Manrope` + `DM Serif Display`)
- Sem framework JavaScript adicional na aplicação
- Lightpanda + Playwright Core apenas para testes funcionais no navegador

## UX

A UX planejada possui dois modos:

- **Domínio**: prioriza `Solutions`, `Intents` e `Flows`, com descrições de negócio.
- **Técnico**: expõe `Agents`, `Actors`, `Actions`, contratos e detalhes do runtime.

Esses modos ainda não estão implementados no bootstrap atual. Hoje `src/Main.elm` monta a aplicação, identifica o Control Plane e informa explicitamente que dados de domínio e a API ainda não foram integrados.

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

## Testes funcionais da interface

Os testes em `tests/interface.lightpanda.test.mjs` executam o bundle compilado em um navegador Lightpanda real controlado por CDP via `playwright-core`.

Instale o binário do Lightpanda e execute:

```bash
npx @lightpanda/browser install
npm run build
npm run test:ui
```

A cobertura acompanha apenas comportamentos realmente implementados. No bootstrap atual ela valida:

1. existência do único mount point `#app`;
2. montagem efetiva do Elm dentro de `#app`;
3. renderização da identidade `AllasCode Ecosystem Control Plane` pelo Elm;
4. mensagem explícita de que dados de domínio/API ainda não foram implementados;
5. título correto do documento.

Cada nova interação da interface — troca Domínio/Técnico, navegação, formulários, comandos, mutations ou consumo da API — deve adicionar seu respectivo teste funcional Lightpanda antes de ser considerada coberta pelo CI.

## CI

O workflow `.github/workflows/elm-ci.yml` executa em pushes e pull requests para `main` e também pode ser iniciado manualmente.

Ele:

1. valida `elm.json`, `src/Main.elm`, `index.html` e o runner Lightpanda;
2. instala as dependências e o browser Lightpanda;
3. compila um build normal;
4. compila o bundle otimizado de produção;
5. verifica se `index.html` referencia `dist/elm.js`;
6. executa os testes funcionais da interface no Lightpanda;
7. publica `index.html` + `dist/elm.js` como artifact do GitHub Actions por 14 dias.

## Próxima integração

A implementação real deverá substituir o estado bootstrap por dados da API do Control Plane, sem alterar a semântica da UI:

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
