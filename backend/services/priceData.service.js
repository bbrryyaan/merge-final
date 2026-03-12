/**
 * A representative dataset of restaurant pricing in Bangalore based on Zomato datasets.
 * Includes avg_cost_for_two and price_range (1-4).
 */
export const RESTAURANT_PRICES = {
    "Jalsa": { avg_cost_for_two: 800, price_range: 2 },
    "Empire Restaurant": { avg_cost_for_two: 750, price_range: 2 },
    "Meghana Foods": { avg_cost_for_two: 600, price_range: 2 },
    "Truffles": { avg_cost_for_two: 900, price_range: 3 },
    "Corner House Ice Creams": { avg_cost_for_two: 400, price_range: 1 },
    "Burger King": { avg_cost_for_two: 500, price_range: 2 },
    "McDonald's": { avg_cost_for_two: 400, price_range: 1 },
    "KFC": { avg_cost_for_two: 500, price_range: 2 },
    "Domino's Pizza": { avg_cost_for_two: 700, price_range: 2 },
    "Starbucks": { avg_cost_for_two: 1000, price_range: 3 },
    "Third Wave Coffee": { avg_cost_for_two: 800, price_range: 2 },
    "Nandhini Deluxe": { avg_cost_for_two: 600, price_range: 2 },
    "Sukh Sagar": { avg_cost_for_two: 400, price_range: 1 },
    "Leon's Burgers & Wings": { avg_cost_for_two: 600, price_range: 2 },
    "Chai Point": { avg_cost_for_two: 300, price_range: 1 },
    "Polar Bear": { avg_cost_for_two: 400, price_range: 1 },
    "California Burrito": { avg_cost_for_two: 600, price_range: 2 },
    "Pizza Hut": { avg_cost_for_two: 750, price_range: 2 },
    "Social": { avg_cost_for_two: 1500, price_range: 3 },
    "Toit": { avg_cost_for_two: 2000, price_range: 4 },
    "The Onesta": { avg_cost_for_two: 600, price_range: 2 },
    "Barbeque Nation": { avg_cost_for_two: 1800, price_range: 4 },
    "Absolute Barbecues": { avg_cost_for_two: 1600, price_range: 3 },
    "Glen's Bakehouse": { avg_cost_for_two: 800, price_range: 2 },
    "Chili's American Grill": { avg_cost_for_two: 1400, price_range: 3 },
};

/**
 * Heuristics for categories if no direct match is found
 */
export const CATEGORY_DEFAULTS = {
    "restaurant": { avg_cost_for_two: 600, price_range: 2 },
    "cafe": { avg_cost_for_two: 500, price_range: 2 },
    "bar": { avg_cost_for_two: 1200, price_range: 3 },
    "supermarket": { avg_cost_for_two: 400, price_range: 1 }, // Items vary
    "pharmacy": { avg_cost_for_two: 300, price_range: 1 },
    "clothes": { avg_cost_for_two: 1500, price_range: 3 },
    "electronics": { avg_cost_for_two: 5000, price_range: 4 },
    "shop": { avg_cost_for_two: 500, price_range: 2 }
};

/**
 * Estimates the cost per person for a given place.
 */
export const estimatePlacePrice = (name, osmType) => {
    // Try direct match
    let entry = RESTAURANT_PRICES[name];
    
    // Try fuzzy match (if name contains keys)
    if (!entry) {
        const key = Object.keys(RESTAURANT_PRICES).find(k => name.toLowerCase().includes(k.toLowerCase()));
        if (key) entry = RESTAURANT_PRICES[key];
    }
    
    // Use defaults
    if (!entry) {
        entry = CATEGORY_DEFAULTS[osmType] || CATEGORY_DEFAULTS["shop"];
    }

    const avg_cost = entry.avg_cost_for_two / 2;
    return {
        avg_cost,
        price_range: entry.price_range
    };
};
