"use client";

import { FormEvent, useEffect, useState } from "react";
import { assignManagedUser, createManagedUser, listManagedUsers, ManagedUser, SessionUser, signIn } from "@/lib/firebase-rest";

type Module = "mayoreo" | "propias" | "expira" | "cargas" | "programaciones" | "usuarios";

const programmingClients = [
  { name:"EE.SS. Mariscal Sucre", diesel:20000, gas:1600 }, { name:"E.S. Azari", diesel:8750, gas:8000 },
  { name:"EOSO El Morro", diesel:28567, gas:8750 }, { name:"EOSO Juana Azurduy", diesel:0, gas:21200 },
  { name:"EOSO María Alejandra", diesel:7200, gas:2533 }, { name:"EOSO Mesa Verde", diesel:16500, gas:12500 },
  { name:"EOSO Nayler", diesel:18033, gas:22000 }, { name:"EOSO Oqharikuna SRL", diesel:16667, gas:16333 },
  { name:"EOSO San Antonio", diesel:8333, gas:39167 }, { name:"EOSO Trébol SRL", diesel:24400, gas:17200 },
  { name:"EESS Ostria Gutiérrez · YPFB", diesel:5523, gas:10099 }, { name:"EESS El Tejar · YPFB", diesel:7934, gas:9226 },
  { name:"EOSO Aiquile", diesel:4427, gas:12000 }, { name:"E.S. Buen Retiro · Padilla", diesel:4200, gas:12000 },
  { name:"EOSO Murillo · Zudáñez", diesel:4267, gas:12000 }, { name:"E.S. Pujllay · Tarabuco", diesel:4350, gas:13500 },
  { name:"EESS Tarabuquillo · YPFB", diesel:1652, gas:5000 }, { name:"EESS Serrano · YPFB", diesel:1109, gas:5000 },
];

const monthly = [
  { month: "Ene", gas: 1510, diesel: 998 }, { month: "Feb", gas: 1442, diesel: 820 },
  { month: "Mar", gas: 1632, diesel: 1010 }, { month: "Abr", gas: 1536, diesel: 1000 },
  { month: "May", gas: 1460, diesel: 1146 }, { month: "Jun", gas: 1235, diesel: 1159 },
  { month: "Jul", gas: 1626, diesel: 1722 }, { month: "Ago", gas: 300, diesel: 358 },
];

const stations = [
  ["Ostria Gutiérrez", "2.580.840", "1.210.062", "Bs 29,4 MM", "1 alerta"],
  ["El Tejar", "2.445.290", "1.710.310", "Bs 34,1 MM", "2 alertas"],
  ["Padcoyo", "1.296.509", "1.281.534", "Bs 21,6 MM", "Al día"],
  ["Camargo", "1.073.332", "843.608", "Bs 15,8 MM", "1 alerta"],
  ["Los Sauces", "772.865", "956.176", "Bs 14,8 MM", "Al día"],
];

const documents = [
  { station: "E.S. El Tejar", document: "Licencia de operación", expiry: "18/09/2026", days: 30, state: "Próximo" },
  { station: "E.S. Ostria Gutiérrez", document: "Certificado de calibración", expiry: "02/10/2026", days: 44, state: "Próximo" },
  { station: "Domigas Ltda.", document: "Póliza de seguro", expiry: "10/08/2026", days: -9, state: "Vencido" },
  { station: "E.S. Padcoyo", document: "Licencia ambiental", expiry: "15/12/2026", days: 118, state: "Vigente" },
];

function Icon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    chart: <><path d="M4 19V9"/><path d="M10 19V5"/><path d="M16 19v-7"/><path d="M22 19H2"/></>,
    station: <><path d="M4 21V5l8-3 8 3v16"/><path d="M9 9h6M9 13h6M9 17h6"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    upload: <><path d="M12 16V4M8 8l4-4 4 4"/><path d="M4 15v5h16v-5"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
    home: <><path d="M3 11l9-8 9 8"/><path d="M5 10v11h14V10"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
  };
  return <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">{paths[name]}</svg>;
}

export default function Home() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [module, setModule] = useState<Module>("mayoreo");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const data = new FormData(event.currentTarget);
    try { setUser(await signIn(String(data.get("email")), String(data.get("password")))); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo ingresar."); }
    finally { setBusy(false); }
  }

  if (!user) return <Login onSubmit={login} error={error} busy={busy} />;

  const initials = user.displayName.split(" ").filter(Boolean).slice(0, 2).map(x => x[0]).join("").toUpperCase();
  const scopeLabel = user.scope === "national" ? "Nacional" : `${user.districtId || "DCCH"} · ${user.zoneId || "Sucre"}`;

  const titles: Record<Module, [string, string]> = {
    mayoreo: ["Movimiento Mayorista", "Ventas, transferencias y cumplimiento PRODE"],
    propias: ["Estaciones propias", "Ventas, recaudaciones y depósitos de DCCH"],
    expira: ["EXPIRA", "Seguimiento documental y alertas de vencimiento"],
    cargas: ["Centro de cargas", "Actualización segura de información operativa"],
    programaciones: ["Programaciones", "Asignación diaria automática y publicación a clientes"],
    usuarios: ["Administración de usuarios", "Cuentas, roles y ámbitos de acceso"],
  };
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">CC</span><div><strong>Control Comercial</strong><small>YPFB · DCCH</small></div></div>
        <nav>
          <Nav active={module === "mayoreo"} onClick={() => setModule("mayoreo")} icon="chart">MOV Mayoreo</Nav>
          <Nav active={module === "propias"} onClick={() => setModule("propias")} icon="station">Estaciones propias</Nav>
          <Nav active={module === "expira"} onClick={() => setModule("expira")} icon="clock">EXPIRA</Nav>
          <Nav active={module === "cargas"} onClick={() => setModule("cargas")} icon="upload">Centro de cargas</Nav>
          {(user.role === "super_admin" || user.role === "district_uploader") && <Nav active={module === "programaciones"} onClick={() => setModule("programaciones")} icon="calendar">Programaciones</Nav>}
          {user.role === "super_admin" && <Nav active={module === "usuarios"} onClick={() => setModule("usuarios")} icon="users">Usuarios</Nav>}
        </nav>
        <div className="scope"><small>ÁMBITO ACTIVO</small><strong>{scopeLabel}</strong><span>{user.role === "super_admin" ? "Superadministración" : "Acceso autorizado"}</span></div>
        <button className="profile" onClick={() => setUser(null)}><span>{initials}</span><div><strong>{user.displayName}</strong><small>Cerrar sesión</small></div></button>
      </aside>
      <section className="content">
        <header className="topbar"><div><p>{user.scope === "national" ? "Control Comercial Nacional" : "Distrito Comercial Chuquisaca"}</p><h1>{titles[module][0]}</h1><span>{titles[module][1]}</span></div><div className="top-actions"><button className="period">Enero – Agosto 2026⌄</button><button className="avatar">{initials}</button></div></header>
        {module === "mayoreo" && <Mayoreo />}
        {module === "propias" && <Propias />}
        {module === "expira" && <Expira />}
        {module === "cargas" && <Cargas />}
        {module === "programaciones" && (user.role === "super_admin" || user.role === "district_uploader") && <Programaciones />}
        {module === "usuarios" && user.role === "super_admin" && <Usuarios token={user.token} />}
      </section>
    </main>
  );
}

function Login({ onSubmit, error, busy }: { onSubmit: (e: FormEvent<HTMLFormElement>) => void; error: string; busy: boolean }) {
  return <main className="login-page"><section className="login-visual"><div className="login-logo">CC</div><div className="visual-copy"><span>CONTROL COMERCIAL</span><h1>Información precisa.<br/>Decisiones oportunas.</h1><p>Ventas, abastecimiento y cumplimiento operativo en una sola plataforma nacional.</p></div><div className="grid-lines"/></section><section className="login-panel"><form onSubmit={onSubmit}><div className="mobile-logo">CC</div><span className="eyebrow">ACCESO INSTITUCIONAL</span><h2>Bienvenido</h2><p>Ingrese con su cuenta autorizada.</p><label>Correo electrónico<input name="email" type="email" autoComplete="email" required/></label><label>Contraseña<input name="password" type="password" autoComplete="current-password" required/></label>{error && <div className="error">{error}</div>}<button className="primary" disabled={busy}>{busy ? "Verificando…" : "Ingresar al sistema"}</button><small className="demo">Acceso exclusivo para usuarios autorizados.</small></form></section></main>;
}

function Nav({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: string; children: React.ReactNode }) {
  return <button className={active ? "nav active" : "nav"} onClick={onClick}><Icon name={icon}/>{children}</button>;
}

function Filters() { return <div className="filters"><button>DCCH · Sucre⌄</button><button>Todos los clientes⌄</button><button>Todos los productos⌄</button><button>Privados + propios⌄</button></div>; }

function Kpi({ label, value, note, tone = "blue" }: { label: string; value: string; note: string; tone?: string }) { return <article className={`kpi ${tone}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>; }

function Mayoreo() {
  return <><Filters/><section className="kpi-grid"><Kpi label="VOLUMEN TOTAL" value="163,9 MM L" note="Gasolina + diésel + GLP"/><Kpi label="CUMPLIMIENTO PRODE" value="96,8%" note="▲ 2,4% sobre el mes anterior" tone="green"/><Kpi label="OPERACIONES" value="14.220" note="12.379 ventas · 1.841 transferencias" tone="violet"/><Kpi label="ALERTAS ACTIVAS" value="7" note="3 requieren atención hoy" tone="amber"/></section><section className="dashboard-grid"><article className="card wide"><CardHead title="Evolución mensual de despachos" subtitle="Miles de litros · privados y estaciones propias"/><BarChart/></article><article className="card"><CardHead title="Cumplimiento por producto" subtitle="Despacho acumulado frente al PRODE"/><Donuts/></article><article className="card wide"><CardHead title="Clientes y destinos destacados" subtitle="Clasificación comercial consolidada"/><table><thead><tr><th>Cliente</th><th>Clasificación</th><th>Producto</th><th>Volumen</th><th>Participación</th></tr></thead><tbody>{[["E.S. San Antonio","EESS privada","Gasolina","18,4 MM L","12,1%"],["Funda Gas","Distribuidora GLP","GLP 10 kg","4,2 MM kg","9,8%"],["E.S. Nayler","EESS privada","Diésel","12,7 MM L","8,6%"],["E.S. El Tejar","Estación propia","Mixto","4,2 MM L","6,4%"]].map(r=><tr key={r[0]}>{r.map((v,i)=><td key={i}>{i===1?<span className="tag">{v}</span>:v}</td>)}</tr>)}</tbody></table></article><article className="card"><CardHead title="Alertas operativas" subtitle="Seguimiento automático"/><Alert tone="red" title="Diésel bajo programación" text="89,2% de cumplimiento acumulado"/><Alert tone="amber" title="3 clientes sin movimiento" text="Más de 5 días hábiles"/><Alert tone="blue" title="Carga actualizada" text="Despachos · 18 ago 2026"/></article></section></>;
}

function Propias() {
  return <><div className="filters"><button>DCCH · Todas las estaciones⌄</button><button>Todos los productos⌄</button><button>Acumulado 2026⌄</button></div><section className="kpi-grid"><Kpi label="RECAUDACIÓN" value="Bs 160,0 MM" note="Importe registrado hasta agosto"/><Kpi label="VENTA GASOLINA" value="10,72 MM L" note="10 estaciones propias" tone="green"/><Kpi label="VENTA DIÉSEL" value="8,20 MM L" note="Acumulado del periodo" tone="violet"/><Kpi label="DEPÓSITOS EN ALERTA" value="12" note="Fechas o diferencias por revisar" tone="amber"/></section><section className="dashboard-grid"><article className="card wide"><CardHead title="Recaudación y depósitos" subtitle="Comportamiento mensual consolidado"/><LineChart/></article><article className="card"><CardHead title="Composición de ventas" subtitle="Por producto"/><div className="product-list"><Product color="#1565d8" name="Gasolina" value="10,72 MM L" pct="51%"/><Product color="#7c5ce5" name="Diésel" value="8,20 MM L" pct="39%"/><Product color="#19a974" name="GNV" value="1,31 MM m³" pct="7%"/><Product color="#f2a63b" name="GLP" value="619.900 kg" pct="3%"/></div></article><article className="card full"><CardHead title="Desempeño por estación" subtitle="Volumen comercializado, recaudación y control"/><table><thead><tr><th>Estación propia</th><th>Gasolina (L)</th><th>Diésel (L)</th><th>Recaudación</th><th>Estado</th></tr></thead><tbody>{stations.map(r=><tr key={r[0]}>{r.map((v,i)=><td key={i}>{i===4?<span className={v==="Al día"?"status ok":"status warn"}>{v}</span>:v}</td>)}</tr>)}</tbody></table></article></section></>;
}

function Expira() {
  const [show, setShow] = useState(false);
  return <><div className="module-actions"><div className="filters"><button>Todas las estaciones⌄</button><button>Todos los documentos⌄</button><button>Todos los responsables⌄</button></div><button className="primary small" onClick={()=>setShow(!show)}>+ Registrar documento</button></div>{show&&<div className="quick-form"><input placeholder="Buscar estación identificada"/><input placeholder="Tipo de documento"/><input type="date"/><input type="date"/><button className="primary small" onClick={()=>setShow(false)}>Guardar borrador</button></div>}<section className="kpi-grid"><Kpi label="DOCUMENTOS ACTIVOS" value="184" note="Privadas y estaciones propias"/><Kpi label="PRÓXIMOS A VENCER" value="16" note="Dentro de los próximos 60 días" tone="amber"/><Kpi label="EN RENOVACIÓN" value="8" note="Con responsables asignados" tone="violet"/><Kpi label="VENCIDOS" value="3" note="Requieren atención inmediata" tone="red"/></section><section className="dashboard-grid"><article className="card wide"><CardHead title="Calendario de vencimientos" subtitle="Próximos seis meses"/><ExpiryBars/></article><article className="card"><CardHead title="Seguimiento" subtitle="Estado de los trámites"/><DonutSingle/></article><article className="card full"><CardHead title="Documentos que requieren atención" subtitle="Alertas dirigidas a responsables de seguimiento"/><table><thead><tr><th>Estación</th><th>Documento</th><th>Vencimiento</th><th>Días</th><th>Estado</th><th>Responsable</th></tr></thead><tbody>{documents.map((d,i)=><tr key={d.station+d.document}><td>{d.station}</td><td>{d.document}</td><td>{d.expiry}</td><td>{d.days}</td><td><span className={`status ${d.state==="Vencido"?"bad":d.state==="Vigente"?"ok":"warn"}`}>{d.state}</span></td><td>{["María Fernández","Luis Herrera","Carlos Méndez","Ana López"][i]}</td></tr>)}</tbody></table></article></section></>;
}

function Cargas() {
  const [file, setFile] = useState("");
  return <><section className="upload-grid">{[["Despachos de venta","Clientes privados, directos, GRACO y distribuidores","Venta"],["Transferencias","Estaciones de servicio propias de YPFB","Transferencia"],["PRODE mensual","Programación por distrito, zona y producto","PRODE"],["Recaudaciones propias","Libro anual acumulativo por estación","Recaudación"]].map((x,i)=><article className="upload-card" key={x[0]}><div className={`upload-icon u${i}`}><Icon name="upload"/></div><h3>{x[0]}</h3><p>{x[1]}</p><label className="file-button">Seleccionar Excel o CSV<input type="file" accept=".xls,.xlsx,.csv" onChange={e=>setFile(e.target.files?.[0]?.name||"")}/></label></article>)}</section>{file&&<div className="file-review"><div><strong>Archivo preparado para validación</strong><span>{file}</span></div><div><span className="status ok">Formato reconocido</span><button className="primary small">Validar y cargar</button></div></div>}<article className="card full history"><CardHead title="Historial de cargas" subtitle="Cada versión queda disponible para auditoría"/><table><thead><tr><th>Fecha</th><th>Archivo</th><th>Periodo detectado</th><th>Registros</th><th>Usuario</th><th>Estado</th></tr></thead><tbody><tr><td>18/08/2026 · 17:42</td><td>despachos_venta_2026.xls</td><td>Ene–Dic 2026</td><td>12.379</td><td>Alimentador Sucre</td><td><span className="status ok">Procesado</span></td></tr><tr><td>18/08/2026 · 17:38</td><td>transferencias_2026.xls</td><td>Ene–Dic 2026</td><td>1.841</td><td>Alimentador Sucre</td><td><span className="status ok">Procesado</span></td></tr><tr><td>01/08/2026 · 09:14</td><td>prode_agosto_2026.xlsx</td><td>Agosto 2026</td><td>31 zonas</td><td>Administrador nacional</td><td><span className="status ok">Procesado</span></td></tr></tbody></table></article></>;
}

type ProgramRow = (typeof programmingClients)[number] & { programmedDiesel: number; programmedGas: number; pendingDiesel: number; pendingGas: number };

function Programaciones() {
  const [date, setDate] = useState("2026-08-19");
  const [availableDiesel, setAvailableDiesel] = useState(243400);
  const [availableGas, setAvailableGas] = useState(310500);
  const [rows, setRows] = useState<ProgramRow[]>(programmingClients.map(client => ({...client, programmedDiesel:0, programmedGas:0, pendingDiesel:0, pendingGas:0})));
  const allocate = (available: number, key: "diesel"|"gas") => {
    const totalWeight = rows.reduce((sum,row)=>sum+row[key],0); let remaining=available;
    return rows.map((row,index)=>{
      const amount=index===rows.length-1?remaining:Math.min(remaining,Math.max(0,Math.round((available*row[key]/totalWeight)/500)*500));
      remaining-=amount; return amount;
    });
  };
  function automatic() {
    const diesel=allocate(availableDiesel,"diesel"), gas=allocate(availableGas,"gas");
    setRows(current=>current.map((row,index)=>({...row,programmedDiesel:diesel[index],programmedGas:gas[index]})));
  }
  function change(index:number,field:"programmedDiesel"|"programmedGas"|"pendingDiesel"|"pendingGas",value:string){setRows(current=>current.map((row,i)=>i===index?{...row,[field]:Math.max(0,Number(value)||0)}:row))}
  const dieselTotal=rows.reduce((sum,row)=>sum+row.programmedDiesel,0), gasTotal=rows.reduce((sum,row)=>sum+row.programmedGas,0);
  const fmt=(value:number)=>new Intl.NumberFormat("es-BO").format(value);
  return <section className="programming"><div className="program-toolbar"><div className="supply"><label>Fecha de programación<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label>Diésel disponible hoy (L)<input type="number" min="0" step="500" value={availableDiesel} onChange={e=>setAvailableDiesel(Number(e.target.value))}/></label><label>Gasolina disponible hoy (L)<input type="number" min="0" step="500" value={availableGas} onChange={e=>setAvailableGas(Number(e.target.value))}/></label></div><div className="program-buttons"><button className="primary small" onClick={automatic}>Programar automáticamente</button><button className="secondary" onClick={()=>window.print()}>Imprimir publicación</button></div></div><section className="kpi-grid"><Kpi label="DIÉSEL DISPONIBLE" value={`${fmt(availableDiesel)} L`} note={`${fmt(Math.max(0,availableDiesel-dieselTotal))} L sin asignar`}/><Kpi label="DIÉSEL PROGRAMADO" value={`${fmt(dieselTotal)} L`} note={`${Math.round(dieselTotal/Math.max(1,availableDiesel)*100)}% del disponible`} tone="violet"/><Kpi label="GASOLINA DISPONIBLE" value={`${fmt(availableGas)} L`} note={`${fmt(Math.max(0,availableGas-gasTotal))} L sin asignar`} tone="green"/><Kpi label="GASOLINA PROGRAMADA" value={`${fmt(gasTotal)} L`} note={`${Math.round(gasTotal/Math.max(1,availableGas)*100)}% del disponible`} tone="amber"/></section><article className="card program-report"><header className="publication-head"><div><small>YPFB · DISTRITO COMERCIAL CHUQUISACA</small><h2>Programación diaria de combustibles</h2><p>Fecha: {date.split("-").reverse().join("/")} · Zona comercial Sucre</p></div><span>Borrador editable</span></header><div className="program-table"><table><thead><tr><th>Cliente / estación</th><th>Prom. diésel</th><th>Pendiente diésel</th><th>Diésel programado</th><th>Prom. gasolina</th><th>Pendiente gasolina</th><th>Gasolina programada</th></tr></thead><tbody>{rows.map((row,index)=><tr key={row.name}><td><strong>{row.name}</strong></td><td>{fmt(row.diesel)}</td><td><input type="number" value={row.pendingDiesel||""} onChange={e=>change(index,"pendingDiesel",e.target.value)}/></td><td><input className="programmed" type="number" value={row.programmedDiesel||""} onChange={e=>change(index,"programmedDiesel",e.target.value)}/></td><td>{fmt(row.gas)}</td><td><input type="number" value={row.pendingGas||""} onChange={e=>change(index,"pendingGas",e.target.value)}/></td><td><input className="programmed" type="number" value={row.programmedGas||""} onChange={e=>change(index,"programmedGas",e.target.value)}/></td></tr>)}</tbody><tfoot><tr><td>TOTAL PROGRAMADO A DESPACHAR</td><td/><td>{fmt(rows.reduce((s,r)=>s+r.pendingDiesel,0))}</td><td>{fmt(dieselTotal)}</td><td/><td>{fmt(rows.reduce((s,r)=>s+r.pendingGas,0))}</td><td>{fmt(gasTotal)}</td></tr></tfoot></table></div><footer>Propuesta basada en promedios históricos de la planilla operativa. Cantidades revisadas por el alimentador distrital antes de publicación.</footer></article></section>;
}

function Usuarios({ token }: { token: string }) {
  const [role, setRole] = useState("district_uploader");
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [selected, setSelected] = useState<ManagedUser | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const national = role === "national_viewer";
  async function refreshUsers(selectUid?: string) {
    const data = await listManagedUsers(token);
    setUsers(data);
    if (selectUid) setSelected(data.find(user => user.uid === selectUid) || null);
  }
  useEffect(() => { refreshUsers().catch(error => setMessage(error.message)); }, []);
  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const body = Object.fromEntries(form.entries());
    try {
      const result = await createManagedUser(body as Parameters<typeof createManagedUser>[0], token);
      await refreshUsers(result.uid);
      setMessage(`Usuario ${result.email} registrado. Ahora asígnale un rol.`);
      formElement.reset();
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo crear el usuario."); }
    finally { setBusy(false); }
  }
  async function assignRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected) return; setBusy(true); setMessage("");
    const data = new FormData(event.currentTarget);
    const values = { role: String(data.get("role")), districtId: String(data.get("districtId") || ""), zoneId: String(data.get("zoneId") || "") };
    try { await assignManagedUser(selected.uid, values, token); await refreshUsers(selected.uid); setMessage(`Rol asignado a ${selected.email}.`); }
    catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo asignar el rol."); }
    finally { setBusy(false); }
  }
  return <section className="admin-layout"><article className="card admin-form"><CardHead title="Registrar usuario" subtitle="Primero crea la cuenta; después asigna sus permisos"/><form onSubmit={createUser}><div className="form-grid"><label>Nombre completo<input name="displayName" required/></label><label>Correo institucional<input name="email" type="email" required/></label><label>Contraseña temporal<input name="password" type="password" minLength={8} required/></label></div><div className="admin-submit"><small>La cuenta quedará pendiente y todavía no podrá ingresar.</small><button className="primary small" disabled={busy}>{busy?"Registrando…":"Registrar usuario"}</button></div></form>{selected&&<form className="assignment" onSubmit={assignRole}><h3>Asignar permisos a {selected.displayName}</h3><div className="form-grid"><label>Rol<select name="role" value={role} onChange={e=>setRole(e.target.value)}><option value="district_uploader">Alimentador distrital</option><option value="district_viewer">Consulta distrital</option><option value="national_viewer">Consulta nacional</option></select></label>{!national&&<><label>Distrito<select name="districtId" defaultValue={selected.districtId||"DCCH"}><option value="DCCH">DCCH · Chuquisaca</option></select></label><label>Zona comercial<select name="zoneId" defaultValue={selected.zoneId||"sucre"}><option value="sucre">Sucre</option></select></label></>}</div><button className="primary small" disabled={busy}>Guardar rol y activar</button></form>}{message&&<div className="admin-message">{message}</div>}</article><article className="card admin-users"><CardHead title="Usuarios registrados" subtitle="Selecciona una cuenta para administrar sus permisos"/><div className="user-list">{users.map(user=><button key={user.uid} className={selected?.uid===user.uid?"user-item selected":"user-item"} onClick={()=>{setSelected(user);setRole(user.role==="unassigned"?"district_uploader":user.role)}}><span>{user.displayName?.slice(0,2).toUpperCase()||"US"}</span><div><b>{user.displayName}</b><small>{user.email}</small><em>{user.status==="pending"?"Pendiente de rol":user.role}</em></div></button>)}</div></article></section>;
}

function CardHead({title,subtitle}:{title:string;subtitle:string}){return <header className="card-head"><div><h3>{title}</h3><p>{subtitle}</p></div><button>•••</button></header>}
function Alert({tone,title,text}:{tone:string;title:string;text:string}){return <div className={`alert ${tone}`}><span>!</span><div><strong>{title}</strong><small>{text}</small></div></div>}
function Product({color,name,value,pct}:{color:string;name:string;value:string;pct:string}){return <div className="product"><span style={{background:color}}/><div><strong>{name}</strong><small>{value}</small></div><b>{pct}</b></div>}
function BarChart(){const max=Math.max(...monthly.flatMap(x=>[x.gas,x.diesel]));return <div className="bar-chart">{monthly.map(x=><div className="bar-group" key={x.month}><div className="bars"><i style={{height:`${x.gas/max*100}%`}}/><i style={{height:`${x.diesel/max*100}%`}}/></div><span>{x.month}</span></div>)}<div className="legend"><span><i className="l1"/>Gasolina</span><span><i className="l2"/>Diésel</span></div></div>}
function Donuts(){return <div className="donuts"><div className="donut d1"><strong>101%</strong><span>Gasolina</span></div><div className="donut d2"><strong>92%</strong><span>Diésel</span></div><div className="donut d3"><strong>97%</strong><span>GLP</span></div></div>}
function LineChart(){return <div className="line-chart"><svg viewBox="0 0 700 220" preserveAspectRatio="none"><defs><linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1673df" stopOpacity=".22"/><stop offset="1" stopColor="#1673df" stopOpacity="0"/></linearGradient></defs><path className="area" d="M10 170 C80 145,105 110,160 130 S245 80,300 105 S390 40,445 78 S535 55,590 60 S650 25,690 42 L690 210 L10 210Z"/><path className="line" d="M10 170 C80 145,105 110,160 130 S245 80,300 105 S390 40,445 78 S535 55,590 60 S650 25,690 42"/><path className="line secondary" d="M10 190 C90 160,120 170,170 145 S270 135,320 125 S420 110,470 112 S570 90,620 88 S670 70,690 75"/></svg><div className="axis"><span>Ene</span><span>Feb</span><span>Mar</span><span>Abr</span><span>May</span><span>Jun</span><span>Jul</span><span>Ago</span></div></div>}
function ExpiryBars(){const v=[8,12,16,9,5,3];return <div className="expiry-bars">{v.map((n,i)=><div key={i}><span>{n}</span><i style={{height:`${n*8}px`}}/><small>{["Ago","Sep","Oct","Nov","Dic","Ene"][i]}</small></div>)}</div>}
function DonutSingle(){return <div className="single-donut"><div><strong>84%</strong><span>Vigentes</span></div><ul><li><i className="g"/>Vigentes <b>157</b></li><li><i className="a"/>Próximos <b>16</b></li><li><i className="v"/>En renovación <b>8</b></li><li><i className="r"/>Vencidos <b>3</b></li></ul></div>}
