import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity, Modal,
  Linking, Alert, Clipboard, FlatList, Dimensions, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, useFocusEffect } from 'expo-router';
import { getCurrentTrip, savePlace, unsavePlace, isPlaceSaved } from '../store/tripStore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_HEIGHT = SCREEN_HEIGHT * 0.40;

// ── Image helpers ────────────────────────────────────────────────────────────
const getCategoryImage = (category: string) => {
  const c = category?.toLowerCase() || '';
  if (c.includes('food') || c.includes('restaurant') || c.includes('bistro'))
    return 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=600&auto=format&fit=crop';
  if (c.includes('history') || c.includes('museum'))
    return 'https://images.unsplash.com/photo-1552832233-4cb50325b128?q=80&w=600&auto=format&fit=crop';
  if (c.includes('nature') || c.includes('park'))
    return 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=600&auto=format&fit=crop';
  if (c.includes('shopping'))
    return 'https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=600&auto=format&fit=crop';
  return 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=600&auto=format&fit=crop';
};

const getCommunityNotes = (category: string, name: string) => {
  const c = category?.toLowerCase() || '';
  if (c.includes('food') || c.includes('restaurant')) return [
    `Arrive early to avoid queues — ${name} gets busy during lunch hours.`,
    'Try the local specialties rather than the tourist menu for authentic flavors.',
    'Cash is often preferred at local eateries.',
    'The best dishes often sell out by early afternoon.',
  ];
  if (c.includes('history') || c.includes('museum')) return [
    'Weekday mornings are significantly less crowded.',
    'Photography may be restricted in certain areas — check signage.',
    'Guided tours are available and highly recommended for deeper context.',
    'Book tickets in advance online to skip the entrance queue.',
  ];
  if (c.includes('nature') || c.includes('park')) return [
    'Best visited in the morning for the most dramatic lighting.',
    'Wear comfortable walking shoes — paths can be uneven.',
    'Bring water and sunscreen, especially in summer.',
    'Wildlife is most active at dawn and dusk.',
  ];
  return [
    `${name} is best explored on foot for the full experience.`,
    'Check opening hours in advance as they may vary by season.',
    'Visit during golden hour for the best photos.',
    'Local guides can provide insider knowledge and context.',
  ];
};

const getPlaceInfo = (category: string) => {
  const c = category?.toLowerCase() || '';
  if (c.includes('food') || c.includes('restaurant'))
    return { hours: '10:00 – 22:00', rating: '4.5 ⭐', duration: '1–2 hours', entry: 'Free entry' };
  if (c.includes('history') || c.includes('museum'))
    return { hours: '9:00 – 18:00', rating: '4.7 ⭐', duration: '2–3 hours', entry: 'Paid entry' };
  if (c.includes('nature') || c.includes('park'))
    return { hours: 'Open 24 hrs', rating: '4.8 ⭐', duration: '3–4 hours', entry: 'Free entry' };
  if (c.includes('shopping'))
    return { hours: '10:00 – 21:00', rating: '4.4 ⭐', duration: '1–3 hours', entry: 'Free entry' };
  return { hours: '9:00 – 20:00', rating: '4.6 ⭐', duration: '1–2 hours', entry: 'Free entry' };
};

const getAddress = (name: string, tripTitle: string) => {
  const parts = tripTitle?.split(' ') || [];
  const city = parts.length >= 2 && parts[parts.length - 1].toLowerCase() === 'trip'
    ? parts[parts.length - 2] : (parts[parts.length - 1] || 'City Center');
  return `${name}, ${city}, Kazakhstan`;
};

// Marker colours per category
const MARKER_COLORS: Record<string, string> = {
  attraction: '#6366f1',
  history: '#f59e0b',
  food: '#ef4444',
  nature: '#22c55e',
  shopping: '#8b5cf6',
};
const markerColor = (category: string) =>
  MARKER_COLORS[category?.toLowerCase().split('/')[0]] ?? '#334155';

type Place = {
  name: string; category: string; description: string;
  travelTime: string; distance: string;
  latitude?: number; longitude?: number;
  imageUrl?: string;
};

// ── Fallback city centres for places missing coords ──────────────────────────
const CITY_CENTRES: Record<string, { latitude: number; longitude: number }> = {
  almaty:  { latitude: 43.2220, longitude: 76.8512 },
  astana:  { latitude: 51.1801, longitude: 71.4460 },
  shymkent:{ latitude: 42.3000, longitude: 69.5900 },
  aktau:   { latitude: 43.6510, longitude: 51.2000 },
  atyrau:  { latitude: 47.0945, longitude: 51.9238 },
};

function resolveCoords(place: Place, tripTitle: string) {
  if (place.latitude && place.longitude)
    return { latitude: place.latitude, longitude: place.longitude };
  const key = (tripTitle || '').toLowerCase().split(' ').find(w => CITY_CENTRES[w]);
  return key ? CITY_CENTRES[key] : { latitude: 43.2220, longitude: 76.8512 };
}

// Compute a region that fits all markers
function regionForPlaces(places: Place[], tripTitle: string) {
  const coords = places.map(p => resolveCoords(p, tripTitle));
  if (coords.length === 0) return { latitude: 43.2220, longitude: 76.8512, latitudeDelta: 0.05, longitudeDelta: 0.05 };
  const lats = coords.map(c => c.latitude);
  const lngs = coords.map(c => c.longitude);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const pad = 0.012;
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(maxLat - minLat + pad * 2, 0.02),
    longitudeDelta: Math.max(maxLng - minLng + pad * 2, 0.02),
  };
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function TripDetails() {
  const mapRef = useRef<MapView>(null);

  // Re-read from store every time the screen is focused so switching trips works
  const [trip, setTrip] = useState(getCurrentTrip);
  const [activeMainTab, setActiveMainTab] = useState<'Overview' | 'Itinerary'>('Overview');
  const [activeDay, setActiveDay] = useState<number>(trip?.days?.[0]?.dayNumber || 1);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [showFullMap, setShowFullMap] = useState(false);
  const fullMapRef = useRef<MapView>(null);

  // This fires every time this screen comes into view (navigation push or back)
  useFocusEffect(
    useCallback(() => {
      const latest = getCurrentTrip();
      setTrip(latest);
      setActiveMainTab('Overview');
      setActiveDay(latest?.days?.[0]?.dayNumber || 1);
      setSelectedPlace(null);
      setFocusedIdx(null);
    }, [])
  );

  React.useEffect(() => {
    if (selectedPlace) setIsSaved(isPlaceSaved(selectedPlace.name));
  }, [selectedPlace]);

  const toggleSave = () => {
    if (!selectedPlace || !trip) return;
    if (isSaved) {
      unsavePlace(selectedPlace.name);
      setIsSaved(false);
      Alert.alert('Removed', `${selectedPlace.name} removed from saved spots.`);
    } else {
      const parts = trip.tripTitle?.split(' ') || [];
      const city = parts.length >= 2 && parts[parts.length - 1].toLowerCase() === 'trip'
        ? parts[parts.length - 2] : parts[parts.length - 1] || 'Unknown City';
      savePlace({ ...selectedPlace, city, country: 'Kazakhstan', image: selectedPlace.imageUrl || getCategoryImage(selectedPlace.category) });
      setIsSaved(true);
      Alert.alert('Saved!', `${selectedPlace.name} added to your spots.`);
    }
  };

  // Tap a card → animate map to that marker
  const focusMarker = useCallback((place: Place, idx: number) => {
    setFocusedIdx(idx);
    const coords = resolveCoords(place, trip?.tripTitle || '');
    const reg = { ...coords, latitudeDelta: 0.012, longitudeDelta: 0.012 };
    mapRef.current?.animateToRegion(reg, 500);
    fullMapRef.current?.animateToRegion(reg, 500);
  }, [trip]);

  if (!trip) {
    return (
      <SafeAreaView className="flex-1 bg-[#f8fafc] justify-center items-center">
        <Text className="text-slate-500 font-bold mb-4">No Trip Found</Text>
        <TouchableOpacity className="px-6 py-3 bg-black rounded-full" onPress={() => router.back()}>
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const activeDayData = trip.days?.find(d => Number(d.dayNumber) === Number(activeDay));
  const activePlaces: Place[] = activeDayData?.places || [];
  const mapRegion = regionForPlaces(activePlaces, trip.tripTitle);
  const polyCoords = activePlaces.map(p => resolveCoords(p, trip.tripTitle));

  // ── Itinerary place card (used in FlatList) ────────────────────────────────
  const renderPlaceCard = ({ item: place, index: idx }: { item: Place; index: number }) => {
    const isFocused = focusedIdx === idx;
    return (
      <View>
        <TouchableOpacity
          style={{
            backgroundColor: '#fff',
            borderRadius: 24,
            padding: 14,
            flexDirection: 'row',
            alignItems: 'center',
            marginHorizontal: 20,
            shadowColor: '#000',
            shadowOpacity: isFocused ? 0.14 : 0.05,
            shadowRadius: isFocused ? 12 : 4,
            shadowOffset: { width: 0, height: 2 },
            elevation: isFocused ? 6 : 2,
            borderWidth: isFocused ? 1.5 : 0,
            borderColor: isFocused ? '#6366f1' : 'transparent',
          }}
          activeOpacity={0.8}
          onPress={() => {
            focusMarker(place, idx);
            setSelectedPlace(place);
          }}
        >
          {/* Numbered circle */}
          <View style={{
            width: 32, height: 32, borderRadius: 16,
            backgroundColor: markerColor(place.category),
            alignItems: 'center', justifyContent: 'center', marginRight: 10,
          }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>{idx + 1}</Text>
          </View>

          <Image source={{ uri: place.imageUrl || getCategoryImage(place.category) }}
            style={{ width: 68, height: 68, borderRadius: 16, backgroundColor: '#e2e8f0', marginRight: 12 }} />

          <View style={{ flex: 1, justifyContent: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <FontAwesome name="star" size={11} color="#0ea5e9" style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a', flex: 1 }} numberOfLines={1}>
                {place.name}
              </Text>
            </View>
            <View style={{ backgroundColor: '#f8fafc', alignSelf: 'flex-start', paddingHorizontal: 8,
              paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b' }}>{place.category}</Text>
            </View>
            {!!place.description && (
              <Text style={{ fontSize: 12, color: '#94a3b8', lineHeight: 16 }} numberOfLines={2}>
                {place.description}
              </Text>
            )}
          </View>
          <FontAwesome name="chevron-right" size={11} color="#cbd5e1" />
        </TouchableOpacity>

        {/* Connector line */}
        {idx < activePlaces.length - 1 && (
          <View style={{ marginLeft: 52, paddingVertical: 2 }}>
            <View style={{ width: 2, height: 24, backgroundColor: '#e2e8f0', marginLeft: 10 }} />
          </View>
        )}
      </View>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* Back button floating */}
      <View style={{ position: 'absolute', top: 56, left: 20, zIndex: 20 }}>
        <TouchableOpacity
          style={{ width: 40, height: 40, backgroundColor: '#fff', borderRadius: 20,
            alignItems: 'center', justifyContent: 'center',
            shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 }}
          onPress={() => router.back()}
        >
          <FontAwesome name="chevron-left" size={16} color="#000" />
        </TouchableOpacity>
      </View>

      {/* ── Top header card ── */}
      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[1]}>
        {/* Placeholder to push sticky header below back button */}
        <View style={{ height: 0 }} />

        {/* Sticky header */}
        <View style={{ backgroundColor: '#fff', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 0,
          borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
          shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, marginTop: 44 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 26, fontWeight: '900', color: '#0f172a', lineHeight: 30 }}>
                {trip.tripTitle || 'Generated Trip'}
              </Text>
              <Text style={{ color: '#94a3b8', fontWeight: '700', fontSize: 14, marginTop: 4 }}>
                {trip.days?.length || 0} Days • AI Optimized
              </Text>
            </View>
            <TouchableOpacity style={{ backgroundColor: '#0f172a', borderRadius: 50, paddingHorizontal: 18,
              paddingVertical: 12, flexDirection: 'row', alignItems: 'center', marginLeft: 8, marginTop: 4,
              shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, elevation: 4 }}>
              <FontAwesome name="share" size={13} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '800', marginLeft: 6, fontSize: 14 }}>Share</Text>
            </TouchableOpacity>
          </View>

          {/* Segmented control */}
          <View style={{ flexDirection: 'row', backgroundColor: '#f1f5f9', padding: 6,
            borderRadius: 50, marginBottom: 0 }}>
            {(['Overview', 'Itinerary'] as const).map(tab => (
              <TouchableOpacity
                key={tab}
                style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 50,
                  backgroundColor: activeMainTab === tab ? '#fff' : 'transparent',
                  shadowColor: activeMainTab === tab ? '#000' : 'transparent',
                  shadowOpacity: 0.06, shadowRadius: 4, elevation: activeMainTab === tab ? 2 : 0 }}
                onPress={() => setActiveMainTab(tab)}
              >
                <Text style={{ fontWeight: '800', fontSize: 14, color: activeMainTab === tab ? '#0f172a' : '#94a3b8' }}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── OVERVIEW ── */}
        {activeMainTab === 'Overview' && (
          <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 32 }}>
            {(trip.days || []).map(d => (
              <View key={d.dayNumber} style={{ backgroundColor: '#fff', borderRadius: 24, padding: 20,
                marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}>
                <Text style={{ fontSize: 24, fontWeight: '900', color: '#0f172a', marginBottom: 8 }}>
                  Day {d.dayNumber}
                </Text>
                <Text style={{ color: '#64748b', fontWeight: '500', lineHeight: 22, fontSize: 15 }}>
                  {(d.places || []).map(p => p.name).join(' ➔ ')}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ── ITINERARY ── */}
        {activeMainTab === 'Itinerary' && (
          <View>
            {/* MAP Preview — Rounded Box Button */}
            <View style={{ height: 200, marginHorizontal: 20, marginTop: 24, borderRadius: 24, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, elevation: 5 }}>
              <TouchableOpacity activeOpacity={0.9} style={{ flex: 1 }} onPress={() => setShowFullMap(true)}>
                <View style={{ flex: 1 }} pointerEvents="none">
                  <MapView
                    ref={mapRef}
                provider={PROVIDER_DEFAULT}
                style={{ flex: 1 }}
                initialRegion={mapRegion}
                showsUserLocation={false}
                showsCompass={false}
                showsScale={false}
              >
                {/* Route polyline */}
                {polyCoords.length > 1 && (
                  <Polyline
                    coordinates={polyCoords}
                    strokeColor="#6366f1"
                    strokeWidth={2.5}
                    lineDashPattern={[6, 4]}
                  />
                )}

                {/* Numbered markers */}
                {activePlaces.map((place, idx) => {
                  const coord = resolveCoords(place, trip.tripTitle);
                  const color = markerColor(place.category);
                  return (
                    <Marker
                      key={idx}
                      coordinate={coord}
                      onPress={() => { focusMarker(place, idx); setSelectedPlace(place); }}
                    >
                      <View style={{
                        width: 34, height: 34, borderRadius: 17,
                        backgroundColor: color,
                        borderWidth: 2.5, borderColor: '#fff',
                        alignItems: 'center', justifyContent: 'center',
                        shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 4, elevation: 4,
                        transform: [{ scale: focusedIdx === idx ? 1.2 : 1 }],
                      }}>
                        <Text style={{ color: '#fff', fontWeight: '900', fontSize: 13 }}>{idx + 1}</Text>
                      </View>
                    </Marker>
                  );
                })}
              </MapView>
            </View>
            
            {/* Floating Expand Icon on Preview */}
                <View style={{ position: 'absolute', bottom: 12, right: 12, width: 36, height: 36, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }}>
                  <FontAwesome name="expand" size={14} color="#0f172a" />
                </View>
              </TouchableOpacity>
            </View>

            {/* Day selector */}
            <View style={{ paddingVertical: 14, paddingTop: 20 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 4 }}>
                {(trip.days || []).map(d => (
                  <TouchableOpacity
                    key={d.dayNumber}
                    onPress={() => {
                      if (activeDay !== d.dayNumber) {
                        setActiveDay(d.dayNumber);
                        setFocusedIdx(null);
                      }
                    }}
                    style={{
                      paddingHorizontal: 22, paddingVertical: 10, marginRight: 10, borderRadius: 50,
                      backgroundColor: activeDay === d.dayNumber ? '#0f172a' : '#fff',
                      borderWidth: 1, borderColor: activeDay === d.dayNumber ? '#0f172a' : '#e2e8f0',
                      shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
                    }}
                  >
                    <Text style={{ fontWeight: '800', fontSize: 14,
                      color: activeDay === d.dayNumber ? '#fff' : '#94a3b8' }}>
                      Day {d.dayNumber}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Place cards — FlatList */}
            <View style={{ paddingBottom: 48 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingHorizontal: 20, marginBottom: 16 }}>
                <Text style={{ fontSize: 26, fontWeight: '900', color: '#0f172a' }}>Day {activeDay}</Text>
                <TouchableOpacity style={{ backgroundColor: '#f0f9ff', paddingHorizontal: 14, paddingVertical: 8,
                  borderRadius: 50, flexDirection: 'row', alignItems: 'center',
                  borderWidth: 1, borderColor: '#bfdbfe' }}>
                  <Text style={{ color: '#3b82f6', fontWeight: '800', fontSize: 13 }}>↹ Optimize</Text>
                </TouchableOpacity>
              </View>

              <FlatList
                data={activePlaces}
                keyExtractor={(_, i) => String(i)}
                renderItem={renderPlaceCard}
                scrollEnabled={false}
                removeClippedSubviews={false}
              />
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── Place Detail Modal ── */}
      <Modal
        visible={!!selectedPlace}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedPlace(null)}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '92%' }}>
            <View style={{ width: 48, height: 5, backgroundColor: '#e2e8f0', borderRadius: 3, alignSelf: 'center', marginTop: 14 }} />

            {/* Pinned header */}
            {selectedPlace && (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingHorizontal: 24, paddingTop: 14, paddingBottom: 14,
                backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ fontSize: 22, fontWeight: '900', color: '#0f172a' }} numberOfLines={1}>
                    {selectedPlace.name}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <View style={{ backgroundColor: '#f0f9ff', paddingHorizontal: 10, paddingVertical: 2,
                      borderRadius: 50, borderWidth: 1, borderColor: '#bfdbfe', marginRight: 8 }}>
                      <Text style={{ color: '#3b82f6', fontWeight: '800', fontSize: 11 }}>{selectedPlace.category}</Text>
                    </View>
                    <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '600' }}>
                      {getPlaceInfo(selectedPlace.category).rating}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={{ width: 36, height: 36, backgroundColor: '#f1f5f9', borderRadius: 18,
                    alignItems: 'center', justifyContent: 'center' }}
                  onPress={() => setSelectedPlace(null)}>
                  <FontAwesome name="times" size={15} color="#475569" />
                </TouchableOpacity>
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              {selectedPlace && (() => {
                const info = getPlaceInfo(selectedPlace.category);
                const address = getAddress(selectedPlace.name, trip.tripTitle);
                return (
                  <View>
                    <Image source={{ uri: selectedPlace.imageUrl || getCategoryImage(selectedPlace.category) }}
                      style={{ marginHorizontal: 20, marginTop: 16, borderRadius: 24,
                        height: 200, backgroundColor: '#e2e8f0' }} resizeMode="cover" />

                    {/* Quick info pills */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, marginTop: 14 }}>
                      {[
                        { icon: 'clock-o', label: info.hours },
                        { icon: 'hourglass-half', label: info.duration },
                        { icon: 'ticket', label: info.entry },
                      ].map(({ icon, label }) => (
                        <View key={label} style={{ flexDirection: 'row', alignItems: 'center',
                          backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#f1f5f9',
                          borderRadius: 50, paddingHorizontal: 12, paddingVertical: 6,
                          marginRight: 8, marginBottom: 8 }}>
                          <FontAwesome name={icon as any} size={11} color="#64748b" />
                          <Text style={{ color: '#475569', fontWeight: '600', fontSize: 12, marginLeft: 5 }}>
                            {label}
                          </Text>
                        </View>
                      ))}
                    </View>

                    {/* About */}
                    <View style={{ paddingHorizontal: 24, marginTop: 4 }}>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>About this place</Text>
                      <Text style={{ color: '#64748b', lineHeight: 22, fontSize: 14 }}>{selectedPlace.description}</Text>
                    </View>

                    {/* Community Notes */}
                    <View style={{ marginHorizontal: 20, marginTop: 18, backgroundColor: '#fffbeb',
                      borderWidth: 1, borderColor: '#fde68a', borderRadius: 20, padding: 16 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                        <Text style={{ fontSize: 18, marginRight: 8 }}>💡</Text>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: '#92400e' }}>Community Notes</Text>
                      </View>
                      {getCommunityNotes(selectedPlace.category, selectedPlace.name).map((note, i) => (
                        <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
                          <Text style={{ color: '#f59e0b', marginRight: 8, marginTop: 2 }}>•</Text>
                          <Text style={{ color: '#44403c', fontSize: 13, lineHeight: 20, flex: 1 }}>{note}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Address */}
                    <View style={{ marginHorizontal: 20, marginTop: 12, backgroundColor: '#f8fafc',
                      borderWidth: 1, borderColor: '#f1f5f9', borderRadius: 20, padding: 16 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <FontAwesome name="map-marker" size={13} color="#64748b" />
                        <Text style={{ fontSize: 14, fontWeight: '800', color: '#334155', marginLeft: 8 }}>Address</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ color: '#64748b', fontSize: 13, flex: 1, paddingRight: 12 }}>{address}</Text>
                        <TouchableOpacity
                          style={{ backgroundColor: '#e2e8f0', borderRadius: 50, paddingHorizontal: 12,
                            paddingVertical: 6, flexDirection: 'row', alignItems: 'center' }}
                          onPress={() => { Clipboard.setString(address); Alert.alert('Copied!', 'Address copied to clipboard.'); }}>
                          <FontAwesome name="copy" size={11} color="#475569" />
                          <Text style={{ color: '#475569', fontWeight: '700', fontSize: 12, marginLeft: 5 }}>Copy</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Action buttons */}
                    <View style={{ flexDirection: 'row', paddingHorizontal: 24, marginTop: 20 }}>
                      <TouchableOpacity
                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                          backgroundColor: isSaved ? '#fef3c7' : '#f1f5f9',
                          borderRadius: 50, paddingVertical: 16, marginRight: 12 }}
                        onPress={toggleSave}>
                        <FontAwesome name={isSaved ? 'bookmark' : 'bookmark-o'} size={15}
                          color={isSaved ? '#d97706' : '#334155'} />
                        <Text style={{ fontWeight: '800', marginLeft: 8, fontSize: 14,
                          color: isSaved ? '#d97706' : '#334155' }}>
                          {isSaved ? 'Saved' : 'Save'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                          backgroundColor: '#0f172a', borderRadius: 50, paddingVertical: 16 }}
                        onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(address)}`)}>
                        <FontAwesome name="location-arrow" size={15} color="#fff" />
                        <Text style={{ fontWeight: '800', color: '#fff', marginLeft: 8, fontSize: 14 }}>Direction</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })()}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Full Screen Interactive Map Modal ── */}
      <Modal
        visible={showFullMap}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowFullMap(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
          <MapView
            ref={fullMapRef}
            provider={PROVIDER_DEFAULT}
            style={{ flex: 1 }}
            initialRegion={mapRegion}
            showsUserLocation={false}
            showsCompass={false}
            showsScale={false}
          >
            {polyCoords.length > 1 && (
              <Polyline coordinates={polyCoords} strokeColor="#6366f1" strokeWidth={2.5} lineDashPattern={[6, 4]} />
            )}
            {activePlaces.map((place, idx) => {
              const coord = resolveCoords(place, trip.tripTitle);
              const color = markerColor(place.category);
              return (
                <Marker
                  key={idx}
                  coordinate={coord}
                  onPress={() => {
                    focusMarker(place, idx);
                    setSelectedPlace(place);
                  }}
                >
                  <View style={{
                    width: 36, height: 36, borderRadius: 18,
                    backgroundColor: color, borderWidth: 2.5, borderColor: '#fff',
                    alignItems: 'center', justifyContent: 'center',
                    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 4, elevation: 4,
                    transform: [{ scale: focusedIdx === idx ? 1.25 : 1 }],
                  }}>
                    <Text style={{ color: '#fff', fontWeight: '900', fontSize: 13 }}>{idx + 1}</Text>
                  </View>
                </Marker>
              );
            })}
          </MapView>
          
          {/* Close Map Button */}
          <SafeAreaView style={{ position: 'absolute', top: 0, left: 0, right: 0 }} pointerEvents="box-none">
            <View style={{ paddingHorizontal: 20, paddingTop: 40 }}>
              <TouchableOpacity
                style={{ width: 44, height: 44, backgroundColor: '#fff', borderRadius: 22,
                  alignItems: 'center', justifyContent: 'center',
                  shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, elevation: 5 }}
                onPress={() => setShowFullMap(false)}
              >
                <FontAwesome name="times" size={18} color="#0f172a" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
