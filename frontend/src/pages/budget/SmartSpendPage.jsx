import { useState, useEffect } from "react";
import { Search, Sparkles, MapPin, AlertCircle } from "lucide-react";
import { useBudgetOutlet } from "./useBudgetOutlet";
import StoreMap from "./StoreMap";
import api from "../../lib/api";

const categories = ["Food", "Clothing", "Groceries", "Haircut", "Electronics", "Drinks", "Pharmacy", "Other"];

const SmartSpendPage = () => {
  const context = useBudgetOutlet();
  const notify = context?.notify || console.log;
  
  const [category, setCategory] = useState(categories[0]);
  const [itemName, setItemName] = useState("");
  const [budget, setBudget] = useState("");
  const [searching, setSearching] = useState(false);
  const [places, setPlaces] = useState([]);
  const [aiRecommendation, setAiRecommendation] = useState(null);
  const [budgetContext, setBudgetContext] = useState(null);
  const [heatmapData, setHeatmapData] = useState([]);
  const [showHeatmap, setShowHeatmap] = useState(true);

  // Use state for center to allow geolocation update
  const [mapCenter, setMapCenter] = useState([12.9716, 77.5946]);
  const [locationError, setLocationError] = useState(null);
  const [radius, setRadius] = useState(5000); // Default 5km
  const [isLiveTracking, setIsLiveTracking] = useState(true);
  const [hasInitialLocation, setHasInitialLocation] = useState(false);
  const [locationMethod, setLocationMethod] = useState("Detecting...");
  const [locationAccuracy, setLocationAccuracy] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [ipAnchor, setIpAnchor] = useState(null);
  const [addressSearch, setAddressSearch] = useState("");
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }

    const successCallback = (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      console.log(`[GPS] Location found: ${latitude}, ${longitude} (±${accuracy}m)`);
      
      setMapCenter([latitude, longitude]);
      setLocationAccuracy(accuracy);
      setHasInitialLocation(true);
      setLocationError(null);
      setLocationMethod(accuracy < 100 ? "GPS (High Accuracy)" : "GPS (Active)");
    };

    const errorCallback = (error) => {
      console.warn("[GPS] Detection failed:", error.message);
      if (error.code === 1) {
        setLocationError("Location access denied. Please enable GPS permissions.");
      } else {
        setLocationError("GPS signal search timed out. Checking network...");
      }
    };

    // Task 1: Use high-accuracy getCurrentPosition
    navigator.geolocation.getCurrentPosition(
      successCallback,
      errorCallback,
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );

    // Optional: Keep watch for real-time movement
    let watchId = null;
    if (isLiveTracking) {
      watchId = navigator.geolocation.watchPosition(
        successCallback,
        errorCallback,
        { 
          enableHighAccuracy: true, 
          timeout: 15000, 
          maximumAge: 5000 
        }
      );
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [isLiveTracking]);

  const handleImproveAccuracy = () => {
    setHasInitialLocation(false);
    notify("info", "Resetting GPS sensors... searching for high-precision lock.");
  };

  const handleManualLocationChange = (newPos) => {
    setMapCenter(newPos);
    setIsLiveTracking(false); // Disable auto-tracking when user specifically picks a spot
  };

  // Handle Address Search (Nominatim)
  const handleAddressSearch = async (e) => {
    if (e) e.preventDefault();
    if (!addressSearch.trim()) return;

    setIsSearchingAddress(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressSearch)}`);
      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const newCenter = [parseFloat(lat), parseFloat(lon)];
        handleManualLocationChange(newCenter);
        setHasInitialLocation(true);
        notify("success", `Location locked to: ${data[0].display_name}`);
      } else {
        notify("error", "Location not found. Try a different name.");
      }
    } catch (error) {
       console.error("Search error:", error);
       notify("error", "Search service unavailable.");
    } finally {
      setIsSearchingAddress(false);
    }
  };

  // Search only occurs on manual button click as per user requested

  const handleFindOptions = async () => {
    if (!itemName || !budget) {
      notify("error", "Please fill in the item name and budget.");
      return;
    }
    
    setSearching(true);
    setAiRecommendation(null);
    try {
      const response = await api.get("/api/places/nearby", {
        params: {
          category: category.toLowerCase(),
          latitude: mapCenter[0],
          longitude: mapCenter[1],
          itemName,
          budget,
          radius
        }
      });
      
      const { places: fetchedPlaces, aiRecommendation: fetchedAi, budgetContext: fetchedContext, heatmapData: fetchedHeatmap, status, message } = response.data;
      
      if (status === "empty") {
        setPlaces([]);
        notify("info", message || `No nearby ${category} options found. Try increasing radius.`);
        return;
      }

      setPlaces(fetchedPlaces);
      setAiRecommendation(fetchedAi);
      setBudgetContext(fetchedContext);
      setHeatmapData(fetchedHeatmap || []);
      notify("success", `Found ${fetchedPlaces.length} real smart options for ${itemName}!`);
    } catch (error) {
      console.error("Failed to fetch places:", error);
      const errorMsg = error.response?.data?.message || "Trouble reaching scouting service. Please try again.";
      notify("error", errorMsg);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-cyan-600/20 text-cyan-400">
            <Sparkles size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Smart Spend Planner</h2>
            <p className="text-sm text-slate-400">Plan your purchase and find the best value options nearby.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-white">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-indigo-500"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Item Name</label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="What are you buying?"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-indigo-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Budget (₹)</label>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="Max Amount"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                             Search Radius: <span className="text-indigo-400 font-bold">{radius >= 1000 ? `${(radius / 1000).toFixed(1)} km` : `${radius} m`}</span>
                        </label>
                        <span className="text-[10px] text-slate-600 font-medium uppercase tracking-widest">Max 50km</span>
                    </div>
                    <input
                        type="range"
                        min="500"
                        max="50000"
                        step={radius < 2000 ? "100" : radius < 10000 ? "500" : "1000"}
                        value={radius}
                        onChange={(e) => setRadius(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all"
                    />
                    <div className="flex justify-between text-[8px] text-slate-600 font-bold uppercase tracking-tighter">
                        <span>500m</span>
                        <span>5km</span>
                        <span>10km</span>
                        <span>25km</span>
                        <span>50km</span>
                    </div>
                </div>
                
                <button
                    onClick={handleFindOptions}
                    disabled={searching}
                    className="px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-indigo-600/20 whitespace-nowrap self-end sm:self-auto"
                >
                    {searching ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search size={18} />}
                    Find Value Options
                </button>
            </div>
        </div>
      </section>

      {budgetContext && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 shadow-lg animate-in slide-in-from-top-4 duration-500">
              <div className="flex items-center gap-2 mb-4">
                  <AlertCircle size={18} className="text-amber-400" />
                  <h3 className="font-semibold text-white">Weekly {category} Capacity</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Weekly Limit</div>
                      <div className="text-xl font-bold text-white">₹{budgetContext.weekly_category_limit}</div>
                  </div>
                  <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Spent This Week</div>
                      <div className="text-xl font-bold text-red-400">₹{budgetContext.category_spent_this_week}</div>
                  </div>
                  <div className="bg-slate-950/50 p-4 rounded-xl border border-indigo-500/30">
                      <div className="text-[10px] text-indigo-400 uppercase font-bold mb-1">Remaining to Spend</div>
                      <div className="text-xl font-bold text-emerald-400">₹{budgetContext.remaining_category_budget}</div>
                  </div>
              </div>
              <div className="mt-4 w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 transition-all duration-1000" 
                    style={{ width: `${Math.min(100, (budgetContext.category_spent_this_week / budgetContext.weekly_category_limit) * 100)}%` }}
                  />
              </div>
          </section>
      )}

      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-xl h-[550px] flex flex-col relative overflow-hidden group">
        <div className="flex items-center justify-between mb-4 px-2">
          <div className="flex items-center gap-2">
            <MapPin size={18} className="text-emerald-400" />
            <h3 className="font-semibold text-white">Interactive Deals Map (OpenStreetMap)</h3>
          </div>
          <div className="flex items-center gap-4">
            <button 
                onClick={() => setShowHeatmap(!showHeatmap)}
                className={`flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-md border transition-all ${
                    showHeatmap 
                    ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' 
                    : 'bg-slate-800/50 border-slate-700 text-slate-500'
                }`}
            >
                <Sparkles size={12} />
                Heatmap: {showHeatmap ? 'ON' : 'OFF'}
            </button>

            <form onSubmit={handleAddressSearch} className="flex-1 max-w-[200px] relative hidden md:block">
                <input 
                    type="text"
                    value={addressSearch}
                    onChange={(e) => setAddressSearch(e.target.value)}
                    placeholder="Search area (e.g. Bantwal)..."
                    className="w-full bg-slate-950/50 border border-slate-700 rounded-md py-1 px-2 text-[10px] text-white outline-none focus:border-indigo-500 pr-6"
                />
                <button 
                   type="submit" 
                   disabled={isSearchingAddress}
                   className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-400"
                >
                    {isSearchingAddress ? <div className="w-2 h-2 border border-indigo-500 border-t-transparent rounded-full animate-spin" /> : <Search size={10} />}
                </button>
            </form>

            <button 
                onClick={handleImproveAccuracy}
                className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-md border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 transition-all active:scale-95"
            >
                <Sparkles size={12} className="animate-pulse" />
                Improve Accuracy
            </button>

            <button 
                onClick={() => setIsLiveTracking(!isLiveTracking)}
                className={`flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-md border transition-all ${
                    isLiveTracking 
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
                    : 'bg-slate-800/50 border-slate-700 text-slate-500'
                }`}
            >
                <div className={`w-1.5 h-1.5 rounded-full ${isLiveTracking ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                Live Tracking: {isLiveTracking ? 'ON' : 'OFF'}
            </button>

            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
               <div className="w-2 h-2 rounded-full bg-emerald-500" /> In Budget
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
               <div className="w-2 h-2 rounded-full bg-amber-500" /> Close
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
               <div className="w-2 h-2 rounded-full bg-red-500" /> Exp
            </div>
            {locationError ? (
                <div className="flex items-center gap-1.5 text-[10px] text-amber-400 bg-amber-400/10 px-2 py-1 rounded-full border border-amber-400/20">
                    <AlertCircle size={12} />
                    {locationError}
                </div>
            ) : (
                <div className="flex items-center gap-2 px-2 py-1 bg-slate-800/50 rounded-md border border-slate-700">
                    <div className={`w-1.5 h-1.5 rounded-full ${(locationAccuracy !== null && locationAccuracy < 100) ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`} />
                    <span className="text-[9px] text-slate-300 font-bold uppercase tracking-widest">{locationMethod}</span>
                    {locationAccuracy && (
                        <span className="text-[8px] text-slate-500 border-l border-slate-700 pl-2">±{Math.round(locationAccuracy)}m</span>
                    )}
                </div>
            )}
          </div>
        </div>

        <div className="w-full flex-1 rounded-xl bg-slate-950/50 border border-slate-800 overflow-hidden shadow-inner">
           <StoreMap 
            center={mapCenter} 
            zoom={radius <= 1000 ? 15 : radius <= 3000 ? 14 : radius <= 8000 ? 13 : radius <= 16000 ? 12 : radius <= 32000 ? 11 : 10} 
            places={places} 
            budget={Number(budget)} 
            recommendation={aiRecommendation}
            heatmapData={heatmapData}
            heatmapVisible={showHeatmap}
            searchRadius={radius}
            onLocationChange={handleManualLocationChange}
            accuracy={locationAccuracy}
           />
        </div>
      </section>

      {aiRecommendation && (
          <section className="rounded-2xl border-2 border-indigo-500/30 bg-indigo-950/20 p-5 shadow-2xl animate-in zoom-in-95 duration-500">
              <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-full bg-indigo-500/20 text-indigo-400">
                        <Sparkles size={24} className="animate-pulse" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            Gemini's Smart Choice
                            <span className="text-[10px] bg-indigo-500 text-white px-2 py-0.5 rounded-md uppercase tracking-widest">
                                {aiRecommendation.aiBadge || "Top Pick"}
                            </span>
                        </h3>
                        {/* Display the name of the recommended place */}
                        <div className="text-indigo-400 font-bold text-xl mt-1 animate-in fade-in slide-in-from-left-2 duration-700">
                            {aiRecommendation.best_choice}
                        </div>
                    </div>
                  </div>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-4">
                  <div className="text-indigo-400 font-semibold text-sm mb-1 uppercase tracking-tighter">Financial Reasoning</div>
                  <p className="text-slate-200 text-sm leading-relaxed italic">
                      "{aiRecommendation.reason}"
                  </p>
              </div>

              <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                      <Sparkles size={14} />
                  </div>
                  <div className="text-xs">
                      <span className="text-emerald-400 font-bold mr-1 uppercase">Savings Tip:</span>
                      <span className="text-slate-300">{aiRecommendation.savingsTip}</span>
                  </div>
              </div>
          </section>
      )}

      {places.length > 0 && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="flex items-center gap-2 mb-4">
                <Sparkles size={18} className="text-indigo-400" />
                <h3 className="font-semibold text-white">Smart Recommendations</h3>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {places
                    .sort((a, b) => a.estimatedPrice - b.estimatedPrice)
                    .map((place) => (
                    <div key={place.id} className="p-4 rounded-xl border border-slate-800 bg-slate-950/50 hover:border-indigo-500/50 transition-colors group">
                        <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-white group-hover:text-indigo-400 transition-colors">{place.name}</h4>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                place.estimatedPrice <= Number(budget) 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}>
                                ₹{place.estimatedPrice}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mb-3">{place.address}</p>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1 text-xs text-slate-400">
                                    <span className="text-amber-400">★</span>
                                    {place.rating.toFixed(1)}
                                </div>
                                <div className="text-[10px] text-slate-500 font-medium bg-slate-800/50 px-2 py-0.5 rounded">
                                    {place.distance_km} KM
                                </div>
                            </div>
                            {place.estimatedPrice <= Number(budget) && (
                                <div className="text-[10px] font-bold text-indigo-400 flex items-center gap-1">
                                    <Sparkles size={12} />
                                    GOOD VALUE
                                </div>
                            )}
                        </div>
                    </div>
                ))}
             </div>
          </section>
      )}
    </div>
  );
};

export default SmartSpendPage;

