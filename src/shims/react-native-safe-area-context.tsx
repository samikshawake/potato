import React from 'react';
import { View } from './react-native';

export const SafeAreaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <>{children}</>
);

export const SafeAreaView: React.FC<any> = ({ style, edges: _edges, children, ...rest }) => (
  <View style={[{ flex: 1, minHeight: 0 }, style]} {...rest}>
    {children}
  </View>
);
