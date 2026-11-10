# Atividade 2 - Testes End-to-End

Suíte **Playwright com TypeScript** para o cadastro de alunos em `atividade/`. Exercita navegador, frontend, Nginx, API Express e PostgreSQL reais, sem simular respostas.

Base: [projeto do professor Arley](https://github.com/arleysouza/qualidade-2026-2-e2e), commit `2984eeb3300d5c5adaad6086a2bab7f778a1ae61`. O código da aplicação foi preservado. A implementação está em `e2e-atividade/`, `playwright.atividade.config.ts` e `compose.atividade-e2e.yml`.

## Executar

Requisitos: Node.js 24 com npm, Docker Desktop em execução com contêineres Linux, Docker Compose com suporte a `up --wait` e porta local `18081` disponível.

Na raiz desta pasta:

```powershell
npm ci
npx playwright install chromium
npm run test:e2e:typecheck
npm run test:e2e
```

Não é necessário criar `.env`, instalar dependências em `server/` ou iniciar a aplicação manualmente. O comando constrói as imagens, inicia os três serviços exclusivos, aguarda seus healthchecks, executa os testes e encerra os contêineres. A primeira construção e o download do navegador podem demorar alguns minutos.

Uma execução bem-sucedida apresenta **19 passed**. Abra o relatório HTML com:

```powershell
npm run test:e2e:report
```

O terminal informa o endereço local. Encerre o servidor do relatório com `Ctrl+C` ao terminar a consulta.

## Cobertura dos cenários

| Cenário do enunciado | Verificação na suíte |
| --- | --- |
| Listagem inicial | Exatamente os três alunos do seed, com RA e nome nas células. |
| Cadastro válido | Preenchimento, clique, resposta 201 e mensagem de sucesso visível. |
| Atualização da lista | Nova linha e alunos anteriores na tabela, identidade do documento preservada e nenhuma navegação. |
| Limpeza do formulário | Campos RA e Nome vazios e botão habilitado após o cadastro. |
| Persistência | Aluno continua na tabela após `page.reload()`. |
| Campos obrigatórios | RA vazio, Nome vazio e ambos vazios bloqueados pelo formulário. |
| RA inválido | Valores `-1`, `0`, `1.5` e `2147483648` rejeitados. |
| Nome inválido | Um ou dois caracteres, somente espaços e nomes curtos com espaços nas extremidades rejeitados. |
| RA duplicado | Resposta 409, mensagem de erro, campos preservados e registro original intacto, inclusive após recarregar. |
| Lista vazia | Banco sem dados e mensagem exata `Nenhum aluno cadastrado.` visível. |

São **19 testes**: uma listagem, um fluxo completo de cadastro, três casos de campos obrigatórios, quatro RAs inválidos, cinco nomes inválidos, uma duplicidade, três limites válidos e uma lista vazia. Os limites extras aceitam RA `1`, RA `2147483647`, nome com três caracteres e nome com cem caracteres. O fluxo completo também verifica a remoção de espaços nas extremidades do nome.

Nos casos inválidos, a suíte verifica a mensagem de validação do navegador, o foco, os campos preservados e a tabela inalterada. Em seguida corrige os campos e confirma que somente o cadastro válido gerou um POST. Cada caso também demonstra que o formulário continua utilizável depois da rejeição.

## Isolamento e independência

- Projeto Docker: `atividade2-e2e`; banco: `atividade2_e2e`.
- PostgreSQL em armazenamento temporário (`tmpfs`), sem volume da demonstração e sem porta de banco publicada no host.
- Frontend acessível em `http://127.0.0.1:18081` durante a execução.
- Antes de **cada teste**, a fixture executa `TRUNCATE` nas tabelas desse banco e reaplica `database/seed.sql`. O caso de lista vazia desativa o seed com `test.use({ seedStudents: false })`.
- Cada teste recebe página e contexto de navegador novos. Não depende dos cadastros de outro caso.
- Um worker, sem paralelismo nem tentativas automáticas, pois a suíte restaura o mesmo banco exclusivo antes de cada caso. Não execute duas instâncias simultâneas nem force `--workers` maior que 1.
- Cadastros pela interface; SQL somente na preparação dos dados. Seletores usam labels, roles e `data-testid`; a sincronização usa respostas HTTP e asserções observáveis, sem pausas fixas.

## Comandos e diagnóstico

| Comando | Uso |
| --- | --- |
| `npm test` ou `npm run test:e2e` | Preparar ambiente, executar e encerrar. |
| `npm run test:e2e -- --headed` | Acompanhar o navegador durante os testes. |
| `npm run test:e2e -- --grep "RA duplicado"` | Executar um caso isoladamente. |
| `npm run test:e2e:list` | Listar os 19 testes sem iniciar o Docker. |
| `npm run test:e2e:typecheck` | Verificar os tipos da suíte e configuração. |
| `npm run test:e2e:report` | Abrir o relatório HTML da atividade. |

Arquivos gerados, ignorados pelo Git:

| Caminho | Conteúdo |
| --- | --- |
| `playwright-report/atividade/index.html` | Relatório HTML. |
| `test-results/atividade/` | Screenshots e traces nas falhas; estado da última execução. |
| `e2e-artifacts/atividade/compose.log` | Logs coletados antes de encerrar os contêineres. |

Para investigar um trace de falha:

```powershell
npx playwright show-trace "caminho/para/trace.zip"
```

Se aparecer erro de conexão com o Docker, abra o Docker Desktop e aguarde o mecanismo Linux iniciar. Se a porta estiver ocupada, libere `18081`. Caso uma interrupção forçada deixe contêineres ativos, remova somente o ambiente da atividade:

```powershell
docker compose -f compose.atividade-e2e.yml -p atividade2-e2e down --remove-orphans
```

## Organização

| Arquivo ou pasta | Responsabilidade |
| --- | --- |
| `e2e-atividade/alunos.spec.ts` | Cenários e asserções da tabela de cobertura. |
| `e2e-atividade/support.ts` | Reset do banco e envio do formulário. |
| `e2e-atividade/run.cjs` | Inicialização, testes, logs e encerramento. |
| `e2e-atividade/tsconfig.json` | Verificação de tipos da suíte. |
| `playwright.atividade.config.ts` | Chromium, URL da atividade, um worker e relatórios. |
| `compose.atividade-e2e.yml` | Frontend `atividade/`, API e banco exclusivos. |
| `atividade/`, `server/`, `database/` | Aplicação original usada pelos testes. |
| `e2e/`, `front/`, `compose.e2e.yml`, `playwright.config.ts` | Exemplo original do Laboratório REST, mantido como referência. |

O exemplo original pode ser executado com `npm run test:laboratorio`. O comando `npm run test:e2e` deste projeto executa a atividade. Ao chamar o Playwright diretamente, use `--config=playwright.atividade.config.ts` para selecionar a suíte correta.

## Entrega

Enunciado: [Atividade 2 - Testes End-to-End.pdf](Atividade%202%20-%20Testes%20End-to-End.pdf). Entrega individual até **18 de novembro**, com código em repositório **público** no GitHub e link enviado como resposta à tarefa no Teams.

Depois de revisar o código e executar a suíte:

1. Crie um repositório público vazio no GitHub.
2. Versione e envie esta pasta. Para uma pasta ainda sem Git, substitua a URL abaixo pela do seu repositório:

   ```powershell
   git init
   git add .
   git commit -m "Implementa testes E2E do cadastro de alunos"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
   git push -u origin main
   ```

3. Confirme que README, testes e configurações estão disponíveis publicamente.
4. Envie a URL do repositório na tarefa do Teams.

O `.gitignore` exclui dependências, caches, `.env`, arquivos temporários e relatórios gerados.

Referência técnica: [configuração do Playwright Test](https://playwright.dev/docs/test-configuration).
