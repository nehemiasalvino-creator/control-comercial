import { createManagedUser, requireSuperAdmin } from "@/lib/firebase-admin-rest";

const roles = new Set(["district_uploader", "district_viewer", "national_viewer"]);

export async function POST(request: Request) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return Response.json({ error: "Falta la sesión." }, { status: 401 });
    await requireSuperAdmin(token);
    const input = await request.json();
    if (!input.email || !input.displayName || !input.password || !roles.has(input.role)) {
      return Response.json({ error: "Complete todos los datos obligatorios." }, { status: 400 });
    }
    if (input.password.length < 8) return Response.json({ error: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 });
    const national = input.role === "national_viewer";
    if (!national && (!input.districtId || !input.zoneId)) {
      return Response.json({ error: "Seleccione distrito y zona." }, { status: 400 });
    }
    const user = await createManagedUser({ ...input, scope: national ? "national" : "district", districtId: national ? "" : input.districtId, zoneId: national ? "" : input.zoneId });
    return Response.json({ user }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear el usuario.";
    return Response.json({ error: message }, { status: /autorización|Sesión/.test(message) ? 403 : 500 });
  }
}
