import { useMemo, useState } from "react";

const mapPoints = [
  {
    id: "atm",
    label: "Nearest ATM",
    description: "Quick cash-out point near the main gate.",
    coords: "19.0026,72.8415",
    category: "Finance",
  },
  {
    id: "mess",
    label: "Budget Mess",
    description: "Student-friendly food option with low-cost meals.",
    coords: "18.9991,72.8442",
    category: "Food",
  },
  {
    id: "library",
    label: "City Library",
    description: "Quiet study space with free Wi-Fi and reading rooms.",
    coords: "19.0053,72.8389",
    category: "Study",
  },
  {
    id: "pharmacy",
    label: "24x7 Pharmacy",
    description: "Emergency medicines and student health essentials.",
    coords: "19.0069,72.8478",
    category: "Health",
  },
];

const defaultBbox = "72.79%2C18.93%2C72.90%2C19.04";

const MapFeaturePage = () => {
  const [selectedPoint, setSelectedPoint] = useState(mapPoints[0]);

  const embedSrc = useMemo(() => {
    const marker = encodeURIComponent(selectedPoint.coords);
    return `https://www.openstreetmap.org/export/embed.html?bbox=${defaultBbox}&layer=mapnik&marker=${marker}`;
  }, [selectedPoint]);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/75 p-5">
        <h1 className="text-xl font-semibold text-white">Campus Map</h1>
        <p className="mt-2 text-sm text-slate-400">
          Explore nearby essentials from the merge branch map feature, now integrated into the latest dashboard.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-3">
          <p className="px-2 pb-2 text-sm font-medium text-slate-300">Quick places</p>
          <div className="space-y-2">
            {mapPoints.map((point) => {
              const active = selectedPoint.id === point.id;
              return (
                <button
                  key={point.id}
                  onClick={() => setSelectedPoint(point)}
                  className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                    active
                      ? "border-indigo-500/50 bg-indigo-500/15 text-indigo-200"
                      : "border-slate-700 bg-slate-950/50 text-slate-300 hover:border-slate-600"
                  }`}
                >
                  <p className="text-sm font-semibold">{point.label}</p>
                  <p className="text-xs text-slate-400">{point.description}</p>
                  <span className="mt-1 inline-block rounded-full border border-slate-600 px-2 py-0.5 text-[11px] text-slate-400">
                    {point.category}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-3">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-slate-300">Focused location: {selectedPoint.label}</p>
            <a
              href={`https://www.openstreetmap.org/?mlat=${selectedPoint.coords.split(",")[0]}&mlon=${selectedPoint.coords.split(",")[1]}#map=16/${selectedPoint.coords}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:border-slate-600"
            >
              Open full map
            </a>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-700">
            <iframe title="Campus map" src={embedSrc} className="h-[520px] w-full" loading="lazy" />
          </div>
        </div>
      </section>
    </div>
  );
};

export default MapFeaturePage;
