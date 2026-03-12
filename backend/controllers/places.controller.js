import fetch from "node-fetch";
import { getAiSpendRecommendation } from "../services/spendAdvisor.service.js";
import { estimatePlacePrice } from "../services/priceData.service.js";
import User from "../models/user.js";
import Expense from "../models/expense.js";

const CATEGORY_MAP = {
  food: [
    { key: "amenity", value: "restaurant" },
    { key: "amenity", value: "fast_food" },
    { key: "amenity", value: "cafe" }
  ],
  groceries: [
    { key: "shop", value: "supermarket" },
    { key: "shop", value: "convenience" },
    { key: "shop", value: "grocery" }
  ],
  clothing: [
    { key: "shop", value: "clothes" },
    { key: "shop", value: "boutique" },
    { key: "shop", value: "fashion" }
  ],
  electronics: [
    { key: "shop", value: "electronics" }
  ],
  haircut: [
    { key: "shop", value: "hairdresser" },
    { key: "shop", value: "beauty" }
  ],
  pharmacy: [
    { key: "amenity", value: "pharmacy" }
  ],
  drinks: [
    { key: "amenity", value: "bar" },
    { key: "amenity", value: "pub" }
  ],
  other: [
    { key: "shop", value: "shop" }
  ]
};

// Irrelevant tags to strictly exclude
const EXCLUDED_TAGS = ["butcher", "fish", "wine", "laboratory", "car_repair", "industrial", "office"];
const RELEVANCE_KEYWORDS = {
  clothing: ["fashion", "clothing", "garments", "apparel", "wear", "trends", "style"],
  food: ["food", "dine", "kitchen", "cafe", "eats"],
  groceries: ["mart", "store", "market", "grocer"],
  electronics: ["tech", "mobile", "computer", "digital"]
};

const TRAVEL_COST_PER_KM = 15; // Average cost per km (Auto/Cab/Fuel)

// Helper to calculate distance in km
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const d = R * c; 
  return d.toFixed(2);
}

// Internal helper for Overpass API with retries/expansion
async function fetchFromOverpass(lat, lng, radius, categoryTags) {
  // Task 2: Build query using ONLY relevant tags for the category
  const tagQueries = categoryTags.map(tag => `
    node["${tag.key}"="${tag.value}"](around:${radius},${lat},${lng});
    way["${tag.key}"="${tag.value}"](around:${radius},${lat},${lng});
  `).join("");

  const query = `[out:json][timeout:25];
  (
    ${tagQueries}
  );
  out center;`;

  console.log(`[Overpass] Query: ${query}`);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); 

  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "User-Agent": "CanaraSmartSpend/1.1",
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    return data.elements || [];
  } catch (e) {
    clearTimeout(timeoutId);
    console.error(`[Overpass] Fetch failed at radius ${radius}:`, e.message);
    return [];
  }
}

export const searchPlaces = async (req, res) => {
  const { category, latitude, longitude, itemName, budget, radius } = req.query;
  console.log(`[SmartSpend] Input: category=${category}, item=${itemName}, budget=${budget}, lat=${latitude}, lng=${longitude}`);

  try {
    if (!category || !latitude || !longitude) {
      return res.status(400).json({ message: "Category and location are required" });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    // Task 2: Fix radius conversion (Support both meters and km)
    let parsedRadius = parseFloat(radius) || 2;
    // If radius is small (< 100), assume user sent Kilometers and convert to Meters
    const radiusMeters = parsedRadius < 100 ? parsedRadius * 1000 : parsedRadius;
    const initialRad = radiusMeters;
    
    const catObj = CATEGORY_MAP[category.toLowerCase()] || CATEGORY_MAP.other;

    console.log(`[SmartSpend] Searching Category: ${category} | Mapped to: ${catObj.key}=${catObj.value} | Radius: ${radiusMeters}m`);

    // Radius Expansion Logic (Recursive/Iterative attempt)
    let rawPlaces = [];
    let currentRadius = initialRad;
    const maxRadius = 15000; // Cap at 15km
    const expansionSteps = [initialRad, initialRad * 2.5, initialRad * 5];

    // Task 3: Use a correct Overpass query format (Explicit Node + Way)
    for (let i = 0; i < expansionSteps.length; i++) {
        currentRadius = Math.min(expansionSteps[i], maxRadius);
        const { key, value } = catObj;
        
        // Task 6: Log generated query
        console.log(`[SmartSpend] Scanned Radius: ${currentRadius}m`);
        
        rawPlaces = await fetchFromOverpass(lat, lng, currentRadius, catObj);
        if (rawPlaces.length > 0) {
            console.log(`[SmartSpend] Found ${rawPlaces.length} raw results at ${currentRadius}m`);
            break;
        }
        console.warn(`[SmartSpend] 0 results at ${currentRadius}m, expanding...`);
    }

    // Task 3 & 4: Process and simplify with relevance filtering
    const processedPlaces = rawPlaces
      .map(p => {
        const placeLat = p.lat || p.center?.lat || lat; 
        const placeLng = p.lon || p.center?.lon || lng; 
        const name = p.tags?.name || p.tags?.brand || "Local Shop";
        
        // Exclude irrelevant tags
        const pType = p.tags?.shop || p.tags?.amenity || "shop";
        if (EXCLUDED_TAGS.includes(pType)) return null;

        // Relevance Scoring
        let relevanceScore = 0;
        const normalizedName = name.toLowerCase();
        const normalizedItem = itemName.toLowerCase();
        
        // Boost if name includes item (e.g. "Levis Pants")
        if (normalizedName.includes(normalizedItem)) relevanceScore += 10;
        
        // Boost based on category keywords
        const keywords = RELEVANCE_KEYWORDS[category.toLowerCase()] || [];
        keywords.forEach(word => {
            if (normalizedName.includes(word)) relevanceScore += 5;
        });

        const pricing = estimatePlacePrice(name, pType);
        const distanceVal = parseFloat(calculateDistance(lat, lng, placeLat, placeLng));
        const travelCost = Math.round(distanceVal * TRAVEL_COST_PER_KM);
        const totalCost = pricing.avg_cost + travelCost;
        
        return {
          id: p.id.toString(),
          name: name,
          lat: placeLat,
          lng: placeLng,
          distance_km: distanceVal,
          address: p.tags?.["addr:street"] 
          ? `${p.tags["addr:street"]}, ${p.tags["addr:city"] || ""}` 
          : p.tags?.["addr:full"] || "Address unavailable",
          type: pType,
          rating: p.tags?.rating ? parseFloat(p.tags.rating) : 3.8 + (Math.random() * 1.2), 
          avg_cost: pricing.avg_cost,
          travel_cost: travelCost,
          total_cost: totalCost,
          estimatedPrice: totalCost,
          price_range: pricing.price_range,
          relevanceScore,
          tag: p.tags?.brand || p.tags?.shop || p.tags?.amenity || "Verified"
        };
      })
      .filter(p => p !== null)
      // Task 5: Sort by relevance then distance
      .sort((a, b) => (b.relevanceScore - a.relevanceScore) || (a.distance_km - b.distance_km))
      .slice(0, 40);

    // Task 7: Return sample data if no real places found
    let searchStatus = "success";
    let searchMessage = "";
    let isDemoMode = false;

    if (processedPlaces.length === 0) {
        console.log(`[SmartSpend] No real results found for ${category}. Injecting sample data.`);
        const samples = getSamplePlaces(lat, lng, category.toLowerCase());
        isDemoMode = true;
        
        // Process samples just like real places
        const demoPlaces = samples.map(s => {
          const distanceVal = parseFloat(calculateDistance(lat, lng, s.lat, s.lng));
          const travelCost = Math.round(distanceVal * TRAVEL_COST_PER_KM);
          const pricing = estimatePlacePrice(s.name, s.type);
          const totalCost = pricing.avg_cost + travelCost;

          return {
            ...s,
            id: `demo-${Math.random()}`,
            distance_km: distanceVal,
            avg_cost: pricing.avg_cost,
            travel_cost: travelCost,
            total_cost: totalCost,
            estimatedPrice: totalCost,
            price_range: pricing.price_range,
            relevanceScore: 100, // Boost demo results
            isDemo: true
          };
        });

        processedPlaces.push(...demoPlaces);
        searchMessage = `Showing 10 curated ${category} options (Demo mode - No real shops detected nearby).`;
    }

    // --- NEW: Fetch Real User Financial Data Context ---
    const user = await User.findById(req.user.id).catch(() => null);
    const monthlyTotalBudget = user?.monthlyBudget || 30000;
    
    // Simple heuristic: Weekly budget is ~25% of monthly. 
    // We assign weights to categories to estimate a category-specific limit.
    const categoryWeights = {
        food: 0.25,
        groceries: 0.20,
        clothing: 0.15,
        shopping: 0.15,
        transport: 0.10,
        pharmacy: 0.05,
        electronics: 0.10,
        other: 0.10
    };
    const currentCategory = category.toLowerCase();
    const weight = categoryWeights[currentCategory] || 0.10;
    const weeklyCategoryBudget = Math.round((monthlyTotalBudget / 4) * weight);

    // Get current week's spending for this category
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    // Escape category for regex to prevent crashes
    const safeCategory = category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const weeklyExpenses = await Expense.find({
        userId: req.user.id,
        category: { $regex: new RegExp(safeCategory, "i") },
        transactionDate: { $gte: startOfWeek },
        type: "expense"
    });
    
    const spentThisWeek = weeklyExpenses.reduce((sum, e) => sum + e.amount, 0);
    const remainingBudget = Math.max(0, weeklyCategoryBudget - spentThisWeek);

    const budgetContext = {
        total_monthly_limit: monthlyTotalBudget,
        weekly_category_limit: weeklyCategoryBudget,
        category_spent_this_week: spentThisWeek,
        remaining_category_budget: remainingBudget,
        currency: user?.currency || "INR"
    };

    // --- NEW: Generate Heatmap Data ---
    const heatmapData = generateHeatmap(processedPlaces, lat, lng, radiusMeters);

    // Get AI Recommendation with Financial Context
    const aiRecommendation = await getAiSpendRecommendation({
        category,
        itemName,
        budget, // This is the user's manually entered "willing to spend"
        places: processedPlaces,
        budgetContext // Pass the real financial context
    });

    res.status(200).json({
        places: processedPlaces,
        aiRecommendation,
        budgetContext,
        heatmapData,
        message: searchMessage,
        status: searchStatus,
        isDemo: isDemoMode
    });
  } catch (error) {
    res.status(500).json({ message: `Search failed: ${error.message}` });
  }
};

/**
 * Buckets places into a grid and calculates average prices for heat-mapping.
 */
function generateHeatmap(places, centerLat, centerLng, radiusMeters) {
    if (places.length === 0) return [];

    const gridSize = 10; // 10x10 grid
    const radiusKm = radiusMeters / 1000;
    const areaRadius = radiusKm * 0.009; // Approx conversion to lat/lng degrees
    
    // Bounds
    const minLat = centerLat - areaRadius;
    const maxLat = centerLat + areaRadius;
    const minLng = centerLng - areaRadius;
    const maxLng = centerLng + areaRadius;

    const latStep = (maxLat - minLat) / gridSize;
    const lngStep = (maxLng - minLng) / gridSize;

    const cells = [];

    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            const cellMinLat = minLat + (i * latStep);
            const cellMaxLat = cellMinLat + latStep;
            const cellMinLng = minLng + (j * lngStep);
            const cellMaxLng = cellMinLng + lngStep;

            const placesInCell = places.filter(p => 
                p.lat >= cellMinLat && p.lat < cellMaxLat && 
                p.lng >= cellMinLng && p.lng < cellMaxLng
            );

            if (placesInCell.length > 0) {
                const avgPrice = placesInCell.reduce((sum, p) => sum + p.total_cost, 0) / placesInCell.length;
                cells.push({
                    bounds: [
                        [cellMinLat, cellMinLng],
                        [cellMaxLat, cellMaxLng]
                    ],
                    avgPrice: Math.round(avgPrice),
                    count: placesInCell.length
                });
            }
        }
    }

    return cells;
}

/**
 * Generates realistic fallback data for demonstration if Overpass returns nothing.
 * Using realistic names and addresses for Bangalore context.
 */
function getSamplePlaces(lat, lng, category) {
    const data = {
        clothing: [
            { name: "City Center Trends", address: "KS Rao Rd, Hampankatta, Mangaluru", lat: 12.8711, lng: 74.8430 },
            { name: "Kodial Styles", address: "M.G. Road, Kodialbail, Mangaluru", lat: 12.8765, lng: 74.8380 },
            { name: "Elite Garments", address: "Forum Fiza Mall, Pandeshwar, Mangaluru", lat: 12.8620, lng: 74.8385 },
            { name: "Vogue Boutique", address: "Bejai Main Rd, Mangaluru", lat: 12.8910, lng: 74.8420 },
            { name: "Denim World", address: "Bharath Mall, Bejai, Mangaluru", lat: 12.8905, lng: 74.8415 },
            { name: "Classic Wear", address: "Falnir Rd, Mangaluru", lat: 12.8650, lng: 74.8450 },
            { name: "Trend Setters", address: "Surathkal, Mangaluru", lat: 13.0110, lng: 74.7930 },
            { name: "Aura Fashion", address: "Kankanady, Mangaluru", lat: 12.8680, lng: 74.8560 },
            { name: "Luxe Apparel", address: "Balmatta Rd, Mangaluru", lat: 12.8720, lng: 74.8510 },
            { name: "Style Hub", address: "Kadri, Mangaluru", lat: 12.8830, lng: 74.8550 }
        ],
        food: [
            { name: "Ideal Ice Cream", address: "Hampankatta, Mangaluru", lat: 12.8715, lng: 74.8435 },
            { name: "Giri Manja's", address: "Car Street, Mangaluru", lat: 12.8760, lng: 74.8400 },
            { name: "Pabbas", address: "Lalbagh, Mangaluru", lat: 12.8810, lng: 74.8410 },
            { name: "Machali", address: "Sharada School Rd, Mangaluru", lat: 12.8730, lng: 74.8450 },
            { name: "Pallkhi", address: "Balmatta, Mangaluru", lat: 12.8700, lng: 74.8520 },
            { name: "Kudla Restaurant", address: "Hampankatta, Mangaluru", lat: 12.8720, lng: 74.8440 },
            { name: "Village Restaurant", address: "Yeyyadi, Mangaluru", lat: 12.9050, lng: 74.8620 },
            { name: "Hotel Narayana", address: "Bunder, Mangaluru", lat: 12.8600, lng: 74.8350 },
            { name: "Gajalee", address: "Circuit House Compound, Mangaluru", lat: 12.8850, lng: 74.8580 },
            { name: "The Liquid Lounge", address: "Balmatta, Mangaluru", lat: 12.8710, lng: 74.8500 }
        ],
        groceries: [
            { name: "Daily Fresh", address: "Kadri, Mangaluru", lat: 12.8820, lng: 74.8540 },
            { name: "City Mart", address: "Bejai, Mangaluru", lat: 12.8900, lng: 74.8430 },
            { name: "Nilgiris", address: "Kodialbail, Mangaluru", lat: 12.8750, lng: 74.8390 },
            { name: "Big Bazaar", address: "Bharath Mall, Mangaluru", lat: 12.8905, lng: 74.8415 },
            { name: "More Supermarket", address: "Attavar, Mangaluru", lat: 12.8620, lng: 74.8420 },
            { name: "Neighborhood Grocery", address: "Ashok Nagar, Mangaluru", lat: 12.8950, lng: 74.8350 },
            { name: "Green Grocery", address: "Bondel, Mangaluru", lat: 12.9200, lng: 74.8650 },
            { name: "Value Mart", address: "Kulshekar, Mangaluru", lat: 12.8950, lng: 74.8850 },
            { name: "Smart Shopper", address: "Derebail, Mangaluru", lat: 12.9100, lng: 74.8450 },
            { name: "Quick Pick", address: "Urwa Store, Mangaluru", lat: 12.8980, lng: 74.8320 }
        ],
        electronics: [
            { name: "Harsha Electronics", address: "Falnir Rd, Mangaluru", lat: 12.8640, lng: 74.8440 },
            { name: "Digital World", address: "K.S. Rao Rd, Mangaluru", lat: 12.8720, lng: 74.8420 },
            { name: "Smart Solutions", address: "Hampankatta, Mangaluru", lat: 12.8700, lng: 74.8450 },
            { name: "Gadget Galaxy", address: "Bejai, Mangaluru", lat: 12.8920, lng: 74.8410 },
            { name: "Future Tech", address: "Kodialbail, Mangaluru", lat: 12.8770, lng: 74.8380 },
            { name: "Electro Hub", address: "Lady Hill, Mangaluru", lat: 12.8850, lng: 74.8350 },
            { name: "Circuit City", address: "Pumpwell, Mangaluru", lat: 12.8640, lng: 74.8650 },
            { name: "Mobile Master", address: "Mannagudda, Mangaluru", lat: 12.8820, lng: 74.8320 },
            { name: "Binary Bits", address: "Derebail, Mangaluru", lat: 12.9120, lng: 74.8470 },
            { name: "Connect Pro", address: "Kankanady, Mangaluru", lat: 12.8660, lng: 74.8580 }
        ],
        haircut: [
            { name: "Signature Salon", address: "Balmatta, Mangaluru", lat: 12.8720, lng: 74.8520 },
            { name: "Elite Barbers", address: "Kadri, Mangaluru", lat: 12.8840, lng: 74.8560 },
            { name: "Glow Beauty Parlour", address: "Bejai, Mangaluru", lat: 12.8910, lng: 74.8430 },
            { name: "Trends Hair Studio", address: "Kodialbail, Mangaluru", lat: 12.8750, lng: 74.8400 },
            { name: "The Grooming Lounge", address: "Bendoorwell, Mangaluru", lat: 12.8720, lng: 74.8620 },
            { name: "Style & Smile", address: "Hampankatta, Mangaluru", lat: 12.8710, lng: 74.8420 },
            { name: "Perfect Cut", address: "Lalbagh, Mangaluru", lat: 12.8820, lng: 74.8400 },
            { name: "Royal Spa", address: "Pandeshwar, Mangaluru", lat: 12.8620, lng: 74.8390 },
            { name: "Urban Unisex", address: "Attavar, Mangaluru", lat: 12.8640, lng: 74.8410 },
            { name: "Charm Salon", address: "Kankanady, Mangaluru", lat: 12.8670, lng: 74.8570 }
        ],
        pharmacy: [
            { name: "Deralakatte Pharmacy", address: "Deralakatte, Mangaluru", lat: 12.8150, lng: 74.8900 },
            { name: "Unity Health Pharmacy", address: "Kankanady, Mangaluru", lat: 12.8680, lng: 74.8580 },
            { name: "Wellness Pharma", address: "Hampankatta, Mangaluru", lat: 12.8720, lng: 74.8430 },
            { name: "Care Chemist", address: "Bejai, Mangaluru", lat: 12.8900, lng: 74.8420 },
            { name: "Life Line Medics", address: "Kodialbail, Mangaluru", lat: 12.8760, lng: 74.8400 },
            { name: "Health First", address: "Kadri, Mangaluru", lat: 12.8830, lng: 74.8540 },
            { name: "Metro Medic", address: "Lalbagh, Mangaluru", lat: 12.8810, lng: 74.8410 },
            { name: "First Aid Pharma", address: "Urwa Store, Mangaluru", lat: 12.8990, lng: 74.8330 },
            { name: "Swift Pharma", address: "Surathkal, Mangaluru", lat: 13.0120, lng: 74.7950 },
            { name: "Pure Cure", address: "Falnir, Mangaluru", lat: 12.8640, lng: 74.8450 }
        ],
        drinks: [
            { name: "The Liquid Lounge", address: "Balmatta, Mangaluru", lat: 12.8715, lng: 74.8515 },
            { name: "Froth on Top", address: "Arya Samaj Rd, Mangaluru", lat: 12.8720, lng: 74.8480 },
            { name: "Retox", address: "City Center, Mangaluru", lat: 12.8715, lng: 74.8425 },
            { name: "High Tide", address: "Pandeshwar, Mangaluru", lat: 12.8610, lng: 74.8380 },
            { name: "Onyx Air Lounge", address: "M.G. Road, Mangaluru", lat: 12.8770, lng: 74.8390 },
            { name: "Deja Vu", address: "Kodialbail, Mangaluru", lat: 12.8760, lng: 74.8410 },
            { name: "Sutra", address: "Lady Hill, Mangaluru", lat: 12.8860, lng: 74.8340 },
            { name: "The Thirsty Crow", address: "Kankanady, Mangaluru", lat: 12.8660, lng: 74.8560 },
            { name: "Big Bang", address: "Yeyyadi, Mangaluru", lat: 12.9060, lng: 74.8630 },
            { name: "Cheers Pub", address: "Kadri, Mangaluru", lat: 12.8820, lng: 74.8550 }
        ],
        other: [
            { name: "Corner Shop", address: "Bunder, Mangaluru", lat: 12.8610, lng: 74.8360 },
            { name: "Local General Store", address: "Ashok Nagar, Mangaluru", lat: 12.8940, lng: 74.8340 },
            { name: "Handy Mart", address: "Bondel, Mangaluru", lat: 12.9210, lng: 74.8660 },
            { name: "Essentials Plus", address: "Surathkal, Mangaluru", lat: 13.0120, lng: 74.7940 },
            { name: "City Variety", address: "Hampankatta, Mangaluru", lat: 12.8725, lng: 74.8435 },
            { name: "The Neighborhood Hub", address: "Lady Hill, Mangaluru", lat: 12.8870, lng: 74.8355 },
            { name: "Blue Box Store", address: "Attavar, Mangaluru", lat: 12.8650, lng: 74.8420 },
            { name: "Utility Center", address: "Kulshekar, Mangaluru", lat: 12.8960, lng: 74.8860 },
            { name: "All-In-One", address: "Derebail, Mangaluru", lat: 12.9110, lng: 74.8460 },
            { name: "Quality Picks", address: "Kankanady, Mangaluru", lat: 12.8690, lng: 74.8590 }
        ]
    };

    const targetList = data[category] || data.other;
    const types = {
        clothing: "clothes",
        food: "restaurant",
        groceries: "supermarket",
        electronics: "electronics",
        haircut: "hairdresser",
        pharmacy: "pharmacy",
        drinks: "bar",
        other: "shop"
    };

    return targetList.map((item, i) => {
        // Task: Offset by ~500m to 2km randomly around the USER'S PRESENT location
        // This ensures the dummy data matches where the user is actually looking.
        const latOffset = (Math.random() - 0.5) * 0.02;
        const lngOffset = (Math.random() - 0.5) * 0.02;
        
        return {
            name: item.name,
            lat: lat + latOffset,
            lng: lng + lngOffset,
            address: item.address,
            type: types[category] || "shop",
            rating: 4.0 + (Math.random() * 0.9),
            tag: "Demo"
        };
    });
}
