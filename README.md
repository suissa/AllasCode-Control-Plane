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

```bash
elm make src/Main.elm --output=dist/elm.js
python3 -m http.server 8080
```

Abra `http://localhost:8080`.

Para build otimizado:

```bash
npm run build
```

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
