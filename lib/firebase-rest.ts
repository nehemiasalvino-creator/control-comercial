export type SessionUser = {
  email: string;
  displayName: string;
  role: "admin" | "alimentador" | "consulta";
  district: string;
  zone: string;
  token?: string;
};

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

export async function signIn(email: string, password: string): Promise<SessionUser> {
  if (!apiKey) {
    if (email === "demo@control.bo" && password === "Demo2026") {
      return { email, displayName: "Jefatura Comercial", role: "admin", district: "DCCH", zone: "Sucre" };
    }
    throw new Error("Firebase aún no está configurado. Use el acceso de demostración.");
  }

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
  return {
    email: result.email,
    displayName: result.displayName || result.email.split("@")[0],
    role: "consulta",
    district: "DCCH",
    zone: "Sucre",
    token: result.idToken,
  };
}
