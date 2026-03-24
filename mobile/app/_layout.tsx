import '../global.css';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function RootLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#94a3b8',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trips',
          tabBarIcon: ({ color }) => <FontAwesome name="map" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: '',
          tabBarIcon: () => (
            <View className="bg-primary h-14 w-14 rounded-full flex items-center justify-center -top-4 shadow-lg">
              <FontAwesome name="plus" size={24} color="#ffffff" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarIcon: ({ color }) => <FontAwesome name="bookmark" size={20} color={color} />,
        }}
      />
    </Tabs>
  );
}
