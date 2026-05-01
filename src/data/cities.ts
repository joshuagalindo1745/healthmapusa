// All 49 major US cities for autocomplete. `slug` is the key the spotlight edge function understands.
// Cities with `supported: true` have real tract-level data wired up.
export interface CityOption {
  slug: string;
  name: string;
  state: string;
  supported: boolean;
}

export const CITIES: CityOption[] = [
  { slug: "new-york-city", name: "New York City", state: "New York", supported: true },
  { slug: "los-angeles", name: "Los Angeles", state: "California", supported: false },
  { slug: "chicago", name: "Chicago", state: "Illinois", supported: true },
  { slug: "houston", name: "Houston", state: "Texas", supported: false },
  { slug: "phoenix", name: "Phoenix", state: "Arizona", supported: false },
  { slug: "philadelphia", name: "Philadelphia", state: "Pennsylvania", supported: false },
  { slug: "san-antonio", name: "San Antonio", state: "Texas", supported: false },
  { slug: "san-diego", name: "San Diego", state: "California", supported: false },
  { slug: "dallas", name: "Dallas", state: "Texas", supported: false },
  { slug: "san-jose", name: "San Jose", state: "California", supported: false },
  { slug: "austin", name: "Austin", state: "Texas", supported: false },
  { slug: "jacksonville", name: "Jacksonville", state: "Florida", supported: false },
  { slug: "fort-worth", name: "Fort Worth", state: "Texas", supported: false },
  { slug: "columbus", name: "Columbus", state: "Ohio", supported: false },
  { slug: "charlotte", name: "Charlotte", state: "North Carolina", supported: false },
  { slug: "indianapolis", name: "Indianapolis", state: "Indiana", supported: false },
  { slug: "san-francisco", name: "San Francisco", state: "California", supported: true },
  { slug: "seattle", name: "Seattle", state: "Washington", supported: false },
  { slug: "denver", name: "Denver", state: "Colorado", supported: false },
  { slug: "nashville", name: "Nashville", state: "Tennessee", supported: false },
  { slug: "oklahoma-city", name: "Oklahoma City", state: "Oklahoma", supported: false },
  { slug: "el-paso", name: "El Paso", state: "Texas", supported: false },
  { slug: "washington-dc", name: "Washington", state: "DC", supported: false },
  { slug: "las-vegas", name: "Las Vegas", state: "Nevada", supported: false },
  { slug: "louisville", name: "Louisville", state: "Kentucky", supported: false },
  { slug: "memphis", name: "Memphis", state: "Tennessee", supported: false },
  { slug: "portland", name: "Portland", state: "Oregon", supported: false },
  { slug: "baltimore", name: "Baltimore", state: "Maryland", supported: false },
  { slug: "milwaukee", name: "Milwaukee", state: "Wisconsin", supported: false },
  { slug: "albuquerque", name: "Albuquerque", state: "New Mexico", supported: false },
  { slug: "tucson", name: "Tucson", state: "Arizona", supported: false },
  { slug: "fresno", name: "Fresno", state: "California", supported: false },
  { slug: "sacramento", name: "Sacramento", state: "California", supported: false },
  { slug: "mesa", name: "Mesa", state: "Arizona", supported: false },
  { slug: "kansas-city", name: "Kansas City", state: "Missouri", supported: false },
  { slug: "atlanta", name: "Atlanta", state: "Georgia", supported: false },
  { slug: "omaha", name: "Omaha", state: "Nebraska", supported: false },
  { slug: "colorado-springs", name: "Colorado Springs", state: "Colorado", supported: false },
  { slug: "raleigh", name: "Raleigh", state: "North Carolina", supported: false },
  { slug: "miami", name: "Miami", state: "Florida", supported: false },
  { slug: "minneapolis", name: "Minneapolis", state: "Minnesota", supported: false },
  { slug: "tampa", name: "Tampa", state: "Florida", supported: false },
  { slug: "new-orleans", name: "New Orleans", state: "Louisiana", supported: false },
  { slug: "cleveland", name: "Cleveland", state: "Ohio", supported: false },
  { slug: "bakersfield", name: "Bakersfield", state: "California", supported: false },
  { slug: "wichita", name: "Wichita", state: "Kansas", supported: false },
  { slug: "arlington", name: "Arlington", state: "Texas", supported: false },
  { slug: "aurora", name: "Aurora", state: "Colorado", supported: false },
  { slug: "anaheim", name: "Anaheim", state: "California", supported: false },
];

export const METRICS = [
  { id: "diabetes", label: "Diabetes" },
  { id: "obesity", label: "Obesity" },
  { id: "inactivity", label: "Physical Inactivity" },
  { id: "mental", label: "Mental Distress" },
  { id: "smoking", label: "Smoking" },
  { id: "hypertension", label: "High Blood Pressure" },
] as const;
