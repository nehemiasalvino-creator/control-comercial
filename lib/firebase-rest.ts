import { firebaseConfig } from "@/lib/firebase-config";

export type SessionUser = {
  uid: string;
  email: string;
  displayName: string;
  role:
    | "super_admin"
    | "district_admin"
    | "zone_admin"
    | "district_uploader"
    | "district_viewer"
    | "national_viewer";
  scope: "national" | "district";
  districtId?: string;
  zoneId?: string;
  token: string;
};

const apiKey =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY || firebaseConfig.apiKey;

type ManagedUserInput = {
  email: string;
  displayName: string;
  password: string;
};

export type ManagedUser = {
  uid: string;
  email: string;
  displayName: string;
  role: string;
  status: string;
  scope?: string;
  districtId?: string;
  zoneId?: string;
};

export type CommercialDistrict = { id: string; code: string; name: string };
export type CommercialZone = { id: string; districtId: string; name: string };
export type ReceiptBusinessUnit = {
  id: string;
  name: string;
  type: "EESS" | "PLANTA" | "PUESTO" | "OTRO";
  districtId: string;
  zoneId: string;
  active: boolean;
};
export type ReceiptLetterSettings = {
  districtId: string;
  toName: string;
  toRole: string;
  via1Name: string;
  via1Role: string;
  via2Name: string;
  via2Role: string;
  fromName: string;
  fromRole: string;
  prefix: string;
  lastCorrelative: number;
  year: number;
};
export type OfficialReceiptDelivery = {
  id: string;
  districtId: string;
  zoneId: string;
  unitId: string;
  unitName: string;
  dates: string[];
  noMovementDates: string[];
  cashGeneralDates: string[];
  paymentVoucherDates: string[];
  letterNumber: string;
  deliveredAt: string;
  status: "delivered";
};

export type ProformaProduct = {
  detail: string;
  volume: number;
  unit: string;
  price: number;
};
export type ProformaClient = {
  id: string;
  name: string;
  controlledRegistry: string;
  pickupPlace: string;
  pickupRegistries: string;
  validityDays: number;
  products: ProformaProduct[];
  districtId: string;
  zoneId: string;
};

export async function signIn(
  email: string,
  password: string,
): Promise<SessionUser> {
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
  if (!profileResponse.ok)
    throw new Error("La cuenta no tiene un perfil autorizado.");
  const fields = profile.fields || {};
  const value = (name: string) =>
    fields[name]?.stringValue as string | undefined;
  if (value("status") !== "active")
    throw new Error("Esta cuenta está suspendida.");

  return {
    uid: result.localId,
    email: value("email") || result.email,
    displayName:
      value("displayName") || result.displayName || result.email.split("@")[0],
    role: value("role") as SessionUser["role"],
    scope: value("scope") as SessionUser["scope"],
    districtId: value("districtId"),
    zoneId: value("zoneId"),
    token: result.idToken,
  };
}

export async function createManagedUser(
  input: ManagedUserInput,
  adminToken: string,
) {
  const accountResponse = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: input.email,
        password: input.password,
        returnSecureToken: false,
      }),
    },
  );
  const account = await accountResponse.json();
  if (!accountResponse.ok) {
    if (account.error?.message === "EMAIL_EXISTS")
      throw new Error("Ese correo ya está registrado.");
    throw new Error("No se pudo crear la cuenta de acceso.");
  }
  const fields: Record<string, object> = {
    email: { stringValue: input.email },
    displayName: { stringValue: input.displayName },
    role: { stringValue: "unassigned" },
    scope: { stringValue: "unassigned" },
    status: { stringValue: "pending" },
    createdAt: { timestampValue: new Date().toISOString() },
  };
  const profileResponse = await fetch(
    `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/users?documentId=${account.localId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    },
  );
  if (!profileResponse.ok)
    throw new Error("La cuenta se creó, pero no se pudo asignar su perfil.");
  return { uid: account.localId as string, email: input.email };
}

function fieldValue(
  fields: Record<string, { stringValue?: string }>,
  name: string,
) {
  return fields[name]?.stringValue || "";
}

export async function listManagedUsers(
  adminToken: string,
): Promise<ManagedUser[]> {
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/users?pageSize=100`,
    { headers: { Authorization: `Bearer ${adminToken}` } },
  );
  const result = await response.json();
  if (!response.ok) throw new Error("No se pudo cargar la lista de usuarios.");
  return (result.documents || []).map(
    (document: {
      name: string;
      fields: Record<string, { stringValue?: string }>;
    }) => ({
      uid: document.name.split("/").pop() || "",
      email: fieldValue(document.fields, "email"),
      displayName: fieldValue(document.fields, "displayName"),
      role: fieldValue(document.fields, "role"),
      status: fieldValue(document.fields, "status"),
      scope: fieldValue(document.fields, "scope"),
      districtId: fieldValue(document.fields, "districtId"),
      zoneId: fieldValue(document.fields, "zoneId"),
    }),
  );
}

export async function assignManagedUser(
  uid: string,
  values: { role: string; districtId?: string; zoneId?: string },
  adminToken: string,
) {
  const national = values.role === "national_viewer";
  const fields: Record<string, object> = {
    role: { stringValue: values.role },
    scope: { stringValue: national ? "national" : "district" },
    status: { stringValue: "active" },
    updatedAt: { timestampValue: new Date().toISOString() },
  };
  if (!national) {
    fields.districtId = { stringValue: values.districtId || "DCCH" };
    fields.zoneId = {
      stringValue:
        values.role === "district_admin" || values.role === "district_viewer"
          ? ""
          : values.zoneId || "sucre",
    };
  }
  const masks = Object.keys(fields)
    .map((name) => `updateMask.fieldPaths=${encodeURIComponent(name)}`)
    .join("&");
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/users/${uid}?${masks}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    },
  );
  if (!response.ok) throw new Error("No se pudo asignar el rol.");
}

function documentFields(document: {
  name: string;
  fields?: Record<string, { stringValue?: string }>;
}) {
  const fields = document.fields || {};
  return {
    id: fieldValue(fields, "id") || document.name.split("/").pop() || "",
    code: fieldValue(fields, "code"),
    name: fieldValue(fields, "name"),
    districtId: fieldValue(fields, "districtId"),
  };
}

export async function listCommercialDistricts(
  token: string,
): Promise<CommercialDistrict[]> {
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/districts?pageSize=100`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (response.status === 404)
    return [{ id: "DCCH", code: "DCCH", name: "Chuquisaca" }];
  const result = await response.json();
  if (!response.ok) throw new Error("No se pudieron cargar los distritos.");
  const rows = (result.documents || []).map(
    documentFields,
  ) as CommercialDistrict[];
  return [
    { id: "DCCH", code: "DCCH", name: "Chuquisaca" },
    ...rows.filter((row) => row.id !== "DCCH"),
  ];
}

export async function saveCommercialDistrict(
  token: string,
  district: CommercialDistrict,
) {
  const id = district.code.trim().toUpperCase(),
    fields = {
      code: { stringValue: id },
      name: { stringValue: district.name.trim() },
      createdAt: { timestampValue: new Date().toISOString() },
    };
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/districts/${id}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    },
  );
  if (!response.ok) throw new Error("No se pudo crear el distrito.");
  return { ...district, id, code: id };
}

export async function listCommercialZones(
  token: string,
): Promise<CommercialZone[]> {
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/zones?pageSize=200`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (response.status === 404)
    return [
      { id: "sucre", districtId: "DCCH", name: "Sucre" },
      { id: "monteagudo", districtId: "DCCH", name: "Monteagudo" },
    ];
  const result = await response.json();
  if (!response.ok)
    throw new Error("No se pudieron cargar las zonas comerciales.");
  const rows = (result.documents || []).map(documentFields) as CommercialZone[];
  const defaults = [
    { id: "sucre", districtId: "DCCH", name: "Sucre" },
    { id: "monteagudo", districtId: "DCCH", name: "Monteagudo" },
  ];
  return [
    ...defaults,
    ...rows.filter(
      (row) =>
        !defaults.some(
          (item) => item.id === row.id && item.districtId === row.districtId,
        ),
    ),
  ];
}

export async function saveCommercialZone(token: string, zone: CommercialZone) {
  const slug = zone.id
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const documentId = `${zone.districtId}_${slug}`,
    fields = {
      id: { stringValue: slug },
      districtId: { stringValue: zone.districtId },
      name: { stringValue: zone.name.trim() },
      createdAt: { timestampValue: new Date().toISOString() },
    };
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/zones/${documentId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    },
  );
  if (!response.ok) throw new Error("No se pudo crear la zona comercial.");
  return { ...zone, id: slug };
}

const defaultReceiptUnits: ReceiptBusinessUnit[] = [
  {
    id: "eess-camargo",
    name: "EESS Camargo",
    type: "EESS",
    districtId: "DCCH",
    zoneId: "sucre",
    active: true,
  },
  {
    id: "eess-el-tejar",
    name: "EESS El Tejar",
    type: "EESS",
    districtId: "DCCH",
    zoneId: "sucre",
    active: true,
  },
  {
    id: "eess-los-sauces",
    name: "EESS Los Sauces",
    type: "EESS",
    districtId: "DCCH",
    zoneId: "monteagudo",
    active: true,
  },
  {
    id: "eess-monteagudo",
    name: "EESS Monteagudo",
    type: "EESS",
    districtId: "DCCH",
    zoneId: "monteagudo",
    active: true,
  },
  {
    id: "eess-muyupampa",
    name: "EESS Muyupampa",
    type: "EESS",
    districtId: "DCCH",
    zoneId: "monteagudo",
    active: true,
  },
  {
    id: "eess-ostria-gutierrez",
    name: "EESS Ostria Gutiérrez",
    type: "EESS",
    districtId: "DCCH",
    zoneId: "sucre",
    active: true,
  },
  {
    id: "eess-padcoyo",
    name: "EESS Padcoyo",
    type: "EESS",
    districtId: "DCCH",
    zoneId: "sucre",
    active: true,
  },
  {
    id: "eess-tarabuquillo",
    name: "EESS Tarabuquillo",
    type: "EESS",
    districtId: "DCCH",
    zoneId: "sucre",
    active: true,
  },
  {
    id: "eess-villa-serrano",
    name: "EESS Villa Serrano",
    type: "EESS",
    districtId: "DCCH",
    zoneId: "sucre",
    active: true,
  },
  {
    id: "planta-camargo",
    name: "Planta Camargo",
    type: "PLANTA",
    districtId: "DCCH",
    zoneId: "sucre",
    active: true,
  },
  {
    id: "puesto-venta-huacaya",
    name: "Puesto de Venta Huacaya",
    type: "PUESTO",
    districtId: "DCCH",
    zoneId: "monteagudo",
    active: true,
  },
  {
    id: "punto-urea-sucre",
    name: "Punto de Urea Sucre",
    type: "PUESTO",
    districtId: "DCCH",
    zoneId: "sucre",
    active: true,
  },
  {
    id: "zona-monteagudo",
    name: "Zona Monteagudo",
    type: "OTRO",
    districtId: "DCCH",
    zoneId: "monteagudo",
    active: true,
  },
  {
    id: "zona-sucre",
    name: "Zona Sucre",
    type: "OTRO",
    districtId: "DCCH",
    zoneId: "sucre",
    active: true,
  },
];

export async function listReceiptBusinessUnits(
  token: string,
  districtId = "DCCH",
  zoneId?: string,
): Promise<ReceiptBusinessUnit[]> {
  const filters = [
    {
      fieldFilter: {
        field: { fieldPath: "districtId" },
        op: "EQUAL",
        value: { stringValue: districtId },
      },
    },
  ];
  if (zoneId)
    filters.push({
      fieldFilter: {
        field: { fieldPath: "zoneId" },
        op: "EQUAL",
        value: { stringValue: zoneId },
      },
    });
  const where =
    filters.length === 1
      ? filters[0]
      : { compositeFilter: { op: "AND", filters } };
  const query = {
    structuredQuery: {
      from: [{ collectionId: "receiptBusinessUnits" }],
      where,
      limit: 200,
    },
  };
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents:runQuery`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(query),
    },
  );
  const result = await response.json();
  if (!response.ok)
    throw new Error("No se pudieron cargar las unidades de negocio.");
  const saved = (result || [])
    .map(
      (entry: {
        document?: {
          name: string;
          fields?: Record<string, { stringValue?: string }>;
        };
      }) => entry.document,
    )
    .filter(Boolean)
    .map(
      (document: {
        name: string;
        fields?: Record<string, { stringValue?: string }>;
      }) => JSON.parse(document.fields?.payload?.stringValue || "{}"),
    ) as ReceiptBusinessUnit[];
  const defaults = defaultReceiptUnits.filter(
    (unit) =>
      unit.districtId === districtId && (!zoneId || unit.zoneId === zoneId),
  );
  return [
    ...defaults.filter((unit) => !saved.some((item) => item.id === unit.id)),
    ...saved,
  ]
    .filter((unit) => unit.active !== false)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function saveReceiptBusinessUnit(
  token: string,
  unit: ReceiptBusinessUnit,
) {
  const fields = {
    districtId: { stringValue: unit.districtId },
    zoneId: { stringValue: unit.zoneId },
    name: { stringValue: unit.name },
    payload: { stringValue: JSON.stringify(unit) },
    updatedAt: { timestampValue: new Date().toISOString() },
  };
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/receiptBusinessUnits/${unit.districtId}_${unit.zoneId}_${unit.id}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    },
  );
  if (!response.ok) throw new Error("No se pudo guardar la unidad de negocio.");
}

export async function getReceiptLetterSettings(
  token: string,
  districtId = "DCCH",
): Promise<ReceiptLetterSettings> {
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/receiptSettings/${districtId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (response.status === 404)
    return {
      districtId,
      toName: "Lic. Karen Eguez Prada",
      toRole: "Encargada de Contabilidad",
      via1Name: "Jefe de la Unidad Distrital Comercial",
      via1Role: "JEFATURA DE UNIDAD",
      via2Name: "Responsable Administrativo",
      via2Role: "ÁREA ADMINISTRATIVA",
      fromName: "Encargado de Estaciones de Servicio",
      fromRole: "UNIDAD DISTRITAL COMERCIAL",
      prefix: `YPFB/${districtId}/UDC-ES`,
      lastCorrelative: 0,
      year: new Date().getFullYear(),
    };
  const result = await response.json();
  if (!response.ok)
    throw new Error("No se pudo cargar la configuración de cartas.");
  return JSON.parse(result.fields?.payload?.stringValue || "{}");
}

export async function saveReceiptLetterSettings(
  token: string,
  settings: ReceiptLetterSettings,
) {
  const fields = {
    districtId: { stringValue: settings.districtId },
    payload: { stringValue: JSON.stringify(settings) },
    updatedAt: { timestampValue: new Date().toISOString() },
  };
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/receiptSettings/${settings.districtId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    },
  );
  if (!response.ok)
    throw new Error("No se pudo guardar la configuración de la carta.");
}

export async function listOfficialReceiptDeliveries(
  token: string,
  districtId: string,
  month: string,
  zoneId?: string,
): Promise<OfficialReceiptDelivery[]> {
  const filters = [
    {
      fieldFilter: {
        field: { fieldPath: "districtId" },
        op: "EQUAL",
        value: { stringValue: districtId },
      },
    },
    {
      fieldFilter: {
        field: { fieldPath: "month" },
        op: "EQUAL",
        value: { stringValue: month },
      },
    },
  ];
  if (zoneId)
    filters.push({
      fieldFilter: {
        field: { fieldPath: "zoneId" },
        op: "EQUAL",
        value: { stringValue: zoneId },
      },
    });
  const query = {
    structuredQuery: {
      from: [{ collectionId: "officialReceiptDeliveries" }],
      where: { compositeFilter: { op: "AND", filters } },
      limit: 500,
    },
  };
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents:runQuery`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(query),
    },
  );
  const result = await response.json();
  if (!response.ok)
    throw new Error("No se pudo cargar el seguimiento mensual.");
  return (result || [])
    .map(
      (entry: {
        document?: { fields?: Record<string, { stringValue?: string }> };
      }) => entry.document,
    )
    .filter(Boolean)
    .map((document: { fields?: Record<string, { stringValue?: string }> }) =>
      JSON.parse(document.fields?.payload?.stringValue || "{}"),
    );
}

export async function saveOfficialReceiptDelivery(
  token: string,
  delivery: OfficialReceiptDelivery,
) {
  const month =
      delivery.dates[0]?.slice(0, 7) || delivery.deliveredAt.slice(0, 7),
    fields = {
      districtId: { stringValue: delivery.districtId },
      zoneId: { stringValue: delivery.zoneId },
      month: { stringValue: month },
      unitId: { stringValue: delivery.unitId },
      payload: { stringValue: JSON.stringify(delivery) },
      updatedAt: { timestampValue: new Date().toISOString() },
    };
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/officialReceiptDeliveries/${delivery.id}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    },
  );
  if (!response.ok)
    throw new Error("No se pudo registrar la entrega de recibos oficiales.");
}

export async function loadProgrammingDays(
  token: string,
  dates: string[],
  districtId = "DCCH",
  zoneId = "sucre",
) {
  const entries = await Promise.all(
    dates.map(async (date) => {
      const id = `${districtId}_${zoneId}_${date}`;
      const response = await fetch(
        `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/programmingDays/${id}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (response.status === 404) return [date, null] as const;
      const result = await response.json();
      if (!response.ok)
        throw new Error("No se pudo recuperar la programación semanal.");
      return [
        date,
        JSON.parse(result.fields?.payload?.stringValue || "null"),
      ] as const;
    }),
  );
  return Object.fromEntries(entries.filter(([, value]) => value));
}

export async function saveProgrammingDay(
  token: string,
  date: string,
  payload: unknown,
  automaticPercent: number,
  districtId = "DCCH",
  zoneId = "sucre",
  reopenJustification = "",
  reopenedBy = "",
) {
  const next = new Date(`${date}T12:00:00`);
  next.setDate(next.getDate() + 1);
  const editableUntil = `${next.toISOString().slice(0, 10)}T04:00:00.000Z`;
  const id = `${districtId}_${zoneId}_${date}`;
  const fields: Record<
    string,
    { stringValue?: string; timestampValue?: string; integerValue?: string }
  > = {
    districtId: { stringValue: districtId },
    zoneId: { stringValue: zoneId },
    date: { stringValue: date },
    editableUntil: { timestampValue: editableUntil },
    payload: { stringValue: JSON.stringify(payload) },
    automaticPercent: { integerValue: String(automaticPercent) },
    updatedAt: { timestampValue: new Date().toISOString() },
  };
  if (reopenJustification) {
    fields.reopenJustification = { stringValue: reopenJustification };
    fields.reopenedBy = { stringValue: reopenedBy };
    fields.reopenedAt = { timestampValue: new Date().toISOString() };
  }
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/programmingDays/${id}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    },
  );
  if (!response.ok)
    throw new Error("No se pudo guardar la programación en Firestore.");
}

export async function listProformaClients(
  token: string,
): Promise<ProformaClient[]> {
  const query = {
    structuredQuery: {
      from: [{ collectionId: "proformaClients" }],
      where: {
        compositeFilter: {
          op: "AND",
          filters: [
            {
              fieldFilter: {
                field: { fieldPath: "districtId" },
                op: "EQUAL",
                value: { stringValue: "DCCH" },
              },
            },
            {
              fieldFilter: {
                field: { fieldPath: "zoneId" },
                op: "EQUAL",
                value: { stringValue: "sucre" },
              },
            },
          ],
        },
      },
      limit: 200,
    },
  };
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents:runQuery`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(query),
    },
  );
  const result = await response.json();
  if (!response.ok)
    throw new Error("No se pudo recuperar el registro de empresas.");
  return (result || [])
    .map(
      (entry: {
        document?: {
          name: string;
          fields: Record<string, { stringValue?: string }>;
        };
      }) => entry.document,
    )
    .filter(Boolean)
    .map(
      (document: {
        name: string;
        fields: Record<string, { stringValue?: string }>;
      }) => {
        const payload = JSON.parse(
          document.fields?.payload?.stringValue || "{}",
        );
        return { ...payload, id: document.name.split("/").pop() || payload.id };
      },
    );
}

export async function saveProformaClient(
  token: string,
  client: ProformaClient,
) {
  const fields = {
    districtId: { stringValue: client.districtId },
    zoneId: { stringValue: client.zoneId },
    name: { stringValue: client.name },
    payload: { stringValue: JSON.stringify(client) },
    updatedAt: { timestampValue: new Date().toISOString() },
  };
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/proformaClients/${client.id}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    },
  );
  if (!response.ok)
    throw new Error("No se pudo guardar la empresa en Firestore.");
}

export async function saveIssuedProforma(
  token: string,
  id: string,
  client: ProformaClient,
  date: string,
  number: string,
) {
  const payload = { client, date, number, issuedAt: new Date().toISOString() };
  const fields = {
    districtId: { stringValue: client.districtId },
    zoneId: { stringValue: client.zoneId },
    clientId: { stringValue: client.id },
    date: { stringValue: date },
    number: { stringValue: number },
    payload: { stringValue: JSON.stringify(payload) },
    createdAt: { timestampValue: new Date().toISOString() },
  };
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/proformas/${id}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    },
  );
  if (!response.ok)
    throw new Error("No se pudo registrar la emisión de la proforma.");
}

export async function getIssuedProformaNumber(
  token: string,
  clientId: string,
  date: string,
): Promise<string | null> {
  const id = `DCCH_sucre_${clientId}_${date}`;
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/proformas/${id}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (response.status === 404) return null;
  const result = await response.json();
  if (!response.ok)
    throw new Error("No se pudo verificar si la proforma ya fue emitida.");
  return result.fields?.number?.stringValue || null;
}

export async function getNextProformaSequence(
  token: string,
  year: string,
): Promise<number> {
  const id = `DCCH_sucre_${year}`;
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/proformaCounters/${id}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (response.status === 404) return 1;
  const result = await response.json();
  if (!response.ok)
    throw new Error("No se pudo obtener el correlativo de proformas.");
  return Number(result.fields?.lastIssued?.integerValue || 0) + 1;
}

export async function saveProformaSequence(
  token: string,
  year: string,
  lastIssued: number,
) {
  const id = `DCCH_sucre_${year}`;
  const fields = {
    districtId: { stringValue: "DCCH" },
    zoneId: { stringValue: "sucre" },
    year: { stringValue: year },
    lastIssued: { integerValue: String(lastIssued) },
    updatedAt: { timestampValue: new Date().toISOString() },
  };
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/proformaCounters/${id}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    },
  );
  if (!response.ok)
    throw new Error(
      "La proforma se registró, pero no se pudo actualizar el correlativo.",
    );
}
