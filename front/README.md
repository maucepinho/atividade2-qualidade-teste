# Interface e automação E2E

Os testes usam `getByTestId()` para localizar elementos por `data-testid`,
independentemente dos rótulos e títulos visíveis. Os campos mantêm seus rótulos
HTML, e o painel de resposta usa `aria-busy` para indicar uma atualização em curso.

| Elemento | `data-testid` |
| --- | --- |
| Título da página | `page-title` |
| Operação | `example` |
| Endereço base | `base` |
| Método | `method` |
| Caminho do recurso | `path` |
| Corpo da requisição | `body` |
| Botão de envio | `send` |
| Requisição preparada | `request-preview` |
| Painel de resposta | `response` |
| Status | `status` |
| Headers da resposta | `response-headers` |
| Corpo da resposta | `response-body` |

Exemplo: `page.getByTestId('response-body')`. Mantenha os identificadores estáveis
ao alterar textos da interface. As asserções sobre conteúdo continuam verificando
os valores esperados pelo cenário.

O seletor “Operação” usa valores fixos, independentes da posição das opções:

| Recurso | Listar | Buscar | Criar |
| --- | --- | --- | --- |
| Alunos | `students-list` | `students-get` | `students-create` |
| Disciplinas | `courses-list` | `courses-get` | `courses-create` |
| Matrículas | `enrollments-list` | `enrollments-get` | `enrollments-create` |

Os exemplos de erro usam `error-400`, `error-404` e `error-409`.

## Conclusão da requisição

`#response` informa `aria-busy="true"` durante o envio e `false` ao terminar.
O botão fica desabilitado durante a requisição e é reabilitado ao concluir.
`#status` expõe os seguintes atributos:

- `data-state`: `idle`, `loading`, `success`, `http-error`, `validation-error` ou `network-error`.
- `data-status-code`: código HTTP recebido, disponível após a leitura completa do corpo.
  É removido no próximo envio; erros locais ou de rede não possuem código HTTP.

Para envios consecutivos com o mesmo resultado, registre a espera pela resposta
de rede antes do clique, aguarde essa resposta e depois confira o estado final e
o conteúdo da região. Não dependa de observar o estado transitório `loading`,
pois uma resposta rápida pode encerrá-lo antes da próxima asserção.

Os IDs existentes foram preservados. A suíte E2E está documentada em
[e2e/README.md](../e2e/README.md). Os exemplos de busca e de matrícula duplicada
pressupõem os dados de `database/seed.sql`; cenários de criação devem preparar
seus dados em um banco isolado.


