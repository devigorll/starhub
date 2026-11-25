# StarHub

Hub pessoal e privado para centralizar projetos e aplicações web, com identidade visual inspirada em Star Wars.

Em vez de editar o código do portfólio a cada novo projeto, você entra no painel, cadastra o projeto com quantas páginas quiser (nome + URL) e abre qualquer uma em nova aba. O mesmo catálogo aparece em qualquer dispositivo.

## Funcionalidades
- Login com e-mail e senha, sessão persistente de 7 dias e logout.
- Dashboard com cards em grade responsiva, sem imagens: nome, descrição opcional e indicador de páginas.
- Cada card funciona como uma pasta que expande com animação e lista as páginas vinculadas, com botão para abrir em nova aba.
- Criar, editar e excluir projetos (com confirmação), cada um com várias URLs.
- Tema claro (padrão) e escuro, com preferência salva. Fundo estrelado nos dois temas: estrelas cinzas sobre branco no claro e claras sobre azul-preto no escuro.
- Estados vazios, avisos de ação e layout adaptado a celular, tablet e desktop.

## Design e desempenho
- Visual minimalista inspirado na Apple: fonte do sistema (SF Pro no Apple, sem webfonts), paleta cinza/branco/preto, um único acento azul discreto e nenhum brilho, neon ou blur.
- Céu estrelado em um único `<canvas>` desenhado uma vez (de novo só ao trocar tema ou largura), com deriva lenta feita só por `transform` na GPU. Respeita `prefers-reduced-motion`.
- Animações limitam-se a cor, opacidade e transform; cards são opacos e isolados com `contain`.

## Arquitetura (sem banco de dados)
- **Frontend:** HTML, CSS e JavaScript puros, em `public/`.
- **Backend:** uma função serverless da Vercel (`api/index.js`), sem dependências.
- **Autenticação:** credenciais em variáveis de ambiente (nunca no navegador). O login gera um cookie assinado (HMAC), `HttpOnly`, `Secure`, `SameSite=Strict`. Há limite de tentativas por IP.
- **Persistência:** o catálogo é um arquivo `projects.json` em um **repositório privado do GitHub**, lido e gravado pela API do GitHub. Cada alteração vira um commit, então você tem histórico e backup de graça.

### Limitações
- Usuário único.
- Edições simultâneas em dois dispositivos: a segunda recebe um aviso para recarregar.
- Cada salvamento leva cerca de 1 segundo (chamada à API do GitHub).
- `/app` entrega apenas a casca da interface; os dados só saem da API com sessão válida.

## Estrutura
```
starhub/
├── api/index.js        # login, logout e CRUD de projetos
├── public/
│   ├── login.html
│   ├── index.html      # dashboard
│   ├── css/style.css
│   └── js/{core.js, app.js}
├── vercel.json         # rotas e cabeçalhos de segurança
├── package.json
└── .env.example
```

## Publicar na Vercel
1. **Repositório de dados:** crie um repositório **privado** no GitHub (ex.: `starhub-data`) com um commit inicial qualquer (um README basta). Use um repositório separado para que salvar projetos não dispare novos deploys.
2. **Token:** em GitHub > Settings > Developer settings > Fine-grained tokens, crie um token apenas para esse repositório, com permissão **Contents: Read and write**.
3. **Código:** suba esta pasta para outro repositório (pode ser privado) e importe-o na Vercel (Framework: *Other*).
4. **Variáveis de ambiente** na Vercel (Settings > Environment Variables), conforme `.env.example`:
   `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SESSION_SECRET` (gere com `openssl rand -hex 32`), `GITHUB_TOKEN`, `GITHUB_REPO` (`usuario/starhub-data`) e, se precisar, `GITHUB_BRANCH` e `GITHUB_FILE`.
5. Faça o deploy e acesse a URL. Se alterar variáveis depois, faça um novo deploy.

Para testar localmente: `npx vercel dev`, com as variáveis em um `.env`.
