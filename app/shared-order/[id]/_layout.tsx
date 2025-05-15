import { Stack } from 'expo-router';

export default function SharedOrderLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="checkout" />
      <Stack.Screen name="confirmation" />
    </Stack>
  );
}
//sded
