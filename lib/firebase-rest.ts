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

type ManagedUserInput = {
  email: string;
  displayName: string;
  password: string;
};

export type ManagedUser = {
  uid: string; email: string; displayName: string; role: string; status: string;
  scope?: string; districtId?: string; zoneId?: string;
};

export type ProformaProduct = { detail:string; volume:number; unit:string; price:number };
export type ProformaClient = {
  id:string; name:string; controlledRegistry:string; pickupPlace:string; pickupRegistries:string;
  validityDays:number; products:ProformaProduct[]; districtId:string; zoneId:string;
};

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

export async function createManagedUser(input: ManagedUserInput, adminToken: string) {
  const accountResponse = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: input.email, password: input.password, returnSecureToken: false }) },
  );
  const account = await accountResponse.json();
  if (!accountResponse.ok) {
    if (account.error?.message === "EMAIL_EXISTS") throw new Error("Ese correo ya está registrado.");
    throw new Error("No se pudo crear la cuenta de acceso.");
  }
  const fields: Record<string, object> = {
    email: { stringValue: input.email }, displayName: { stringValue: input.displayName },
    role: { stringValue: "unassigned" }, scope: { stringValue: "unassigned" },
    status: { stringValue: "pending" }, createdAt: { timestampValue: new Date().toISOString() },
  };
  const profileResponse = await fetch(
    `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/users?documentId=${account.localId}`,
    { method: "POST", headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ fields }) },
  );
  if (!profileResponse.ok) throw new Error("La cuenta se creó, pero no se pudo asignar su perfil.");
  return { uid: account.localId as string, email: input.email };
}

function fieldValue(fields: Record<string, { stringValue?: string }>, name: string) {
  return fields[name]?.stringValue || "";
}

export async function listManagedUsers(adminToken: string): Promise<ManagedUser[]> {
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/users?pageSize=100`,
    { headers: { Authorization: `Bearer ${adminToken}` } },
  );
  const result = await response.json();
  if (!response.ok) throw new Error("No se pudo cargar la lista de usuarios.");
  return (result.documents || []).map((document: { name: string; fields: Record<string, { stringValue?: string }> }) => ({
    uid: document.name.split("/").pop() || "", email: fieldValue(document.fields, "email"),
    displayName: fieldValue(document.fields, "displayName"), role: fieldValue(document.fields, "role"),
    status: fieldValue(document.fields, "status"), scope: fieldValue(document.fields, "scope"),
    districtId: fieldValue(document.fields, "districtId"), zoneId: fieldValue(document.fields, "zoneId"),
  }));
}

export async function assignManagedUser(
  uid: string,
  values: { role: string; districtId?: string; zoneId?: string },
  adminToken: string,
) {
  const national = values.role === "national_viewer";
  const fields: Record<string, object> = {
    role: { stringValue: values.role }, scope: { stringValue: national ? "national" : "district" },
    status: { stringValue: "active" }, updatedAt: { timestampValue: new Date().toISOString() },
  };
  if (!national) {
    fields.districtId = { stringValue: values.districtId || "DCCH" };
    fields.zoneId = { stringValue: values.zoneId || "sucre" };
  }
  const masks = Object.keys(fields).map(name => `updateMask.fieldPaths=${encodeURIComponent(name)}`).join("&");
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/users/${uid}?${masks}`,
    { method: "PATCH", headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ fields }) },
  );
  if (!response.ok) throw new Error("No se pudo asignar el rol.");
}

export async function loadProgrammingDays(token:string, dates:string[]) {
  const entries=await Promise.all(dates.map(async date=>{
    const id=`DCCH_sucre_${date}`;
    const response=await fetch(`https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/programmingDays/${id}`,{headers:{Authorization:`Bearer ${token}`}});
    if(response.status===404)return [date,null] as const;
    const result=await response.json();
    if(!response.ok)throw new Error("No se pudo recuperar la programación semanal.");
    return [date,JSON.parse(result.fields?.payload?.stringValue||"null")] as const;
  }));
  return Object.fromEntries(entries.filter(([,value])=>value));
}

export async function saveProgrammingDay(token:string,date:string,payload:unknown,automaticPercent:number) {
  const next=new Date(`${date}T12:00:00`);next.setDate(next.getDate()+1);
  const editableUntil=`${next.toISOString().slice(0,10)}T04:00:00.000Z`;
  const id=`DCCH_sucre_${date}`;
  const fields={districtId:{stringValue:"DCCH"},zoneId:{stringValue:"sucre"},date:{stringValue:date},editableUntil:{timestampValue:editableUntil},payload:{stringValue:JSON.stringify(payload)},automaticPercent:{integerValue:String(automaticPercent)},updatedAt:{timestampValue:new Date().toISOString()}};
  const response=await fetch(`https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/programmingDays/${id}`,{method:"PATCH",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({fields})});
  if(!response.ok)throw new Error("No se pudo guardar la programación en Firestore.");
}

export async function listProformaClients(token:string):Promise<ProformaClient[]> {
  const query={structuredQuery:{from:[{collectionId:"proformaClients"}],where:{compositeFilter:{op:"AND",filters:[{fieldFilter:{field:{fieldPath:"districtId"},op:"EQUAL",value:{stringValue:"DCCH"}}},{fieldFilter:{field:{fieldPath:"zoneId"},op:"EQUAL",value:{stringValue:"sucre"}}}]}},limit:200}};
  const response=await fetch(`https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents:runQuery`,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify(query)});
  const result=await response.json();
  if(!response.ok)throw new Error("No se pudo recuperar el registro de empresas.");
  return (result||[]).map((entry:{document?:{name:string;fields:Record<string,{stringValue?:string}>}})=>entry.document).filter(Boolean).map((document:{name:string;fields:Record<string,{stringValue?:string}>})=>{
    const payload=JSON.parse(document.fields?.payload?.stringValue||"{}");
    return {...payload,id:document.name.split("/").pop()||payload.id};
  });
}

export async function saveProformaClient(token:string,client:ProformaClient) {
  const fields={districtId:{stringValue:client.districtId},zoneId:{stringValue:client.zoneId},name:{stringValue:client.name},payload:{stringValue:JSON.stringify(client)},updatedAt:{timestampValue:new Date().toISOString()}};
  const response=await fetch(`https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/proformaClients/${client.id}`,{method:"PATCH",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({fields})});
  if(!response.ok)throw new Error("No se pudo guardar la empresa en Firestore.");
}

export async function saveIssuedProforma(token:string,id:string,client:ProformaClient,date:string,number:string) {
  const payload={client,date,number,issuedAt:new Date().toISOString()};
  const fields={districtId:{stringValue:client.districtId},zoneId:{stringValue:client.zoneId},clientId:{stringValue:client.id},date:{stringValue:date},number:{stringValue:number},payload:{stringValue:JSON.stringify(payload)},createdAt:{timestampValue:new Date().toISOString()}};
  const response=await fetch(`https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/proformas/${id}`,{method:"PATCH",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({fields})});
  if(!response.ok)throw new Error("No se pudo registrar la emisión de la proforma.");
}

export async function getNextProformaSequence(token:string,year:string):Promise<number> {
  const id=`DCCH_sucre_${year}`;
  const response=await fetch(`https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/proformaCounters/${id}`,{headers:{Authorization:`Bearer ${token}`}});
  if(response.status===404)return 1;
  const result=await response.json();
  if(!response.ok)throw new Error("No se pudo obtener el correlativo de proformas.");
  return Number(result.fields?.lastIssued?.integerValue||0)+1;
}

export async function saveProformaSequence(token:string,year:string,lastIssued:number) {
  const id=`DCCH_sucre_${year}`;
  const fields={districtId:{stringValue:"DCCH"},zoneId:{stringValue:"sucre"},year:{stringValue:year},lastIssued:{integerValue:String(lastIssued)},updatedAt:{timestampValue:new Date().toISOString()}};
  const response=await fetch(`https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/proformaCounters/${id}`,{method:"PATCH",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({fields})});
  if(!response.ok)throw new Error("La proforma se registró, pero no se pudo actualizar el correlativo.");
}
