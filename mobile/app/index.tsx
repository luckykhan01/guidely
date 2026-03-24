import React from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

export default function Home() {
  const travelGuides = [
    {
      id: 1,
      title: '1-Day Paris Trip',
      spots: '9 Spots',
      image: 'https://images.unsplash.com/photo-1502602881469-4478dce5b9d3?q=80&w=600&auto=format&fit=crop',
    },
    {
      id: 2,
      title: '1-Day Rome Trip',
      spots: '7 Spots',
      image: 'https://images.unsplash.com/photo-1552832233-4cb50325b128?q=80&w=600&auto=format&fit=crop',
    },
    {
      id: 3,
      title: '3-Day London Trip',
      spots: '19 Spots',
      image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=600&auto=format&fit=crop',
    },
  ];

  const myTrips = [
    {
      id: 1,
      title: '4-Day Rome, Italy Trip',
      duration: '4 Days 3 Nights',
      spots: '20 Spots',
      image: 'https://images.unsplash.com/photo-1552832233-4cb50325b128?q=80&w=600&auto=format&fit=crop',
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-white relative">
      <ScrollView className="flex-1 px-5 pt-2" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center justify-between mb-8 mt-4">
          {/* Custom Text Logo */}
          <Text className="text-3xl font-extrabold tracking-tighter text-black">Guidely</Text>
          {/* User Profile Icon */}
          <View className="w-12 h-12 rounded-full bg-indigo-600 items-center justify-center shadow-lg">
            <Text className="text-white text-lg font-medium">E</Text>
          </View>
        </View>

        {/* Travel Guides Section */}
        <View className="mb-10">
          <Text className="text-lg font-semibold text-gray-400 mb-4">Travel Guides</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="overflow-visible">
            {travelGuides.map((guide) => (
              <TouchableOpacity
                key={guide.id}
                className="w-40 h-56 rounded-[24px] overflow-hidden mr-4 shadow-sm bg-white"
                activeOpacity={0.9}
              >
                <Image source={{ uri: guide.image }} className="absolute w-full h-full" resizeMode="cover" />
                {/* Elegant gradient overlay */}
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.7)']}
                  className="absolute w-full h-full"
                />
                <View className="absolute bottom-0 w-full p-4">
                  <Text className="text-white text-lg font-bold mb-1 leading-tight">{guide.title}</Text>
                  <Text className="text-gray-300 text-sm font-medium">{guide.spots}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* My Trips Section */}
        <View className="mb-24">
          <Text className="text-lg font-semibold text-gray-400 mb-4">My Trips</Text>
          {myTrips.map((trip) => (
            <TouchableOpacity
              key={trip.id}
              className="flex-row bg-[#f5f8ff] rounded-[24px] p-3 mb-4 items-center shadow-sm"
              activeOpacity={0.9}
            >
              <Image
                source={{ uri: trip.image }}
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
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
