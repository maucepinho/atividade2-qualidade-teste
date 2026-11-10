import type { Locator, Page, Request } from "@playwright/test";
import { test, expect, SEEDED_STUDENTS, submitStudent } from "./support";

type Student = { ra: number; name: string };

async function expectStudents(page: Page, students: readonly Student[]) {
  const rows = page.getByTestId("student-row");
  await expect(rows).toHaveCount(students.length);
  for (const student of students) {
    const row = rows.filter({
      has: page.getByRole("cell", { name: String(student.ra), exact: true }),
    });
    await expect(row).toHaveCount(1);
    await expect(row.getByRole("cell")).toHaveText([
      String(student.ra),
      student.name,
    ]);
  }
}

async function expectSuccessfulRegistration(page: Page, student: Student) {
  await expect(page.getByTestId("form-message")).toHaveText(
    "Aluno cadastrado com sucesso.",
  );
  await expect(page.getByTestId("form-message")).toHaveAttribute(
    "data-state",
    "success",
  );
  await expect(page.getByLabel("RA", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Nome", { exact: true })).toHaveValue("");
  await expect(page.getByRole("button", { name: "Cadastrar aluno" })).toBeEnabled();
  await expect(page.getByTestId("student-form")).toHaveAttribute("aria-busy", "false");
  await expectStudents(page, [...SEEDED_STUDENTS, student]);
}

// A rejeição é observada no formulário e na tabela. A correção posterior confirma
// que apenas o envio válido chega à API, sem esperar por uma pausa arbitrária.
async function expectInvalidRegistration(
  page: Page,
  values: { ra: string; name: string },
  invalidField: "RA" | "Nome",
  validityFlag: "valueMissing" | "rangeUnderflow" | "rangeOverflow" | "stepMismatch" | "invalidName",
) {
  const posts: Request[] = [];
  page.on("request", (request) => {
    if (
      new URL(request.url()).pathname === "/api/students" &&
      request.method() === "POST"
    ) {
      posts.push(request);
    }
  });

  const ra = page.getByLabel("RA", { exact: true });
  const name = page.getByLabel("Nome", { exact: true });
  await ra.fill(values.ra);
  await name.fill(values.name);
  await page.getByRole("button", { name: "Cadastrar aluno" }).click();

  const control: Locator = page.getByLabel(invalidField, { exact: true });
  const validation = await control.evaluate((element: HTMLInputElement) => ({
    valid: element.validity.valid,
    valueMissing: element.validity.valueMissing,
    rangeUnderflow: element.validity.rangeUnderflow,
    rangeOverflow: element.validity.rangeOverflow,
    stepMismatch: element.validity.stepMismatch,
    customError: element.validity.customError,
    tooShort: element.validity.tooShort,
    message: element.validationMessage,
  }));
  expect(validation.valid).toBe(false);
  expect(validation.message).not.toBe("");
  if (validityFlag === "invalidName") {
    // Nomes curtos podem ser bloqueados pelo minlength nativo ou pela validação
    // da versão sem espaços; ambos devem apresentar uma mensagem ao usuário.
    expect(validation.tooShort || validation.customError).toBe(true);
  } else {
    expect(validation[validityFlag]).toBe(true);
  }
  await expect(control).toBeFocused();
  await expect(ra).toHaveValue(values.ra);
  await expect(name).toHaveValue(values.name);
  await expect(page.getByTestId("form-message")).toBeEmpty();
  await expectStudents(page, SEEDED_STUDENTS);
  expect(posts).toHaveLength(0);

  const corrected = { ra: "900001", name: "Aluno Corrigido" };
  await submitStudent(page, corrected);
  await expectSuccessfulRegistration(page, {
    ra: Number(corrected.ra),
    name: corrected.name,
  });
  expect(posts).toHaveLength(1);
  expect(posts[0].postDataJSON()).toEqual({
    ra: Number(corrected.ra),
    name: corrected.name,
  });
}

test("listagem inicial apresenta exatamente os alunos existentes no banco", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Cadastro de alunos", exact: true })).toBeVisible();
  await expect(page.getByTestId("students-table").getByRole("columnheader")).toHaveText([
    "RA",
    "Nome",
  ]);
  await expectStudents(page, SEEDED_STUDENTS);
  await expect(page.getByTestId("list-message")).toBeEmpty();
});

test("cadastro válido exibe sucesso, atualiza sem recarregar, limpa o formulário e persiste", async ({ page }) => {
  const originalDocument = await page.evaluateHandle(() => document);
  const navigations: string[] = [];
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) navigations.push(frame.url());
  });
  const student = { ra: "900001", name: "  Daniela Maria Souza  " };
  const persisted = { ra: 900001, name: "Daniela Maria Souza" };

  const response = await submitStudent(page, student);
  expect(await response.json()).toEqual(persisted);
  await expectSuccessfulRegistration(page, persisted);
  expect(navigations).toEqual([]);
  expect(await page.evaluate((previous) => previous === document, originalDocument)).toBe(true);
  await originalDocument.dispose();

  await page.reload();
  await expect(page.getByTestId("list-message")).toHaveAttribute("data-state", "success");
  await expectStudents(page, [...SEEDED_STUDENTS, persisted]);
  await expect(page.getByTestId("form-message")).toBeEmpty();
});

for (const scenario of [
  { title: "RA vazio", ra: "", name: "Aluno Válido", field: "RA" },
  { title: "Nome vazio", ra: "900001", name: "", field: "Nome" },
  { title: "ambos vazios", ra: "", name: "", field: "RA" },
] as const) {
  test(`campos obrigatórios: bloqueia ${scenario.title}`, async ({ page }) => {
    await expectInvalidRegistration(page, scenario, scenario.field, "valueMissing");
  });
}

for (const scenario of [
  { title: "negativo", ra: "-1", flag: "rangeUnderflow" },
  { title: "zero", ra: "0", flag: "rangeUnderflow" },
  { title: "decimal", ra: "1.5", flag: "stepMismatch" },
  { title: "acima de 2147483647", ra: "2147483648", flag: "rangeOverflow" },
] as const) {
  test(`RA inválido: rejeita valor ${scenario.title}`, async ({ page }) => {
    await expectInvalidRegistration(
      page,
      { ra: scenario.ra, name: "Aluno Válido" },
      "RA",
      scenario.flag,
    );
  });
}

for (const scenario of [
  { title: "um caractere", name: "A" },
  { title: "dois caracteres", name: "Ab" },
  { title: "somente espaços", name: "   " },
  { title: "um caractere entre espaços", name: "  A  " },
  { title: "dois caracteres entre espaços", name: "  Ab  " },
] as const) {
  test(`Nome inválido: rejeita ${scenario.title}`, async ({ page }) => {
    await expectInvalidRegistration(
      page,
      { ra: "900001", name: scenario.name },
      "Nome",
      "invalidName",
    );
  });
}

test("RA duplicado exibe erro, preserva os campos e não altera o aluno existente", async ({ page }) => {
  const existing = SEEDED_STUDENTS[0];
  const attempted = { ra: String(existing.ra), name: "Outro Nome de Aluno" };
  const response = await submitStudent(page, attempted, 409);

  expect(await response.json()).toMatchObject({ message: "Já existe um estudante com este RA." });
  await expect(page.getByTestId("form-message")).toHaveText(
    "Não foi possível cadastrar o aluno. Já existe um estudante com este RA.",
  );
  await expect(page.getByTestId("form-message")).toHaveAttribute("data-state", "error");
  await expect(page.getByLabel("RA", { exact: true })).toHaveValue(attempted.ra);
  await expect(page.getByLabel("Nome", { exact: true })).toHaveValue(attempted.name);
  await expect(page.getByRole("button", { name: "Cadastrar aluno" })).toBeEnabled();
  await expectStudents(page, SEEDED_STUDENTS);

  await page.reload();
  await expect(page.getByTestId("list-message")).toHaveAttribute("data-state", "success");
  await expectStudents(page, SEEDED_STUDENTS);
});

for (const scenario of [
  { title: "RA mínimo e nome com três caracteres", ra: "1", name: "Ana" },
  { title: "RA máximo", ra: "2147483647", name: "Aluno Limite" },
  { title: "nome com cem caracteres", ra: "900001", name: "A".repeat(100) },
] as const) {
  test(`limites válidos: aceita ${scenario.title}`, async ({ page }) => {
    await submitStudent(page, scenario);
    await expectSuccessfulRegistration(page, { ra: Number(scenario.ra), name: scenario.name });
  });
}

test.describe("banco sem alunos", () => {
  test.use({ seedStudents: false });

  test("lista vazia apresenta a mensagem e nenhuma linha de aluno", async ({ page }) => {
    await expect(page.getByTestId("list-message")).toHaveText("Nenhum aluno cadastrado.");
    await expect(page.getByTestId("list-message")).toBeVisible();
    await expectStudents(page, []);
    await expect(page.getByTestId("students-table").getByRole("columnheader")).toHaveText([
      "RA",
      "Nome",
    ]);
  });
});
