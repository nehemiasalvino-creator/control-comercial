import { createSign } from "node:crypto";
import { firebaseConfig } from "@/lib/firebase-config";

const tokenUrl = "https://oauth2.googleapis.com/token";
const scope = "https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/datastore";

function base64url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

async function adminToken() {
  const email = process.env.FIREBASE_CLIENT_EMAIL;
  const key = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !key) throw new Error("Firebase Admin no está configurado en el servidor.");
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({ iss: email, sub: email, aud: tokenUrl, scope, iat: now, exp: now + 3600 }));
  const unsigned = `${header}.${payload}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(key);
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${base64url(signature)}` }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error("No se pudo autenticar el servicio administrativo.");
  return result.access_token as string;
}

export async function requireSuperAdmin(idToken: string) {
  const authResponse = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken }) },
  );
  const auth = await authResponse.json();
  const uid = auth.users?.[0]?.localId;
  if (!authResponse.ok || !uid) throw new Error("Sesión inválida o vencida.");
  const profileResponse = await fetch(
    `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/users/${uid}`,
    { headers: { Authorization: `Bearer ${idToken}` } },
  );
  const profile = await profileResponse.json();
  if (profile.fields?.role?.stringValue !== "super_admin" || profile.fields?.status?.stringValue !== "active") {
    throw new Error("No tiene autorización de superadministrador.");
  }
}

export async function createManagedUser(input: Record<string, string>) {
  const token = await adminToken();
  const authResponse = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${firebaseConfig.projectId}/accounts`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email: input.email, password: input.password, displayName: input.displayName, emailVerified: false }),
    },
  );
  const auth = await authResponse.json();
  if (!authResponse.ok) throw new Error(auth.error?.message || "No se pudo crear la cuenta.");

  const fields: Record<string, object> = {
    email: { stringValue: input.email }, displayName: { stringValue: input.displayName },
    role: { stringValue: input.role }, scope: { stringValue: input.scope }, status: { stringValue: "active" },
    createdAt: { timestampValue: new Date().toISOString() },
  };
  if (input.districtId) fields.districtId = { stringValue: input.districtId };
  if (input.zoneId) fields.zoneId = { stringValue: input.zoneId };
  const documentResponse = await fetch(
    `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/users?documentId=${auth.localId}`,
    { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ fields }) },
  );
  if (!documentResponse.ok) throw new Error("La cuenta se creó, pero faltó registrar su perfil.");
  return { uid: auth.localId, email: input.email };
}
