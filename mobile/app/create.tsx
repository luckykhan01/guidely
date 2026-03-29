import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { setCurrentTrip, addMyTrip } from '../store/tripStore';

type Step = 'Where' | 'When' | 'Preferences';

const TRENDING = [
  { name: 'Almaty', country: 'Kazakhstan', flag: '🇰🇿' },
  { name: 'Astana', country: 'Kazakhstan', flag: '🇰🇿' },
  { name: 'Shymkent', country: 'Kazakhstan', flag: '🇰🇿' },
  { name: 'Aktau', country: 'Kazakhstan', flag: '🇰🇿' },
  { name: 'Atyrau', country: 'Kazakhstan', flag: '🇰🇿' },
];

const PREFS = [
  { id: 'Popular', icon: '📌' },
  { id: 'Museum', icon: '🖼️' },
  { id: 'Nature', icon: '🏞️' },
  { id: 'Foodie', icon: '🍕' },
  { id: 'History', icon: '🏛️' },
  { id: 'Shopping', icon: '🛍️' },
];

const DAYS_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 14, 21, 30];

export default function CreateTrip() {
  const [activeStep, setActiveStep] = useState<Step>('Where');
  const [city, setCity] = useState<{name: string, country: string, flag: string} | null>(null);
  const [days, setDays] = useState<number>(4);
  const [preferences, setPreferences] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateTrip = async (payload: any) => {
    setIsLoading(true);
    try {
      const response = await fetch('http://192.168.0.174:8080/api/generate-trip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      
      // Store the trip data in the module-level store
      // instead of passing it through URL params (which crashes the nav context)
      setCurrentTrip(data);
      
      const totalDays = data.days?.length || 1;
      const totalSpots = data.days?.reduce((acc: number, d: any) => acc + (d.places?.length || 0), 0) || 0;
      
      const cityLower = (city?.name || 'Unknown').toLowerCase();
      let cityImage = require('../assets/images/almaty.jpg'); // default fallback
      if (cityLower === 'astana') cityImage = require('../assets/images/astana.jpg');
      if (cityLower === 'shymkent') cityImage = require('../assets/images/shymkent.jpg');
      
      // If the AI returned a real image for the first place, use it as cover
      if (data.days?.[0]?.places?.[0]?.imageUrl) {
        cityImage = { uri: data.days[0].places[0].imageUrl };
      }

      addMyTrip({
        id: Date.now(),
        title: data.tripTitle || 'Generated Trip',
        duration: `${totalDays} Day${totalDays > 1 ? 's' : ''}`,
        spots: `${totalSpots} Spots`,
        image: cityImage,
        tripData: data,
      });

      router.push('/trip');
    } catch (error) {
      console.error(error);
      alert('Failed to contact AI backend. Ensure the Go server runs on port 8080 and GEMINI_API_KEY is valid.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    if (activeStep === 'Where') {
      if (!city) {
        setCity(TRENDING[2]); 
      }
      setActiveStep('When');
    } else if (activeStep === 'When') {
      setActiveStep('Preferences');
    } else {
      const payload = {
        destination_city: city?.name || 'Rome',
        duration_days: days,
        preferences_array: preferences.length > 0 ? preferences : []
      };
      handleGenerateTrip(payload);
    }
  };

  const togglePreference = (id: string) => {
    if (preferences.includes(id)) {
      setPreferences(preferences.filter(p => p !== id));
    } else {
      setPreferences([...preferences, id]);
    }
  };

  const handleClear = () => {
    setCity(null);
    setDays(4);
    setPreferences([]);
    setActiveStep('Where');
  };

  return (
    <LinearGradient colors={['#e0f2fe', '#f8fafc', '#e0f2fe']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Modal Header */}
        <View className="flex-row items-center justify-between px-6 pt-4 pb-6">
          {/* Left Spacer */}
          <View className="w-10" />
          <Text className="text-[20px] font-bold text-slate-900">Create Trip</Text>
          <TouchableOpacity 
            className="w-10 h-10 bg-black/5 rounded-full items-center justify-center"
            onPress={() => router.navigate('/')}
          >
            <FontAwesome name="times" size={18} color="#475569" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
          {/* STEP 1: WHERE? */}
          <TouchableOpacity 
            activeOpacity={0.9}
            onPress={() => setActiveStep('Where')}
            className={`bg-white rounded-3xl p-5 mb-4 shadow-sm ${activeStep === 'Where' ? 'min-h-[300px]' : ''}`}
          >
            {activeStep === 'Where' ? (
              <View>
                <Text className="text-xl font-bold text-slate-800 mb-4">Where?</Text>
                {/* Search Bar */}
                <View className="flex-row items-center bg-white border border-slate-100 rounded-full px-5 h-14 mb-6 shadow-sm">
                  <FontAwesome name="search" size={18} color="#0f172a" />
                  <TextInput 
                    placeholder="Search destinations" 
                    className="flex-1 ml-3 text-[17px] text-slate-800 font-medium h-full"
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                {/* Trending */}
                <View className="flex-row items-center mb-4">
                  <FontAwesome name="fire" size={16} color="#cbd5e1" />
                  <Text className="text-slate-400 font-semibold ml-2">Trending</Text>
                </View>

                {TRENDING.map((item, idx) => (
                  <TouchableOpacity 
                    key={idx} 
                    className="flex-row items-center py-3"
                    onPress={() => {
                      setCity(item);
                      // Brief delay so the user feels the selection before the accordion collapses 
                      setTimeout(() => setActiveStep('When'), 150);
                    }}
                  >
                    <View className="w-12 h-10 bg-[#f8fafc] rounded-xl items-center justify-center border border-gray-100">
                      <Text className="text-xl">{item.flag}</Text>
                    </View>
                    <View className="ml-4 flex-1">
                      <Text className={`text-[17px] font-bold ${city?.name === item.name ? 'text-blue-600' : 'text-slate-900'}`}>
                        {item.name}
                      </Text>
                      <Text className="text-slate-400 text-sm mt-0.5">{item.country}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              // Collapsed Step 1 State
              <View className="flex-row items-center justify-between py-1">
                <Text className="text-[17px] font-bold text-slate-900">Where</Text>
                {city ? (
                  <View className="flex-row items-center">
                    <View className="w-10 h-8 bg-slate-50 rounded-lg items-center justify-center border border-gray-100 mr-3">
                      <Text className="text-lg">{city.flag}</Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-[15px] font-bold text-slate-900">{city.name}</Text>
                      <Text className="text-slate-400 text-[11px]">{city.country}</Text>
                    </View>
                  </View>
                ) : (
                  <Text className="text-blue-500 font-medium text-[15px]">I'm flexible</Text>
                )}
              </View>
            )}
          </TouchableOpacity>

          {/* STEP 2: WHEN? */}
          <TouchableOpacity 
            activeOpacity={0.9}
            onPress={() => setActiveStep('When')}
            className={`bg-white rounded-3xl p-5 mb-4 shadow-sm ${activeStep === 'When' ? 'min-h-[300px]' : ''}`}
          >
            {activeStep === 'When' ? (
              <View>
                <Text className="text-xl font-bold text-slate-800 mb-5">When?</Text>
                {/* Tabs Toggle */}
                <View className="flex-row bg-[#f8fafc] rounded-full p-1.5 mb-6 border border-gray-100">
                  <View className="flex-1 bg-white rounded-full py-3 shadow-sm items-center">
                    <Text className="text-[#3b82f6] font-bold text-[14px]">Flexible</Text>
                  </View>
                  <View className="flex-1 rounded-full py-3 items-center">
                    <Text className="text-slate-400 font-bold text-[14px]">Specific Dates</Text>
                  </View>
                </View>

                <View className="flex-row items-center justify-center mb-6">
                  <FontAwesome name="calendar" size={14} color="#94a3b8" />
                  <Text className="text-slate-400 font-semibold ml-2 text-[15px]">Number of days</Text>
                </View>

                {/* Vertical Scroll Wheel */}
                <View className="h-[168px] items-center justify-center relative">
                  {/* Selection Highlight background Box */}
                  <View className="absolute top-1/2 -mt-[28px] w-full h-[56px] bg-[#f1f5f9] rounded-xl" />
                  <ScrollView 
                    showsVerticalScrollIndicator={false}
                    snapToInterval={56} // Sync with selection height
                    decelerationRate="fast"
                    className="w-full"
                    contentContainerStyle={{ paddingVertical: 56 }}
                    onScroll={(e) => {
                      const y = e.nativeEvent.contentOffset.y;
                      const index = Math.round(y / 56);
                      const newDay = DAYS_OPTIONS[Math.max(0, Math.min(index, DAYS_OPTIONS.length - 1))];
                      if (newDay && newDay !== days) {
                        setDays(newDay);
                        Haptics.selectionAsync(); // Subtle haptic trigger on roll
                      }
                    }}
                    scrollEventThrottle={16}
                  >
                    {DAYS_OPTIONS.map((val) => {
                      const isSelected = days === val;
                      return (
                        <TouchableOpacity 
                          key={val} 
                          className="h-[56px] items-center justify-center"
                          onPress={() => {
                            setDays(val);
                            Haptics.selectionAsync();
                          }}
                        >
                          <Text 
                            className={`font-bold ${isSelected ? 'text-[40px]' : 'text-[32px]'}`}
                            style={{ color: isSelected ? '#000000' : '#d1d5db' }}
                          >
                            {val}
                          </Text>
                        </TouchableOpacity>
                      )
                    })}
                  </ScrollView>
                </View>
              </View>
            ) : (
              // Collapsed Step 2 State
              <View className="flex-row items-center justify-between py-1">
                <Text className="text-[17px] font-bold text-slate-900">When</Text>
                <View className="items-end">
                  <Text className="text-[15px] font-bold text-slate-900">{days} Days</Text>
                  <Text className="text-slate-400 text-[11px]">Anytime</Text>
                </View>
              </View>
            )}
          </TouchableOpacity>

          {/* STEP 3: PREFERENCES */}
          <TouchableOpacity 
            activeOpacity={0.9}
            onPress={() => setActiveStep('Preferences')}
            className={`bg-white rounded-3xl p-5 mb-10 shadow-sm ${activeStep === 'Preferences' ? 'min-h-[300px]' : ''}`}
          >
            {activeStep === 'Preferences' ? (
              <View>
                <Text className="text-xl font-bold text-slate-800 mb-5">Preferences</Text>
                <View className="flex-row flex-wrap justify-between">
                  {PREFS.map((pref) => {
                    const selected = preferences.includes(pref.id);
                    return (
                      <TouchableOpacity
                        key={pref.id}
                        onPress={() => togglePreference(pref.id)}
                        className={`w-[48%] flex-row items-center py-4 px-4 rounded-3xl mb-3 border ${
                          selected ? 'border-blue-300 bg-blue-50/50' : 'border-gray-100 bg-[#f8fafc]'
                        }`}
                      >
                        <Text className="text-[22px] mr-3">{pref.icon}</Text>
                        <Text className={`font-bold text-[15px] ${selected ? 'text-slate-900' : 'text-slate-900'}`}>
                          {pref.id}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Skip Button */}
                <TouchableOpacity 
                  className="mt-4 flex-row items-center justify-center py-4 rounded-full border border-blue-50 bg-white shadow-sm"
                  onPress={() => {
                     setPreferences(['Surprise me']);
                     const payload = {
                       destination_city: city?.name || 'Rome',
                       duration_days: days,
                       preferences_array: ['Surprise me']
                     };
                     handleGenerateTrip(payload);
                  }}
                  disabled={isLoading}
                >
                  <Text className="text-blue-400 mr-2 text-xl">✨</Text>
                  <Text className="text-blue-500 font-bold text-[16px]">Skip, Surprise me</Text>
                </TouchableOpacity>
              </View>
            ) : (
              // Collapsed Step 3 State
              <View className="flex-row items-center justify-between py-1">
                <Text className="text-[17px] font-bold text-slate-500">Preferences</Text>
                <Text className="text-blue-500 font-bold text-[15px]">
                  {preferences.length > 0 ? `${preferences.length} selected` : 'Add interests'}
                </Text>
              </View>
            )}
          </TouchableOpacity>

        </ScrollView>

        {/* Bottom Bar Controls - Fixed floating effect */}
        <View className="px-5 py-5 flex-row items-center justify-between bg-transparent pb-8">
          <TouchableOpacity 
            className="flex-row items-center px-6 py-[18px] rounded-full bg-white shadow-sm"
            onPress={handleClear}
          >
             <FontAwesome name="times-circle" size={16} color="#fb7185" />
             <Text className="text-[#fb7185] font-bold text-[16px] ml-2">Clear</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            className="flex-1 ml-4 bg-[#0f172a] rounded-full items-center justify-center py-[18px] shadow-lg"
            onPress={handleNext}
          >
            <Text className="text-white font-bold text-[17px]">
              {activeStep === 'Preferences' ? 'Continue' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>

      </SafeAreaView>

      {/* Loading Overlay */}
      {isLoading && (
        <View className="absolute inset-0 bg-white/80 items-center justify-center z-50">
          <ActivityIndicator size="large" color="#0ea5e9" />
          <Text className="mt-4 text-[17px] font-bold text-slate-700">AI is crafting your trip...</Text>
          <Text className="mt-1 text-sm text-slate-500">This might take a few seconds</Text>
        </View>
      )}
    </LinearGradient>
  );
}
