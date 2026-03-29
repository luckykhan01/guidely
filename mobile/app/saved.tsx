import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { getSavedPlaces, SavedPlace } from '../store/tripStore';

export default function Saved() {
  const [places, setPlaces] = useState<SavedPlace[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Load places when screen opens or when pulled to refresh
  const loadPlaces = useCallback(() => {
    setPlaces([...getSavedPlaces()]);
  }, []);

  // React Navigation 'useFocusEffect' equivalent in Expo Router:
  // Using onRefresh as the primary way right now, but we'll also load on mount
  React.useEffect(() => {
    loadPlaces();
  }, [loadPlaces]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPlaces();
    setTimeout(() => setRefreshing(false), 500);
  }, [loadPlaces]);

  // Group places by country, then city
  const groupedPlaces = places.reduce((acc, place) => {
    if (!acc[place.country]) acc[place.country] = {};
    if (!acc[place.country][place.city]) acc[place.country][place.city] = [];
    acc[place.country][place.city].push(place);
    return acc;
  }, {} as Record<string, Record<string, SavedPlace[]>>);

  return (
    <SafeAreaView className="flex-1 bg-white relative">
      <ScrollView 
        className="flex-1 px-5 pt-2" 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#cbd5e1" />}
      >
        {/* Header Section */}
        <View className="flex-row items-center justify-between mt-4 mb-2">
          <View>
            <Text className="text-[32px] font-extrabold tracking-tighter text-black">My Spots</Text>
            <Text className="text-[#889abb] font-semibold text-[15px]">{places.length} Spots Saved</Text>
          </View>
          <TouchableOpacity className="bg-orange-50 px-4 py-2 rounded-full border border-orange-200 flex-row items-center shadow-sm">
            <FontAwesome name="map-signs" size={14} color="#f97316" />
            <Text className="text-orange-500 font-bold ml-2">Import Guide</Text>
          </TouchableOpacity>
        </View>

        {places.length === 0 ? (
          <View className="flex-1 items-center justify-center mt-32">
            <View className="w-20 h-20 bg-slate-50 rounded-full items-center justify-center mb-4">
              <FontAwesome name="bookmark-o" size={32} color="#cbd5e1" />
            </View>
            <Text className="text-xl font-bold text-slate-900 mb-2">No spots saved</Text>
            <Text className="text-slate-500 text-center px-8">When you find a place you like in a trip, tap the bookmark icon to save it here.</Text>
          </View>
        ) : (
          <View className="mt-8 pb-32">
            {Object.entries(groupedPlaces).map(([country, cities]) => {
              const countryTotalSpots = Object.values(cities).reduce((sum, list) => sum + list.length, 0);
              const totalCities = Object.keys(cities).length;

              return (
                <View key={country} className="mb-10">
                  {/* Country Header */}
                  <View className="flex-row items-end justify-between mb-5">
                    <Text className="text-[26px] font-extrabold text-black">{country}</Text>
                    <Text className="text-[#889abb] font-medium text-[14px] mb-1">{totalCities} Cities • {countryTotalSpots} Spots</Text>
                  </View>

                  {/* Cities List */}
                  {Object.entries(cities).map(([city, cityPlaces]) => (
                    <View key={city} className="mb-6">
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5 px-5">
                        {/* We use the image from the first place in the city as the city cover photo */}
                        <TouchableOpacity className="mr-4" activeOpacity={0.9}>
                          <Image 
                            source={{ uri: cityPlaces[0].image }} 
                            className="w-[160px] h-[160px] rounded-3xl bg-slate-100" 
                            resizeMode="cover"
                          />
                          <Text className="text-[17px] font-extrabold text-slate-900 mt-3">{city}</Text>
                          <Text className="text-slate-500 font-medium text-[14px]">{cityPlaces.length} Spots</Text>
                        </TouchableOpacity>
                        
                        {/* The individual spots could be listed here or opened on tap */}
                        <TouchableOpacity className="w-[160px] h-[160px] rounded-3xl bg-slate-50 border border-slate-200 items-center justify-center mr-8">
                          <View className="w-12 h-12 bg-white rounded-full shadow-sm items-center justify-center mb-2">
                            <FontAwesome name="chevron-right" size={16} color="#94a3b8" />
                          </View>
                          <Text className="text-slate-500 font-bold">View all</Text>
                        </TouchableOpacity>
                      </ScrollView>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
