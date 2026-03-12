import { MapContainer, TileLayer, Marker, Popup, useMap, Rectangle, Circle, Polyline, LayersControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useState, useCallback, useEffect } from 'react';

const { BaseLayer } = LayersControl;

// Fix for default marker icons in Leaflet with Webpack/Vite
// ... (omitting unchanged marker icon logic for brevity, keeping imports)
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

// Helper component to handle map re-centering when props change
const ChangeView = ({ center, zoom }) => {
  const map = useMap();
  map.setView(center, zoom);
  return null;
};

const StoreMap = ({ 
  center = [12.9716, 77.5946], 
  zoom = 13, 
  places = [], 
  budget = 0, 
  recommendation = null,
  heatmapData = [],
  heatmapVisible = true,
  searchRadius = 5000,
  onLocationChange = null,
  accuracy = null
}) => {
  const [activeRoute, setActiveRoute] = useState(null);
  const [routingInfo, setRoutingInfo] = useState(null);

  // Clear route when center changes significantly
  useEffect(() => {
    setActiveRoute(null);
    setRoutingInfo(null);
  }, [center]);

  const fetchRoute = useCallback(async (destLat, destLng) => {
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${center[1]},${center[0]};${destLng},${destLat}?overview=full&geometries=geojson`
      );
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        // OSRM returns [lng, lat], Leaflet needs [lat, lng]
        const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
        setActiveRoute(coordinates);
        setRoutingInfo({
          distance: (route.distance / 1000).toFixed(1),
          duration: Math.round(route.duration / 60)
        });
      }
    } catch (error) {
      console.error("Routing error:", error);
    }
  }, [center]);

  // Component to handle map clicks
  const MapEvents = () => {
    useMap({
      click(e) {
        if (onLocationChange) {
          onLocationChange([e.latlng.lat, e.latlng.lng]);
        }
      },
    });
    return null;
  };

  // Function to create custom color markers
  const createIcon = (color, isSpecial = false) => {
    if (isSpecial) {
      return new L.DivIcon({
        html: `<div style="background-color: #fbbf24; width: 24px; height: 24px; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 15px #fbbf24; display: flex; align-items: center; justify-content: center; color: white; font-size: 14px;">★</div>`,
        className: 'custom-div-icon special-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12]
      });
    }
    return new L.DivIcon({
      html: `<div style="background-color: ${color}; width: 12px; height: 12px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 10px ${color};"></div>`,
      className: 'custom-div-icon',
      iconSize: [12, 12],
      iconAnchor: [6, 6],
      popupAnchor: [0, -6]
    });
  };

  const getMarkerColor = (price) => {
    if (!budget) return '#10b981'; // Green default
    if (price <= budget) return '#10b981'; // Green
    if (price <= budget * 1.2) return '#f59e0b'; // Yellow (Amber)
    return '#ef4444'; // Red
  };

  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-slate-800 shadow-inner min-h-[400px]">
      <MapContainer 
        center={center} 
        zoom={zoom} 
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%', background: '#020617' }}
      >
        <ChangeView center={center} zoom={zoom} />
        <MapEvents />
        
        <LayersControl position="topright">
          <BaseLayer name="Dark View">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              className="map-tiles"
            />
          </BaseLayer>
          <BaseLayer checked name="Standard View">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </BaseLayer>
          <BaseLayer name="Satellite View">
            <TileLayer
              attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EBP, and the GIS User Community'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </BaseLayer>
        </LayersControl>

        {/* Search Radius Visualization */}
        <Circle 
          center={center}
          radius={searchRadius}
          pathOptions={{ 
            color: '#6366f1', 
            fillColor: '#6366f1', 
            fillOpacity: 0.05, 
            weight: 1,
            dashArray: '5, 10'
          }}
        />

        {/* Location Accuracy Radius */}
        {accuracy && (
          <Circle
            center={center}
            radius={accuracy}
            pathOptions={{
              color: '#10b981',
              fillColor: '#10b981',
              fillOpacity: 0.1,
              weight: 1,
              dashArray: '2, 5'
            }}
          />
        )}

        {/* Active Route Polyline (Glowing Layered Path) */}
        {activeRoute && (
          <>
            {/* Outline/Glow */}
            <Polyline 
              positions={activeRoute} 
              pathOptions={{ 
                color: '#6366f1', 
                weight: 8, 
                opacity: 0.3, 
                lineJoin: 'round',
                lineCap: 'round'
              }} 
            />
            {/* Main Path */}
            <Polyline 
              positions={activeRoute} 
              pathOptions={{ 
                color: '#818cf8', 
                weight: 4, 
                opacity: 1,
                lineJoin: 'round',
                lineCap: 'round'
              }} 
            />
          </>
        )}

        {/* Budget Heatmap Layer */}
        {heatmapVisible && heatmapData.map((cell, index) => (
          <Rectangle
            key={`heatmap-${index}`}
            bounds={cell.bounds}
            pathOptions={{
              fillColor: getMarkerColor(cell.avgPrice),
              fillOpacity: 0.15,
              weight: 0.5,
              color: 'transparent'
            }}
          >
            <Popup>
              <div className="text-[10px] space-y-1">
                <div className="font-bold text-indigo-400">Area Value Analysis</div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Avg Cost:</span>
                  <span className="font-bold">₹{cell.avgPrice}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Options:</span>
                  <span className="font-bold">{cell.count} shops</span>
                </div>
              </div>
            </Popup>
          </Rectangle>
        ))}
        
        {/* User Location Marker */}
        <Marker 
          position={center} 
          icon={createIcon('#6366f1')}
          draggable={true}
          eventHandlers={{
            dragend: (e) => {
              const marker = e.target;
              const position = marker.getLatLng();
              if (onLocationChange) {
                onLocationChange([position.lat, position.lng]);
              }
            },
          }}
        >
          <Popup>
            <div className="text-xs">
              <strong className="text-indigo-400">Search Center</strong><br />
              <div className="text-[10px] text-slate-500 font-mono mt-1">
                {center[0].toFixed(4)}, {center[1].toFixed(4)}
              </div>
              <p className="text-slate-300 mt-1">Deals are being searched around this point.</p>
            </div>
          </Popup>
        </Marker>

        {/* Business/Deal Markers */}
        {places.map((place) => {
          const isAiChoice = recommendation?.recommendedPlaceId === place.id;
          return (
            <Marker 
              key={place.id} 
              position={[place.lat, place.lng]}
              icon={createIcon(getMarkerColor(place.estimatedPrice), isAiChoice)}
              eventHandlers={{
                click: () => fetchRoute(place.lat, place.lng)
              }}
            >
              <Popup>
                <div className="space-y-1 min-w-[180px]">
                  {isAiChoice && (
                    <div className="text-[9px] font-bold text-indigo-400 mb-1 flex items-center gap-1 uppercase tracking-widest">
                       <span className="text-[#fbbf24]">★</span> AI RECOMMENDED OPTION
                    </div>
                  )}
                  <div className="font-bold text-indigo-400">{place.name}</div>
                  <div className="text-[10px] text-slate-400 mb-2">{place.address}</div>
                  
                  {routingInfo && activeRoute && activeRoute[activeRoute.length-1][0] === place.lat && (
                    <div className="flex items-center gap-3 py-1.5 px-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg mb-2">
                       <div className="flex flex-col">
                          <span className="text-[7px] text-slate-500 uppercase font-bold">Road Dist</span>
                          <span className="text-[10px] text-indigo-300 font-bold">{routingInfo.distance} km</span>
                       </div>
                       <div className="flex flex-col">
                          <span className="text-[7px] text-slate-500 uppercase font-bold">Drive Time</span>
                          <span className="text-[10px] text-emerald-400 font-bold">{routingInfo.duration} min</span>
                       </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 py-2 border-y border-slate-800 my-2">
                    <div className="space-y-1">
                        <div className="text-[8px] text-slate-500 uppercase">Item Cost</div>
                        <div className="text-xs text-white font-medium">₹{place.avg_cost}</div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-[8px] text-slate-500 uppercase">Travel</div>
                        <div className="text-xs text-slate-300">₹{place.travel_cost}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-1">
                      <div className="flex flex-col">
                          <span className="text-[8px] text-indigo-400 uppercase font-bold">Total Cost</span>
                          <span className={`text-sm font-black ${place.total_cost <= budget ? 'text-emerald-400' : place.total_cost <= budget * 1.2 ? 'text-amber-400' : 'text-red-400'}`}>
                              ₹{place.total_cost}
                          </span>
                      </div>
                      <div className="text-right">
                          <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400">
                             <span className="text-amber-400">★</span> {place.rating.toFixed(1)}
                          </div>
                          <div className="text-[9px] text-slate-500">{place.distance_km} km away</div>
                      </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      
      <style>{`
        .map-tiles {
          filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
        }
        .leaflet-container {
          font-family: inherit;
        }
        .leaflet-control-zoom-in, .leaflet-control-zoom-out {
          background: #1e293b !important;
          color: white !important;
          border: 1px solid #334155 !important;
        }
        .leaflet-popup-content-wrapper {
          background: #0f172a;
          color: white;
          border: 1px solid #334155;
        }
        .leaflet-popup-tip {
          background: #0f172a;
        }
      `}</style>
    </div>
  );
};

export default StoreMap;
