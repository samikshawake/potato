import React from 'react';
import { flattenStyle } from './react-native';

function buildTransform(rotation?: number | string, origin?: string, existingTransform?: string) {
  if (rotation === undefined || rotation === null) return existingTransform;
  const cleanOrigin = origin ? origin.replace(/,/g, ' ').replace(/\s+/g, ' ').trim() : '';
  const rot = cleanOrigin ? `rotate(${rotation} ${cleanOrigin})` : `rotate(${rotation})`;
  return existingTransform ? `${existingTransform} ${rot}` : rot;
}

export const Svg: React.FC<any> = ({ style, children, ...rest }) => (
  <svg style={flattenStyle(style)} {...rest}>
    {children}
  </svg>
);

export const G: React.FC<any> = ({ rotation, origin, transform, children, ...rest }) => (
  <g transform={buildTransform(rotation, origin, transform)} {...rest}>
    {children}
  </g>
);

export const Circle: React.FC<any> = ({ rotation, origin, transform, ...rest }) => (
  <circle transform={buildTransform(rotation, origin, transform)} {...rest} />
);

export const Ellipse: React.FC<any> = (props) => <ellipse {...props} />;
export const Polygon: React.FC<any> = (props) => <polygon {...props} />;
export const Rect: React.FC<any> = (props) => <rect {...props} />;
export const Path: React.FC<any> = (props) => <path {...props} />;
export const Defs: React.FC<any> = ({ children, ...rest }) => <defs {...rest}>{children}</defs>;
export const LinearGradient: React.FC<any> = ({ children, ...rest }) => (
  <linearGradient {...rest}>{children}</linearGradient>
);
export const Stop: React.FC<any> = (props) => <stop {...props} />;

export default Svg;
