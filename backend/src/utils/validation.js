// ========================================================================
// ACTIVITY VALIDATION LAYER
// Validates activity data, units, and required fields
// ========================================================================

const ACTIVITY_TYPES = {
  stationary_combustion: {
    name: 'Stationary Combustion',
    required: ['fuel_combusted', 'quantity_combusted', 'units'],
    scope: 1,
  },
  mobile_sources: {
    name: 'Mobile Sources',
    required: ['vehicle_type', 'calculation_method', 'on_road_or_non_road'],
    scope: 1,
    conditionalRequired: {
      FUEL_BASED: ['fuel_usage', 'units'],
      DISTANCE_BASED: ['miles_traveled'],
    },
  },
  refrigeration_ac: {
    name: 'Refrigeration & AC',
    required: ['refrigerant_type', 'amount_released', 'amount_units'],
    scope: 1,
  },
  fire_suppression: {
    name: 'Fire Suppression',
    required: ['suppressant_type', 'amount_used', 'amount_units'],
    scope: 1,
  },
  purchased_gases: {
    name: 'Purchased Gases',
    required: ['gas_type', 'amount_purchased', 'amount_units'],
    scope: 1,
  },
  electricity: {
    name: 'Electricity',
    required: ['kwh_purchased', 'calculation_method'],
    scope: 2,
  },
  steam: {
    name: 'Steam & Heat',
    required: ['amount_purchased', 'amount_units'],
    scope: 2,
  },
  business_travel_air: {
    name: 'Air Travel',
    required: ['departure_city', 'arrival_city', 'flight_type', 'cabin_class', 'distance_km'],
    scope: 3,
  },
  business_travel_rail: {
    name: 'Rail Travel',
    required: ['route', 'rail_type', 'distance_km'],
    scope: 3,
  },
  business_travel_road: {
    name: 'Road Travel',
    required: ['transport_type', 'vehicle_size', 'distance_km'],
    scope: 3,
  },
  business_travel_hotel: {
    name: 'Hotel Accommodation',
    required: ['hotel_name', 'city_country', 'num_nights'],
    scope: 3,
  },
  commuting: {
    name: 'Employee Commuting',
    required: ['commute_mode'],
    scope: 3,
  },
  transportation_distribution: {
    name: 'Transportation & Distribution',
    required: ['transport_mode'],
    scope: 3,
  },
  waste: {
    name: 'Waste',
    required: ['waste_type', 'disposal_method', 'amount', 'amount_units'],
    scope: 3,
  },
  offsets: {
    name: 'Carbon Offsets',
    required: ['offset_description', 'amount_mtco2e'],
    scope: 0,
  },
};

const DROPDOWNS = {
  fuel_types: [
    'Natural Gas',
    'Diesel',
    'Petrol',
    'LPG',
    'Kerosene',
    'Coal',
    'Biomass',
    'Other',
  ],
  vehicle_types: [
    'Car',
    'Van',
    'Truck',
    'Bus',
    'Motorcycle',
    'Tractor',
    'Other',
  ],
  refrigerant_types: [
    'HFC-134a',
    'HFC-407C',
    'HFC-410A',
    'HFC-507A',
    'Other HFCs',
    'Non-fluorinated',
  ],
  flight_types: ['Domestic', 'Short-haul', 'Long-haul'],
  cabin_classes: ['Economy', 'Business', 'First'],
  rail_types: ['Passenger Train', 'Freight Train', 'Tram', 'Metro'],
  transport_types: ['Car (rental)', 'Taxi', 'Bus', 'Coach'],
  vehicle_sizes: ['Small', 'Medium', 'Large'],
  commute_modes: [
    'Car (solo)',
    'Car (shared)',
    'Public Transport',
    'Bicycle',
    'Walking',
    'Motorcycle',
    'Other',
  ],
  hotel_categories: ['1-star', '2-star', '3-star', '4-star', '5-star'],
  transport_modes: [
    'Road',
    'Rail',
    'Air',
    'Sea',
    'Multi-modal',
  ],
  waste_types: [
    'General Waste',
    'Recycling',
    'Organic/Food Waste',
    'Hazardous Waste',
    'Packaging',
    'Other',
  ],
  disposal_methods: [
    'Landfill',
    'Incineration',
    'Recycling',
    'Composting',
    'Energy Recovery',
    'Other',
  ],
  units: [
    'kg',
    'tonnes',
    'litres',
    'gallons',
    'cubic meters',
    'kWh',
    'MWh',
    'km',
    'miles',
    'kg CO2e',
    'tonnes CO2e',
  ],
};

// Validate activity data
export function validateActivity(activityType, data) {
  const config = ACTIVITY_TYPES[activityType];

  if (!config) {
    return { valid: false, errors: [`Unknown activity type: ${activityType}`] };
  }

  const errors = [];

  // Check required fields
  for (const field of config.required) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      errors.push(`Required field missing: ${field}`);
    }
  }

  // Check conditional required fields
  if (config.conditionalRequired && data.calculation_method) {
    const method = data.calculation_method.toUpperCase();
    const conditionalFields = config.conditionalRequired[method];
    if (conditionalFields) {
      for (const field of conditionalFields) {
        if (data[field] === undefined || data[field] === null || data[field] === '') {
          errors.push(`Required for ${method}: ${field}`);
        }
      }
    }
  }

  // Validate numeric fields are non-negative where applicable
  const numericFields = [
    'fuel_consumption',
    'fuel_usage',
    'miles_traveled',
    'amount_released',
    'amount_used',
    'amount_purchased',
    'kwh_purchased',
    'distance_km',
    'distance_per_trip_km',
    'weight_tons',
    'amount',
    'amount_mtco2e',
    'num_nights',
    'num_rooms',
    'num_commuters',
    'commute_days_per_year',
  ];

  for (const field of numericFields) {
    if (data[field] !== undefined && data[field] !== null) {
      const value = parseFloat(data[field]);
      if (isNaN(value)) {
        errors.push(`${field} must be a valid number`);
      } else if (value < 0) {
        errors.push(`${field} must be non-negative`);
      }
    }
  }

  // Validate dropdowns
  if (
    data.fuel_type &&
    !DROPDOWNS.fuel_types.includes(data.fuel_type)
  ) {
    errors.push(
      `Invalid fuel_type. Expected one of: ${DROPDOWNS.fuel_types.join(', ')}`
    );
  }

  if (
    data.vehicle_type &&
    !DROPDOWNS.vehicle_types.includes(data.vehicle_type)
  ) {
    errors.push(
      `Invalid vehicle_type. Expected one of: ${DROPDOWNS.vehicle_types.join(', ')}`
    );
  }

  if (
    data.calculation_method &&
    !['FUEL_BASED', 'DISTANCE_BASED', 'LOCATION_BASED', 'MARKET_BASED'].includes(
      data.calculation_method.toUpperCase()
    )
  ) {
    errors.push('Invalid calculation_method');
  }

  if (
    data.flight_type &&
    !DROPDOWNS.flight_types.includes(data.flight_type)
  ) {
    errors.push(
      `Invalid flight_type. Expected one of: ${DROPDOWNS.flight_types.join(', ')}`
    );
  }

  if (
    data.commute_mode &&
    !DROPDOWNS.commute_modes.includes(data.commute_mode)
  ) {
    errors.push(
      `Invalid commute_mode. Expected one of: ${DROPDOWNS.commute_modes.join(', ')}`
    );
  }

  if (data.units && !DROPDOWNS.units.includes(data.units)) {
    errors.push(
      `Invalid units. Expected one of: ${DROPDOWNS.units.join(', ')}`
    );
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// Get activity config
export function getActivityConfig(activityType) {
  return ACTIVITY_TYPES[activityType];
}

// Get all dropdowns
export function getDropdowns() {
  return DROPDOWNS;
}

// Get activity types
export function getActivityTypes() {
  return Object.entries(ACTIVITY_TYPES).map(([key, value]) => ({
    id: key,
    name: value.name,
    scope: value.scope,
  }));
}
