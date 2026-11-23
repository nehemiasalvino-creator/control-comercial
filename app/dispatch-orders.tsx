"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DispatchOrder,
  DispatchPlant,
  getNextDispatchOrderSequence,
  listProformaClients,
  ProformaClient,
  saveDispatchOrder,
  saveDispatchOrderSequence,
  saveProformaClient,
  SessionUser,
} from "@/lib/firebase-rest";
import "./dispatch-orders.css";

const plants: Array<{ id: DispatchPlant; name: string; code: string }> = [
  { id: "tarabuquillo", name: "TARABUQUILLO", code: "TAR" },
  { id: "monteagudo", name: "MONTEAGUDO", code: "MON" },
  { id: "camargo", name: "CAMARGO", code: "CAM" },
  { id: "qhora-qhora", name: "QHORA QHORA", code: "QQH" },
];

const products = {
  diesel: { label: "DIÉSEL OIL", price: 17.3, unit: "LITROS" as const },
  gasolina: {
    label: "GASOLINA ESPECIAL",
    price: 6.59,
    unit: "LITROS" as const,
  },
  glp: {
    label: "GAS LICUADO DE PETRÓLEO (GLP)",
    price: 1.22942,
    unit: "KILOGRAMOS" as const,
  },
};

function localDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

const money = (value: number) =>
  new Intl.NumberFormat("es-BO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const quantityLabel = (value: number) =>
  new Intl.NumberFormat("es-BO", { maximumFractionDigits: 3 }).format(value);

export default function DispatchOrders({ user }: { user: SessionUser }) {
  const today = localDate();
  const year = Number(today.slice(0, 4));
  const [plantId, setPlantId] = useState<DispatchPlant>("tarabuquillo");
  const [clients, setClients] = useState<ProformaClient[]>([]);
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<ProformaClient | null>(
    null,
  );
  const [showResults, setShowResults] = useState(false);
  const [newClient, setNewClient] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRegistry, setNewRegistry] = useState("");
  const [product, setProduct] = useState<keyof typeof products>("diesel");
  const [quantity, setQuantity] = useState(0);
  const [bankDocument, setBankDocument] = useState("");
  const [sealCount, setSealCount] = useState(0);
  const [observations, setObservations] = useState("");
  const [sequence, setSequence] = useState(1);
  const [printOrder, setPrintOrder] = useState<DispatchOrder | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const plant = plants.find((item) => item.id === plantId) || plants[0];
  const productInfo = products[product];
  const productAmount = quantity * productInfo.price;
  const sealsAmount = sealCount * 2.2;
  const total = productAmount + sealsAmount + 1;
  const orderNumber = `OD-${plant.code}-${String(sequence).padStart(6, "0")}/${year}`;

  const filteredClients = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es");
    if (!term) return clients.slice(0, 12);
    return clients
      .filter((client) => client.name.toLocaleLowerCase("es").includes(term))
      .slice(0, 12);
  }, [clients, search]);

  useEffect(() => {
    listProformaClients(user.token)
      .then((items) =>
        setClients(items.sort((a, b) => a.name.localeCompare(b.name))),
      )
      .catch((error) => setMessage(error.message));
  }, [user.token]);

  useEffect(() => {
    getNextDispatchOrderSequence(user.token, plantId, year)
      .then(setSequence)
      .catch((error) => setMessage(error.message));
  }, [user.token, plantId, year]);

  function selectClient(client: ProformaClient) {
    setSelectedClient(client);
    setSearch(client.name);
    setShowResults(false);
    setNewClient(false);
    setMessage("");
  }

  async function createClient() {
    if (!newName.trim()) {
      setMessage("Ingrese el nombre o razón social del nuevo cliente.");
      return;
    }
    setBusy(true);
    const client: ProformaClient = {
      id: crypto.randomUUID(),
      name: newName.trim().toUpperCase(),
      controlledRegistry: newRegistry.trim(),
      pickupPlace: plant.name,
      pickupRegistries: "",
      validityDays: 30,
      products: [],
      districtId: user.districtId || "DCCH",
      zoneId: "sucre",
    };
    try {
      await saveProformaClient(user.token, client);
      setClients((current) =>
        [...current, client].sort((a, b) => a.name.localeCompare(b.name)),
      );
      selectClient(client);
      setNewName("");
      setNewRegistry("");
      setMessage("Cliente registrado y seleccionado.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se pudo crear el cliente.",
      );
    } finally {
      setBusy(false);
    }
  }

  function resetForNextOrder() {
    setSelectedClient(null);
    setSearch("");
    setProduct("diesel");
    setQuantity(0);
    setBankDocument("");
    setSealCount(0);
    setObservations("");
    setPrintOrder(null);
    setSequence((value) => value + 1);
    setMessage("Orden emitida. Formulario listo para la siguiente orden.");
  }

  async function issueOrder() {
    if (!selectedClient) {
      setMessage("Busque y seleccione un cliente.");
      return;
    }
    if (quantity <= 0) {
      setMessage("Ingrese una cantidad mayor a cero.");
      return;
    }
    if (!bankDocument.trim()) {
      setMessage("Ingrese el número del depósito o documento bancario.");
      return;
    }
    setBusy(true);
    const issuedAt = new Date().toISOString();
    const order: DispatchOrder = {
      id: `${plantId}_${year}_${String(sequence).padStart(6, "0")}`,
      districtId: user.districtId || "DCCH",
      zoneId: user.zoneId || "sucre",
      plantId,
      plantName: plant.name,
      number: orderNumber,
      sequence,
      year,
      date: today,
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      controlledRegistry: selectedClient.controlledRegistry || "",
      bankDocumentNumber: bankDocument.trim(),
      product,
      productLabel: productInfo.label,
      quantity,
      unit: productInfo.unit,
      unitPrice: productInfo.price,
      productAmount,
      sealCount,
      sealUnitPrice: 2.2,
      sealsAmount,
      formAmount: 1,
      totalAmount: total,
      observations: observations.trim(),
      issuedAt,
      issuedBy: user.email,
    };
    try {
      await saveDispatchOrder(user.token, order);
      await saveDispatchOrderSequence(user.token, plantId, year, sequence);
      setPrintOrder(order);
      setMessage("Orden registrada. Preparando las dos copias para impresión…");
      document.body.classList.add("printing-dispatch-order");
      window.addEventListener(
        "afterprint",
        () => {
          document.body.classList.remove("printing-dispatch-order");
          resetForNextOrder();
        },
        { once: true },
      );
      setTimeout(() => window.print(), 150);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se pudo emitir la orden.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="dispatch-orders-workspace">
        <div className="dispatch-plant-card">
          <div>
            <small>PLANTA DE DESPACHO</small>
            <h2>Seleccione la planta activa</h2>
          </div>
          <div className="dispatch-plant-tabs">
            {plants.map((item) => (
              <button
                key={item.id}
                className={plantId === item.id ? "active" : ""}
                onClick={() => setPlantId(item.id)}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>

        <div className="dispatch-grid">
          <div className="dispatch-form-card">
            <header>
              <div>
                <small>ORDEN EN PREPARACIÓN</small>
                <h3>{orderNumber}</h3>
              </div>
              <span>
                {new Intl.DateTimeFormat("es-BO").format(
                  new Date(`${today}T12:00:00`),
                )}
              </span>
            </header>

            <div className="dispatch-field dispatch-client-search">
              <label>Cliente / razón social</label>
              <div className="dispatch-search-row">
                <input
                  value={search}
                  placeholder="Escriba para buscar entre las empresas de Proformas…"
                  onFocus={() => setShowResults(true)}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setSelectedClient(null);
                    setShowResults(true);
                  }}
                />
                <button onClick={() => setNewClient((value) => !value)}>
                  + Nuevo cliente
                </button>
              </div>
              {showResults && (
                <div className="dispatch-search-results">
                  {filteredClients.length ? (
                    filteredClients.map((client) => (
                      <button
                        key={client.id}
                        onClick={() => selectClient(client)}
                      >
                        <strong>{client.name}</strong>
                        <small>
                          {client.controlledRegistry ||
                            "Sin registro de Sustancias Controladas"}
                        </small>
                      </button>
                    ))
                  ) : (
                    <p>No se encontraron clientes. Use “Nuevo cliente”.</p>
                  )}
                </div>
              )}
              {selectedClient && (
                <p className="dispatch-selected-client">
                  ✓ Cliente seleccionado: <strong>{selectedClient.name}</strong>
                </p>
              )}
            </div>

            {newClient && (
              <div className="dispatch-new-client">
                <h4>Registrar cliente nuevo</h4>
                <input
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  placeholder="Nombre o razón social"
                />
                <input
                  value={newRegistry}
                  onChange={(event) => setNewRegistry(event.target.value)}
                  placeholder="Registro de Sustancias Controladas (opcional)"
                />
                <button disabled={busy} onClick={createClient}>
                  Guardar y seleccionar
                </button>
              </div>
            )}

            <div className="dispatch-fields-grid">
              <div className="dispatch-field">
                <label>Producto</label>
                <select
                  value={product}
                  onChange={(event) =>
                    setProduct(event.target.value as keyof typeof products)
                  }
                >
                  <option value="diesel">Diésel Oil · Bs 17,30/L</option>
                  <option value="gasolina">
                    Gasolina Especial · Bs 6,59/L
                  </option>
                  <option value="glp">GLP · Bs 1,22942/kg</option>
                </select>
              </div>
              <div className="dispatch-field">
                <label>Cantidad ({productInfo.unit.toLowerCase()})</label>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={quantity || ""}
                  onChange={(event) =>
                    setQuantity(Number(event.target.value) || 0)
                  }
                />
              </div>
              <div className="dispatch-field">
                <label>N.º depósito / documento bancario</label>
                <input
                  value={bankDocument}
                  onChange={(event) => setBankDocument(event.target.value)}
                  placeholder="Ej.: 518751101"
                />
              </div>
              <div className="dispatch-field">
                <label>Número de precintos</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={sealCount || ""}
                  onChange={(event) =>
                    setSealCount(Math.max(0, Number(event.target.value) || 0))
                  }
                />
              </div>
              <div className="dispatch-field dispatch-wide">
                <label>Observaciones (opcional)</label>
                <textarea
                  value={observations}
                  onChange={(event) => setObservations(event.target.value)}
                  rows={2}
                />
              </div>
            </div>
          </div>

          <aside className="dispatch-summary-card">
            <small>LIQUIDACIÓN AUTOMÁTICA</small>
            <h3>Total a cobrar</h3>
            <strong className="dispatch-total">Bs {money(total)}</strong>
            <dl>
              <div>
                <dt>{productInfo.label}</dt>
                <dd>
                  {quantityLabel(quantity)} × Bs{" "}
                  {productInfo.price.toFixed(product === "glp" ? 5 : 2)}
                  <b>Bs {money(productAmount)}</b>
                </dd>
              </div>
              <div>
                <dt>Precintos</dt>
                <dd>
                  {sealCount} × Bs 2,20<b>Bs {money(sealsAmount)}</b>
                </dd>
              </div>
              <div>
                <dt>Formulario</dt>
                <dd>
                  1 × Bs 1,00<b>Bs 1,00</b>
                </dd>
              </div>
            </dl>
            <button disabled={busy} onClick={issueOrder}>
              {busy ? "Registrando…" : "Emitir e imprimir orden"}
            </button>
            {message && <p className="dispatch-message">{message}</p>}
            <small className="dispatch-help">
              La impresión genera dos copias iguales en una sola hoja Carta.
            </small>
          </aside>
        </div>
      </section>

      {printOrder && (
        <section className="dispatch-order-print">
          <div className="dispatch-order-sheet">
            <OrderCopy order={printOrder} copy="COPIA CLIENTE" />
            <div className="dispatch-cut-line">
              <span>✂</span> CORTE
            </div>
            <OrderCopy order={printOrder} copy="COPIA RESPALDO" />
          </div>
        </section>
      )}
    </>
  );
}

function OrderCopy({ order, copy }: { order: DispatchOrder; copy: string }) {
  return (
    <article className="dispatch-order-copy">
      <header>
        <div className="dispatch-print-brand">
          <strong>YPFB</strong>
          <span>YACIMIENTOS PETROLÍFEROS FISCALES BOLIVIANOS</span>
        </div>
        <div className="dispatch-print-title">
          <h1>ORDEN DE DESPACHO</h1>
          <small>{copy}</small>
        </div>
        <div className="dispatch-print-number">
          <small>N.º</small>
          <strong>{order.number}</strong>
        </div>
      </header>
      <div className="dispatch-print-meta">
        <p>
          <b>PLANTA DE DESPACHO:</b> {order.plantName}
        </p>
        <p>
          <b>FECHA:</b>{" "}
          {new Intl.DateTimeFormat("es-BO").format(
            new Date(`${order.date}T12:00:00`),
          )}
        </p>
      </div>
      <table className="dispatch-client-table">
        <tbody>
          <tr>
            <th>NOMBRE / RAZÓN SOCIAL</th>
            <td>{order.clientName}</td>
            <th>N.º DEPÓSITO</th>
            <td>{order.bankDocumentNumber}</td>
          </tr>
          <tr>
            <th>REGISTRO SUSTANCIAS CONTROLADAS</th>
            <td colSpan={3}>{order.controlledRegistry || "NO REGISTRADO"}</td>
          </tr>
        </tbody>
      </table>
      <table className="dispatch-product-table">
        <thead>
          <tr>
            <th>PRODUCTO</th>
            <th>CANTIDAD</th>
            <th>UNIDAD</th>
            <th>PRECIO UNIT.</th>
            <th>IMPORTE</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{order.productLabel}</td>
            <td>{quantityLabel(order.quantity)}</td>
            <td>{order.unit}</td>
            <td>
              Bs {order.unitPrice.toFixed(order.product === "glp" ? 5 : 2)}
            </td>
            <td>Bs {money(order.productAmount)}</td>
          </tr>
        </tbody>
      </table>
      <div className="dispatch-print-costs">
        <p>
          <span>PRECINTOS: {order.sealCount} × Bs 2,20</span>
          <b>Bs {money(order.sealsAmount)}</b>
        </p>
        <p>
          <span>FORMULARIO</span>
          <b>Bs {money(order.formAmount)}</b>
        </p>
        <p className="total">
          <span>TOTAL A COBRAR</span>
          <b>Bs {money(order.totalAmount)}</b>
        </p>
      </div>
      {order.observations && (
        <p className="dispatch-print-observations">
          <b>OBSERVACIONES:</b> {order.observations}
        </p>
      )}
      <div className="dispatch-print-signatures">
        <p>
          ENTREGADO POR
          <br />
          <span>FACTURACIÓN</span>
        </p>
        <p>
          RECIBIDO CONFORME
          <br />
          <span>CLIENTE / CONDUCTOR</span>
        </p>
        <p>
          AUTORIZADO POR
          <br />
          <span>RESPONSABLE DE PLANTA</span>
        </p>
      </div>
      <footer>
        <span>Emitido por: {order.issuedBy}</span>
        <span>Documento generado por Control Comercial UDC</span>
      </footer>
    </article>
  );
}
