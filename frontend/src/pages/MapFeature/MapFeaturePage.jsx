const MapFeaturePage = () => {
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/75 p-5">
        <h1 className="text-xl font-semibold text-white">Campus Map</h1>
        <p className="mt-2 text-sm text-slate-400">
          Explore nearby essentials on an interactive map. Use zoom and drag to inspect the area.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/75 p-3">
        <div className="overflow-hidden rounded-xl border border-slate-700">
          <iframe
            title="Campus map"
            src="https://www.openstreetmap.org/export/embed.html?bbox=72.79%2C18.93%2C72.90%2C19.04&layer=mapnik"
            className="h-[520px] w-full"
            loading="lazy"
          />
        </div>
      </section>
    </div>
  );
};

export default MapFeaturePage;
