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

const PROTECTED_AREAS = ["admin", "courier", "dispatcher", "customer", "merchant"] as const;

function walkFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const results: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(fullPath));
    } else if (entry.isFile()) {
      results.push(fullPath);
    }
  }
  return results;
}

test("AppShell keeps protected layout children mounted while loading so Next.js instant-navigation validation sees the active segment", () => {
  const appShellPath = path.join(SRC_ROOT, "components", "layout", "app-shell.tsx");
  const source = fs.readFileSync(appShellPath, "utf8");

  assert.match(
    source,
    /\{state\.status\s*!==\s*"error"\s*\?\s*children\s*:\s*null\}/,
    "ShellContent must keep children mounted while state.status is 'loading' or 'ready'",
  );
  assert.doesNotMatch(
    source,
    /state\.status\s*===\s*"loading"/,
    "ShellContent must not render a duplicate loading skeleton alongside page-level RequireCurrentUser fallbacks",
  );
  assert.match(
    source,
    /\{state\.status\s*===\s*"error"\s*\?/,
    "ShellContent must unmount children and show error notice when state.status === 'error'",
  );
});

test("Every protected role layout and page preserves instant-navigation validation without server-side data fetches or unguarded content", () => {
  const allSrcFiles = walkFiles(SRC_ROOT).filter((file) => /\.(ts|tsx)$/.test(file));

  // 1. No instant = false suppression anywhere in src/
  for (const file of allSrcFiles) {
    const content = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(
      content,
      /export\s+const\s+instant\s*=\s*false/,
      `Found forbidden instant = false opt-out in ${path.relative(FRONTEND_ROOT, file)}`,
    );
  }

  // 2. Every protected role layout mounts AppShell with its matching area
  for (const area of PROTECTED_AREAS) {
    const layoutPath = path.join(SRC_ROOT, "app", area, "layout.tsx");
    const layoutSource = fs.readFileSync(layoutPath, "utf8");
    assert.match(
      layoutSource,
      new RegExp(`<AppShell\\s+area="${area.toUpperCase()}"`),
      `Expected ${area}/layout.tsx to mount <AppShell area="${area.toUpperCase()}">`,
    );
  }

  // 3. Every protected page either guards directly with RequireCurrentUser or delegates to a guarded component
  const guardedDelegates = [
    "ComingSoon",
    "AccountSettings",
    "AdminOverview",
    "CourierManagement",
    "CourierDetailView",
    "DispatcherManagement",
    "DispatcherDetailView",
  ];

  const protectedPages = PROTECTED_AREAS.flatMap((area) =>
    walkFiles(path.join(SRC_ROOT, "app", area)).filter((file) => file.endsWith("page.tsx")),
  );

  assert.ok(protectedPages.length >= 65, `Expected at least 65 protected pages, found ${protectedPages.length}`);

  for (const pageFile of protectedPages) {
    const source = fs.readFileSync(pageFile, "utf8");
    const rel = path.relative(FRONTEND_ROOT, pageFile);

    // Must not perform server-side fetches or dynamic server cookie/header reads
    assert.doesNotMatch(source, /\bfetch\s*\(/, `Unexpected server fetch() in ${rel}`);
    assert.doesNotMatch(source, /\bcookies\s*\(/, `Unexpected cookies() call in ${rel}`);
    assert.doesNotMatch(source, /\bheaders\s*\(/, `Unexpected headers() call in ${rel}`);

    const usesDirectGuard = source.includes("<RequireCurrentUser");
    const usesGuardedDelegate = guardedDelegates.some((name) => new RegExp(`<${name}\\b`).test(source));
    assert.ok(
      usesDirectGuard || usesGuardedDelegate,
      `Protected page ${rel} must render <RequireCurrentUser> or a guarded component`,
    );
  }

  // 4. Every guarded delegate component itself uses <RequireCurrentUser>
  const delegateFiles = [
    "src/components/layout/coming-soon.tsx",
    "src/features/identity/components/account-settings.tsx",
    "src/features/identity/components/admin-overview.tsx",
    "src/features/identity/components/courier-management.tsx",
    "src/features/identity/components/courier-detail-view.tsx",
    "src/features/identity/components/dispatcher-management.tsx",
    "src/features/identity/components/dispatcher-detail-view.tsx",
  ];

  for (const relFile of delegateFiles) {
    const content = fs.readFileSync(path.join(FRONTEND_ROOT, relFile), "utf8");
    assert.match(
      content,
      /<RequireCurrentUser\b/,
      `Expected ${relFile} to wrap protected UI and data hooks in <RequireCurrentUser>`,
    );
  }
});

test("RequireCurrentUser renders fallback when user is null and mounts children only after authentication resolves", () => {
  const React = nodeRequire("react") as typeof import("react");
  const { renderToStaticMarkup } = nodeRequire("react-dom/server") as typeof import("react-dom/server");

  const reqUserPath = path.join(SRC_ROOT, "features", "identity", "components", "require-current-user.tsx");
  const source = fs.readFileSync(reqUserPath, "utf8");
  const transpiled = ts.transpileModule(source, {
    fileName: reqUserPath,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  });

  let mockUser: { id: string; fullName: string; role: string } | null = null;
  const mod = { exports: {} as Record<string, unknown> };
  const customRequire = (specifier: string) => {
    if (specifier === "./current-user") {
      return { useCurrentUser: () => mockUser };
    }
    return nodeRequire(specifier);
  };

  const wrapper = vm.runInThisContext(
    `(function (exports, require, module, __filename, __dirname) { ${transpiled.outputText}\n})`,
    { filename: reqUserPath },
  ) as (
    exportsObj: Record<string, unknown>,
    req: (id: string) => unknown,
    modObj: { exports: Record<string, unknown> },
    file: string,
    dir: string,
  ) => void;
  wrapper(mod.exports, customRequire, mod, reqUserPath, path.dirname(reqUserPath));

  const RequireCurrentUser = mod.exports.RequireCurrentUser as (props: {
    fallback: React.ReactNode;
    children: React.ReactNode | ((user: { fullName: string }) => React.ReactNode);
  }) => React.ReactElement;

  let protectedMountCount = 0;
  function ProtectedProbe() {
    protectedMountCount += 1;
    return React.createElement("div", null, "SECRET_ADMIN_DATA");
  }

  // While user is null (GET /auth/me loading): fallback renders and ProtectedProbe never mounts
  mockUser = null;
  const loadingHtml = renderToStaticMarkup(
    RequireCurrentUser({
      fallback: React.createElement("div", null, "LOADING_SKELETON"),
      children: React.createElement(ProtectedProbe),
    }),
  );
  assert.equal(loadingHtml, "<div>LOADING_SKELETON</div>");
  assert.equal(protectedMountCount, 0);

  // Once user resolves: ProtectedProbe mounts and render-prop receives verified user
  mockUser = { id: "u-1", fullName: "Ayesha Admin", role: "ADMIN" };
  const readyHtml = renderToStaticMarkup(
    RequireCurrentUser({
      fallback: React.createElement("div", null, "LOADING_SKELETON"),
      children: (user: { fullName: string }) => React.createElement("div", null, `Hello ${user.fullName}`),
    }),
  );
  assert.equal(readyHtml, "<div>Hello Ayesha Admin</div>");
});

