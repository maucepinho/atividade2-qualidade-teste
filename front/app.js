const examples = [
  ["students-list", "Alunos · listar", "GET", "/api/students"],
  ["students-get", "Alunos · buscar", "GET", "/api/students/258001"],
  [
    "students-create", "Alunos · criar",
    "POST",
    "/api/students",
    { ra: 258099, name: "Estudante de teste" },
  ],
  ["courses-list", "Disciplinas · listar", "GET", "/api/courses"],
  ["courses-get", "Disciplinas · buscar", "GET", "/api/courses/13"],
  [
    "courses-create", "Disciplinas · criar",
    "POST",
    "/api/courses",
    { name: "Disciplina de teste REST" },
  ],
  ["enrollments-list", "Matrículas · listar", "GET", "/api/enrollments"],
  ["enrollments-get", "Matrículas · buscar", "GET", "/api/enrollments/student/258001/course/1"],
  [
    "enrollments-create", "Matrículas · criar",
    "POST",
    "/api/enrollments",
    { studentRa: 258099, courseId: 13 },
  ],
  [
    "error-400", "Erro 400 · dados inválidos",
    "POST",
    "/api/students",
    { ra: -1, name: "A" },
  ],
  ["error-404", "Erro 404 · aluno inexistente", "GET", "/api/students/2147483647"],
  [
    "error-409", "Erro 409 · matrícula já existente no seed",
    "POST",
    "/api/enrollments",
    { studentRa: 258001, courseId: 1 },
  ],
];
const $ = (id) => document.getElementById(id);
$("base").value =
  location.protocol === "file:" ? "http://localhost:3002" : location.origin;
examples.forEach(([id, label]) =>
  $("example").add(new Option(label, id)),
);

function hasBody() {
  return $("method").value === "POST";
}
function requestUrl() {
  const base = new URL($("base").value);
  if (!["http:", "https:"].includes(base.protocol))
    throw new Error("Use um endereço HTTP ou HTTPS.");
  const path = $("path").value;
  const method = $("method").value;
  const collection = /^\/api\/(students|courses|enrollments)$/;
  const resource = /^\/api\/(students|courses)\/[^/?#]+$/;
  const enrollment = /^\/api\/enrollments\/student\/[^/?#]+\/course\/[^/?#]+$/;
  const supported =
    (method === "GET" && (collection.test(path) || resource.test(path) || enrollment.test(path))) ||
    (method === "POST" && collection.test(path));

  if (!supported) {
    throw new Error("Escolha um caminho suportado para a opera\u00e7\u00e3o selecionada.");
  }
  return new URL(base.href.replace(/\/$/, "") + path).href;
}
function preview() {
  $("body").disabled = !hasBody();
  let url;
  try {
    url = requestUrl();
  } catch {
    url = "(endereço ou caminho inválido)";
  }
  $("request-preview").textContent =
    `${$("method").value} ${url}\nAccept: application/json${hasBody() ? "\nContent-Type: application/json\n\n" + $("body").value : ""}`;
}
function chooseExample() {
  const [, , method, path, body] = examples.find(
    ([id]) => id === $("example").value,
  );
  $("method").value = method;
  $("path").value = path;
  $("body").value = body ? JSON.stringify(body, null, 2) : "";
  $("example-hint").textContent = "Edite os identificadores e o corpo antes de enviar.";
  preview();
}
$("example").addEventListener("change", chooseExample);
for (const id of ["base", "method", "path", "body"])
  $(id).addEventListener("input", preview);
$("request-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if ($("send").disabled) return;
  delete $("status").dataset.statusCode;
  let url, body;
  try {
    url = requestUrl();
    if (hasBody()) body = JSON.stringify(JSON.parse($("body").value));
  } catch (error) {
    $("status").className = "status error";
    $("status").textContent = "Requisição não enviada";
    $("status").dataset.state = "validation-error";
    $("response-meta").textContent = error.message;
    $("response-headers").textContent = "—";
    $("response-body").textContent =
      "Corrija o endereço, caminho ou JSON e tente novamente.";
    return;
  }
  const entry = Object.fromEntries(
    ["base", "method", "path", "body"].map((id) => [id, $(id).value]),
  );
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  $("send").disabled = true;
  $("response").setAttribute("aria-busy", "true");
  $("status").dataset.state = "loading";
  $("status").className = "status";
  $("status").textContent = "Enviando…";
  $("response-headers").textContent = "—";
  $("response-body").textContent = "Aguardando resposta…";
  $("response-meta").textContent = url;
  const start = performance.now();
  try {
    const response = await fetch(url, {
      method: entry.method,
      headers,
      body,
      signal: AbortSignal.timeout(15000),
    });
    const text = await response.text();
    $("status").className = `status ${response.ok ? "success" : "error"}`;
    $("status").textContent =
      `${response.status} ${response.statusText}`.trim();
    $("response-meta").textContent =
      `${Math.round(performance.now() - start)} ms · ${new TextEncoder().encode(text).length} bytes de corpo · ${response.url}`;
    $("response-headers").textContent =
      Array.from(response.headers, ([name, value]) => `${name}: ${value}`).join(
        "\n",
      ) || "(nenhum header acessível)";
    let formatted = text || "(resposta sem corpo)";
    try {
      formatted = JSON.stringify(JSON.parse(text), null, 2);
    } catch {
      /* Mantém respostas que não são JSON. */
    }
    $("response-body").textContent = formatted;
    $("status").dataset.statusCode = String(response.status);
    $("status").dataset.state = response.ok ? "success" : "http-error";
  } catch (error) {
    $("status").className = "status error";
    $("status").textContent = "Falha de conexão";
    $("status").dataset.state = "network-error";
    $("response-meta").textContent =
      `${Math.round(performance.now() - start)} ms · Sem resposta HTTP disponível`;
    $("response-body").textContent =
      `${error.message}\n\nVerifique se a API está em execução e se o endereço está correto. Use preferencialmente a página servida pelo Compose. Outra origem pode exigir configuração de CORS. O limite de espera é 15 segundos.`;
  } finally {
    $("send").disabled = false;
    $("response").setAttribute("aria-busy", "false");
  }
});
chooseExample();
