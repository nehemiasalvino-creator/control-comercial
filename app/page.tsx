"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  assignManagedUser,
  CommercialDistrict,
  CommercialZone,
  createManagedUser,
  getIssuedProformaNumber,
  getNextProformaSequence,
  listCommercialDistricts,
  listCommercialZones,
  listManagedUsers,
  listProformaClients,
  loadProgrammingDays,
  ManagedUser,
  ProformaClient,
  saveCommercialDistrict,
  saveCommercialZone,
  saveIssuedProforma,
  saveProformaClient,
  saveProformaSequence,
  saveProgrammingDay,
  SessionUser,
  signIn,
} from "@/lib/firebase-rest";
import { parseDispatchPdf } from "@/lib/pdf-dispatch";
import OfficialReceipts from "./official-receipts";
import "./proforma.css";

type Module =
  | "mayoreo"
  | "propias"
  | "expira"
  | "cargas"
  | "programaciones"
  | "proformas"
  | "recibos"
  | "usuarios";

const programmingClients = [
  {
    name: "EE.SS. Mariscal Sucre",
    category: "station",
    diesel: 20000,
    gas: 1600,
    compartments: [5000, 5000, 10000],
  },
  {
    name: "E.S. Azari",
    category: "station",
    diesel: 8750,
    gas: 8000,
    compartments: [12500, 12500],
  },
  {
    name: "EOSO El Morro",
    category: "station",
    diesel: 28567,
    gas: 8750,
    compartments: [12500, 12500],
  },
  {
    name: "EOSO Juana Azurduy",
    category: "station",
    diesel: 0,
    gas: 21200,
    compartments: [12500, 6000, 5500],
  },
  {
    name: "EOSO María Alejandra",
    category: "station",
    diesel: 7200,
    gas: 2533,
    compartments: [12000, 8000, 4000],
  },
  {
    name: "EOSO Mesa Verde",
    category: "station",
    diesel: 16500,
    gas: 12500,
    compartments: [5000, 5000, 10000],
  },
  {
    name: "EOSO Nayler",
    category: "station",
    diesel: 18033,
    gas: 22000,
    compartments: [12500, 6000, 5500],
  },
  {
    name: "EOSO Oqharikuna SRL",
    category: "station",
    diesel: 16667,
    gas: 16333,
    compartments: [20000, 15000],
  },
  {
    name: "EOSO San Antonio",
    category: "station",
    diesel: 8333,
    gas: 39167,
    compartments: [10000, 5000, 5000],
  },
  {
    name: "EOSO Trébol SRL",
    category: "station",
    diesel: 24400,
    gas: 17200,
    compartments: [12000, 8000, 4000],
  },
  {
    name: "EESS Ostria Gutiérrez · YPFB",
    category: "station",
    diesel: 5523,
    gas: 10099,
    compartments: [12000, 7500, 4500],
  },
  {
    name: "EESS El Tejar · YPFB",
    category: "station",
    diesel: 7934,
    gas: 9226,
    compartments: [12000, 7500, 4500],
  },
  {
    name: "EOSO Aiquile",
    category: "station",
    diesel: 4427,
    gas: 11823,
    compartments: [16300, 11300, 4900],
  },
  {
    name: "E.S. Buen Retiro · Padilla",
    category: "station",
    diesel: 4200,
    gas: 4333,
    compartments: [12000, 8000, 4000],
  },
  {
    name: "EOSO Murillo · Zudáñez",
    category: "station",
    diesel: 4267,
    gas: 4733,
    compartments: [12000, 8000, 4000],
  },
  {
    name: "E.S. Pujllay · Tarabuco",
    category: "station",
    diesel: 4350,
    gas: 3650,
    compartments: [13500, 10500],
  },
  {
    name: "EESS Tarabuquillo · YPFB",
    category: "station",
    diesel: 1652,
    gas: 1919,
    compartments: [12000, 7500, 4500],
  },
  {
    name: "EESS Serrano · YPFB",
    category: "station",
    diesel: 1109,
    gas: 2533,
    compartments: [12000, 7500, 4500],
  },
  ...[
    "FANCESSA",
    "SEDCAM",
    "China Harbour",
    "San Lucas",
    "Ravelo",
    "SERMISUD",
    "ENDE Guaracachi",
    "Alcaldía de Ravelo",
    "Raúl Pozo",
    "EBC",
    "Yellow",
    "Alcaldía de Sucre",
    "Planta Monteagudo",
    "Colquechaca",
  ].map((name) => ({
    name,
    category: "direct",
    diesel: 0,
    gas: 0,
    compartments: [],
  })),
];

const monteagudoClients = [
  {
    name: "EOSO Coop. San José Obrero · Monteagudo",
    category: "station",
    diesel: 8000,
    gas: 12000,
    compartments: [8000, 12000],
  },
  {
    name: "EESS Sauces · YPFB · Monteagudo",
    category: "station",
    diesel: 10000,
    gas: 0,
    compartments: [10000],
  },
  {
    name: "EESS Monteagudo · YPFB",
    category: "station",
    diesel: 10000,
    gas: 0,
    compartments: [10000],
  },
  {
    name: "EESS Muyupampa · YPFB · Monteagudo",
    category: "station",
    diesel: 8000,
    gas: 12000,
    compartments: [8000, 12000],
  },
  {
    name: "Servicio Departamental de Caminos · Monteagudo",
    category: "direct",
    diesel: 0,
    gas: 0,
    compartments: [],
  },
];

const monthly = [
  { month: "Ene", gas: 1510, diesel: 998 },
  { month: "Feb", gas: 1442, diesel: 820 },
  { month: "Mar", gas: 1632, diesel: 1010 },
  { month: "Abr", gas: 1536, diesel: 1000 },
  { month: "May", gas: 1460, diesel: 1146 },
  { month: "Jun", gas: 1235, diesel: 1159 },
  { month: "Jul", gas: 1626, diesel: 1722 },
  { month: "Ago", gas: 300, diesel: 358 },
];

const stations = [
  ["Ostria Gutiérrez", "2.580.840", "1.210.062", "Bs 29,4 MM", "1 alerta"],
  ["El Tejar", "2.445.290", "1.710.310", "Bs 34,1 MM", "2 alertas"],
  ["Padcoyo", "1.296.509", "1.281.534", "Bs 21,6 MM", "Al día"],
  ["Camargo", "1.073.332", "843.608", "Bs 15,8 MM", "1 alerta"],
  ["Los Sauces", "772.865", "956.176", "Bs 14,8 MM", "Al día"],
];

const documents = [
  {
    station: "E.S. El Tejar",
    document: "Licencia de operación",
    expiry: "18/09/2026",
    days: 30,
    state: "Próximo",
  },
  {
    station: "E.S. Ostria Gutiérrez",
    document: "Certificado de calibración",
    expiry: "02/10/2026",
    days: 44,
    state: "Próximo",
  },
  {
    station: "Domigas Ltda.",
    document: "Póliza de seguro",
    expiry: "10/08/2026",
    days: -9,
    state: "Vencido",
  },
  {
    station: "E.S. Padcoyo",
    document: "Licencia ambiental",
    expiry: "15/12/2026",
    days: 118,
    state: "Vigente",
  },
];

function Icon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    chart: (
      <>
        <path d="M4 19V9" />
        <path d="M10 19V5" />
        <path d="M16 19v-7" />
        <path d="M22 19H2" />
      </>
    ),
    station: (
      <>
        <path d="M4 21V5l8-3 8 3v16" />
        <path d="M9 9h6M9 13h6M9 17h6" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V4M8 8l4-4 4 4" />
        <path d="M4 15v5h16v-5" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    home: (
      <>
        <path d="M3 11l9-8 9 8" />
        <path d="M5 10v11h14V10" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    receipt: (
      <>
        <path d="M6 2h12v20l-3-2-3 2-3-2-3 2Z" />
        <path d="M9 7h6M9 11h6M9 15h4" />
      </>
    ),
  };
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      {paths[name]}
    </svg>
  );
}

export default function Home() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [module, setModule] = useState<Module>("mayoreo");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      setUser(
        await signIn(String(data.get("email")), String(data.get("password"))),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo ingresar.");
    } finally {
      setBusy(false);
    }
  }

  if (!user) return <Login onSubmit={login} error={error} busy={busy} />;

  const initials = user.displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0])
    .join("")
    .toUpperCase();
  const scopeLabel =
    user.scope === "national"
      ? "Nacional"
      : `${user.districtId || "DCCH"} · ${user.zoneId || "Sucre"}`;

  const titles: Record<Module, [string, string]> = {
    mayoreo: [
      "Movimiento Mayorista",
      "Ventas, transferencias y cumplimiento PRODE",
    ],
    propias: [
      "Estaciones propias",
      "Ventas, recaudaciones y depósitos de DCCH",
    ],
    expira: ["EXPIRA", "Seguimiento documental y alertas de vencimiento"],
    cargas: [
      "Centro de cargas",
      "Actualización segura de información operativa",
    ],
    programaciones: [
      "Programaciones",
      "Asignación diaria automática y publicación a clientes",
    ],
    proformas: [
      "Proformas",
      "Registro permanente de empresas y emisión mensual",
    ],
    recibos: [
      "Recibos oficiales",
      "Arqueos diarios, cartas de entrega y control mensual",
    ],
    usuarios: [
      "Administración de usuarios",
      "Cuentas, roles y ámbitos de acceso",
    ],
  };
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">CC</span>
          <div>
            <strong>Control Comercial</strong>
            <small>YPFB · DCCH</small>
          </div>
        </div>
        <nav>
          <Nav
            active={module === "mayoreo"}
            onClick={() => setModule("mayoreo")}
            icon="chart"
          >
            MOV Mayoreo
          </Nav>
          <Nav
            active={module === "propias"}
            onClick={() => setModule("propias")}
            icon="station"
          >
            Estaciones propias
          </Nav>
          <Nav
            active={module === "expira"}
            onClick={() => setModule("expira")}
            icon="clock"
          >
            EXPIRA
          </Nav>
          <Nav
            active={module === "cargas"}
            onClick={() => setModule("cargas")}
            icon="upload"
          >
            Centro de cargas
          </Nav>
          {(user.role === "super_admin" ||
            user.role === "district_admin" ||
            user.role === "zone_admin" ||
            user.role === "district_uploader" ||
            user.role === "district_viewer" ||
            user.role === "national_viewer") && (
            <Nav
              active={module === "programaciones"}
              onClick={() => setModule("programaciones")}
              icon="calendar"
            >
              Programaciones
            </Nav>
          )}
          {(user.role === "super_admin" ||
            user.role === "district_uploader") && (
            <Nav
              active={module === "proformas"}
              onClick={() => setModule("proformas")}
              icon="station"
            >
              Proformas
            </Nav>
          )}
          <Nav
            active={module === "recibos"}
            onClick={() => setModule("recibos")}
            icon="receipt"
          >
            Recibos oficiales
          </Nav>
          {user.role === "super_admin" && (
            <Nav
              active={module === "usuarios"}
              onClick={() => setModule("usuarios")}
              icon="users"
            >
              Usuarios
            </Nav>
          )}
        </nav>
        <div className="scope">
          <small>ÁMBITO ACTIVO</small>
          <strong>{scopeLabel}</strong>
          <span>
            {user.role === "super_admin"
              ? "Superadministración"
              : "Acceso autorizado"}
          </span>
        </div>
        <button className="profile" onClick={() => setUser(null)}>
          <span>{initials}</span>
          <div>
            <strong>{user.displayName}</strong>
            <small>Cerrar sesión</small>
          </div>
        </button>
      </aside>
      <section className="content">
        <header className="topbar">
          <div>
            <p>
              {user.scope === "national"
                ? "Control Comercial Nacional"
                : "Distrito Comercial Chuquisaca"}
            </p>
            <h1>{titles[module][0]}</h1>
            <span>{titles[module][1]}</span>
          </div>
          <div className="top-actions">
            <button className="period">Enero – Agosto 2026⌄</button>
            <button className="avatar">{initials}</button>
          </div>
        </header>
        {module === "mayoreo" && <Mayoreo />}
        {module === "propias" && <Propias />}
        {module === "expira" && <Expira />}
        {module === "cargas" && <Cargas />}
        {module === "programaciones" &&
          (user.role === "super_admin" ||
            user.role === "district_admin" ||
            user.role === "zone_admin" ||
            user.role === "district_uploader" ||
            user.role === "district_viewer" ||
            user.role === "national_viewer") && <Programaciones user={user} />}
        {module === "proformas" &&
          (user.role === "super_admin" ||
            user.role === "district_uploader") && (
            <Proformas token={user.token} />
          )}
        {module === "recibos" && <OfficialReceipts user={user} />}
        {module === "usuarios" && user.role === "super_admin" && (
          <Usuarios token={user.token} />
        )}
      </section>
    </main>
  );
}

function Login({
  onSubmit,
  error,
  busy,
}: {
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  error: string;
  busy: boolean;
}) {
  return (
    <main className="login-page">
      <section className="login-visual">
        <div className="login-logo">CC</div>
        <div className="visual-copy">
          <span>CONTROL COMERCIAL</span>
          <h1>
            Información precisa.
            <br />
            Decisiones oportunas.
          </h1>
          <p>
            Ventas, abastecimiento y cumplimiento operativo en una sola
            plataforma nacional.
          </p>
        </div>
        <div className="grid-lines" />
      </section>
      <section className="login-panel">
        <form onSubmit={onSubmit}>
          <div className="mobile-logo">CC</div>
          <span className="eyebrow">ACCESO INSTITUCIONAL</span>
          <h2>Bienvenido</h2>
          <p>Ingrese con su cuenta autorizada.</p>
          <label>
            Correo electrónico
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Contraseña
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          {error && <div className="error">{error}</div>}
          <button className="primary" disabled={busy}>
            {busy ? "Verificando…" : "Ingresar al sistema"}
          </button>
          <small className="demo">
            Acceso exclusivo para usuarios autorizados.
          </small>
        </form>
      </section>
    </main>
  );
}

function Nav({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <button className={active ? "nav active" : "nav"} onClick={onClick}>
      <Icon name={icon} />
      {children}
    </button>
  );
}

function Filters() {
  return (
    <div className="filters">
      <button>DCCH · Sucre⌄</button>
      <button>Todos los clientes⌄</button>
      <button>Todos los productos⌄</button>
      <button>Privados + propios⌄</button>
    </div>
  );
}

function Kpi({
  label,
  value,
  note,
  tone = "blue",
}: {
  label: string;
  value: string;
  note: string;
  tone?: string;
}) {
  return (
    <article className={`kpi ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function Mayoreo() {
  return (
    <>
      <Filters />
      <section className="kpi-grid">
        <Kpi
          label="VOLUMEN TOTAL"
          value="163,9 MM L"
          note="Gasolina + diésel + GLP"
        />
        <Kpi
          label="CUMPLIMIENTO PRODE"
          value="96,8%"
          note="▲ 2,4% sobre el mes anterior"
          tone="green"
        />
        <Kpi
          label="OPERACIONES"
          value="14.220"
          note="12.379 ventas · 1.841 transferencias"
          tone="violet"
        />
        <Kpi
          label="ALERTAS ACTIVAS"
          value="7"
          note="3 requieren atención hoy"
          tone="amber"
        />
      </section>
      <section className="dashboard-grid">
        <article className="card wide">
          <CardHead
            title="Evolución mensual de despachos"
            subtitle="Miles de litros · privados y estaciones propias"
          />
          <BarChart />
        </article>
        <article className="card">
          <CardHead
            title="Cumplimiento por producto"
            subtitle="Despacho acumulado frente al PRODE"
          />
          <Donuts />
        </article>
        <article className="card wide">
          <CardHead
            title="Clientes y destinos destacados"
            subtitle="Clasificación comercial consolidada"
          />
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Clasificación</th>
                <th>Producto</th>
                <th>Volumen</th>
                <th>Participación</th>
              </tr>
            </thead>
            <tbody>
              {[
                [
                  "E.S. San Antonio",
                  "EESS privada",
                  "Gasolina",
                  "18,4 MM L",
                  "12,1%",
                ],
                [
                  "Funda Gas",
                  "Distribuidora GLP",
                  "GLP 10 kg",
                  "4,2 MM kg",
                  "9,8%",
                ],
                ["E.S. Nayler", "EESS privada", "Diésel", "12,7 MM L", "8,6%"],
                [
                  "E.S. El Tejar",
                  "Estación propia",
                  "Mixto",
                  "4,2 MM L",
                  "6,4%",
                ],
              ].map((r) => (
                <tr key={r[0]}>
                  {r.map((v, i) => (
                    <td key={i}>
                      {i === 1 ? <span className="tag">{v}</span> : v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </article>
        <article className="card">
          <CardHead
            title="Alertas operativas"
            subtitle="Seguimiento automático"
          />
          <Alert
            tone="red"
            title="Diésel bajo programación"
            text="89,2% de cumplimiento acumulado"
          />
          <Alert
            tone="amber"
            title="3 clientes sin movimiento"
            text="Más de 5 días hábiles"
          />
          <Alert
            tone="blue"
            title="Carga actualizada"
            text="Despachos · 18 ago 2026"
          />
        </article>
      </section>
    </>
  );
}

function Propias() {
  return (
    <>
      <div className="filters">
        <button>DCCH · Todas las estaciones⌄</button>
        <button>Todos los productos⌄</button>
        <button>Acumulado 2026⌄</button>
      </div>
      <section className="kpi-grid">
        <Kpi
          label="RECAUDACIÓN"
          value="Bs 160,0 MM"
          note="Importe registrado hasta agosto"
        />
        <Kpi
          label="VENTA GASOLINA"
          value="10,72 MM L"
          note="10 estaciones propias"
          tone="green"
        />
        <Kpi
          label="VENTA DIÉSEL"
          value="8,20 MM L"
          note="Acumulado del periodo"
          tone="violet"
        />
        <Kpi
          label="DEPÓSITOS EN ALERTA"
          value="12"
          note="Fechas o diferencias por revisar"
          tone="amber"
        />
      </section>
      <section className="dashboard-grid">
        <article className="card wide">
          <CardHead
            title="Recaudación y depósitos"
            subtitle="Comportamiento mensual consolidado"
          />
          <LineChart />
        </article>
        <article className="card">
          <CardHead title="Composición de ventas" subtitle="Por producto" />
          <div className="product-list">
            <Product
              color="#1565d8"
              name="Gasolina"
              value="10,72 MM L"
              pct="51%"
            />
            <Product
              color="#7c5ce5"
              name="Diésel"
              value="8,20 MM L"
              pct="39%"
            />
            <Product color="#19a974" name="GNV" value="1,31 MM m³" pct="7%" />
            <Product color="#f2a63b" name="GLP" value="619.900 kg" pct="3%" />
          </div>
        </article>
        <article className="card full">
          <CardHead
            title="Desempeño por estación"
            subtitle="Volumen comercializado, recaudación y control"
          />
          <table>
            <thead>
              <tr>
                <th>Estación propia</th>
                <th>Gasolina (L)</th>
                <th>Diésel (L)</th>
                <th>Recaudación</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {stations.map((r) => (
                <tr key={r[0]}>
                  {r.map((v, i) => (
                    <td key={i}>
                      {i === 4 ? (
                        <span
                          className={
                            v === "Al día" ? "status ok" : "status warn"
                          }
                        >
                          {v}
                        </span>
                      ) : (
                        v
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      </section>
    </>
  );
}

function Expira() {
  const [show, setShow] = useState(false);
  return (
    <>
      <div className="module-actions">
        <div className="filters">
          <button>Todas las estaciones⌄</button>
          <button>Todos los documentos⌄</button>
          <button>Todos los responsables⌄</button>
        </div>
        <button className="primary small" onClick={() => setShow(!show)}>
          + Registrar documento
        </button>
      </div>
      {show && (
        <div className="quick-form">
          <input placeholder="Buscar estación identificada" />
          <input placeholder="Tipo de documento" />
          <input type="date" />
          <input type="date" />
          <button className="primary small" onClick={() => setShow(false)}>
            Guardar borrador
          </button>
        </div>
      )}
      <section className="kpi-grid">
        <Kpi
          label="DOCUMENTOS ACTIVOS"
          value="184"
          note="Privadas y estaciones propias"
        />
        <Kpi
          label="PRÓXIMOS A VENCER"
          value="16"
          note="Dentro de los próximos 60 días"
          tone="amber"
        />
        <Kpi
          label="EN RENOVACIÓN"
          value="8"
          note="Con responsables asignados"
          tone="violet"
        />
        <Kpi
          label="VENCIDOS"
          value="3"
          note="Requieren atención inmediata"
          tone="red"
        />
      </section>
      <section className="dashboard-grid">
        <article className="card wide">
          <CardHead
            title="Calendario de vencimientos"
            subtitle="Próximos seis meses"
          />
          <ExpiryBars />
        </article>
        <article className="card">
          <CardHead title="Seguimiento" subtitle="Estado de los trámites" />
          <DonutSingle />
        </article>
        <article className="card full">
          <CardHead
            title="Documentos que requieren atención"
            subtitle="Alertas dirigidas a responsables de seguimiento"
          />
          <table>
            <thead>
              <tr>
                <th>Estación</th>
                <th>Documento</th>
                <th>Vencimiento</th>
                <th>Días</th>
                <th>Estado</th>
                <th>Responsable</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((d, i) => (
                <tr key={d.station + d.document}>
                  <td>{d.station}</td>
                  <td>{d.document}</td>
                  <td>{d.expiry}</td>
                  <td>{d.days}</td>
                  <td>
                    <span
                      className={`status ${d.state === "Vencido" ? "bad" : d.state === "Vigente" ? "ok" : "warn"}`}
                    >
                      {d.state}
                    </span>
                  </td>
                  <td>
                    {
                      [
                        "María Fernández",
                        "Luis Herrera",
                        "Carlos Méndez",
                        "Ana López",
                      ][i]
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      </section>
    </>
  );
}

function Cargas() {
  const [file, setFile] = useState("");
  return (
    <>
      <section className="upload-grid">
        {[
          [
            "Despachos de venta",
            "Clientes privados, directos, GRACO y distribuidores",
            "Venta",
          ],
          [
            "Transferencias",
            "Estaciones de servicio propias de YPFB",
            "Transferencia",
          ],
          [
            "PRODE mensual",
            "Programación por distrito, zona y producto",
            "PRODE",
          ],
          [
            "Recaudaciones propias",
            "Libro anual acumulativo por estación",
            "Recaudación",
          ],
        ].map((x, i) => (
          <article className="upload-card" key={x[0]}>
            <div className={`upload-icon u${i}`}>
              <Icon name="upload" />
            </div>
            <h3>{x[0]}</h3>
            <p>{x[1]}</p>
            <label className="file-button">
              Seleccionar Excel o CSV
              <input
                type="file"
                accept=".xls,.xlsx,.csv"
                onChange={(e) => setFile(e.target.files?.[0]?.name || "")}
              />
            </label>
          </article>
        ))}
      </section>
      {file && (
        <div className="file-review">
          <div>
            <strong>Archivo preparado para validación</strong>
            <span>{file}</span>
          </div>
          <div>
            <span className="status ok">Formato reconocido</span>
            <button className="primary small">Validar y cargar</button>
          </div>
        </div>
      )}
      <article className="card full history">
        <CardHead
          title="Historial de cargas"
          subtitle="Cada versión queda disponible para auditoría"
        />
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Archivo</th>
              <th>Periodo detectado</th>
              <th>Registros</th>
              <th>Usuario</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>18/08/2026 · 17:42</td>
              <td>despachos_venta_2026.xls</td>
              <td>Ene–Dic 2026</td>
              <td>12.379</td>
              <td>Alimentador Sucre</td>
              <td>
                <span className="status ok">Procesado</span>
              </td>
            </tr>
            <tr>
              <td>18/08/2026 · 17:38</td>
              <td>transferencias_2026.xls</td>
              <td>Ene–Dic 2026</td>
              <td>1.841</td>
              <td>Alimentador Sucre</td>
              <td>
                <span className="status ok">Procesado</span>
              </td>
            </tr>
            <tr>
              <td>01/08/2026 · 09:14</td>
              <td>prode_agosto_2026.xlsx</td>
              <td>Agosto 2026</td>
              <td>31 zonas</td>
              <td>Administrador nacional</td>
              <td>
                <span className="status ok">Procesado</span>
              </td>
            </tr>
          </tbody>
        </table>
      </article>
    </>
  );
}

const newProformaClient = (): ProformaClient => ({
  id: "",
  name: "",
  controlledRegistry: "",
  pickupPlace: "PLANTA LÍQUIDOS YPFB - QHORA QHORA",
  pickupRegistries: "",
  validityDays: 30,
  districtId: "DCCH",
  zoneId: "sucre",
  products: [
    { detail: "GASOLINA ESPECIAL CF", volume: 0, unit: "LITRO", price: 6.96 },
    { detail: "DIESEL OIL NACIONAL CF", volume: 0, unit: "LITRO", price: 9.8 },
  ],
});
const localDateIso = (value = new Date()) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
const shiftLocalDate = (value: string, days: number) => {
  const next = new Date(`${value}T12:00:00`);
  next.setDate(next.getDate() + days);
  return localDateIso(next);
};

function Proformas({ token }: { token: string }) {
  const today = localDateIso(),
    minDate = shiftLocalDate(today, -2),
    maxDate = shiftLocalDate(today, 2),
    [clients, setClients] = useState<ProformaClient[]>([]),
    [draft, setDraft] = useState<ProformaClient>(newProformaClient),
    [date, setDate] = useState(today),
    [sequence, setSequence] = useState(1),
    [existingNumber, setExistingNumber] = useState<string | null>(null),
    [editing, setEditing] = useState(true),
    [message, setMessage] = useState("");
  const year = date.slice(0, 4),
    number =
      existingNumber ||
      `PROFORMA DCCH/UDC-${String(sequence).padStart(3, "0")}/${year}`;
  useEffect(() => {
    listProformaClients(token)
      .then(setClients)
      .catch((error) => setMessage(error.message));
  }, [token]);
  useEffect(() => {
    getNextProformaSequence(token, year)
      .then(setSequence)
      .catch((error) => setMessage(error.message));
  }, [token, year]);
  useEffect(() => {
    if (!draft.id) {
      setExistingNumber(null);
      return;
    }
    getIssuedProformaNumber(token, draft.id, date)
      .then(setExistingNumber)
      .catch((error) => setMessage(error.message));
  }, [token, draft.id, date]);
  const money = (value: number) =>
      new Intl.NumberFormat("es-BO", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value),
    total = draft.products.reduce((sum, p) => sum + p.volume * p.price, 0);
  const longDate = new Intl.DateTimeFormat("es-BO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
  const update = (field: keyof ProformaClient, value: string | number) =>
    setDraft((current) => ({ ...current, [field]: value }));
  const product = (
    index: number,
    field: "detail" | "volume" | "unit" | "price",
    value: string,
  ) =>
    setDraft((current) => ({
      ...current,
      products: current.products.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]:
                field === "volume" || field === "price"
                  ? Math.max(0, Number(value) || 0)
                  : value,
            }
          : item,
      ),
    }));
  async function saveClient() {
    if (!draft.name.trim())
      return setMessage("Ingrese el nombre de la empresa.");
    const wasNew = !draft.id,
      next = { ...draft, id: draft.id || crypto.randomUUID() };
    try {
      await saveProformaClient(token, next);
      setClients((all) =>
        [...all.filter((item) => item.id !== next.id), next].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );
      if (wasNew) {
        setDraft(newProformaClient());
        setEditing(true);
        setMessage(
          "Empresa registrada. El formulario quedó listo para registrar la siguiente.",
        );
      } else {
        setDraft(next);
        setEditing(false);
        setMessage("Cambios de la empresa guardados.");
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se pudo guardar.",
      );
    }
  }
  async function issue() {
    if (!draft.id) return setMessage("Seleccione una empresa registrada.");
    if (date < minDate || date > maxDate)
      return setMessage(
        "La fecha solo puede modificarse dos días antes o dos días después de hoy.",
      );
    const isNew = !existingNumber;
    try {
      await saveIssuedProforma(
        token,
        `DCCH_sucre_${draft.id}_${date}`,
        draft,
        date,
        number,
      );
      if (isNew) {
        await saveProformaSequence(token, year, sequence);
        setExistingNumber(number);
      }
      setMessage(
        isNew
          ? "Nueva proforma registrada. Preparando impresión…"
          : "Reimpresión: se conserva el correlativo original.",
      );
      document.body.classList.add("printing-proforma");
      window.addEventListener(
        "afterprint",
        () => {
          document.body.classList.remove("printing-proforma");
          if (isNew) setSequence((value) => value + 1);
        },
        { once: true },
      );
      setTimeout(() => window.print(), 100);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo emitir.");
    }
  }
  function select(client: ProformaClient) {
    setDraft(JSON.parse(JSON.stringify(client)));
    setEditing(false);
    setMessage("");
  }
  return (
    <section className="proformas-workspace">
      <div className="proforma-layout">
        <aside className="proforma-companies">
          <header>
            <div>
              <h3>Empresas registradas</h3>
              <small>Datos permanentes para próximas emisiones</small>
            </div>
            <button
              className="primary small"
              onClick={() => {
                setDraft(newProformaClient());
                setEditing(true);
                setMessage("");
              }}
            >
              + Nueva
            </button>
          </header>
          <div className="company-search">
            <input placeholder="Buscar empresa" />
          </div>
          <div className="company-list">
            {clients.length ? (
              clients.map((client) => (
                <button
                  key={client.id}
                  className={client.id === draft.id ? "active" : ""}
                  onClick={() => select(client)}
                >
                  <span>{client.name.slice(0, 2).toUpperCase()}</span>
                  <div>
                    <b>{client.name}</b>
                    <small>
                      {client.controlledRegistry || "Sin registro indicado"}
                    </small>
                  </div>
                </button>
              ))
            ) : (
              <p>Aún no existen empresas registradas.</p>
            )}
          </div>
        </aside>
        <main className="proforma-editor">
          <article className="card company-form">
            <div className="company-form-head">
              <CardHead
                title={
                  draft.id
                    ? "Datos permanentes de la empresa"
                    : "Registrar nueva empresa"
                }
                subtitle={
                  draft.id && !editing
                    ? "Información protegida. Pulse Editar para modificarla."
                    : "Complete y guarde los datos permanentes."
                }
              />
              {draft.id && !editing && (
                <button className="secondary" onClick={() => setEditing(true)}>
                  Editar empresa
                </button>
              )}
            </div>
            <div className="proforma-fields">
              <label className="wide">
                Empresa / cliente
                <input
                  disabled={!editing}
                  value={draft.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Razón social completa"
                />
              </label>
              <label>
                Registro Sustancias Controladas
                <input
                  disabled={!editing}
                  value={draft.controlledRegistry}
                  onChange={(e) => update("controlledRegistry", e.target.value)}
                  placeholder="1000-00000-00D"
                />
              </label>
              <label>
                Lugar de recojo
                <input
                  disabled={!editing}
                  value={draft.pickupPlace}
                  onChange={(e) => update("pickupPlace", e.target.value)}
                />
              </label>
              <label className="wide">
                Registros de la planta o lugar de recojo
                <input
                  disabled={!editing}
                  value={draft.pickupRegistries}
                  onChange={(e) => update("pickupRegistries", e.target.value)}
                  placeholder="Separar registros con espacios"
                />
              </label>
              <label>
                Vigencia
                <input
                  disabled={!editing}
                  type="number"
                  value={draft.validityDays}
                  onChange={(e) =>
                    update("validityDays", Number(e.target.value) || 30)
                  }
                />
                <small>días</small>
              </label>
            </div>
            <div className="product-editor">
              <header>
                <b>Productos habituales</b>
                <button
                  disabled={!editing}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      products: [
                        ...current.products,
                        { detail: "", volume: 0, unit: "LITRO", price: 0 },
                      ],
                    }))
                  }
                >
                  + Producto
                </button>
              </header>
              {draft.products.map((item, index) => (
                <div key={index}>
                  <input
                    disabled={!editing}
                    value={item.detail}
                    onChange={(e) => product(index, "detail", e.target.value)}
                    placeholder="Detalle"
                  />
                  <input
                    disabled={!editing}
                    type="number"
                    value={item.volume || ""}
                    onChange={(e) => product(index, "volume", e.target.value)}
                    placeholder="Volumen"
                  />
                  <input
                    disabled={!editing}
                    value={item.unit}
                    onChange={(e) => product(index, "unit", e.target.value)}
                  />
                  <input
                    disabled={!editing}
                    type="number"
                    step="0.01"
                    value={item.price || ""}
                    onChange={(e) => product(index, "price", e.target.value)}
                    placeholder="Precio"
                  />
                  <b>Bs {money(item.volume * item.price)}</b>
                  <button
                    disabled={!editing}
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        products: current.products.filter(
                          (_, i) => i !== index,
                        ),
                      }))
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            {editing && (
              <button
                className="primary small save-company"
                onClick={saveClient}
              >
                {draft.id ? "Guardar cambios" : "Registrar empresa"}
              </button>
            )}
          </article>
          <article className="card monthly-issue">
            <CardHead
              title="Emitir proforma mensual"
              subtitle={
                existingNumber
                  ? "Esta empresa ya tiene proforma en esa fecha: se reimprimirá con el mismo correlativo."
                  : "Una fecha nueva generará el siguiente correlativo disponible."
              }
            />
            <div>
              <label>
                Fecha de emisión
                <input
                  type="date"
                  min={minDate}
                  max={maxDate}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <label>
                Número de proforma
                <input value={number} readOnly />
              </label>
              <div className="issue-total">
                <span>Importe total</span>
                <b>Bs {money(total)}</b>
              </div>
              <button className="primary" onClick={issue}>
                {existingNumber
                  ? "Reimprimir proforma"
                  : "Registrar e imprimir proforma"}
              </button>
            </div>
          </article>
          {message && <div className="admin-message">{message}</div>}
        </main>
      </div>
      <section className="proforma-print">
        <header>
          <div className="ypfb-print">
            <strong>YPFB</strong>
            <small>Corporación</small>
          </div>
          <div>
            <h1>FACTURA PROFORMA</h1>
            <p>DISTRITO COMERCIAL CHUQUISACA</p>
          </div>
        </header>
        <div className="proforma-meta">
          <p>
            <b>FECHA:</b> {longDate}
          </p>
          <p>
            <b>NRO:</b> {number}
          </p>
        </div>
        <div className="proforma-client">
          <p>
            <b>CLIENTE:</b> {draft.name}
          </p>
          <p>
            <b>REGISTRO SUSTANCIAS CONTROLADAS:</b> {draft.controlledRegistry}
          </p>
          <p>
            <b>LUGAR DE RECOJO:</b> {draft.pickupPlace}
          </p>
          <p>
            <b>REGISTRO SUSTANCIAS CONTROLADAS:</b> {draft.pickupRegistries}
          </p>
        </div>
        <table>
          <thead>
            <tr>
              <th>DETALLE</th>
              <th>VOLUMEN</th>
              <th>UNIDAD</th>
              <th>PRECIO</th>
              <th>IMPORTE (Bs.)</th>
            </tr>
          </thead>
          <tbody>
            {draft.products.map((item, index) => (
              <tr key={index}>
                <td>{item.detail}</td>
                <td>{money(item.volume)}</td>
                <td>{item.unit}</td>
                <td>{money(item.price)}</td>
                <td>{money(item.volume * item.price)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4}>TOTAL</td>
              <td>{money(total)}</td>
            </tr>
          </tfoot>
        </table>
        <p className="validity">PARA {draft.validityDays} DÍAS</p>
      </section>
    </section>
  );
}

type ProgrammingClient = {
  name: string;
  category: string;
  diesel: number;
  gas: number;
  compartments: number[];
};
type ProgramRow = ProgrammingClient & {
  programmedDiesel: number;
  programmedGas: number;
  autoDiesel: number;
  autoGas: number;
  manual: boolean;
};
type DayProgram = {
  rows: ProgramRow[];
  stationDiesel: number;
  stationGas: number;
  directDiesel: number;
  directGas: number;
  generated: boolean;
};
const zoneCatalog: Record<
  string,
  { label: string; clients: ProgrammingClient[] }
> = {
  sucre: { label: "Sucre", clients: programmingClients },
  monteagudo: { label: "Monteagudo", clients: monteagudoClients },
};
const emptyDay = (
  clients: ProgrammingClient[] = programmingClients,
): DayProgram => {
  const stations = clients.filter((client) => client.category === "station");
  return {
    stationDiesel: stations.reduce((sum, client) => sum + client.diesel, 0),
    stationGas: stations.reduce((sum, client) => sum + client.gas, 0),
    directDiesel: 0,
    directGas: 0,
    generated: false,
    rows: clients.map((client) => ({
      ...client,
      programmedDiesel: 0,
      programmedGas: 0,
      autoDiesel: 0,
      autoGas: 0,
      manual: false,
    })),
  };
};
const realWeekValues: Record<string, Record<string, [number, number]>> = {
  "2026-08-19": {
    "EE.SS. Mariscal Sucre": [20000, 12000],
    "E.S. Azari": [20000, 12500],
    "EOSO El Morro": [20000, 12500],
    "EOSO Juana Azurduy": [0, 24000],
    "EOSO María Alejandra": [20000, 12000],
    "EOSO Mesa Verde": [20000, 20000],
    "EOSO Nayler": [20000, 24000],
    "EOSO Oqharikuna SRL": [20000, 20000],
    "EOSO San Antonio": [20000, 35000],
    "EOSO Trébol SRL": [20000, 28000],
    "EESS Ostria Gutiérrez · YPFB": [12000, 24000],
    "EESS El Tejar · YPFB": [12000, 12000],
    "EOSO Aiquile": [4900, 24000],
    "EOSO Murillo · Zudáñez": [12000, 12000],
    "E.S. Pujllay · Tarabuco": [13500, 10500],
    "EESS Serrano · YPFB": [12000, 12000],
  },
  "2026-08-24": {
    "EE.SS. Mariscal Sucre": [20000, 12000],
    "E.S. Azari": [20000, 12500],
    "EOSO El Morro": [20000, 12500],
    "EOSO Juana Azurduy": [0, 24000],
    "EOSO María Alejandra": [20000, 12000],
    "EOSO Mesa Verde": [20000, 20000],
    "EOSO Nayler": [20000, 24000],
    "EOSO Oqharikuna SRL": [20000, 25000],
    "EOSO San Antonio": [20000, 35000],
    "EOSO Trébol SRL": [20000, 24000],
    "EESS Ostria Gutiérrez · YPFB": [12000, 24000],
    "EESS El Tejar · YPFB": [12000, 24000],
    "EOSO Aiquile": [4900, 24000],
    "E.S. Buen Retiro · Padilla": [12000, 12000],
    "EOSO Murillo · Zudáñez": [12000, 12000],
    "E.S. Pujllay · Tarabuco": [10500, 13500],
  },
  "2026-08-25": {
    "EE.SS. Mariscal Sucre": [24000, 0],
    "E.S. Azari": [24000, 25000],
    "EOSO El Morro": [24000, 12500],
    "EOSO Juana Azurduy": [0, 36000],
    "EOSO María Alejandra": [24000, 0],
    "EOSO Mesa Verde": [24000, 30000],
    "EOSO Nayler": [24000, 24000],
    "EOSO Oqharikuna SRL": [24000, 20000],
    "EOSO San Antonio": [24000, 40000],
    "EOSO Trébol SRL": [24000, 36000],
    "EESS Ostria Gutiérrez · YPFB": [12000, 12000],
    "EESS El Tejar · YPFB": [12000, 12000],
    "EESS Tarabuquillo · YPFB": [12000, 12000],
    SEDCAM: [0, 5000],
  },
  "2026-08-26": {
    "EE.SS. Mariscal Sucre": [20000, 12000],
    "E.S. Azari": [20000, 12500],
    "EOSO El Morro": [20000, 12500],
    "EOSO Juana Azurduy": [0, 29000],
    "EOSO María Alejandra": [20000, 8000],
    "EOSO Mesa Verde": [20000, 20000],
    "EOSO Nayler": [20000, 24000],
    "EOSO Oqharikuna SRL": [20000, 21000],
    "EOSO San Antonio": [20000, 50000],
    "EOSO Trébol SRL": [20000, 48000],
    "EESS Ostria Gutiérrez · YPFB": [12000, 12000],
    "EESS El Tejar · YPFB": [12000, 12000],
    "EESS Serrano · YPFB": [8000, 0],
    "EOSO Aiquile": [4900, 21200],
    "E.S. Buen Retiro · Padilla": [12000, 12000],
    "EOSO Murillo · Zudáñez": [12000, 12000],
    "E.S. Pujllay · Tarabuco": [10500, 13500],
  },
  "2026-08-27": {
    "EE.SS. Mariscal Sucre": [24000, 0],
    "E.S. Azari": [24000, 20000],
    "EOSO El Morro": [24000, 19000],
    "EOSO Juana Azurduy": [0, 36000],
    "EOSO María Alejandra": [24000, 0],
    "EOSO Mesa Verde": [24000, 20000],
    "EOSO Nayler": [24000, 35000],
    "EOSO Oqharikuna SRL": [24000, 20000],
    "EOSO San Antonio": [24000, 50000],
    "EOSO Trébol SRL": [24000, 48000],
    "EESS Ostria Gutiérrez · YPFB": [12000, 17000],
    "EESS El Tejar · YPFB": [12000, 12000],
    "EOSO Aiquile": [4900, 27600],
    "Planta Monteagudo": [0, 9000],
  },
  "2026-08-28": {
    "EE.SS. Mariscal Sucre": [20000, 12000],
    "E.S. Azari": [20000, 24000],
    "EOSO El Morro": [20000, 12500],
    "EOSO Juana Azurduy": [0, 24000],
    "EOSO María Alejandra": [20000, 11000],
    "EOSO Mesa Verde": [20000, 30000],
    "EOSO Nayler": [20000, 24000],
    "EOSO Oqharikuna SRL": [20000, 20000],
    "EOSO San Antonio": [20000, 50000],
    "EOSO Trébol SRL": [20000, 46000],
    "EESS Ostria Gutiérrez · YPFB": [24000, 24000],
    "EESS El Tejar · YPFB": [12000, 12000],
    "E.S. Buen Retiro · Padilla": [12000, 15000],
    "EOSO Murillo · Zudáñez": [12000, 15000],
    "E.S. Pujllay · Tarabuco": [13500, 10500],
  },
  "2026-08-29": {
    "EE.SS. Mariscal Sucre": [24000, 0],
    "E.S. Azari": [24000, 25000],
    "EOSO El Morro": [24000, 12500],
    "EOSO Juana Azurduy": [0, 35000],
    "EOSO María Alejandra": [24000, 12000],
    "EOSO Mesa Verde": [24000, 30000],
    "EOSO Nayler": [24000, 35000],
    "EOSO Oqharikuna SRL": [24000, 25000],
    "EOSO San Antonio": [24000, 50000],
    "EOSO Trébol SRL": [24000, 48000],
    "EESS Ostria Gutiérrez · YPFB": [12000, 24000],
    "EESS El Tejar · YPFB": [12000, 24000],
  },
};
const dispatch1908: Record<string, [number, number]> = {
  "EE.SS. Mariscal Sucre": [20000, 12000],
  "E.S. Azari": [20000, 12500],
  "EOSO El Morro": [20000, 12500],
  "EOSO Juana Azurduy": [0, 24000],
  "EOSO María Alejandra": [20000, 12000],
  "EOSO Mesa Verde": [20000, 20000],
  "EOSO Nayler": [20000, 24000],
  "EOSO Oqharikuna SRL": [20000, 20000],
  "EOSO San Antonio": [20000, 35000],
  "EOSO Trébol SRL": [20000, 28000],
  "EESS Ostria Gutiérrez · YPFB": [12000, 24000],
  "EESS El Tejar · YPFB": [12000, 12000],
  "EOSO Aiquile": [4900, 24000],
  "EOSO Murillo · Zudáñez": [12000, 12000],
  "E.S. Pujllay · Tarabuco": [13500, 10500],
  "EESS Serrano · YPFB": [12000, 12000],
};
const seededPrograms = (zoneId = "sucre") =>
  zoneId === "sucre"
    ? Object.fromEntries(
        Object.entries(realWeekValues).map(([date, values]) => {
          const rows = programmingClients.map((client) => {
            const [d, g] = values[client.name] || [0, 0];
            return {
              ...client,
              programmedDiesel: d,
              programmedGas: g,
              autoDiesel: d,
              autoGas: g,
              manual: false,
            };
          });
          const station = rows.filter((r) => r.category === "station"),
            direct = rows.filter((r) => r.category === "direct");
          return [
            date,
            {
              rows,
              stationDiesel: station.reduce(
                (s, r) => s + r.programmedDiesel,
                0,
              ),
              stationGas: station.reduce((s, r) => s + r.programmedGas, 0),
              directDiesel: direct.reduce((s, r) => s + r.programmedDiesel, 0),
              directGas: direct.reduce((s, r) => s + r.programmedGas, 0),
              generated: true,
            },
          ];
        }),
      )
    : {};
const iso = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (value: string, days: number) => {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return iso(date);
};
const mondayOf = (value: string) => {
  const date = new Date(`${value}T12:00:00`);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return iso(date);
};

type ProgrammingExportRow = {
  date: string;
  zone: string;
  client: string;
  diesel: number;
  gas: number;
};

function dateRange(from: string, to: string) {
  if (!from || !to || from > to) return [];
  const days = Math.min(
    366,
    Math.floor(
      (new Date(`${to}T12:00:00`).getTime() -
        new Date(`${from}T12:00:00`).getTime()) /
        86400000,
    ) + 1,
  );
  return Array.from({ length: days }, (_, index) => addDays(from, index));
}

function exportProgrammingExcel(
  filename: string,
  rows: ProgrammingExportRow[],
) {
  const escape = (value: string | number) =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  const body = rows
    .map(
      (row) =>
        `<tr><td>${escape(row.date)}</td><td>${escape(row.zone)}</td><td>${escape(row.client)}</td><td>${row.diesel}</td><td>${row.gas}</td><td>${row.diesel + row.gas}</td></tr>`,
    )
    .join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"></head><body><table border="1"><thead><tr><th>Fecha</th><th>Zona</th><th>Cliente</th><th>Diésel (L)</th><th>Gasolina (L)</th><th>Total (L)</th></tr></thead><tbody>${body}</tbody></table></body></html>`;
  const link = document.createElement("a");
  link.href = URL.createObjectURL(
    new Blob(["\ufeff", html], { type: "application/vnd.ms-excel" }),
  );
  link.download = `${filename}.xls`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function ProgrammingRangePublication({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle: string;
  rows: ProgrammingExportRow[];
}) {
  const fmt = (value: number) => new Intl.NumberFormat("es-BO").format(value);
  const diesel = rows.reduce((sum, row) => sum + row.diesel, 0);
  const gas = rows.reduce((sum, row) => sum + row.gas, 0);
  return (
    <section className="print-publication range-publication">
      <header>
        <div>
          <small>YPFB · DISTRITO COMERCIAL CHUQUISACA</small>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <b>CONTROL COMERCIAL</b>
      </header>
      <div className="print-kpis">
        <div>
          <span>TOTAL PROGRAMADO</span>
          <strong>{fmt(diesel + gas)} L</strong>
          <small>Solo registros programados</small>
        </div>
        <div>
          <span>DIÉSEL</span>
          <strong>{fmt(diesel)} L</strong>
          <small>
            {Math.round((diesel / Math.max(1, diesel + gas)) * 100)}%
          </small>
        </div>
        <div>
          <span>GASOLINA</span>
          <strong>{fmt(gas)} L</strong>
          <small>{Math.round((gas / Math.max(1, diesel + gas)) * 100)}%</small>
        </div>
        <div>
          <span>REGISTROS</span>
          <strong>{rows.length}</strong>
          <small>Clientes con programación</small>
        </div>
      </div>
      <article className="print-section">
        <h2>Detalle de programación seleccionada</h2>
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Zona</th>
              <th>Cliente / estación</th>
              <th>Diésel</th>
              <th>Gasolina</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.date}-${row.zone}-${row.client}-${index}`}>
                <td>{row.date.split("-").reverse().join("/")}</td>
                <td>{row.zone}</td>
                <td>{row.client}</td>
                <td>{fmt(row.diesel)} L</td>
                <td>{fmt(row.gas)} L</td>
                <td>{fmt(row.diesel + row.gas)} L</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3}>TOTAL</td>
              <td>{fmt(diesel)} L</td>
              <td>{fmt(gas)} L</td>
              <td>{fmt(diesel + gas)} L</td>
            </tr>
          </tfoot>
        </table>
      </article>
      <footer className="print-note">
        Reporte generado por Control Comercial · Solo incluye valores mayores
        que cero.
      </footer>
    </section>
  );
}

function Programaciones({ user }: { user: SessionUser }) {
  const token = user.token,
    today = iso(new Date()),
    canChooseZone =
      user.role === "super_admin" ||
      user.role === "national_viewer" ||
      user.role === "district_admin" ||
      user.role === "district_viewer",
    initialZone = canChooseZone ? "sucre" : user.zoneId || "sucre";
  const [selectedZone, setSelectedZone] = useState(initialZone),
    [selectedDate, setSelectedDate] = useState(today),
    [programs, setPrograms] = useState<Record<string, DayProgram>>(() =>
      seededPrograms(initialZone),
    ),
    [notice, setNotice] = useState(""),
    [hideUnprogrammed, setHideUnprogrammed] = useState(true),
    [fuelFilter, setFuelFilter] = useState<"both" | "diesel" | "gas">("both"),
    [reportFrom, setReportFrom] = useState(today),
    [reportTo, setReportTo] = useState(today),
    [reopenJustifications, setReopenJustifications] = useState<
      Record<string, string>
    >({}),
    [dispatchFile, setDispatchFile] = useState<File | null>(null),
    [parsedDispatch, setParsedDispatch] = useState<{
      date: string;
      volumes: Record<string, [number, number]>;
      orders: number;
    } | null>(null);
  const districtId = user.districtId || "DCCH";
  const activeZone = zoneCatalog[selectedZone] || zoneCatalog.sucre,
    activeClients = activeZone.clients;
  const weekStart = mondayOf(selectedDate),
    week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    current = programs[selectedDate] || emptyDay(activeClients),
    locked =
      user.role === "national_viewer" ||
      user.role === "district_viewer" ||
      (selectedDate < today && !reopenJustifications[selectedDate]);
  const fmt = (value: number) => new Intl.NumberFormat("es-BO").format(value),
    setCurrent = (next: DayProgram) => {
      if (!locked) setPrograms((all) => ({ ...all, [selectedDate]: next }));
    };
  useEffect(() => {
    if (selectedZone === "all") return;
    setPrograms(seededPrograms(selectedZone));
    setParsedDispatch(null);
    const monthStart = `${selectedDate.slice(0, 7)}-01`,
      last = week[6],
      count =
        Math.floor(
          (new Date(`${last}T12:00:00`).getTime() -
            new Date(`${monthStart}T12:00:00`).getTime()) /
            86400000,
        ) + 1,
      historyDates = Array.from({ length: count }, (_, i) =>
        addDays(monthStart, i),
      );
    loadProgrammingDays(token, historyDates, districtId, selectedZone)
      .then((saved) => setPrograms((all) => ({ ...all, ...saved })))
      .catch((error) => setNotice(error.message));
  }, [token, weekStart, selectedDate, districtId, selectedZone]);
  useEffect(() => {
    if (selectedZone === "all") return;
    const dates = dateRange(reportFrom, reportTo);
    if (!dates.length) return;
    loadProgrammingDays(token, dates, districtId, selectedZone)
      .then((saved) => setPrograms((all) => ({ ...all, ...saved })))
      .catch((error) => setNotice(error.message));
  }, [token, districtId, selectedZone, reportFrom, reportTo]);
  const totalD = current.rows.reduce((s, r) => s + r.programmedDiesel, 0),
    totalG = current.rows.reduce((s, r) => s + r.programmedGas, 0),
    available =
      current.stationDiesel +
      current.stationGas +
      current.directDiesel +
      current.directGas;
  const autoVolume = current.rows.reduce(
      (s, r) => s + (r.manual ? 0 : r.programmedDiesel + r.programmedGas),
      0,
    ),
    autoPct = Math.round((autoVolume / Math.max(1, totalD + totalG)) * 100),
    manualPct = totalD + totalG ? 100 - autoPct : 0;
  const stationPct = Math.round(
      ((current.stationDiesel + current.stationGas) / Math.max(1, available)) *
        100,
    ),
    directPct = 100 - stationPct;
  const dispatches =
      parsedDispatch?.date === selectedDate
        ? parsedDispatch.volumes
        : selectedZone === "sucre" && selectedDate === "2026-08-19"
          ? dispatch1908
          : {},
    dispatchedD = Object.values(dispatches).reduce((s, v) => s + v[0], 0),
    dispatchedG = Object.values(dispatches).reduce((s, v) => s + v[1], 0),
    pendingD = Math.max(0, totalD - dispatchedD),
    pendingG = Math.max(0, totalG - dispatchedG);
  const weekTotals = week.map((date) => {
      const p = programs[date];
      return {
        date,
        d: p?.rows.reduce((s, r) => s + r.programmedDiesel, 0) || 0,
        g: p?.rows.reduce((s, r) => s + r.programmedGas, 0) || 0,
      };
    }),
    maxDay = weekTotals.reduce(
      (a, b) => (a.d + a.g > b.d + b.g ? a : b),
      weekTotals[0],
    ),
    prodeDaily = 0;
  const sumDay = (day: DayProgram) => ({
    d: day.rows.reduce((s, r) => s + r.programmedDiesel, 0),
    g: day.rows.reduce((s, r) => s + r.programmedGas, 0),
  });
  const yesterday = addDays(today, -1),
    todayPlan = programs[today] || emptyDay(activeClients),
    yesterdayPlan = programs[yesterday] || emptyDay(activeClients),
    todaySum = sumDay(todayPlan),
    yesterdaySum = sumDay(yesterdayPlan);
  const yesterdayDispatch =
      parsedDispatch?.date === yesterday
        ? parsedDispatch.volumes
        : selectedZone === "sucre" && yesterday === "2026-08-19"
          ? dispatch1908
          : {},
    yesterdayDispatchedD = Object.values(yesterdayDispatch).reduce(
      (s, v) => s + v[0],
      0,
    ),
    yesterdayDispatchedG = Object.values(yesterdayDispatch).reduce(
      (s, v) => s + v[1],
      0,
    );
  const todayAvailable =
      todayPlan.stationDiesel +
      todayPlan.stationGas +
      todayPlan.directDiesel +
      todayPlan.directGas,
    todayStationPct = Math.round(
      ((todayPlan.stationDiesel + todayPlan.stationGas) /
        Math.max(1, todayAvailable)) *
        100,
    ),
    todayDirectPct = 100 - todayStationPct,
    todayAutoVolume = todayPlan.rows.reduce(
      (s, r) => s + (r.manual ? 0 : r.programmedDiesel + r.programmedGas),
      0,
    ),
    todayAutoPct = Math.round(
      (todayAutoVolume / Math.max(1, todaySum.d + todaySum.g)) * 100,
    ),
    todayManualPct = todaySum.d + todaySum.g ? 100 - todayAutoPct : 0;
  const futureSummary = weekTotals.filter(
      (item) => item.date > today && item.d + item.g > 0,
    ),
    compareMax = Math.max(
      1,
      yesterdaySum.d,
      yesterdaySum.g,
      yesterdayDispatchedD,
      yesterdayDispatchedG,
    );
  function quota(
    field: keyof Pick<
      DayProgram,
      "stationDiesel" | "stationGas" | "directDiesel" | "directGas"
    >,
    value: string,
  ) {
    setCurrent({ ...current, [field]: Math.max(0, Number(value) || 0) });
  }
  function generate() {
    let remD = current.stationDiesel,
      remG = current.stationGas,
      remDirectD = current.directDiesel,
      remDirectG = current.directGas;
    const weekday = new Date(`${selectedDate}T12:00:00`).getDay();
    const directCount = Math.max(
      1,
      current.rows.filter((row) => row.category === "direct").length,
    );
    const prior = Object.entries(programs)
      .filter(
        ([date]) =>
          date < selectedDate &&
          new Date(`${date}T12:00:00`).getDay() === weekday,
      )
      .map(([, day]) => day);
    const rows = current.rows.map((row, index) => {
      const history = prior
        .map((day) => day.rows.find((item) => item.name === row.name))
        .filter(Boolean) as ProgramRow[];
      if (row.category === "direct") {
        const historicalD = history.length
          ? Math.round(
              history.reduce((sum, item) => sum + item.programmedDiesel, 0) /
                history.length,
            )
          : Math.round(current.directDiesel / directCount);
        const historicalG = history.length
          ? Math.round(
              history.reduce((sum, item) => sum + item.programmedGas, 0) /
                history.length,
            )
          : Math.round(current.directGas / directCount);
        const d = Math.min(remDirectD, historicalD),
          g = Math.min(remDirectG, historicalG);
        remDirectD -= d;
        remDirectG -= g;
        return {
          ...row,
          programmedDiesel: d,
          programmedGas: g,
          autoDiesel: d,
          autoGas: g,
          manual: false,
        };
      }
      const shouldRun = history.length
        ? history.some((item) => item.programmedDiesel + item.programmedGas > 0)
        : (index + weekday) %
            Math.max(
              1,
              Math.round(
                row.compartments.reduce((a, b) => a + b, 0) /
                  Math.max(1, row.diesel + row.gas),
              ),
            ) ===
          0;
      if (!shouldRun)
        return {
          ...row,
          programmedDiesel: 0,
          programmedGas: 0,
          autoDiesel: 0,
          autoGas: 0,
          manual: false,
        };
      const targetD = history.length
          ? history.reduce((s, r) => s + r.programmedDiesel, 0) / history.length
          : row.diesel,
        targetG = history.length
          ? history.reduce((s, r) => s + r.programmedGas, 0) / history.length
          : row.gas;
      let d = 0,
        g = 0;
      for (const capacity of row.compartments) {
        const favorD =
          targetD / Math.max(1, targetD + targetG) >= d / Math.max(1, d + g);
        if (favorD && remD >= capacity) {
          d += capacity;
          remD -= capacity;
        } else if (remG >= capacity) {
          g += capacity;
          remG -= capacity;
        } else if (remD >= capacity) {
          d += capacity;
          remD -= capacity;
        }
      }
      return {
        ...row,
        programmedDiesel: d,
        programmedGas: g,
        autoDiesel: d,
        autoGas: g,
        manual: false,
      };
    });
    const next = { ...current, rows, generated: true };
    setCurrent(next);
    saveProgrammingDay(
      token,
      selectedDate,
      next,
      100,
      districtId,
      selectedZone,
      reopenJustifications[selectedDate] || "",
      user.email,
    )
      .then(() =>
        setNotice(`Programación automática de ${activeZone.label} guardada.`),
      )
      .catch((error) => setNotice(error.message));
  }
  function edit(
    index: number,
    field: "programmedDiesel" | "programmedGas",
    value: string,
  ) {
    const next = {
      ...current,
      rows: current.rows.map((row, i) =>
        i === index
          ? { ...row, [field]: Math.max(0, Number(value) || 0), manual: true }
          : row,
      ),
    };
    setCurrent(next);
    const volume = next.rows.reduce(
        (s, r) => s + r.programmedDiesel + r.programmedGas,
        0,
      ),
      auto = next.rows.reduce(
        (s, r) => s + (r.manual ? 0 : r.programmedDiesel + r.programmedGas),
        0,
      );
    saveProgrammingDay(
      token,
      selectedDate,
      next,
      Math.round((auto / Math.max(1, volume)) * 100),
      districtId,
      selectedZone,
      reopenJustifications[selectedDate] || "",
      user.email,
    )
      .then(() => setNotice("Ajuste guardado."))
      .catch((error) => setNotice(error.message));
  }
  function editWeekCell(
    date: string,
    clientName: string,
    field: "programmedDiesel" | "programmedGas",
    value: string,
  ) {
    if (
      (date < today && !reopenJustifications[date]) ||
      user.role === "national_viewer" ||
      user.role === "district_viewer"
    )
      return;
    const day = programs[date] || emptyDay(activeClients);
    const rows = day.rows.map((row) =>
      row.name === clientName
        ? { ...row, [field]: Math.max(0, Number(value) || 0), manual: true }
        : row,
    );
    const next = { ...day, rows, generated: true };
    setPrograms((all) => ({ ...all, [date]: next }));
    const volume = rows.reduce(
      (sum, row) => sum + row.programmedDiesel + row.programmedGas,
      0,
    );
    const automatic = rows.reduce(
      (sum, row) =>
        sum + (row.manual ? 0 : row.programmedDiesel + row.programmedGas),
      0,
    );
    saveProgrammingDay(
      token,
      date,
      next,
      Math.round((automatic / Math.max(1, volume)) * 100),
      districtId,
      selectedZone,
      reopenJustifications[date] || "",
      user.email,
    )
      .then(() =>
        setNotice(
          `Programación del ${date.split("-").reverse().join("/")} guardada.`,
        ),
      )
      .catch((error) => setNotice(error.message));
  }
  async function reconcile() {
    if (!dispatchFile) return setNotice("Seleccione el PDF de despachos.");
    try {
      const parsed = await parseDispatchPdf(dispatchFile);
      setParsedDispatch(parsed);
      setSelectedDate(parsed.date);
      setNotice(
        `${parsed.orders} órdenes conciliadas para ${parsed.date.split("-").reverse().join("/")}.`,
      );
    } catch {
      setNotice(
        "No se pudo leer el PDF. Verifique que corresponda al formato Despachos de Cisternas.",
      );
    }
  }
  function reopenPastDate() {
    if (
      selectedDate >= today ||
      user.role === "national_viewer" ||
      user.role === "district_viewer"
    )
      return;
    const justification =
      window
        .prompt(
          "Indique la justificación para reabrir esta programación pasada (mínimo 10 caracteres):",
        )
        ?.trim() || "";
    if (justification.length < 10)
      return setNotice("La justificación debe tener al menos 10 caracteres.");
    setReopenJustifications((current) => ({
      ...current,
      [selectedDate]: justification,
    }));
    setNotice(
      `Día ${selectedDate.split("-").reverse().join("/")} reabierto de forma excepcional. Los cambios quedarán auditados.`,
    );
  }
  if (selectedZone === "all")
    return (
      <ProgrammingConsolidated
        token={token}
        districtId={districtId}
        onZoneChange={setSelectedZone}
      />
    );
  const canEditProgramming =
    user.role !== "national_viewer" && user.role !== "district_viewer";
  const visibleClients = activeClients.filter(
    (client) =>
      !hideUnprogrammed ||
      week.some((date) => {
        const row = programs[date]?.rows.find(
          (item) => item.name === client.name,
        );
        return (row?.programmedDiesel || 0) + (row?.programmedGas || 0) > 0;
      }),
  );
  const weekDiesel = weekTotals.reduce((sum, item) => sum + item.d, 0),
    weekGas = weekTotals.reduce((sum, item) => sum + item.g, 0),
    weekVolume = weekDiesel + weekGas,
    dieselPct = Math.round((weekDiesel / Math.max(1, weekVolume)) * 100),
    gasPct = weekVolume ? 100 - dieselPct : 0;
  const reportDates = dateRange(reportFrom, reportTo);
  const reportRows: ProgrammingExportRow[] = reportDates.flatMap((date) =>
    (programs[date]?.rows || [])
      .filter((row) => row.programmedDiesel + row.programmedGas > 0)
      .map((row) => ({
        date,
        zone: activeZone.label,
        client: row.name,
        diesel: row.programmedDiesel,
        gas: row.programmedGas,
      })),
  );
  return (
    <section
      className="programming single-week-programming workspace-scroll"
      data-fuel={fuelFilter}
    >
      <ZoneSelector
        selected={selectedZone}
        canConsolidate={canChooseZone}
        onChange={setSelectedZone}
      />
      <ProgrammingRangePublication
        title={`Programación de combustibles · ${activeZone.label}`}
        subtitle={`${reportFrom.split("-").reverse().join("/")} al ${reportTo.split("-").reverse().join("/")}`}
        rows={reportRows}
      />
      <div className="week-nav sticky-week">
        <button onClick={() => setSelectedDate(addDays(weekStart, -7))}>
          ←
        </button>
        <div>
          {week.map((date) => (
            <button
              key={date}
              className={`${date === selectedDate ? "selected " : ""}${date === today ? "current-day" : ""}`.trim()}
              onClick={() => setSelectedDate(date)}
            >
              <small>
                {
                  ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"][
                    new Date(`${date}T12:00:00`).getDay()
                  ]
                }
              </small>
              <b>{date.slice(8, 10)}</b>
              <strong>{date === today ? "HOY" : ""}</strong>
              <em>
                {date < today
                  ? "Cerrado"
                  : programs[date]?.generated
                    ? "Programado"
                    : "Editable"}
              </em>
            </button>
          ))}
        </div>
        <button onClick={() => setSelectedDate(addDays(weekStart, 7))}>
          →
        </button>
      </div>
      <div className="scroll-content">
        <div className="allocation-split">
          <span>Distribución disponible</span>
          <div>
            <i style={{ width: `${stationPct}%` }} />
            <u style={{ width: `${directPct}%` }} />
          </div>
          <b>{stationPct}% estaciones</b>
          <b>{directPct}% directos / GRACO</b>
        </div>
        <div className="program-toolbar compact-toolbar">
          <div className="quota-grid">
            <label>
              Diésel · estaciones
              <input
                disabled={locked}
                type="number"
                value={current.stationDiesel}
                onChange={(e) => quota("stationDiesel", e.target.value)}
              />
            </label>
            <label>
              Gasolina · estaciones
              <input
                disabled={locked}
                type="number"
                value={current.stationGas}
                onChange={(e) => quota("stationGas", e.target.value)}
              />
            </label>
            <label>
              Diésel · directos/GRACO
              <input
                disabled={locked}
                type="number"
                value={current.directDiesel}
                onChange={(e) => quota("directDiesel", e.target.value)}
              />
            </label>
            <label>
              Gasolina · directos/GRACO
              <input
                disabled={locked}
                type="number"
                value={current.directGas}
                onChange={(e) => quota("directGas", e.target.value)}
              />
            </label>
          </div>
          <div className="program-buttons">
            <button
              disabled={locked}
              className="primary small"
              onClick={generate}
            >
              Programar día
            </button>
            <button className="secondary" onClick={() => window.print()}>
              Publicación gráfica
            </button>
            {canChooseZone && (
              <button
                className="consolidated-action"
                onClick={() => setSelectedZone("all")}
              >
                Ver consolidado Sucre + Monteagudo
              </button>
            )}
          </div>
        </div>
        {notice && <div className="admin-message">{notice}</div>}
        {locked && (
          <div className="locked-note">
            Cerrado a las 00:00. Disponible únicamente para consulta,
            conciliación e impresión.
          </div>
        )}
        <section className="weekly-control-panel">
          <div className="weekly-control-head">
            <div>
              <small>DÍA PARA PROGRAMAR</small>
              <b>{selectedDate.split("-").reverse().join("/")}</b>
              <span>{locked ? "Cerrado" : "Editable"}</span>
              {selectedDate < today &&
                canEditProgramming &&
                !reopenJustifications[selectedDate] && (
                  <button className="reopen-day" onClick={reopenPastDate}>
                    Reabrir con justificación
                  </button>
                )}
            </div>
            <div
              className="fuel-filter"
              role="group"
              aria-label="Filtrar combustible"
            >
              <button
                className={fuelFilter === "both" ? "active" : ""}
                onClick={() => setFuelFilter("both")}
              >
                Ambos
              </button>
              <button
                className={fuelFilter === "diesel" ? "active diesel" : "diesel"}
                onClick={() => setFuelFilter("diesel")}
              >
                Solo diésel
              </button>
              <button
                className={fuelFilter === "gas" ? "active gas" : "gas"}
                onClick={() => setFuelFilter("gas")}
              >
                Solo gasolina
              </button>
            </div>
            <div className="weekly-actions">
              <button
                disabled={locked}
                className="primary small"
                onClick={generate}
              >
                Programación automática
              </button>
              <button className="secondary" onClick={() => window.print()}>
                Publicación gráfica
              </button>
              {canChooseZone && (
                <button
                  className="consolidated-action"
                  onClick={() => setSelectedZone("all")}
                >
                  Consolidado
                </button>
              )}
            </div>
          </div>
          <div className="report-range-controls">
            <label>
              Reporte desde
              <input
                type="date"
                value={reportFrom}
                onChange={(event) => setReportFrom(event.target.value)}
              />
            </label>
            <label>
              Hasta
              <input
                type="date"
                min={reportFrom}
                value={reportTo}
                onChange={(event) => setReportTo(event.target.value)}
              />
            </label>
            <span>{reportRows.length} registros programados</span>
            <button
              className="secondary"
              disabled={!reportRows.length}
              onClick={() => window.print()}
            >
              Imprimir / PDF
            </button>
            <button
              className="excel-action"
              disabled={!reportRows.length}
              onClick={() =>
                exportProgrammingExcel(
                  `programacion-${activeZone.label}-${reportFrom}-${reportTo}`,
                  reportRows,
                )
              }
            >
              Descargar Excel
            </button>
          </div>
          <div className="weekly-quota-grid">
            <label>
              Diésel · estaciones
              <input
                disabled={locked}
                type="number"
                min="0"
                value={current.stationDiesel || ""}
                placeholder="0"
                onChange={(event) => quota("stationDiesel", event.target.value)}
              />
            </label>
            <label>
              Gasolina · estaciones
              <input
                disabled={locked}
                type="number"
                min="0"
                value={current.stationGas || ""}
                placeholder="0"
                onChange={(event) => quota("stationGas", event.target.value)}
              />
            </label>
            <label>
              Diésel · directos/GRACO
              <input
                disabled={locked}
                type="number"
                min="0"
                value={current.directDiesel || ""}
                placeholder="0"
                onChange={(event) => quota("directDiesel", event.target.value)}
              />
            </label>
            <label>
              Gasolina · directos/GRACO
              <input
                disabled={locked}
                type="number"
                min="0"
                value={current.directGas || ""}
                placeholder="0"
                onChange={(event) => quota("directGas", event.target.value)}
              />
            </label>
          </div>
          <div className="programming-percentages">
            <div>
              <span>Diésel {dieselPct}%</span>
              <i>
                <b style={{ width: `${dieselPct}%` }} />
                <em style={{ width: `${gasPct}%` }} />
              </i>
              <span>Gasolina {gasPct}%</span>
            </div>
            <div>
              <span>Automático {autoPct}%</span>
              <i className="auto-line">
                <b style={{ width: `${autoPct}%` }} />
                <em style={{ width: `${manualPct}%` }} />
              </i>
              <span>Manual {manualPct}%</span>
            </div>
          </div>
        </section>
        <section className="kpi-grid">
          <Kpi
            label="MÁXIMO DE LA SEMANA"
            value={`${fmt(maxDay.d + maxDay.g)} L`}
            note={
              prodeDaily
                ? "Comparado con PRODE"
                : "Línea PRODE pendiente de carga"
            }
          />
          <Kpi
            label="DISPONIBLE PARA EL DÍA"
            value={`${fmt(available)} L`}
            note={`${fmt(totalD + totalG)} L actualmente asignados`}
            tone="green"
          />
          <Kpi
            label="ASIGNACIÓN AUTOMÁTICA"
            value={`${autoPct}%`}
            note="Aprende del mismo día de semanas anteriores"
            tone="violet"
          />
          <Kpi
            label="AJUSTE MANUAL"
            value={`${manualPct}%`}
            note="Debe disminuir al aprender el patrón"
            tone="amber"
          />
        </section>
        <article className="card weekly-graphic">
          <CardHead
            title="Programación semanal y línea PRODE"
            subtitle={
              prodeDaily
                ? `PRODE diario ${fmt(prodeDaily)} L`
                : "La referencia aparecerá al cargar el PRODE"
            }
          />
          <div className="week-bars improved">
            {weekTotals.map((item) => (
              <div key={item.date}>
                <span>{fmt(item.d + item.g)}</span>
                <i>
                  <u
                    style={{
                      height: `${(item.d / Math.max(1, maxDay.d + maxDay.g)) * 130}px`,
                    }}
                  />
                  <em
                    style={{
                      height: `${(item.g / Math.max(1, maxDay.d + maxDay.g)) * 130}px`,
                    }}
                  />
                </i>
                <b>{item.date.slice(8, 10)}</b>
                <small>
                  D {fmt(item.d)} · G {fmt(item.g)}
                </small>
              </div>
            ))}
          </div>
        </article>
        <article className="card week-table editable-week-table">
          <header className="weekly-table-toolbar">
            <div>
              <h2>Programación semanal · {activeZone.label}</h2>
              <p>
                {weekStart.split("-").reverse().join("/")} al{" "}
                {week[6].split("-").reverse().join("/")} · Los cambios se
                guardan automáticamente
              </p>
            </div>
            <label>
              <input
                type="checkbox"
                checked={hideUnprogrammed}
                onChange={(event) => setHideUnprogrammed(event.target.checked)}
              />{" "}
              Ocultar clientes sin programación
            </label>
          </header>
          <div className="fuel-legend">
            <span className="diesel-key">Diésel</span>
            <span className="gas-key">Gasolina</span>
            <small>Hoy y días futuros editables · Días pasados cerrados</small>
          </div>
          <div className="program-table">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  {week.map((date) => (
                    <th
                      key={date}
                      className={
                        date < today
                          ? "past"
                          : date === today
                            ? "today"
                            : "future"
                      }
                    >
                      <b>
                        {
                          ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"][
                            new Date(`${date}T12:00:00`).getDay()
                          ]
                        }{" "}
                        {date.slice(8, 10)}
                      </b>
                      <small>
                        {date < today
                          ? "Pasado"
                          : date === today
                            ? "Hoy"
                            : "Futuro"}
                      </small>
                    </th>
                  ))}
                  <th className="row-total-head">Total semanal</th>
                </tr>
              </thead>
              <tbody>
                {visibleClients.map((client) => {
                  const rowDiesel = week.reduce(
                      (sum, date) =>
                        sum +
                        (programs[date]?.rows.find(
                          (item) => item.name === client.name,
                        )?.programmedDiesel || 0),
                      0,
                    ),
                    rowGas = week.reduce(
                      (sum, date) =>
                        sum +
                        (programs[date]?.rows.find(
                          (item) => item.name === client.name,
                        )?.programmedGas || 0),
                      0,
                    );
                  return (
                    <tr key={client.name}>
                      <td>
                        <strong>{client.name}</strong>
                        <small>
                          {client.category === "station"
                            ? "EESS"
                            : "Directo / GRACO"}
                        </small>
                      </td>
                      {week.map((date) => {
                        const row = programs[date]?.rows.find(
                            (item) => item.name === client.name,
                          ),
                          disabled = date < today || !canEditProgramming;
                        return (
                          <td
                            key={date}
                            className={
                              date < today
                                ? "past"
                                : date === today
                                  ? "today"
                                  : "future"
                            }
                          >
                            <label className="weekly-fuel diesel">
                              <span>D</span>
                              <input
                                aria-label={`Diésel ${client.name} ${date}`}
                                disabled={disabled}
                                type="number"
                                min="0"
                                value={row?.programmedDiesel || ""}
                                placeholder="0"
                                onChange={(event) =>
                                  editWeekCell(
                                    date,
                                    client.name,
                                    "programmedDiesel",
                                    event.target.value,
                                  )
                                }
                              />
                            </label>
                            <label className="weekly-fuel gas">
                              <span>G</span>
                              <input
                                aria-label={`Gasolina ${client.name} ${date}`}
                                disabled={disabled}
                                type="number"
                                min="0"
                                value={row?.programmedGas || ""}
                                placeholder="0"
                                onChange={(event) =>
                                  editWeekCell(
                                    date,
                                    client.name,
                                    "programmedGas",
                                    event.target.value,
                                  )
                                }
                              />
                            </label>
                          </td>
                        );
                      })}
                      <td className="row-total">
                        <b className="diesel-total">D {fmt(rowDiesel)}</b>
                        <b className="gas-total">G {fmt(rowGas)}</b>
                        <strong>{fmt(rowDiesel + rowGas)} L</strong>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td>
                    <strong>TOTAL POR DÍA</strong>
                    <small>{visibleClients.length} clientes visibles</small>
                  </td>
                  {weekTotals.map((item) => (
                    <td key={item.date}>
                      <b className="diesel-total">D {fmt(item.d)}</b>
                      <b className="gas-total">G {fmt(item.g)}</b>
                      <strong>{fmt(item.d + item.g)} L</strong>
                    </td>
                  ))}
                  <td className="grand-total">
                    <b className="diesel-total">
                      D {fmt(weekTotals.reduce((sum, item) => sum + item.d, 0))}
                    </b>
                    <b className="gas-total">
                      G {fmt(weekTotals.reduce((sum, item) => sum + item.g, 0))}
                    </b>
                    <strong>
                      {fmt(
                        weekTotals.reduce(
                          (sum, item) => sum + item.d + item.g,
                          0,
                        ),
                      )}{" "}
                      L
                    </strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </article>
        <article className="card program-report">
          <header className="publication-head">
            <div>
              <small>YPFB · DISTRITO COMERCIAL CHUQUISACA</small>
              <h2>Programación de combustibles</h2>
              <p>
                {selectedDate.split("-").reverse().join("/")} · Semana{" "}
                {weekStart.split("-").reverse().join("/")} al{" "}
                {week[6].split("-").reverse().join("/")}
              </p>
            </div>
            <span>{locked ? "Cerrado" : "Borrador editable"}</span>
          </header>
          <div className="program-table compact">
            <table>
              <thead>
                <tr>
                  <th>Cliente / estación</th>
                  <th>Tipo</th>
                  <th>Compartimientos</th>
                  <th>Diésel</th>
                  <th>Gasolina</th>
                  <th>Origen</th>
                </tr>
              </thead>
              <tbody>
                {current.rows.map((row, index) => (
                  <tr key={row.name}>
                    <td>
                      <strong>{row.name}</strong>
                    </td>
                    <td>
                      {row.category === "station" ? "EESS" : "Directo / GRACO"}
                    </td>
                    <td>
                      {row.compartments.length
                        ? row.compartments.map(fmt).join(" + ")
                        : "Manual"}
                    </td>
                    <td>
                      <input
                        disabled={locked}
                        className="programmed"
                        type="number"
                        value={row.programmedDiesel || ""}
                        onChange={(e) =>
                          edit(index, "programmedDiesel", e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        disabled={locked}
                        className="programmed"
                        type="number"
                        value={row.programmedGas || ""}
                        onChange={(e) =>
                          edit(index, "programmedGas", e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <span
                        className={row.manual ? "origin manual" : "origin auto"}
                      >
                        {row.manual ? "Manual" : "Automático"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>TOTAL</td>
                  <td />
                  <td />
                  <td>{fmt(totalD)}</td>
                  <td>{fmt(totalG)}</td>
                  <td>
                    {autoPct}% / {manualPct}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </article>
        <article className="card dispatch-control">
          <CardHead
            title="Conciliación de despachos"
            subtitle="Carga diaria y seguimiento de pendientes hasta completar"
          />
          <div className="dispatch-upload">
            <label>
              Subir despacho del día anterior
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setDispatchFile(e.target.files?.[0] || null)}
              />
            </label>
            <div>
              <b>
                {dispatchFile?.name || "Despachos Cisternas 19-08-2026.pdf"}
              </b>
              <span>
                {dispatchFile
                  ? "PDF listo para validar"
                  : "Ejemplo real analizado"}
              </span>
            </div>
            <button className="primary small" onClick={reconcile}>
              Validar y conciliar
            </button>
          </div>
          <div className="reconcile-kpis">
            <div>
              <span>Programado</span>
              <b>{fmt(totalD + totalG)} L</b>
            </div>
            <div>
              <span>Despachado</span>
              <b>{fmt(dispatchedD + dispatchedG)} L</b>
            </div>
            <div>
              <span>Pendiente diésel</span>
              <b>{fmt(pendingD)} L</b>
            </div>
            <div>
              <span>Pendiente gasolina</span>
              <b>{fmt(pendingG)} L</b>
            </div>
          </div>
          {Object.keys(dispatches).length > 0 && (
            <div className="reconcile-ok">
              Conciliación {selectedDate.split("-").reverse().join("/")}:{" "}
              {fmt(dispatchedD)} L DO y {fmt(dispatchedG)} L GE identificados
              por cliente y orden.
            </div>
          )}
        </article>
        <section className="print-publication">
          <header>
            <div>
              <small>YPFB · DISTRITO COMERCIAL CHUQUISACA</small>
              <h1>Reporte operativo de programación</h1>
              <p>
                Zona Comercial {activeZone.label} · Emitido el{" "}
                {today.split("-").reverse().join("/")}
              </p>
            </div>
            <b>CONTROL COMERCIAL</b>
          </header>
          <div className="print-kpis">
            <div>
              <span>PROGRAMADO HOY</span>
              <strong>{fmt(todaySum.d + todaySum.g)} L</strong>
              <small>
                DO {fmt(todaySum.d)} · GE {fmt(todaySum.g)}
              </small>
            </div>
            <div>
              <span>DESPACHADO AYER</span>
              <strong>
                {fmt(yesterdayDispatchedD + yesterdayDispatchedG)} L
              </strong>
              <small>
                DO {fmt(yesterdayDispatchedD)} · GE {fmt(yesterdayDispatchedG)}
              </small>
            </div>
            <div>
              <span>PENDIENTE DE AYER</span>
              <strong>
                {fmt(
                  Math.max(
                    0,
                    yesterdaySum.d +
                      yesterdaySum.g -
                      yesterdayDispatchedD -
                      yesterdayDispatchedG,
                  ),
                )}{" "}
                L
              </strong>
              <small>Seguimiento hasta completar</small>
            </div>
            <div>
              <span>FUTURO PROGRAMADO</span>
              <strong>
                {fmt(futureSummary.reduce((s, r) => s + r.d + r.g, 0))} L
              </strong>
              <small>
                {futureSummary.filter((r) => r.d + r.g > 0).length} días con
                asignación
              </small>
            </div>
          </div>
          <div className="print-panels">
            <article>
              <h2>Programado vs. despachado de ayer</h2>
              {[
                ["Diésel", yesterdaySum.d, yesterdayDispatchedD],
                ["Gasolina", yesterdaySum.g, yesterdayDispatchedG],
              ].map(([label, planned, sent]) => (
                <div className="compare-row" key={String(label)}>
                  <b>{label}</b>
                  <span>
                    <i
                      style={{
                        width: `${(Number(planned) / compareMax) * 100}%`,
                      }}
                    />
                    <em
                      style={{ width: `${(Number(sent) / compareMax) * 100}%` }}
                    />
                  </span>
                  <small>
                    Programado {fmt(Number(planned))} · Despachado{" "}
                    {fmt(Number(sent))}
                  </small>
                </div>
              ))}
              <footer>
                <i /> Programado <em /> Despachado
              </footer>
            </article>
            <article>
              <h2>Transparencia de la programación de hoy</h2>
              <div className="percentage">
                <span>
                  <i style={{ width: `${todayStationPct}%` }} />
                  <em style={{ width: `${todayDirectPct}%` }} />
                </span>
                <b>{todayStationPct}% estaciones</b>
                <b>{todayDirectPct}% directos / GRACO</b>
              </div>
              <div className="percentage auto">
                <span>
                  <i style={{ width: `${todayAutoPct}%` }} />
                  <em style={{ width: `${todayManualPct}%` }} />
                </span>
                <b>{todayAutoPct}% automático</b>
                <b>{todayManualPct}% ajuste manual</b>
              </div>
              <p>
                La programación combina criterios estadísticos, capacidades
                completas de cisternas y ajustes operativos auditables.
              </p>
            </article>
          </div>
          <article className="print-section">
            <h2>Programación de hoy por cliente</h2>
            <table>
              <thead>
                <tr>
                  <th>Cliente / estación</th>
                  <th>Clasificación</th>
                  <th>Diésel</th>
                  <th>Gasolina</th>
                  <th>Origen</th>
                </tr>
              </thead>
              <tbody>
                {todayPlan.rows
                  .filter((r) => r.programmedDiesel + r.programmedGas > 0)
                  .map((row) => (
                    <tr key={row.name}>
                      <td>{row.name}</td>
                      <td>
                        {row.category === "station"
                          ? "EESS"
                          : "Directo / GRACO"}
                      </td>
                      <td>{fmt(row.programmedDiesel)} L</td>
                      <td>{fmt(row.programmedGas)} L</td>
                      <td>{row.manual ? "Ajuste manual" : "Automático"}</td>
                    </tr>
                  ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}>TOTAL HOY</td>
                  <td>{fmt(todaySum.d)} L</td>
                  <td>{fmt(todaySum.g)} L</td>
                  <td>{todayAutoPct}% automático</td>
                </tr>
              </tfoot>
            </table>
          </article>
          <article className="print-section future-print">
            <h2>Programación futura de la semana</h2>
            <div>
              {futureSummary.map((item) => (
                <section
                  key={item.date}
                  className={item.d + item.g ? "has-program" : "empty"}
                >
                  <small>
                    {
                      [
                        "Domingo",
                        "Lunes",
                        "Martes",
                        "Miércoles",
                        "Jueves",
                        "Viernes",
                        "Sábado",
                      ][new Date(`${item.date}T12:00:00`).getDay()]
                    }
                  </small>
                  <b>{item.date.slice(8, 10)}</b>
                  <strong>{fmt(item.d + item.g)} L</strong>
                  <span>
                    DO {fmt(item.d)} · GE {fmt(item.g)}
                  </span>
                </section>
              ))}
            </div>
          </article>
          <footer className="print-note">
            Reporte generado por Control Comercial · Programación trazable y
            sujeta a conciliación con despachos reales.
          </footer>
        </section>
      </div>
    </section>
  );
}

function ZoneSelector({
  selected,
  canConsolidate,
  onChange,
}: {
  selected: string;
  canConsolidate: boolean;
  onChange: (zone: string) => void;
}) {
  return (
    <div className="zone-selector">
      <div>
        <small>ZONA COMERCIAL</small>
        <strong>
          {selected === "all"
            ? "Consolidado DCCH"
            : zoneCatalog[selected]?.label || "Sucre"}
        </strong>
      </div>
      {canConsolidate ? (
        <>
          <button
            className={selected === "sucre" ? "active" : ""}
            onClick={() => onChange("sucre")}
          >
            Sucre
          </button>
          <button
            className={selected === "monteagudo" ? "active" : ""}
            onClick={() => onChange("monteagudo")}
          >
            Monteagudo
          </button>
          <button
            className={selected === "all" ? "active" : ""}
            onClick={() => onChange("all")}
          >
            Consolidado
          </button>
        </>
      ) : (
        <button className="active">
          {zoneCatalog[selected]?.label || "Sucre"}
        </button>
      )}
    </div>
  );
}

function ProgrammingConsolidated({
  token,
  districtId,
  onZoneChange,
}: {
  token: string;
  districtId: string;
  onZoneChange: (zone: string) => void;
}) {
  const today = iso(new Date()),
    [selectedDate, setSelectedDate] = useState(today),
    [data, setData] = useState<Record<string, Record<string, DayProgram>>>({
      sucre: {},
      monteagudo: {},
    }),
    [reportFrom, setReportFrom] = useState(today),
    [reportTo, setReportTo] = useState(today),
    [message, setMessage] = useState("Cargando consolidado…");
  const weekStart = mondayOf(selectedDate),
    week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  useEffect(() => {
    const loadDates = Array.from(
      new Set([...week, ...dateRange(reportFrom, reportTo)]),
    );
    Promise.all([
      loadProgrammingDays(token, loadDates, districtId, "sucre"),
      loadProgrammingDays(token, loadDates, districtId, "monteagudo"),
    ])
      .then(([sucre, monteagudo]) => {
        setData({
          sucre: { ...seededPrograms("sucre"), ...sucre },
          monteagudo,
        });
        setMessage("");
      })
      .catch((error) => setMessage(error.message));
  }, [token, districtId, weekStart, reportFrom, reportTo]);
  const fmt = (value: number) => new Intl.NumberFormat("es-BO").format(value);
  const sum = (
    zone: string,
    date: string,
    product: "programmedDiesel" | "programmedGas",
  ) =>
    data[zone]?.[date]?.rows.reduce((total, row) => total + row[product], 0) ||
    0;
  const rows = ["sucre", "monteagudo"].map((zone) => ({
    zone,
    label: zoneCatalog[zone].label,
    diesel: week.reduce(
      (total, date) => total + sum(zone, date, "programmedDiesel"),
      0,
    ),
    gas: week.reduce(
      (total, date) => total + sum(zone, date, "programmedGas"),
      0,
    ),
  }));
  const totalD = rows.reduce((total, row) => total + row.diesel, 0),
    totalG = rows.reduce((total, row) => total + row.gas, 0),
    maxDay = Math.max(
      1,
      ...week.map((date) =>
        ["sucre", "monteagudo"].reduce(
          (total, zone) =>
            total +
            sum(zone, date, "programmedDiesel") +
            sum(zone, date, "programmedGas"),
          0,
        ),
      ),
    );
  const dayRows = week
    .map((date) => ({
      date,
      diesel: ["sucre", "monteagudo"].reduce(
        (total, zone) => total + sum(zone, date, "programmedDiesel"),
        0,
      ),
      gas: ["sucre", "monteagudo"].reduce(
        (total, zone) => total + sum(zone, date, "programmedGas"),
        0,
      ),
    }))
    .filter((item) => item.diesel + item.gas > 0);
  const reportRows: ProgrammingExportRow[] = dateRange(
    reportFrom,
    reportTo,
  ).flatMap((date) =>
    ["sucre", "monteagudo"].flatMap((zone) =>
      (data[zone]?.[date]?.rows || [])
        .filter((row) => row.programmedDiesel + row.programmedGas > 0)
        .map((row) => ({
          date,
          zone: zoneCatalog[zone].label,
          client: row.name,
          diesel: row.programmedDiesel,
          gas: row.programmedGas,
        })),
    ),
  );
  return (
    <section className="programming workspace-scroll">
      <ZoneSelector selected="all" canConsolidate onChange={onZoneChange} />
      <ProgrammingRangePublication
        title="Reporte consolidado de programación"
        subtitle={`Sucre + Monteagudo · ${reportFrom.split("-").reverse().join("/")} al ${reportTo.split("-").reverse().join("/")}`}
        rows={reportRows}
      />
      <div className="week-nav sticky-week">
        <button onClick={() => setSelectedDate(addDays(weekStart, -7))}>
          ←
        </button>
        <div>
          {week.map((date) => (
            <button
              key={date}
              className={`${date === selectedDate ? "selected " : ""}${date === today ? "current-day" : ""}`.trim()}
              onClick={() => setSelectedDate(date)}
            >
              <small>
                {
                  ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"][
                    new Date(`${date}T12:00:00`).getDay()
                  ]
                }
              </small>
              <b>{date.slice(8, 10)}</b>
              <strong>{date === today ? "HOY" : ""}</strong>
              <em>{date < today ? "Cerrado" : "Consulta"}</em>
            </button>
          ))}
        </div>
        <button onClick={() => setSelectedDate(addDays(weekStart, 7))}>
          →
        </button>
      </div>
      <div className="scroll-content">
        {message && <div className="admin-message">{message}</div>}
        <section className="consolidated-report-controls">
          <div>
            <h2>Publicación consolidada</h2>
            <p>
              Sucre y Monteagudo en un solo reporte, únicamente con datos
              programados.
            </p>
          </div>
          <label>
            Desde
            <input
              type="date"
              value={reportFrom}
              onChange={(event) => setReportFrom(event.target.value)}
            />
          </label>
          <label>
            Hasta
            <input
              type="date"
              min={reportFrom}
              value={reportTo}
              onChange={(event) => setReportTo(event.target.value)}
            />
          </label>
          <button
            className="primary"
            disabled={!reportRows.length}
            onClick={() => window.print()}
          >
            Imprimir / PDF consolidado
          </button>
          <button
            className="excel-action"
            disabled={!reportRows.length}
            onClick={() =>
              exportProgrammingExcel(
                `programacion-consolidada-${reportFrom}-${reportTo}`,
                reportRows,
              )
            }
          >
            Descargar Excel consolidado
          </button>
        </section>
        <section className="kpi-grid">
          <Kpi
            label="TOTAL CONSOLIDADO"
            value={`${fmt(totalD + totalG)} L`}
            note="Sucre + Monteagudo"
          />
          <Kpi
            label="DIÉSEL"
            value={`${fmt(totalD)} L`}
            note="Programación semanal"
            tone="violet"
          />
          <Kpi
            label="GASOLINA"
            value={`${fmt(totalG)} L`}
            note="Programación semanal"
            tone="green"
          />
          <Kpi
            label="ZONAS INCLUIDAS"
            value="2"
            note="DCCH Chuquisaca"
            tone="amber"
          />
        </section>
        <article className="card weekly-graphic">
          <CardHead
            title="Consolidado semanal por día"
            subtitle="Suma de las zonas comerciales seleccionadas"
          />
          <div className="week-bars improved">
            {week.map((date) => {
              const d = ["sucre", "monteagudo"].reduce(
                  (total, zone) => total + sum(zone, date, "programmedDiesel"),
                  0,
                ),
                g = ["sucre", "monteagudo"].reduce(
                  (total, zone) => total + sum(zone, date, "programmedGas"),
                  0,
                );
              return (
                <div key={date}>
                  <span>{fmt(d + g)}</span>
                  <i>
                    <u style={{ height: `${(d / maxDay) * 130}px` }} />
                    <em style={{ height: `${(g / maxDay) * 130}px` }} />
                  </i>
                  <b>{date.slice(8, 10)}</b>
                  <small>
                    D {fmt(d)} · G {fmt(g)}
                  </small>
                </div>
              );
            })}
          </div>
        </article>
        <article className="card consolidated-table">
          <CardHead
            title="Reporte por zona comercial"
            subtitle={`Semana ${weekStart.split("-").reverse().join("/")} al ${week[6].split("-").reverse().join("/")}`}
          />
          <table>
            <thead>
              <tr>
                <th>Zona</th>
                <th>Diésel</th>
                <th>Gasolina</th>
                <th>Total</th>
                <th>Participación</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.zone}>
                  <td>
                    <strong>{row.label}</strong>
                  </td>
                  <td>{fmt(row.diesel)} L</td>
                  <td>{fmt(row.gas)} L</td>
                  <td>{fmt(row.diesel + row.gas)} L</td>
                  <td>
                    {Math.round(
                      ((row.diesel + row.gas) / Math.max(1, totalD + totalG)) *
                        100,
                    )}
                    %
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>CONSOLIDADO DCCH</td>
                <td>{fmt(totalD)} L</td>
                <td>{fmt(totalG)} L</td>
                <td>{fmt(totalD + totalG)} L</td>
                <td>100%</td>
              </tr>
            </tfoot>
          </table>
          <footer>
            <button
              className="primary consolidated-print-button"
              onClick={() => window.print()}
            >
              Publicación gráfica consolidada
            </button>
          </footer>
        </article>
        <section className="print-publication consolidated-print">
          <header>
            <div>
              <small>YPFB · DISTRITO COMERCIAL CHUQUISACA</small>
              <h1>Reporte consolidado de programación</h1>
              <p>
                Zonas Comerciales Sucre + Monteagudo · Emitido el{" "}
                {today.split("-").reverse().join("/")}
              </p>
            </div>
            <b>CONTROL COMERCIAL</b>
          </header>
          <div className="print-kpis">
            <div>
              <span>TOTAL SEMANAL</span>
              <strong>{fmt(totalD + totalG)} L</strong>
              <small>Consolidado de las dos zonas</small>
            </div>
            <div>
              <span>DIÉSEL</span>
              <strong>{fmt(totalD)} L</strong>
              <small>Programación consolidada</small>
            </div>
            <div>
              <span>GASOLINA</span>
              <strong>{fmt(totalG)} L</strong>
              <small>Programación consolidada</small>
            </div>
            <div>
              <span>ZONAS INCLUIDAS</span>
              <strong>2</strong>
              <small>Sucre + Monteagudo</small>
            </div>
          </div>
          <article className="print-section">
            <h2>Consolidado por zona comercial</h2>
            <table>
              <thead>
                <tr>
                  <th>Zona comercial</th>
                  <th>Diésel</th>
                  <th>Gasolina</th>
                  <th>Total</th>
                  <th>Participación</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.zone}>
                    <td>{row.label}</td>
                    <td>{fmt(row.diesel)} L</td>
                    <td>{fmt(row.gas)} L</td>
                    <td>{fmt(row.diesel + row.gas)} L</td>
                    <td>
                      {Math.round(
                        ((row.diesel + row.gas) /
                          Math.max(1, totalD + totalG)) *
                          100,
                      )}
                      %
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>TOTAL DCCH</td>
                  <td>{fmt(totalD)} L</td>
                  <td>{fmt(totalG)} L</td>
                  <td>{fmt(totalD + totalG)} L</td>
                  <td>100%</td>
                </tr>
              </tfoot>
            </table>
          </article>
          <article className="print-section future-print">
            <h2>Programación consolidada por día</h2>
            <div>
              {dayRows.map((item) => (
                <section
                  key={item.date}
                  className={item.diesel + item.gas ? "has-program" : "empty"}
                >
                  <small>
                    {
                      [
                        "Domingo",
                        "Lunes",
                        "Martes",
                        "Miércoles",
                        "Jueves",
                        "Viernes",
                        "Sábado",
                      ][new Date(item.date + "T12:00:00").getDay()]
                    }
                  </small>
                  <b>{item.date.slice(8, 10)}</b>
                  <strong>{fmt(item.diesel + item.gas)} L</strong>
                  <span>
                    DO {fmt(item.diesel)} · GE {fmt(item.gas)}
                  </span>
                </section>
              ))}
            </div>
          </article>
          <footer className="print-note">
            Reporte consolidado de las zonas comerciales seleccionadas ·
            Información trazable por zona y fecha.
          </footer>
        </section>
      </div>
    </section>
  );
}

function ProgramacionesLegacy({ token }: { token: string }) {
  const today = iso(new Date()),
    [selectedDate, setSelectedDate] = useState("2026-08-24"),
    [programs, setPrograms] =
      useState<Record<string, DayProgram>>(seededPrograms);
  const weekStart = mondayOf(selectedDate),
    week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const current = programs[selectedDate] || emptyDay(),
    locked = selectedDate < today;
  const [saveMessage, setSaveMessage] = useState("");
  const [dispatchFile, setDispatchFile] = useState("");
  useEffect(() => {
    loadProgrammingDays(token, week)
      .then((saved) => setPrograms((all) => ({ ...all, ...saved })))
      .catch((error) => setSaveMessage(error.message));
  }, [token, weekStart]);
  const fmt = (value: number) => new Intl.NumberFormat("es-BO").format(value);
  function updateCurrent(next: DayProgram) {
    if (!locked) setPrograms((all) => ({ ...all, [selectedDate]: next }));
  }
  function quota(
    field: keyof Pick<
      DayProgram,
      "stationDiesel" | "stationGas" | "directDiesel" | "directGas"
    >,
    value: string,
  ) {
    updateCurrent({ ...current, [field]: Math.max(0, Number(value) || 0) });
  }
  function automatic() {
    let remD = current.stationDiesel,
      remG = current.stationGas;
    const rows = current.rows.map((row, index) => {
      if (row.category === "direct")
        return {
          ...row,
          programmedDiesel: 0,
          programmedGas: 0,
          autoDiesel: 0,
          autoGas: 0,
          manual: false,
        };
      const frequency = Math.max(
        1,
        Math.round(
          row.compartments.reduce((a, b) => a + b, 0) /
            Math.max(1, row.diesel + row.gas),
        ),
      );
      if (
        (index + new Date(`${selectedDate}T12:00:00`).getDay()) % frequency !==
        0
      )
        return {
          ...row,
          programmedDiesel: 0,
          programmedGas: 0,
          autoDiesel: 0,
          autoGas: 0,
          manual: false,
        };
      let diesel = 0,
        gas = 0;
      for (const capacity of row.compartments) {
        const needD = remD / Math.max(1, current.stationDiesel),
          needG = remG / Math.max(1, current.stationGas);
        if (needD >= needG && remD >= capacity) {
          diesel += capacity;
          remD -= capacity;
        } else if (remG >= capacity) {
          gas += capacity;
          remG -= capacity;
        } else if (remD >= capacity) {
          diesel += capacity;
          remD -= capacity;
        }
      }
      return {
        ...row,
        programmedDiesel: diesel,
        programmedGas: gas,
        autoDiesel: diesel,
        autoGas: gas,
        manual: false,
      };
    });
    let directD = current.directDiesel,
      directG = current.directGas;
    const directs = rows
      .map((row, i) => ({ row, i }))
      .filter((x) => x.row.category === "direct");
    directs.forEach((entry, i) => {
      const active =
        (i + new Date(`${selectedDate}T12:00:00`).getDay()) % 4 === 0;
      if (!active) return;
      const d = Math.min(directD, 10000),
        g = Math.min(directG, 10000);
      directD -= d;
      directG -= g;
      rows[entry.i] = {
        ...entry.row,
        programmedDiesel: d,
        programmedGas: g,
        autoDiesel: d,
        autoGas: g,
        manual: false,
      };
    });
    const next = { ...current, rows, generated: true };
    updateCurrent(next);
    saveProgrammingDay(token, selectedDate, next, 100)
      .then(() => setSaveMessage("Programación automática guardada."))
      .catch((error) => setSaveMessage(error.message));
  }
  function edit(
    index: number,
    field: "programmedDiesel" | "programmedGas",
    value: string,
  ) {
    const next = {
      ...current,
      rows: current.rows.map((row, i) =>
        i === index
          ? { ...row, [field]: Math.max(0, Number(value) || 0), manual: true }
          : row,
      ),
    };
    updateCurrent(next);
    const volume = next.rows.reduce(
        (s, r) => s + r.programmedDiesel + r.programmedGas,
        0,
      ),
      auto = next.rows.reduce(
        (s, r) => s + (r.manual ? 0 : r.programmedDiesel + r.programmedGas),
        0,
      );
    saveProgrammingDay(
      token,
      selectedDate,
      next,
      Math.round((auto / Math.max(1, volume)) * 100),
    )
      .then(() => setSaveMessage("Ajuste manual guardado."))
      .catch((error) => setSaveMessage(error.message));
  }
  const total = (field: "programmedDiesel" | "programmedGas") =>
      current.rows.reduce((sum, row) => sum + row[field], 0),
    totalD = total("programmedDiesel"),
    totalG = total("programmedGas");
  const autoVolume = current.rows.reduce(
      (s, r) => s + (r.manual ? 0 : r.programmedDiesel + r.programmedGas),
      0,
    ),
    allVolume = totalD + totalG,
    autoPct = Math.round((autoVolume / Math.max(1, allVolume)) * 100),
    manualPct = allVolume ? 100 - autoPct : 0;
  const weekTotals = week.map((date) => {
      const p = programs[date];
      return {
        date,
        d: p?.rows.reduce((s, r) => s + r.programmedDiesel, 0) || 0,
        g: p?.rows.reduce((s, r) => s + r.programmedGas, 0) || 0,
      };
    }),
    maxDay = weekTotals.reduce(
      (best, item) => (item.d + item.g > best.d + best.g ? item : best),
      weekTotals[0],
    );
  const availableTotal =
      current.stationDiesel +
      current.stationGas +
      current.directDiesel +
      current.directGas,
    stationShare = Math.round(
      ((current.stationDiesel + current.stationGas) /
        Math.max(1, availableTotal)) *
        100,
    ),
    directShare = 100 - stationShare;
  const dispatches = selectedDate === "2026-08-19" ? dispatch1908 : {},
    dispatchedD = Object.values(dispatches).reduce((s, v) => s + v[0], 0),
    dispatchedG = Object.values(dispatches).reduce((s, v) => s + v[1], 0),
    pendingD = Math.max(0, totalD - dispatchedD),
    pendingG = Math.max(0, totalG - dispatchedG);
  return (
    <section className="programming">
      <div className="week-nav">
        <button onClick={() => setSelectedDate(addDays(weekStart, -7))}>
          ← Semana anterior
        </button>
        <div>
          {week.map((date) => (
            <button
              key={date}
              className={date === selectedDate ? "selected" : ""}
              onClick={() => setSelectedDate(date)}
            >
              <small>
                {
                  ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"][
                    new Date(`${date}T12:00:00`).getDay()
                  ]
                }
              </small>
              <b>{date.slice(8, 10)}</b>
              <em>
                {date < today
                  ? "Cerrado"
                  : programs[date]?.generated
                    ? "Programado"
                    : "Editable"}
              </em>
            </button>
          ))}
        </div>
        <button onClick={() => setSelectedDate(addDays(weekStart, 7))}>
          Semana siguiente →
        </button>
      </div>
      <div className="program-toolbar">
        <div className="quota-grid">
          <label>
            Diésel · estaciones
            <input
              disabled={locked}
              type="number"
              value={current.stationDiesel}
              onChange={(e) => quota("stationDiesel", e.target.value)}
            />
          </label>
          <label>
            Gasolina · estaciones
            <input
              disabled={locked}
              type="number"
              value={current.stationGas}
              onChange={(e) => quota("stationGas", e.target.value)}
            />
          </label>
          <label>
            Diésel · directos/GRACO
            <input
              disabled={locked}
              type="number"
              value={current.directDiesel}
              onChange={(e) => quota("directDiesel", e.target.value)}
            />
          </label>
          <label>
            Gasolina · directos/GRACO
            <input
              disabled={locked}
              type="number"
              value={current.directGas}
              onChange={(e) => quota("directGas", e.target.value)}
            />
          </label>
        </div>
        <div className="program-buttons">
          <button
            disabled={locked}
            className="primary small"
            onClick={automatic}
          >
            {current.generated ? "Reprogramar día" : "Programar día"}
          </button>
          <button className="secondary" onClick={() => window.print()}>
            Publicación gráfica
          </button>
        </div>
      </div>
      {locked && (
        <div className="locked-note">
          Programación cerrada automáticamente a las 00:00. Solo se permite
          consultar e imprimir.
        </div>
      )}
      <section className="kpi-grid">
        <Kpi
          label="MÁXIMO DE LA SEMANA"
          value={`${fmt(maxDay.d + maxDay.g)} L`}
          note={`${maxDay.date.split("-").reverse().join("/")} · diésel + gasolina`}
        />
        <Kpi
          label="PROGRAMADO HOY"
          value={`${fmt(allVolume)} L`}
          note={`${fmt(totalD)} D · ${fmt(totalG)} G`}
          tone="green"
        />
        <Kpi
          label="ASIGNACIÓN AUTOMÁTICA"
          value={`${autoPct}%`}
          note="Basada en estadística y compartimientos"
          tone="violet"
        />
        <Kpi
          label="AJUSTE MANUAL"
          value={`${manualPct}%`}
          note="Cambios realizados por el alimentador"
          tone="amber"
        />
      </section>
      <article className="card weekly-graphic">
        <CardHead
          title="Resumen gráfico semanal"
          subtitle="Volumen programado por día"
        />
        <div className="week-bars">
          {weekTotals.map((item) => (
            <div key={item.date}>
              <span>{fmt(item.d + item.g)}</span>
              <i
                style={{
                  height: `${Math.max(3, ((item.d + item.g) / Math.max(1, maxDay.d + maxDay.g)) * 100)}%`,
                }}
              />
              <b>{item.date.slice(8, 10)}</b>
              <small>
                D {fmt(item.d)} · G {fmt(item.g)}
              </small>
            </div>
          ))}
        </div>
      </article>
      <article className="card program-report">
        <header className="publication-head">
          <div>
            <small>YPFB · DISTRITO COMERCIAL CHUQUISACA</small>
            <h2>Programación de combustibles</h2>
            <p>
              {selectedDate.split("-").reverse().join("/")} · Semana{" "}
              {weekStart.split("-").reverse().join("/")} al{" "}
              {week[6].split("-").reverse().join("/")}
            </p>
          </div>
          <span>{locked ? "Cerrado" : "Borrador editable"}</span>
        </header>
        <div className="program-table compact">
          <table>
            <thead>
              <tr>
                <th>Cliente / estación</th>
                <th>Tipo</th>
                <th>Compartimientos de cisterna</th>
                <th>Diésel</th>
                <th>Gasolina</th>
                <th>Origen</th>
              </tr>
            </thead>
            <tbody>
              {current.rows.map((row, index) => (
                <tr key={row.name}>
                  <td>
                    <strong>{row.name}</strong>
                  </td>
                  <td>
                    {row.category === "station" ? "EESS" : "Directo / GRACO"}
                  </td>
                  <td>
                    {row.compartments.length
                      ? row.compartments.map(fmt).join(" + ")
                      : "Programación manual"}
                  </td>
                  <td>
                    <input
                      disabled={locked}
                      className="programmed"
                      type="number"
                      value={row.programmedDiesel || ""}
                      onChange={(e) =>
                        edit(index, "programmedDiesel", e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      disabled={locked}
                      className="programmed"
                      type="number"
                      value={row.programmedGas || ""}
                      onChange={(e) =>
                        edit(index, "programmedGas", e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <span
                      className={row.manual ? "origin manual" : "origin auto"}
                    >
                      {row.manual ? "Manual" : "Automático"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>TOTAL PROGRAMADO A DESPACHAR</td>
                <td />
                <td />
                <td>{fmt(totalD)}</td>
                <td>{fmt(totalG)}</td>
                <td>
                  {autoPct}% auto / {manualPct}% manual
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <footer>
          La propuesta automática utiliza demanda histórica y capacidades
          completas de BI, BJ y BK. Los ajustes manuales quedan identificados
          para garantizar transparencia.
        </footer>
      </article>
    </section>
  );
}

function Usuarios({ token }: { token: string }) {
  const [role, setRole] = useState("district_uploader");
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [selected, setSelected] = useState<ManagedUser | null>(null);
  const [districts, setDistricts] = useState<CommercialDistrict[]>([]),
    [zones, setZones] = useState<CommercialZone[]>([]),
    [districtId, setDistrictId] = useState("DCCH");
  const [adminView, setAdminView] = useState<"users" | "structure">("users");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const national = role === "national_viewer";
  async function refreshUsers(selectUid?: string) {
    const data = await listManagedUsers(token);
    setUsers(data);
    if (selectUid)
      setSelected(data.find((user) => user.uid === selectUid) || null);
  }
  async function refreshStructure() {
    const [districtRows, zoneRows] = await Promise.all([
      listCommercialDistricts(token),
      listCommercialZones(token),
    ]);
    setDistricts(districtRows);
    setZones(zoneRows);
  }
  useEffect(() => {
    Promise.all([refreshUsers(), refreshStructure()]).catch((error) =>
      setMessage(error.message),
    );
  }, []);
  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const body = Object.fromEntries(form.entries());
    try {
      const result = await createManagedUser(
        body as Parameters<typeof createManagedUser>[0],
        token,
      );
      await refreshUsers(result.uid);
      setMessage(`Usuario ${result.email} registrado. Ahora asígnale un rol.`);
      formElement.reset();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se pudo crear el usuario.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function assignRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    setMessage("");
    const data = new FormData(event.currentTarget);
    const values = {
      role: String(data.get("role")),
      districtId: String(data.get("districtId") || ""),
      zoneId: String(data.get("zoneId") || ""),
    };
    try {
      await assignManagedUser(selected.uid, values, token);
      await refreshUsers(selected.uid);
      setMessage(`Rol asignado a ${selected.email}.`);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se pudo asignar el rol.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function createDistrict(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = event.currentTarget,
      data = new FormData(form);
    try {
      await saveCommercialDistrict(token, {
        id: String(data.get("code")),
        code: String(data.get("code")),
        name: String(data.get("name")),
      });
      await refreshStructure();
      form.reset();
      setMessage("Distrito creado y disponible para asignar usuarios.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo crear el distrito.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function createZone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = event.currentTarget,
      data = new FormData(form),
      name = String(data.get("name"));
    try {
      await saveCommercialZone(token, {
        id: name,
        districtId: String(data.get("districtId")),
        name,
      });
      await refreshStructure();
      form.reset();
      setMessage("Zona comercial creada y disponible para asignar usuarios.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se pudo crear la zona.",
      );
    } finally {
      setBusy(false);
    }
  }
  const availableZones = zones.filter((zone) => zone.districtId === districtId);
  return (
    <section className="user-admin-workspace">
      <div className="admin-tabs">
        <button
          className={adminView === "users" ? "active" : ""}
          onClick={() => setAdminView("users")}
        >
          Usuarios y roles
        </button>
        <button
          className={adminView === "structure" ? "active" : ""}
          onClick={() => setAdminView("structure")}
        >
          Distritos y zonas
        </button>
      </div>
      {message && <div className="admin-message">{message}</div>}
      {adminView === "structure" ? (
        <section className="structure-grid">
          <article className="card">
            <CardHead
              title="Crear distrito"
              subtitle="Nivel territorial principal del sistema"
            />
            <form className="catalog-form" onSubmit={createDistrict}>
              <label>
                Código institucional
                <input
                  name="code"
                  placeholder="Ej. DCTJ"
                  maxLength={10}
                  required
                />
              </label>
              <label>
                Nombre del distrito
                <input name="name" placeholder="Ej. Tarija" required />
              </label>
              <button className="primary small" disabled={busy}>
                Crear distrito
              </button>
            </form>
            <div className="catalog-list">
              {districts.map((district) => (
                <div key={district.id}>
                  <b>{district.code}</b>
                  <span>{district.name}</span>
                  <em>
                    {
                      zones.filter((zone) => zone.districtId === district.id)
                        .length
                    }{" "}
                    zonas
                  </em>
                </div>
              ))}
            </div>
          </article>
          <article className="card">
            <CardHead
              title="Crear zona comercial"
              subtitle="Cada zona pertenece a un distrito"
            />
            <form className="catalog-form" onSubmit={createZone}>
              <label>
                Distrito
                <select name="districtId" required>
                  {districts.map((district) => (
                    <option key={district.id} value={district.id}>
                      {district.code} · {district.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Nombre de la zona
                <input name="name" placeholder="Ej. Monteagudo" required />
              </label>
              <button className="primary small" disabled={busy}>
                Crear zona
              </button>
            </form>
            <div className="catalog-list">
              {zones.map((zone) => (
                <div key={`${zone.districtId}_${zone.id}`}>
                  <b>{zone.name}</b>
                  <span>{zone.districtId}</span>
                  <em>ID: {zone.id}</em>
                </div>
              ))}
            </div>
          </article>
        </section>
      ) : (
        <section className="admin-layout">
          <article className="card admin-form">
            <CardHead
              title="Registrar usuario"
              subtitle="Crea la cuenta y después define su nivel de responsabilidad"
            />
            <form onSubmit={createUser}>
              <div className="form-grid">
                <label>
                  Nombre completo
                  <input name="displayName" required />
                </label>
                <label>
                  Correo institucional
                  <input name="email" type="email" required />
                </label>
                <label>
                  Contraseña temporal
                  <input
                    name="password"
                    type="password"
                    minLength={8}
                    required
                  />
                </label>
              </div>
              <div className="admin-submit">
                <small>La cuenta quedará pendiente hasta recibir un rol.</small>
                <button className="primary small" disabled={busy}>
                  {busy ? "Registrando…" : "Registrar usuario"}
                </button>
              </div>
            </form>
            {selected && (
              <form className="assignment" onSubmit={assignRole}>
                <h3>Asignar permisos a {selected.displayName}</h3>
                <div className="form-grid">
                  <label>
                    Rol
                    <select
                      name="role"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                    >
                      <option value="district_admin">
                        Administrador de distrito
                      </option>
                      <option value="zone_admin">Administrador de zona</option>
                      <option value="district_uploader">
                        Alimentador de zona
                      </option>
                      <option value="district_viewer">
                        Consulta distrital/zonal
                      </option>
                      <option value="national_viewer">Consulta nacional</option>
                    </select>
                  </label>
                  {!national && (
                    <>
                      <label>
                        Distrito
                        <select
                          name="districtId"
                          value={districtId}
                          onChange={(e) => setDistrictId(e.target.value)}
                        >
                          {districts.map((district) => (
                            <option key={district.id} value={district.id}>
                              {district.code} · {district.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      {role !== "district_admin" &&
                        role !== "district_viewer" && (
                          <label>
                            Zona comercial
                            <select
                              key={districtId}
                              name="zoneId"
                              defaultValue={
                                selected.zoneId || availableZones[0]?.id
                              }
                            >
                              {availableZones.map((zone) => (
                                <option key={zone.id} value={zone.id}>
                                  {zone.name}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                    </>
                  )}
                </div>
                <button className="primary small" disabled={busy}>
                  Guardar rol y activar
                </button>
              </form>
            )}
          </article>
          <article className="card admin-users">
            <CardHead
              title="Usuarios registrados"
              subtitle="Selecciona una cuenta para administrar sus permisos"
            />
            <div className="user-list">
              {users.map((user) => (
                <button
                  key={user.uid}
                  className={
                    selected?.uid === user.uid
                      ? "user-item selected"
                      : "user-item"
                  }
                  onClick={() => {
                    setSelected(user);
                    setRole(
                      user.role === "unassigned"
                        ? "district_uploader"
                        : user.role,
                    );
                    setDistrictId(
                      user.districtId || districts[0]?.id || "DCCH",
                    );
                  }}
                >
                  <span>
                    {user.displayName?.slice(0, 2).toUpperCase() || "US"}
                  </span>
                  <div>
                    <b>{user.displayName}</b>
                    <small>{user.email}</small>
                    <em>
                      {user.status === "pending"
                        ? "Pendiente de rol"
                        : `${user.role} · ${user.districtId || "Nacional"}${user.zoneId ? ` / ${user.zoneId}` : ""}`}
                    </em>
                  </div>
                </button>
              ))}
            </div>
          </article>
        </section>
      )}
    </section>
  );
}

function CardHead({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="card-head">
      <div>
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
      <button>•••</button>
    </header>
  );
}
function Alert({
  tone,
  title,
  text,
}: {
  tone: string;
  title: string;
  text: string;
}) {
  return (
    <div className={`alert ${tone}`}>
      <span>!</span>
      <div>
        <strong>{title}</strong>
        <small>{text}</small>
      </div>
    </div>
  );
}
function Product({
  color,
  name,
  value,
  pct,
}: {
  color: string;
  name: string;
  value: string;
  pct: string;
}) {
  return (
    <div className="product">
      <span style={{ background: color }} />
      <div>
        <strong>{name}</strong>
        <small>{value}</small>
      </div>
      <b>{pct}</b>
    </div>
  );
}
function BarChart() {
  const max = Math.max(...monthly.flatMap((x) => [x.gas, x.diesel]));
  return (
    <div className="bar-chart">
      {monthly.map((x) => (
        <div className="bar-group" key={x.month}>
          <div className="bars">
            <i style={{ height: `${(x.gas / max) * 100}%` }} />
            <i style={{ height: `${(x.diesel / max) * 100}%` }} />
          </div>
          <span>{x.month}</span>
        </div>
      ))}
      <div className="legend">
        <span>
          <i className="l1" />
          Gasolina
        </span>
        <span>
          <i className="l2" />
          Diésel
        </span>
      </div>
    </div>
  );
}
function Donuts() {
  return (
    <div className="donuts">
      <div className="donut d1">
        <strong>101%</strong>
        <span>Gasolina</span>
      </div>
      <div className="donut d2">
        <strong>92%</strong>
        <span>Diésel</span>
      </div>
      <div className="donut d3">
        <strong>97%</strong>
        <span>GLP</span>
      </div>
    </div>
  );
}
function LineChart() {
  return (
    <div className="line-chart">
      <svg viewBox="0 0 700 220" preserveAspectRatio="none">
        <defs>
          <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1673df" stopOpacity=".22" />
            <stop offset="1" stopColor="#1673df" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          className="area"
          d="M10 170 C80 145,105 110,160 130 S245 80,300 105 S390 40,445 78 S535 55,590 60 S650 25,690 42 L690 210 L10 210Z"
        />
        <path
          className="line"
          d="M10 170 C80 145,105 110,160 130 S245 80,300 105 S390 40,445 78 S535 55,590 60 S650 25,690 42"
        />
        <path
          className="line secondary"
          d="M10 190 C90 160,120 170,170 145 S270 135,320 125 S420 110,470 112 S570 90,620 88 S670 70,690 75"
        />
      </svg>
      <div className="axis">
        <span>Ene</span>
        <span>Feb</span>
        <span>Mar</span>
        <span>Abr</span>
        <span>May</span>
        <span>Jun</span>
        <span>Jul</span>
        <span>Ago</span>
      </div>
    </div>
  );
}
function ExpiryBars() {
  const v = [8, 12, 16, 9, 5, 3];
  return (
    <div className="expiry-bars">
      {v.map((n, i) => (
        <div key={i}>
          <span>{n}</span>
          <i style={{ height: `${n * 8}px` }} />
          <small>{["Ago", "Sep", "Oct", "Nov", "Dic", "Ene"][i]}</small>
        </div>
      ))}
    </div>
  );
}
function DonutSingle() {
  return (
    <div className="single-donut">
      <div>
        <strong>84%</strong>
        <span>Vigentes</span>
      </div>
      <ul>
        <li>
          <i className="g" />
          Vigentes <b>157</b>
        </li>
        <li>
          <i className="a" />
          Próximos <b>16</b>
        </li>
        <li>
          <i className="v" />
          En renovación <b>8</b>
        </li>
        <li>
          <i className="r" />
          Vencidos <b>3</b>
        </li>
      </ul>
    </div>
  );
}
