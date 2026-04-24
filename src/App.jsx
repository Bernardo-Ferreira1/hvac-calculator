
import React, { useState, useMemo } from "react";

/* ================= UI ================= */

const Card = ({ children }) => (
  <div style={{
    border: "1px solid #ccc",
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    background: "#fafafa",
  }}>
    {children}
  </div>
);

const Label = ({ children }) => (
  <div style={{ fontWeight: "bold", marginTop: 8 }}>{children}</div>
);

const Input = (props) => (
  <input style={{ padding: 4, marginRight: 6, minWidth: 80 }} {...props} />
);

const Button = ({ children, ...props }) => (
  <button style={{ padding: "4px 8px", marginRight: 6 }} {...props}>
    {children}
  </button>
);

/* ================= Constantes ================= */

const RHO = 1.2;
const MU = 1.8e-5;

/* ================= Materiais ================= */

const MATERIALS = [
  { id: "galv", name: "Aço galvanizado", eps: 0.00015 },
  { id: "inox", name: "Inox", eps: 0.00003 },
  { id: "pvc", name: "PVC / Plástico", eps: 0.00001 },
];

/* ================= Acessórios ================= */

const ACCESSORIES = [
  { id: "curve90", name: "Curva 90°", K: 0.9 },
  { id: "grille", name: "Grelha / Terminal", K: 1.5 },
  { id: "reduction", name: "Redução", K: 0.5 },
];

/* ================= Funções ================= */

function frictionFactor(Re, eps, D) {
  if (Re <= 0) return 0;
  return (
    0.25 /
    Math.pow(
      Math.log10(eps / (3.7 * D) + 5.74 / Math.pow(Re, 0.9)),
      2
    )
  );
}

/* ================= App ================= */

export default function App() {

  const [sections, setSections] = useState([
    {
      flow_m3h: 500,
      diameter: 0.2,
      length: 10,
      material: "galv",
      losses: []
    }
  ]);

  const [safetyPercent, setSafetyPercent] = useState(0);

  const results = useMemo(() => {
    let totalLoss = 0;

    const detailed = sections.map((s) => {
      const Q = s.flow_m3h / 3600;
      const area = Math.PI * s.diameter ** 2 / 4;
      const velocity = Q / area;
      const Re = (RHO * velocity * s.diameter) / MU;

      const mat = MATERIALS.find(m => m.id === s.material);
      const f = frictionFactor(Re, mat.eps, s.diameter);

      const linearLoss =
        f * (s.length / s.diameter) * (RHO * velocity ** 2 / 2);

      const pressurePerMeter = linearLoss / s.length;

      const Ktotal = s.losses.reduce(
        (sum, l) => sum + l.K * l.qty, 0
      );

      const singularLoss = Ktotal * (RHO * velocity ** 2 / 2);
      const sectionLoss = linearLoss + singularLoss;

      totalLoss += sectionLoss;

      return {
        area,
        velocity,
        Re,
        f,
        linearLoss,
        pressurePerMeter,
        sectionLoss,
      };
    });

    const safetyFactor = 1 + safetyPercent / 100;

    return {
      detailed,
      totalLoss,
      safetyFactor,
      totalWithSafety: totalLoss * safetyFactor,
    };
  }, [sections, safetyPercent]);

  return (
    <div style={{ padding: 20, maxWidth: 900 }}>
      <h2 style={{ textAlign: "center" }}>
        Calculadora HVAC – Ramal Crítico
      </h2>

      {sections.map((s, i) => (
        <Card key={i}>
          <h3>Troço {i + 1}</h3>

          <Label>Caudal (m³/h)</Label>
          <Input type="number" value={s.flow_m3h}
            onChange={e => {
              const n = [...sections];
              n[i].flow_m3h = +e.target.value;
              setSections(n);
            }} />

          <Label>Diâmetro (m)</Label>
          <Input type="number" step="0.01" value={s.diameter}
            onChange={e => {
              const n = [...sections];
              n[i].diameter = +e.target.value;
              setSections(n);
            }} />

          <Label>Comprimento (m)</Label>
          <Input type="number" value={s.length}
            onChange={e => {
              const n = [...sections];
              n[i].length = +e.target.value;
              setSections(n);
            }} />

          <Label>Material</Label>
          <select value={s.material}
            onChange={e => {
              const n = [...sections];
              n[i].material = e.target.value;
              setSections(n);
            }}>
            {MATERIALS.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>

          <Label>Acessórios</Label>
          {s.losses.map((l, j) => (
            <div key={j}>
              <select value={l.id}
                onChange={e => {
                  const acc = ACCESSORIES.find(a => a.id === e.target.value);
                  const n = [...sections];
                  n[i].losses[j] = { ...acc, qty: l.qty };
                  setSections(n);
                }}>
                {ACCESSORIES.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>

              <Input type="number" value={l.qty}
                onChange={e => {
                  const n = [...sections];
                  n[i].losses[j].qty = +e.target.value;
                  setSections(n);
                }} />

              <Button onClick={() => {
                const n = [...sections];
                n[i].losses = n[i].losses.filter((_, k) => k !== j);
                setSections(n);
              }}>❌</Button>
            </div>
          ))}

          <Button onClick={() => {
            const n = [...sections];
            n[i].losses.push({ ...ACCESSORIES[0], qty: 1 });
            setSections(n);
          }}>+ Adicionar acessório</Button>

          <hr />

          <p><b>Área:</b> {results.detailed[i].area.toFixed(4)} m²</p>
          <p><b>Velocidade:</b> {results.detailed[i].velocity.toFixed(2)} m/s</p>
          <p><b>Reynolds:</b> {Math.round(results.detailed[i].Re)}</p>
          <p><b>f:</b> {results.detailed[i].f.toFixed(4)}</p>
          <p><b>Perda linear:</b> {results.detailed[i].linearLoss.toFixed(1)} Pa</p>
          <p><b>P (Pa/m):</b> {results.detailed[i].pressurePerMeter.toFixed(2)} Pa/m</p>
          <p><b>Δp troço:</b> {results.detailed[i].sectionLoss.toFixed(1)} Pa</p>

          <Button onClick={() =>
            setSections(sections.filter((_, idx) => idx !== i))
          }>Remover troço</Button>
        </Card>
      ))}

      <Button onClick={() =>
        setSections([...sections, {
          flow_m3h: 500,
          diameter: 0.2,
          length: 10,
          material: "galv",
          losses: []
        }])
      }>+ Adicionar troço</Button>

      <Card>
        <Label>Coeficiente de segurança (%)</Label>
        <Input type="number" value={safetyPercent}
          onChange={e => setSafetyPercent(+e.target.value)} />
        <p>Fator aplicado: × {results.safetyFactor.toFixed(2)}</p>
      </Card>

      <Card>
        <h3>Resultado final</h3>
        <p>Perda calculada: <b>{results.totalLoss.toFixed(1)} Pa</b></p>
        <p>Perda com segurança: <b>{results.totalWithSafety.toFixed(1)} Pa</b></p>
      </Card>
    </div>
  );
}
