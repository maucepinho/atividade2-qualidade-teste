import { test as base, expect, type Page } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const SEEDED_STUDENTS = [
  { ra: 258001, name: "Ana Clara Silva" },
  { ra: 258002, name: "Bruno Henrique Santos" },
  { ra: 258003, name: "Camila Oliveira Souza" },
] as const;

export const test = base.extend<{ seedStudents: boolean }>({
  seedStudents: [true, { option: true }],
  page: async ({ page, seedStudents }, use) => {
    const seed = seedStudents
      ? readFileSync(resolve(__dirname, "../database/seed.sql"), "utf8")
      : "";
    const reset = spawnSync(
      "docker",
      [
        "compose",
        "-f",
        "compose.atividade-e2e.yml",
        "-p",
        "atividade2-e2e",
        "exec",
        "-T",
        "database",
        "psql",
        "-U",
        "postgres",
        "-d",
        "atividade2_e2e",
        "-v",
        "ON_ERROR_STOP=1",
      ],
      {
        cwd: resolve(__dirname, ".."),
        encoding: "utf8",
        input:
          "TRUNCATE enrollments, courses, students RESTART IDENTITY CASCADE;\n" +
          seed,
      },
    );
    if (reset.error || reset.status !== 0) {
      throw new Error(
        `Falha ao restaurar o banco da atividade: ${reset.error?.message ?? reset.stderr}`,
      );
    }

    await page.goto("/");
    await expect(page.locator("#students")).toHaveAttribute("aria-busy", "false");
    await expect(page.getByTestId("list-message")).toHaveAttribute(
      "data-state",
      "success",
    );
    await use(page);
  },
});

export { expect };

export async function submitStudent(
  page: Page,
  student: { ra: string; name: string },
  status = 201,
) {
  await page.getByLabel("RA", { exact: true }).fill(student.ra);
  await page.getByLabel("Nome", { exact: true }).fill(student.name);
  const responsePromise = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/students" &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Cadastrar aluno" }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(status);
  await expect(page.getByTestId("student-form")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await expect(page.getByRole("button", { name: "Cadastrar aluno" })).toBeEnabled();
  return response;
}
