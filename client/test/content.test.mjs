import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { transpileModule, ModuleKind, ScriptTarget } from "typescript";
async function load(name) {
  const source = await readFile(
    new URL("../src/lib/" + name + ".ts", import.meta.url),
    "utf8",
  );
  const code = transpileModule(source, {
    compilerOptions: { module: ModuleKind.ES2022, target: ScriptTarget.ES2022 },
  }).outputText;
  return import(
    "data:text/javascript;base64," + Buffer.from(code).toString("base64")
  );
}
const roles = await load("roles"),
  content = await load("content");
test("Russian role names produce a stable URL-safe identifier", () => {
  assert.equal(roles.slugify("  Редактор сюжетов!  "), "redaktor-syuzhetov");
  assert.equal(roles.slugify("QA / Core"), "qa-core");
  assert.ok(roles.slugify("x".repeat(80)).length <= 64);
});
test("permission changes identify additions and removals", () => {
  assert.deepEqual(
    roles.permissionDiff(
      ["articles.create", "players.adjust"],
      ["articles.create", "reports.edit"],
    ),
    { added: ["reports.edit"], removed: ["players.adjust"] },
  );
});
test("Russian counters use singular and plural forms", () => {
  assert.equal(content.words(21, "статья", "статьи", "статей"), "статья");
  assert.equal(content.words(12, "статья", "статьи", "статей"), "статей");
  assert.equal(content.words(24, "статья", "статьи", "статей"), "статьи");
});
test("public names do not expose phone-derived logins or an email", () => {
  assert.equal(content.readableName("tel_79123456789"), "Игрок AGL");
  assert.equal(content.readableName("mail@example.test"), "Игрок AGL");
  assert.equal(content.readableName("akaalexey"), "akaalexey");
});
