import { firebaseConfig } from "@/lib/firebase-config";

export type SessionUser = {
  uid: string;
  email: string;
  displayName: string;
  role: "super_admin" | "district_uploader" | "district_viewer" | "national_viewer";
  scope: "national" | "district";
  districtId?: string;
  zoneId?: string;
  token: string;
};

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || firebaseConfig.apiKey;

export async function signIn(email: string, password: string): Promise<SessionUser> {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const result = await response.json();
  if (!response.ok) throw new Error("Correo o contraseña incorrectos.");
  const profileResponse = await fetch(
    `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/users/${result.localId}`,
    { headers: { Authorization: `Bearer ${result.idToken}` } },
  );
  const profile = await profileResponse.json();
  if (!profileResponse.ok) throw new Error("La cuenta no tiene un perfil autorizado.");
  const fields = profile.fields || {};
  const value = (name: string) => fields[name]?.stringValue as string | undefined;
  if (value("status") !== "active") throw new Error("Esta cuenta está suspendida.");

  return {
    uid: result.localId,
    email: value("email") || result.email,
    displayName: value("displayName") || result.displayName || result.email.split("@")[0],
    role: value("role") as SessionUser["role"],
    scope: value("scope") as SessionUser["scope"],
    districtId: value("districtId"),
    zoneId: value("zoneId"),
    token: result.idToken,
  };
}
