import { useState } from 'react';
import { router } from 'expo-router';

export function useAddToCartAnimation() {
  const [showAnimation, setShowAnimation] = useState(false);
  const [animationConfig, setAnimationConfig] = useState<{
    startPosition: { x: number; y: number };
    endPosition: { x: number; y: number };
  } | null>(null);

  const measureCartTab = (): Promise<{ x: number; y: number }> => {
    return new Promise((resolve) => {
      // Get approximate tab bar position
      // These values are estimates since we can't directly measure the tab bar
      const screenHeight = window.innerHeight;
      const tabBarY = screenHeight - 50; // Approximate tab bar position from bottom
      
      resolve({
        x: window.innerWidth / 2, // Center of screen
        y: tabBarY,
      });
    });
  };

  const animateToCart = async (buttonRef: any) => {
    return new Promise<void>((resolve) => {
      // Measure the button position
      buttonRef.current?.measure(async (_x: number, _y: number, width: number, height: number, pageX: number, pageY: number) => {
        const startPosition = {
          x: pageX + width / 2 - 20, // Center of button, minus half of animation icon size
          y: pageY + height / 2 - 20,
        };

        const endPosition = await measureCartTab();

        setAnimationConfig({ startPosition, endPosition });
        setShowAnimation(true);

        // Wait for animation to complete
        setTimeout(() => {
          setShowAnimation(false);
          setAnimationConfig(null);
          resolve();
        }, 1000);
      });
    });
  };

  const navigateToCart = () => {
    router.push('/(tabs)/cart');
  };

  return {
    showAnimation,
    animationConfig,
    animateToCart,
    navigateToCart,
  };
}