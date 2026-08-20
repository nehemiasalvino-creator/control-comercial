import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const PROJECT_ID = "control-comercial-8171e";
const input = JSON.parse(readFileSync(new URL("./programming-august-2026.json", import.meta.url), "utf8"));
const token = execFileSync("gcloud", ["auth", "print-access-token"], { encoding: "utf8" }).trim();
const endpoint = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/programmingDays`;

for (const [date, payload] of Object.entries(input.days)) {
  const id = `${input.districtId}_${input.zoneId}_${date}`;
  const nextDay = new Date(`${date}T12:00:00.000Z`); nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  const editableUntil = `${nextDay.toISOString().slice(0, 10)}T04:00:00.000Z`;
  const fields = {
    districtId: { stringValue: input.districtId }, zoneId: { stringValue: input.zoneId },
    date: { stringValue: date }, editableUntil: { timestampValue: editableUntil },
    payload: { stringValue: JSON.stringify(payload) }, automaticPercent: { integerValue: "0" },
    historicalImport: { booleanValue: true }, sourceFile: { stringValue: payload.source },
    updatedAt: { timestampValue: new Date().toISOString() },
  };
  const response = await fetch(`${endpoint}/${id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  });
  if (!response.ok) throw new Error(`${date}: ${response.status} ${await response.text()}`);
  console.log(`✓ ${date}`);
}
console.log(`Importación terminada: ${Object.keys(input.days).length} días históricos.`);
