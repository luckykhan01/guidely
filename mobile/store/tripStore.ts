// Simple module-level store to pass large trip data between screens
// without going through URL params (which breaks Expo Router navigation context)

type TripPlace = {
  name: string;
  category: string;
  description: string;
  travelTime: string;
  distance: string;
  latitude?: number;
  longitude?: number;
  imageUrl?: string;
};

export type SavedPlace = TripPlace & {
  city: string;
  country: string;
  image: string;
};

type TripDay = {
  dayNumber: number;
  places: TripPlace[];
};

export type TripData = {
  tripTitle: string;
  days: TripDay[];
};

let _currentTrip: TripData | null = null;

export function setCurrentTrip(trip: TripData) {
  _currentTrip = trip;
}

export function getCurrentTrip(): TripData | null {
  return _currentTrip;
}

// Global store for generated My Trips
let _myTrips: any[] = [];

export function addMyTrip(tripSummary: any) {
  _myTrips = [tripSummary, ..._myTrips];
}

export function getMyTrips(): any[] {
  return _myTrips;
}

// Global store for saved spots (in-memory for now)
let _savedPlaces: SavedPlace[] = [];

export function savePlace(place: SavedPlace) {
  if (!_savedPlaces.some(p => p.name === place.name)) {
    _savedPlaces = [..._savedPlaces, place];
  }
}

export function unsavePlace(name: string) {
  _savedPlaces = _savedPlaces.filter(p => p.name !== name);
}

export function getSavedPlaces(): SavedPlace[] {
  return _savedPlaces;
}

export function isPlaceSaved(name: string): boolean {
  return _savedPlaces.some(p => p.name === name);
}
