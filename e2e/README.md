# Testes E2E

Requisitos: Node.js 24, Docker em execução e Docker Compose com suporte a `up --wait`.
Execute os comandos na raiz do projeto:

```powershell
npm ci
npx playwright install chromium
npm run test:e2e
```

O comando cria a aplicação completa usando exclusivamente `compose.e2e.yml`,
o projeto Docker `aula4-e2e` e a porta local `18080`. Não usa o `.env` nem o
volume do Compose da demonstração. Reserve esse nome e essa porta para os testes.
O banco não publica portas e usa armazenamento temporário.

Antes de cada cenário, a fixture executa `TRUNCATE` e reaplica `database/seed.sql`
somente no banco `aula4_e2e` desse projeto Docker. Os testes executam em sequência,
com um worker e sem novas tentativas automáticas. Não execute duas suítes ao mesmo tempo.
Os cenários que enviam requisições exercitam o caminho completo: navegador,
interface web, Nginx, API Express e PostgreSQL, sem interceptação ou simulação
das respostas da API. A suíte também verifica comportamentos locais da interface,
como a preparação da requisição e o bloqueio de JSON inválido antes do envio.

## Primeiro teste: cadastro com `send()`

O primeiro cenário de `laboratorio.spec.ts`, `cadastra um aluno pela interface`,
define o objeto de Mariana uma única vez e o reutiliza no envio e na comparação
do resultado com `toEqual(student)`.

O teste importa `test`, `expect` e `send` de `./support`, preservando a fixture que
restaura o banco e abre a página antes de cada cenário.

O auxiliar `send()` de `support.ts` reutiliza as operações comuns de seleção,
preenchimento, envio e verificação da resposta nos cenários. Assim, uma chamada como
`await send(page, 'students-create', 201, { body: student })` reúne essas etapas.
Ele verifica o status, os headers e o corpo exibidos na interface e compara o
JSON apresentado com a resposta HTTP recebida.

## Como apresentar o projeto na aula

A interface é um laboratório de requisições REST: permite selecionar operações,
editar JSON, enviar requisições e observar respostas. Essas interações são o
objeto dos testes E2E e podem ser usadas diretamente para ensinar automação no
navegador, sem reestruturar a aplicação.

Ordem sugerida para apresentar os exemplos:

1. Cadastro de aluno com `send()`: acompanhar em `support.ts` como o auxiliar
   localiza campos por `getByTestId()`, seleciona a operação, preenche o JSON, clica e verifica o resultado.
2. Consulta do aluno cadastrado: mostrar a consulta após o cadastro no mesmo
   cenário, como ocorre no fluxo completo. Cada teste restaura o banco antes de
   começar; um cenário não depende dos dados criados pelo anterior.
3. Fluxo completo de matrícula: apresentar `send()` como reutilização das ações
   comuns e acompanhar o cadastro de aluno e disciplina, a matrícula e as
   consultas após recarregar a página.
4. Apresentação de um erro HTTP: observar o código e o corpo da resposta na
   interface e as verificações correspondentes no teste.
5. Bloqueio de JSON inválido: mostrar que a validação local impede o envio e
   que a requisição funciona após corrigir o corpo.
6. Fixtures, restauração do banco e relatórios: explicar o `test` de `./support`,
   o isolamento entre cenários e a consulta dos resultados e traces.

## Cenários

- Cadastro de um aluno pela interface usando `send()` e comparação do objeto retornado.
- Seleção da operação e prévia da requisição.
- Listagem e busca dos dados iniciais de alunos, disciplinas e matrículas.
- Cadastro de aluno e disciplina, matrícula e consulta após recarregar a página.
- Apresentação de erros HTTP 400, 404 e 409.
- Bloqueio de JSON inválido e recuperação após corrigir o corpo.

## Comandos úteis

```powershell
npm run test:e2e:typecheck
npm run test:e2e:list
npm run test:e2e -- --headed
npm run test:e2e -- --grep "matricula"
npm run test:e2e:report
```

O relatório é servido em `127.0.0.1`, com uma porta disponível escolhida
automaticamente. Acesse o endereço informado no terminal. Mantenha o terminal desse
comando aberto enquanto consulta os resultados. A listagem usa apenas o
reporter de texto para preservar o HTML da última execução.

O script encerra os contêineres ao terminar, inclusive se os testes falharem.
Os logs ficam em `e2e-artifacts/compose.log`; o relatório HTML em
`playwright-report/`; capturas e traces de falhas em `test-results/`.
Após uma interrupção forçada do processo, a limpeza pode ser feita com:

```powershell
docker compose -f compose.e2e.yml -p aula4-e2e down --remove-orphans
```

O Playwright usa esperas de rede e asserções com repetição, sem pausas fixas.
Os seletores usam `getByTestId()` com atributos `data-testid` estáveis,
independentes dos rótulos. Consulte os identificadores em `front/README.md`.

Referência: [documentação do Playwright Test](https://playwright.dev/docs/intro).
