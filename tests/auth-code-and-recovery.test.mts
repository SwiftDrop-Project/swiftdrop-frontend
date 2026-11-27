import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_ROOT = path.resolve(__dirname, "..");
const SRC_ROOT = path.join(FRONTEND_ROOT, "src");
const nodeRequire = createRequire(import.meta.url);

const moduleCache = new Map<string, { exports: Record<string, unknown> }>();

function resolveTsFile(basePath: string): string | null {
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    path.join(basePath, "index.ts"),
    path.join(basePath, "index.tsx"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

function loadTsModule<T>(specifier: string, fromDir = SRC_ROOT): T {
  let targetPath: string | null = null;
  if (specifier.startsWith("@/")) {
    targetPath = resolveTsFile(path.join(SRC_ROOT, specifier.slice(2)));
  } else if (specifier.startsWith("./") || specifier.startsWith("../")) {
    targetPath = resolveTsFile(path.resolve(fromDir, specifier));
  }
  if (!targetPath) {
    return nodeRequire(specifier) as T;
  }
  const cached = moduleCache.get(targetPath);
  if (cached) {
    return cached.exports as T;
  }

  const source = fs.readFileSync(targetPath, "utf8");
  const transpiled = ts.transpileModule(source, {
    fileName: targetPath,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  });

  const mod: { exports: Record<string, unknown> } = { exports: {} };
  moduleCache.set(targetPath, mod);

  const dir = path.dirname(targetPath);
  const localRequire = (req: string) => loadTsModule<unknown>(req, dir);
  const wrapper = vm.runInThisContext(
    `(function(exports, require, module, __filename, __dirname) { ${transpiled.outputText}\n})`,
    { filename: targetPath },
  );
  wrapper(mod.exports, localRequire, mod, targetPath, dir);
  return mod.exports as T;
}

function installMockSessionStorage() {
  const store = new Map<string, string>();
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
  Object.defineProperty(globalThis, "sessionStorage", { value: storage, configurable: true, writable: true });
  return { store, storage };
}

test("classifyLoginIdentifier and normalizeSriLankanMobile handle emails, Sri Lankan mobiles, empty and malformed inputs", () => {
  const validation = loadTsModule<typeof import("../src/lib/validation")>("@/lib/validation");
  const recovery = loadTsModule<typeof import("../src/features/identity/lib/recovery-flow")>(
    "@/features/identity/lib/recovery-flow",
  );

  assert.equal(validation.normalizeSriLankanMobile("077 123 4567"), "+94771234567");
  assert.equal(validation.normalizeSriLankanMobile("771234567"), "+94771234567");
  assert.equal(validation.normalizeSriLankanMobile("+94 71 234 5678"), "+94712345678");
  assert.equal(validation.normalizeSriLankanMobile("0112345678"), null);

  assert.deepEqual(recovery.classifyLoginIdentifier(""), { kind: "empty" });
  assert.deepEqual(recovery.classifyLoginIdentifier("   "), { kind: "empty" });

  // Accepts all supported email domains, not just popular ones
  assert.deepEqual(recovery.classifyLoginIdentifier("  Alice.Perera+1@uom.lk  "), {
    kind: "email",
    identifier: "alice.perera+1@uom.lk",
    raw: "Alice.Perera+1@uom.lk",
  });
  assert.deepEqual(recovery.classifyLoginIdentifier("orders@shop.co.uk"), {
    kind: "email",
    identifier: "orders@shop.co.uk",
    raw: "orders@shop.co.uk",
  });

  assert.deepEqual(recovery.classifyLoginIdentifier(" 077 123 4567 "), {
    kind: "phone",
    identifier: "+94771234567",
    raw: "077 123 4567",
  });

  for (const bad of ["not-an-email", "user@nodot", "011 234 5678", "12345", "a b@example.com"]) {
    assert.deepEqual(recovery.classifyLoginIdentifier(bad), { kind: "invalid" }, `expected invalid for ${bad}`);
  }
});

test("recovery flow storage isolates flows, keeps phone identifier distinct from display email, and restarts safely on missing/tampered context", () => {
  const { store } = installMockSessionStorage();
  const recovery = loadTsModule<typeof import("../src/features/identity/lib/recovery-flow")>(
    "@/features/identity/lib/recovery-flow",
  );

  const emailFlowId = recovery.createBoundEmailFlow("alice@example.com", "Alice@example.com");
  const phoneFlowId = recovery.createBoundPhoneFlow("+94771234567", "077 123 4567");
  assert.notEqual(emailFlowId, phoneFlowId);

  const emailFlow = recovery.readRecoveryFlow(emailFlowId);
  assert.deepEqual(emailFlow, {
    kind: "bound-email",
    identifier: "alice@example.com",
    loginIdentifier: "Alice@example.com",
    displayEmail: "Alice@example.com",
    codeSent: false,
  });

  const phoneFlow = recovery.readRecoveryFlow(phoneFlowId);
  assert.deepEqual(phoneFlow, {
    kind: "bound-phone",
    identifier: "+94771234567",
    loginIdentifier: "077 123 4567",
    confirmationEmail: null,
    displayEmail: null,
    codeSent: false,
  });

  // Updating confirmation email keeps the original phone identifier intact
  if (phoneFlow && phoneFlow.kind === "bound-phone") {
    recovery.updateRecoveryFlow(phoneFlowId, {
      ...phoneFlow,
      confirmationEmail: "alice@example.com",
      displayEmail: "alice@example.com",
      codeSent: true,
    });
  }
  const updatedPhone = recovery.readRecoveryFlow(phoneFlowId);
  assert.equal(updatedPhone?.identifier, "+94771234567");
  assert.equal(updatedPhone?.displayEmail, "alice@example.com");
  assert.equal(updatedPhone?.kind === "bound-phone" ? updatedPhone.confirmationEmail : null, "alice@example.com");

  // Missing / unknown flow returns null (e.g. opened in another tab)
  assert.equal(recovery.readRecoveryFlow("missing-flow-id"), null);
  assert.equal(recovery.readRecoveryFlow(null), null);

  // Tampered storage entry is rejected safely
  store.set("swiftdrop.recovery.corrupt", JSON.stringify({ kind: "bound-email", identifier: "bad", displayEmail: "bad", loginIdentifier: "bad", codeSent: true }));
  assert.equal(recovery.readRecoveryFlow("corrupt"), null);

  // Clearing a completed flow removes both sessionStorage and in-memory state
  recovery.clearRecoveryFlow(phoneFlowId);
  assert.equal(recovery.readRecoveryFlow(phoneFlowId), null);
  // Clearing phoneFlowId does not disturb emailFlowId
  assert.equal(recovery.readRecoveryFlow(emailFlowId)?.identifier, "alice@example.com");
});

test("recovery routes and cooldown keys preserve standalone reset route and separate phone confirmation emails", () => {
  const routes = loadTsModule<typeof import("../src/features/identity/lib/routes")>("@/features/identity/lib/routes");
  const cooldown = loadTsModule<typeof import("../src/features/identity/lib/cooldown")>(
    "@/features/identity/lib/cooldown",
  );

  assert.equal(routes.loginHref(), "/login");
  assert.equal(routes.loginHref("077 123 4567"), "/login?identifier=077+123+4567");
  assert.equal(routes.forgotPasswordHref(), "/forgot-password");
  assert.equal(routes.forgotPasswordHref("flow-1"), "/forgot-password?flow=flow-1");
  assert.equal(routes.resetPasswordHref("alice@example.com"), "/reset-password?email=alice%40example.com");
  assert.equal(routes.resetPasswordFlowHref("flow-1"), "/reset-password?flow=flow-1");

  assert.equal(cooldown.cooldownKeys.reset("Alice@Example.com"), "reset:alice@example.com");
  assert.notEqual(
    cooldown.cooldownKeys.reset("+94771234567", "wrong@example.com"),
    cooldown.cooldownKeys.reset("+94771234567", "alice@example.com"),
  );
});
