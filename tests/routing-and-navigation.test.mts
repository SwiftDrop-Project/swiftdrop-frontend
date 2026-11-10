import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";
import type { NextRequest } from "next/server";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_ROOT = path.resolve(__dirname, "..");
const SRC_ROOT = path.join(FRONTEND_ROOT, "src");
const nodeRequire = createRequire(import.meta.url);
const { NextRequest: NextRequestCtor } = nodeRequire("next/server") as typeof import("next/server");

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
    if (specifier === "next/server") {
      return nodeRequire("next/server") as T;
    }
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

  const mod = { exports: {} as Record<string, unknown> };
  moduleCache.set(targetPath, mod);

  const dirname = path.dirname(targetPath);
  const customRequire = (childSpecifier: string) => loadTsModule(childSpecifier, dirname);
  const wrapper = vm.runInThisContext(
    `(function (exports, require, module, __filename, __dirname) { ${transpiled.outputText}\n})`,
    { filename: targetPath },
  ) as (
    exportsObj: Record<string, unknown>,
    req: (id: string) => unknown,
    modObj: { exports: Record<string, unknown> },
    file: string,
    dir: string,
  ) => void;

  wrapper(mod.exports, customRequire, mod, targetPath, dirname);
  return mod.exports as T;
}

type RolesModule = typeof import("../src/lib/roles");
type NavigationModule = typeof import("../src/lib/navigation");
type ReferenceModule = typeof import("../src/lib/reference");
type SchemasModule = typeof import("../src/features/identity/schemas");
type ProxyModule = typeof import("../src/proxy");

const roles = loadTsModule<RolesModule>("@/lib/roles");
const navigation = loadTsModule<NavigationModule>("@/lib/navigation");
const reference = loadTsModule<ReferenceModule>("@/lib/reference");
const schemas = loadTsModule<SchemasModule>("@/features/identity/schemas");
const proxyModule = loadTsModule<ProxyModule>("@/proxy");

function makeJwt(claims: Record<string, unknown>): string {
  const encode = (obj: Record<string, unknown>) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(claims)}.signature`;
}

function makeRequest(urlPath: string, token?: string): NextRequest {
  const headers = new Headers();
  if (token) {
    headers.set("cookie", `SD_TOKEN=${token}`);
  }
  return new NextRequestCtor(`http://localhost:3000${urlPath}`, { headers });
}

test("ROLE_HOME maps ADMIN to /admin and DISPATCHER to /dispatcher", () => {
  assert.equal(roles.ROLE_HOME.ADMIN, "/admin");
  assert.equal(roles.ROLE_HOME.DISPATCHER, "/dispatcher");
  assert.equal(roles.ROLE_HOME.COURIER, "/courier");
  assert.equal(roles.ROLE_HOME.MERCHANT, "/merchant");
  assert.equal(roles.ROLE_HOME.CUSTOMER, "/customer");

  assert.equal(roles.areaForPath("/admin"), "ADMIN");
  assert.equal(roles.areaForPath("/admin/couriers/123"), "ADMIN");
  assert.equal(roles.areaForPath("/dispatcher/assign"), "DISPATCHER");
  assert.equal(roles.areaForPath("/change-password"), null);
  assert.equal(roles.areaForPath("/login"), null);
});

test("resolvePostAuthDestination enforces one canonical onboarding priority everywhere", () => {
  // 1. PROFILE_INCOMPLETE wins even if mustChangePassword is also true
  assert.equal(
    roles.resolvePostAuthDestination(
      roles.onboardingFromUser({
        role: "CUSTOMER",
        status: "PROFILE_INCOMPLETE",
        mustChangePassword: true,
      }),
      "/customer/deliveries",
    ),
    "/register/complete",
  );

  // 2. mustChangePassword routes to /change-password and ignores ?next=
  assert.equal(
    roles.resolvePostAuthDestination(
      roles.onboardingFromUser({
        role: "COURIER",
        status: "ACTIVE",
        mustChangePassword: true,
      }),
      "/courier/history",
    ),
    "/change-password",
  );

  assert.equal(
    roles.resolvePostAuthDestination(
      roles.onboardingFromUser({
        role: "DISPATCHER",
        status: "ACTIVE",
        mustChangePassword: true,
      }),
    ),
    "/change-password",
  );

  // 3. Complete active accounts go to validated in-role next or ROLE_HOME[role]
  assert.equal(
    roles.resolvePostAuthDestination(
      roles.onboardingFromUser({ role: "ADMIN", status: "ACTIVE", mustChangePassword: false }),
    ),
    "/admin",
  );
  assert.equal(
    roles.resolvePostAuthDestination(
      roles.onboardingFromUser({ role: "ADMIN", status: "ACTIVE", mustChangePassword: false }),
      "/admin/couriers?q=kamal",
    ),
    "/admin/couriers?q=kamal",
  );

  // Cross-role or unsafe next paths fall back to own role home
  assert.equal(roles.getSafeNext("/admin/merchants", "DISPATCHER"), "/dispatcher");
  assert.equal(roles.getSafeNext("//evil.example/admin", "ADMIN"), "/admin");
  assert.equal(roles.getSafeNext("/\\evil.example", "ADMIN"), "/admin");
  assert.equal(roles.getSafeNext("https://evil.example/admin", "ADMIN"), "/admin");
});

test("proxy enforces role separation, mandatory password change, and loop-free redirects", () => {
  const futureExp = Math.floor(Date.now() / 1000) + 3600;
  const expiredExp = Math.floor(Date.now() / 1000) - 60;

  // Unauthenticated access to /admin redirects to /login?next=%2Fadmin
  const unauthAdmin = proxyModule.proxy(makeRequest("/admin"));
  assert.equal(unauthAdmin.status, 307);
  assert.equal(unauthAdmin.headers.get("location"), "http://localhost:3000/login?next=%2Fadmin");

  // Expired token is treated as unauthenticated
  const expiredToken = makeJwt({ role: "ADMIN", status: "ACTIVE", pwd_change: false, exp: expiredExp });
  const expiredAdmin = proxyModule.proxy(makeRequest("/admin", expiredToken));
  assert.equal(expiredAdmin.headers.get("location"), "http://localhost:3000/login?next=%2Fadmin");

  // Active ADMIN on /login redirects to /admin (not /dispatcher)
  const adminToken = makeJwt({ role: "ADMIN", status: "ACTIVE", pwd_change: false, exp: futureExp });
  const adminFromLogin = proxyModule.proxy(makeRequest("/login", adminToken));
  assert.equal(adminFromLogin.headers.get("location"), "http://localhost:3000/admin");

  // Active ADMIN on /admin is allowed through
  const adminOnAdmin = proxyModule.proxy(makeRequest("/admin/couriers", adminToken));
  assert.equal(adminOnAdmin.headers.get("location"), null);

  // Active DISPATCHER attempting /admin or /admin/merchants redirects to /dispatcher
  const dispatcherToken = makeJwt({
    role: "DISPATCHER",
    status: "ACTIVE",
    pwd_change: false,
    exp: futureExp,
  });
  assert.equal(
    proxyModule.proxy(makeRequest("/admin", dispatcherToken)).headers.get("location"),
    "http://localhost:3000/dispatcher",
  );
  assert.equal(
    proxyModule.proxy(makeRequest("/admin/merchants", dispatcherToken)).headers.get("location"),
    "http://localhost:3000/dispatcher",
  );

  // Staff with pwd_change=true are forced to /change-password from role pages and /login, and allowed on /change-password
  const forcedCourierToken = makeJwt({
    role: "COURIER",
    status: "ACTIVE",
    pwd_change: true,
    exp: futureExp,
  });
  assert.equal(
    proxyModule.proxy(makeRequest("/courier", forcedCourierToken)).headers.get("location"),
    "http://localhost:3000/change-password",
  );
  assert.equal(
    proxyModule.proxy(makeRequest("/login", forcedCourierToken)).headers.get("location"),
    "http://localhost:3000/change-password",
  );
  assert.equal(
    proxyModule.proxy(makeRequest("/change-password", forcedCourierToken)).headers.get("location"),
    null,
  );

  // Active user without pwd_change visiting /change-password redirects cleanly to their role home
  assert.equal(
    proxyModule.proxy(makeRequest("/change-password", dispatcherToken)).headers.get("location"),
    "http://localhost:3000/dispatcher",
  );
});

test("Admin sidebar has all 5 collapsible groups in exact order and every route has a page.tsx", () => {
  const adminGroups = navigation.NAVIGATION.ADMIN;
  assert.deepEqual(
    adminGroups.map((group) => group.label),
    ["Customer", "Merchant", "Dispatcher", "Courier", "Admin"],
  );
  assert.ok(adminGroups.every((group) => group.collapsible === true));
  assert.deepEqual(
    adminGroups.map((group) => group.defaultOpen),
    [false, false, false, false, true],
  );

  assert.deepEqual(
    adminGroups[0].items.map((item) => item.title),
    [
      "Overview",
      "Create Delivery",
      "My Deliveries",
      "Track Parcel",
      "My Addresses",
      "Delivery History",
      "Payments & Receipts",
      "Profile",
    ],
  );
  assert.deepEqual(
    adminGroups[1].items.map((item) => item.title),
    [
      "Overview",
      "Create Order",
      "My Orders",
      "Track Shipments",
      "Customers",
      "API Keys",
      "Webhooks",
      "Webhook Logs",
      "Business Profile",
    ],
  );
  assert.deepEqual(
    adminGroups[2].items.map((item) => item.title),
    [
      "Overview",
      "Unassigned Parcels",
      "All Parcels",
      "Couriers",
      "Assign Courier",
      "Live Tracking",
      "Delivery Issues",
    ],
  );
  assert.deepEqual(
    adminGroups[3].items.map((item) => item.title),
    [
      "Overview",
      "Today's Deliveries",
      "My Assignments",
      "Delivery Details",
      "Update Status",
      "Delivery History",
      "Failed Deliveries",
      "Profile",
    ],
  );
  assert.deepEqual(
    adminGroups[4].items.map((item) => item.title),
    [
      "Overview",
      "User Management",
      "Merchant Approvals",
      "Courier Management",
      "Dispatcher Management",
      "All Parcels",
      "Zones & Pricing",
      "Delivery Rates",
      "Reports & Analytics",
      "System Settings",
    ],
  );

  // Condition 6: System Settings (/admin/settings) is separate from personal Account settings (/admin/account)
  assert.equal(navigation.settingsHref("ADMIN"), "/admin/account");

  // Dispatcher sidebar has zero /admin routes and no Merchant Approvals
  const dispatcherHrefs = navigation.NAVIGATION.DISPATCHER.flatMap((group) =>
    group.items.map((item) => item.href),
  );
  assert.ok(dispatcherHrefs.every((href) => href === "/dispatcher" || href.startsWith("/dispatcher/")));
  assert.ok(!dispatcherHrefs.includes("/dispatcher/merchants"));

  // Active navigation matching
  assert.equal(navigation.activeHref("ADMIN", "/admin"), "/admin");
  assert.equal(navigation.activeHref("ADMIN", "/admin/couriers/abc-123"), "/admin/couriers");
  assert.equal(navigation.activeHref("ADMIN", "/admin/account"), undefined);

  // Every route in NAVIGATION + help + settings exists on disk under src/app
  for (const role of roles.ROLES) {
    const hrefs = [
      ...navigation.NAVIGATION[role].flatMap((group) => group.items.map((item) => item.href)),
      navigation.helpItem(role).href,
      navigation.settingsHref(role),
    ].filter((href): href is string => Boolean(href));

    for (const href of hrefs) {
      const pagePath = path.join(SRC_ROOT, "app", ...href.split("/").filter(Boolean), "page.tsx");
      assert.ok(fs.existsSync(pagePath), `Expected page.tsx for ${role} route ${href} at ${pagePath}`);
    }
  }
});

test("Vehicle types and staff validation schemas match backend contracts", () => {
  assert.deepEqual(reference.VEHICLE_TYPE_VALUES, ["MOTORBIKE", "THREE_WHEELER", "VAN", "LORRY"]);

  const courierParsed = schemas.createCourierSchema.safeParse({
    fullName: "  Kamal Perera  ",
    phone: "  077 123 4567  ",
    email: "  Kamal@SwiftDrop.lk ",
    branch: "COLOMBO",
    vehicleType: "THREE_WHEELER",
    password: "TempPassword1",
  });
  assert.ok(courierParsed.success);
  assert.equal(courierParsed.data.fullName, "Kamal Perera");
  assert.equal(courierParsed.data.phone, "077 123 4567");
  assert.equal(courierParsed.data.email, "Kamal@SwiftDrop.lk");
  assert.equal(courierParsed.data.branch, "COLOMBO");

  const invalidVehicle = schemas.createCourierSchema.safeParse({
    fullName: "Kamal Perera",
    phone: "0771234567",
    email: "kamal@swiftdrop.lk",
    branch: "COLOMBO",
    vehicleType: "BICYCLE",
    password: "TempPassword1",
  });
  assert.ok(!invalidVehicle.success);

  // Mandatory password change rejects reusing current password
  const reusedPassword = schemas.changePasswordSchema.safeParse({
    currentPassword: "TempPassword1",
    newPassword: "TempPassword1",
    confirmPassword: "TempPassword1",
  });
  assert.ok(!reusedPassword.success);

  // Admin password reset requires matching confirmation
  const mismatchedReset = schemas.adminResetPasswordSchema.safeParse({
    newPassword: "NewPassword12",
    confirmPassword: "DifferentPassword12",
  });
  assert.ok(!mismatchedReset.success);
});

