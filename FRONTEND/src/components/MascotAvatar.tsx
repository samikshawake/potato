import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
  Circle,
  Ellipse,
  Polygon,
  Rect,
  Path,
  G,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';

interface Props {
  size?: number;
  showShades?: boolean;
  mood?: 'cool' | 'happy' | 'celebrate';
}

export const MascotAvatar: React.FC<Props> = ({
  size = 72,
  showShades = true,
  mood = 'cool',
}) => {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          {/* Fur Gradient */}
          <LinearGradient id="foxFur" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#FFA439" />
            <Stop offset="100%" stopColor="#EA6F1E" />
          </LinearGradient>
          {/* Inner Ear Pink */}
          <LinearGradient id="earPink" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#FFAEC0" />
            <Stop offset="100%" stopColor="#F472B6" />
          </LinearGradient>
          {/* Sunglasses Gradient */}
          <LinearGradient id="shadesGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#1E1E2E" />
            <Stop offset="100%" stopColor="#11111B" />
          </LinearGradient>
        </Defs>

        {/* Outer Ears */}
        {/* Left Ear */}
        <Polygon points="22,46 12,14 42,28" fill="url(#foxFur)" />
        <Polygon points="24,40 16,18 38,28" fill="url(#earPink)" />

        {/* Right Ear */}
        <Polygon points="78,46 88,14 58,28" fill="url(#foxFur)" />
        <Polygon points="76,40 84,18 62,28" fill="url(#earPink)" />

        {/* Fox Head Base */}
        <Circle cx="50" cy="56" r="32" fill="url(#foxFur)" />

        {/* Cheek Tufts (White Fur) */}
        <Path
          d="M 22 56 C 22 72 36 84 50 84 C 64 84 78 72 78 56 C 70 64 62 68 50 68 C 38 68 30 64 22 56 Z"
          fill="#FFFDF7"
        />

        {/* Cute Black Snout Nose */}
        <Ellipse cx="50" cy="67" rx="5" ry="3.5" fill="#1E1E24" />
        {/* Mouth */}
        <Path
          d="M 46 72 Q 50 76 54 72"
          stroke="#1E1E24"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />

        {showShades ? (
          /* Cool Sunglasses with Emerald Dollar Sparkles (like reference image) */
          <G>
            {/* Sunglasses Bridge */}
            <Rect x="44" y="47" width="12" height="4" rx="2" fill="#181822" />
            {/* Left Lens */}
            <Rect x="23" y="43" width="24" height="15" rx="6" fill="url(#shadesGrad)" />
            {/* Right Lens */}
            <Rect x="53" y="43" width="24" height="15" rx="6" fill="url(#shadesGrad)" />

            {/* Neon Green Dollar / Sparkle Accents on Glasses */}
            {/* Left Lens Dollar Sparkle */}
            <Path
              d="M 33 46 L 37 46 M 35 45 L 35 55 M 33 54 L 37 54"
              stroke="#22C55E"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            {/* Right Lens Dollar Sparkle */}
            <Path
              d="M 63 46 L 67 46 M 65 45 L 65 55 M 63 54 L 67 54"
              stroke="#22C55E"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </G>
        ) : (
          /* Normal cute fox eyes */
          <G>
            <Circle cx="35" cy="48" r="4.5" fill="#181822" />
            <Circle cx="36.5" cy="46.5" r="1.5" fill="#FFFFFF" />
            <Circle cx="65" cy="48" r="4.5" fill="#181822" />
            <Circle cx="66.5" cy="46.5" r="1.5" fill="#FFFFFF" />
          </G>
        )}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
