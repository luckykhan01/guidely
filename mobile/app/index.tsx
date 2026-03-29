import React from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, Animated, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { setCurrentTrip, getMyTrips } from '../store/tripStore';
import { useCallback, useState } from 'react';

const TRAVEL_GUIDES = [
  {
    id: 1,
    title: '2-Day Almaty Trip',
    spots: '10 Spots',
    image: require('../assets/images/almaty.jpg'),
    tripData: {
      tripTitle: '2-Day Almaty Trip',
      days: [
        {
          dayNumber: 1,
          places: [
            { name: 'Kok-Tobe Hill', category: 'Attraction', description: 'Iconic hill with panoramic views of Almaty and the Tian Shan mountains.', travelTime: '20 min', distance: '5 km', latitude: 43.2343, longitude: 76.9740 },
            { name: 'Panfilov Park', category: 'History', description: 'A beautiful park with the famous Zenkov Cathedral and war memorial.', travelTime: '15 min', distance: '3 km', latitude: 43.2600, longitude: 76.9450 },
            { name: 'Green Bazaar', category: 'Food', description: 'The most vibrant market in Almaty, full of local fruits, spices and street food.', travelTime: '10 min', distance: '1.5 km', latitude: 43.2574, longitude: 76.9514 },
          ],
        },
        {
          dayNumber: 2,
          places: [
            { name: 'Medeu Ice Rink', category: 'Attraction', description: "The world's highest-altitude skating rink nestled in a stunning mountain gorge.", travelTime: '30 min', distance: '12 km', latitude: 43.1773, longitude: 77.0128 },
            { name: 'Shymbulak Ski Resort', category: 'Nature', description: 'A world-class mountain resort just above Medeu with breathtaking alpine scenery.', travelTime: '15 min', distance: '4 km', latitude: 43.1530, longitude: 77.0230 },
            { name: 'Arbat Street', category: 'Food', description: "Almaty's pedestrian street lined with restaurants, cafes and souvenir shops.", travelTime: '40 min', distance: '14 km', latitude: 43.2600, longitude: 76.9290 },
          ],
        },
      ],
    },
  },
  {
    id: 2,
    title: '1-Day Astana Trip',
    spots: '8 Spots',
    image: require('../assets/images/astana.jpg'),
    tripData: {
      tripTitle: '1-Day Astana Trip',
      days: [
        {
          dayNumber: 1,
          places: [
            { name: 'Baiterek Tower', category: 'Attraction', description: 'The iconic 97m tower symbolizing the mythical tree of life — unmissable in Astana.', travelTime: '15 min', distance: '2 km', latitude: 51.1283, longitude: 71.4305 },
            { name: 'Palace of Peace and Reconciliation', category: 'History', description: 'A striking glass pyramid designed by Norman Foster for international dialogue.', travelTime: '10 min', distance: '1 km', latitude: 51.1218, longitude: 71.4237 },
            { name: 'Khan Shatyr', category: 'Shopping', description: 'A giant transparent tent housing shops, a beach resort and entertainment complex.', travelTime: '10 min', distance: '2 km', latitude: 51.1325, longitude: 71.4021 },
            { name: 'Nur-Astana Mosque', category: 'History', description: "One of Central Asia's largest mosques with stunning golden domes.", travelTime: '15 min', distance: '3 km', latitude: 51.1500, longitude: 71.4140 },
          ],
        },
      ],
    },
  },
  {
    id: 3,
    title: '1-Day Shymkent Trip',
    spots: '6 Spots',
    image: require('../assets/images/shymkent.jpg'),
    tripData: {
      tripTitle: '1-Day Shymkent Trip',
      days: [
        {
          dayNumber: 1,
          places: [
            { name: 'Ordabasy Square', category: 'Attraction', description: 'The historic main square of Shymkent, surrounded by cultural landmarks.', travelTime: '10 min', distance: '1 km', latitude: 42.3173, longitude: 69.5860 },
            { name: 'Shymkent Zoo', category: 'Nature', description: 'A large zoo featuring Central Asian wildlife including rare snow leopards.', travelTime: '20 min', distance: '4 km', latitude: 42.3034, longitude: 69.5994 },
            { name: 'Old Bazaar', category: 'Food', description: 'A bustling traditional market with authentic Kazakh food, spices and crafts.', travelTime: '15 min', distance: '2.5 km', latitude: 42.3140, longitude: 69.5950 },
          ],
        },
      ],
    },
  },
];

const MY_TRIPS: any[] = [];

const AnimatedCard = ({ children, onPress, style, className }: any) => {
  const scale = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 20,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();
  };

  return (
    <TouchableWithoutFeedback
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]} className={className}>
        {children}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

export default function Home() {
  const [allMyTrips, setAllMyTrips] = useState<any[]>(MY_TRIPS);
  
  useFocusEffect(
    useCallback(() => {
      // Prepend dynamically generated trips from store to the hardcoded base ones
      setAllMyTrips([...getMyTrips(), ...MY_TRIPS]);
    }, [])
  );

  const openTrip = (tripData: any) => {
    setCurrentTrip(tripData);
    router.push('/trip');
  };

  return (
    <SafeAreaView className="flex-1 bg-white relative">
      <ScrollView className="flex-1 px-5 pt-2" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center justify-between mb-8 mt-4">
          <Text className="text-3xl font-extrabold tracking-tighter text-black">JolDa</Text>
          <View className="w-12 h-12 rounded-full bg-indigo-600 items-center justify-center shadow-lg">
            <Text className="text-white text-lg font-medium">Э</Text>
          </View>
        </View>

        {/* Travel Guides Section */}
        <View className="mb-10">
          <Text className="text-lg font-semibold text-gray-400 mb-4">Travel Guides</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="overflow-visible">
            {TRAVEL_GUIDES.map((guide) => (
              <AnimatedCard
                key={guide.id}
                className="w-40 h-56 rounded-[24px] overflow-hidden mr-4 shadow-sm bg-white"
                onPress={() => openTrip(guide.tripData)}
              >
                <Image source={guide.image} className="absolute w-full h-full" resizeMode="cover" />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.75)']}
                  className="absolute w-full h-full"
                />
                <View className="absolute bottom-0 w-full p-4">
                  <Text className="text-white text-[15px] font-bold mb-1 leading-tight">{guide.title}</Text>
                  <Text className="text-gray-300 text-sm font-medium">{guide.spots}</Text>
                </View>
              </AnimatedCard>
            ))}
          </ScrollView>
        </View>

        {/* My Trips Section */}
        <View className="mb-24">
          <Text className="text-lg font-semibold text-gray-400 mb-4">My Trips</Text>
          {allMyTrips.length === 0 && (
            <Text className="text-slate-500 font-medium italic mb-10">You haven't generated any trips yet!</Text>
          )}
          {allMyTrips.map((trip: any, idx: number) => (
            <AnimatedCard
              key={trip.id || idx}
              className="flex-row bg-[#f5f8ff] rounded-[24px] p-3 mb-4 items-center shadow-sm"
              onPress={() => openTrip(trip.tripData)}
            >
              <Image
                source={trip.image}
                className="w-24 h-24 rounded-2xl mr-4"
                resizeMode="cover"
              />
              <View className="flex-1 justify-center py-2 relative">
                <Text className="text-blue-700 font-bold text-[17px] mb-2 pr-2">{trip.title}</Text>
                <View className="border-l-2 border-blue-200 pl-3 py-1">
                  <Text className="text-[#889abb] font-medium text-[13px] mb-1">{trip.duration}</Text>
                  <Text className="text-[#889abb] font-medium text-[13px]">{trip.spots}</Text>
                </View>
              </View>
            </AnimatedCard>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
