import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { ShoppingBag } from 'lucide-react-native';

type AddToCartAnimationProps = {
  startPosition: { x: number; y: number };
  endPosition: { x: number; y: number };
  onComplete: () => void;
};

export function AddToCartAnimation({
  startPosition,
  endPosition,
  onComplete,
}: AddToCartAnimationProps) {
  const translateX = useSharedValue(startPosition.x);
  const translateY = useSharedValue(startPosition.y);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    // Start the animation sequence
    scale.value = withSequence(
      withSpring(1.2),
      withSpring(1)
    );

    translateX.value = withTiming(endPosition.x, {
      duration: 750,
    });

    translateY.value = withTiming(endPosition.y, {
      duration: 750,
    }, () => {
      opacity.value = withTiming(0, {
        duration: 200,
      }, () => {
        runOnJS(onComplete)();
      });
    });
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
      opacity: opacity.value,
    };
  });

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.icon, animatedStyle]}>
        <ShoppingBag size={24} color="#fff" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  icon: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
});