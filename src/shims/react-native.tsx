import React, { forwardRef, useEffect } from 'react';

type AnyStyle = Record<string, any> | false | null | undefined | AnyStyle[];

export function flattenStyle(style?: AnyStyle): React.CSSProperties {
  if (!style) return {};
  if (Array.isArray(style)) {
    return style.reduce<React.CSSProperties>((acc, item) => {
      Object.assign(acc, flattenStyle(item));
      return acc;
    }, {});
  }
  if (typeof style !== 'object') return {};

  const out: Record<string, any> = { ...style };

  // Normalize background shorthand to backgroundColor when used for plain colors/transparent
  if (out.background !== undefined) {
    if (out.backgroundColor === undefined) {
      out.backgroundColor = out.background === 'none' ? 'transparent' : out.background;
    }
    delete out.background;
  }

  // Expand padding shorthands (edge > axis > all) into atomic longhand properties
  if (
    out.padding !== undefined ||
    out.paddingHorizontal !== undefined ||
    out.paddingVertical !== undefined
  ) {
    const pT = out.paddingTop ?? out.paddingVertical ?? out.padding;
    const pR = out.paddingRight ?? out.paddingHorizontal ?? out.padding;
    const pB = out.paddingBottom ?? out.paddingVertical ?? out.padding;
    const pL = out.paddingLeft ?? out.paddingHorizontal ?? out.padding;
    if (pT !== undefined) out.paddingTop = pT;
    if (pR !== undefined) out.paddingRight = pR;
    if (pB !== undefined) out.paddingBottom = pB;
    if (pL !== undefined) out.paddingLeft = pL;
    delete out.padding;
    delete out.paddingHorizontal;
    delete out.paddingVertical;
  }

  // Expand margin shorthands (edge > axis > all) into atomic longhand properties
  if (
    out.margin !== undefined ||
    out.marginHorizontal !== undefined ||
    out.marginVertical !== undefined
  ) {
    const mT = out.marginTop ?? out.marginVertical ?? out.margin;
    const mR = out.marginRight ?? out.marginHorizontal ?? out.margin;
    const mB = out.marginBottom ?? out.marginVertical ?? out.margin;
    const mL = out.marginLeft ?? out.marginHorizontal ?? out.margin;
    if (mT !== undefined) out.marginTop = mT;
    if (mR !== undefined) out.marginRight = mR;
    if (mB !== undefined) out.marginBottom = mB;
    if (mL !== undefined) out.marginLeft = mL;
    delete out.margin;
    delete out.marginHorizontal;
    delete out.marginVertical;
  }

  // Expand borderRadius shorthand into corner longhands
  if (out.borderRadius !== undefined) {
    if (out.borderTopLeftRadius === undefined) out.borderTopLeftRadius = out.borderRadius;
    if (out.borderTopRightRadius === undefined) out.borderTopRightRadius = out.borderRadius;
    if (out.borderBottomRightRadius === undefined) out.borderBottomRightRadius = out.borderRadius;
    if (out.borderBottomLeftRadius === undefined) out.borderBottomLeftRadius = out.borderRadius;
    delete out.borderRadius;
  }

  // Expand overflow shorthand into overflowX / overflowY
  if (out.overflow !== undefined) {
    if (out.overflowX === undefined) out.overflowX = out.overflow;
    if (out.overflowY === undefined) out.overflowY = out.overflow;
    delete out.overflow;
  }

  // Expand numeric flex shorthand into flexGrow / flexShrink / flexBasis
  if (typeof out.flex === 'number') {
    if (out.flex > 0) {
      if (out.flexGrow === undefined) out.flexGrow = out.flex;
      if (out.flexShrink === undefined) out.flexShrink = 1;
      if (out.flexBasis === undefined) out.flexBasis = '0%';
    } else if (out.flex === 0) {
      if (out.flexGrow === undefined) out.flexGrow = 0;
      if (out.flexShrink === undefined) out.flexShrink = 0;
      if (out.flexBasis === undefined) out.flexBasis = 'auto';
    } else if (out.flex === -1) {
      if (out.flexGrow === undefined) out.flexGrow = 0;
      if (out.flexShrink === undefined) out.flexShrink = 1;
      if (out.flexBasis === undefined) out.flexBasis = 'auto';
    }
    delete out.flex;
  }

  // Convert React Native shadow props into standard CSS boxShadow
  if (out.shadowColor || out.elevation) {
    const color = out.shadowColor || '#3B2A75';
    const offsetX = out.shadowOffset?.width ?? 0;
    const offsetY = out.shadowOffset?.height ?? 4;
    const radius = out.shadowRadius ?? 12;
    const opacity = out.shadowOpacity ?? 0.06;

    // Convert hex color + opacity to rgba if hex
    let rgba = `rgba(59, 42, 117, ${opacity})`;
    if (typeof color === 'string' && color.startsWith('#') && (color.length === 7 || color.length === 4)) {
      const hex =
        color.length === 4
          ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
          : color;
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      rgba = `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    if (!out.boxShadow) {
      out.boxShadow = `${offsetX}px ${offsetY}px ${radius}px ${rgba}`;
    }
  }
  delete out.shadowColor;
  delete out.shadowOffset;
  delete out.shadowOpacity;
  delete out.shadowRadius;
  delete out.elevation;
  delete out.textAlignVertical;

  // Normalize border / borderWidth / borderColor / borderStyle into edge longhands
  if (out.border === 'none' || out.border === 0) {
    if (out.borderWidth === undefined) out.borderWidth = 0;
    if (out.borderStyle === undefined) out.borderStyle = 'none';
    if (out.borderColor === undefined) out.borderColor = 'transparent';
    delete out.border;
  }

  const hasAnyBorderWidth =
    out.borderWidth !== undefined ||
    out.borderTopWidth !== undefined ||
    out.borderRightWidth !== undefined ||
    out.borderBottomWidth !== undefined ||
    out.borderLeftWidth !== undefined;

  if (out.borderWidth !== undefined) {
    if (out.borderTopWidth === undefined) out.borderTopWidth = out.borderWidth;
    if (out.borderRightWidth === undefined) out.borderRightWidth = out.borderWidth;
    if (out.borderBottomWidth === undefined) out.borderBottomWidth = out.borderWidth;
    if (out.borderLeftWidth === undefined) out.borderLeftWidth = out.borderWidth;
    delete out.borderWidth;
  }

  if (out.borderColor !== undefined) {
    if (out.borderTopColor === undefined) out.borderTopColor = out.borderColor;
    if (out.borderRightColor === undefined) out.borderRightColor = out.borderColor;
    if (out.borderBottomColor === undefined) out.borderBottomColor = out.borderColor;
    if (out.borderLeftColor === undefined) out.borderLeftColor = out.borderColor;
    delete out.borderColor;
  }

  if (hasAnyBorderWidth || out.borderStyle !== undefined) {
    const resolvedStyle = out.borderStyle ?? 'solid';
    if (out.borderTopStyle === undefined && out.borderTopWidth !== undefined) {
      out.borderTopStyle = resolvedStyle;
    }
    if (out.borderRightStyle === undefined && out.borderRightWidth !== undefined) {
      out.borderRightStyle = resolvedStyle;
    }
    if (out.borderBottomStyle === undefined && out.borderBottomWidth !== undefined) {
      out.borderBottomStyle = resolvedStyle;
    }
    if (out.borderLeftStyle === undefined && out.borderLeftWidth !== undefined) {
      out.borderLeftStyle = resolvedStyle;
    }
    delete out.borderStyle;
  }

  // Normalize outline shorthand if passed
  if (out.outline === 'none' || out.outline === 0) {
    if (out.outlineStyle === undefined) out.outlineStyle = 'none';
    if (out.outlineWidth === undefined) out.outlineWidth = 0;
    delete out.outline;
  }

  if (out.fontFamily === 'System') {
    out.fontFamily =
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  } else if (out.fontFamily === 'Courier') {
    out.fontFamily =
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
  }

  if (typeof out.lineHeight === 'number') {
    out.lineHeight = `${out.lineHeight}px`;
  }

  return out as React.CSSProperties;
}

export const StyleSheet = {
  create: <T extends Record<string, any>>(styles: T): T => styles,
  flatten: flattenStyle,
};

export const Platform = {
  OS: 'web' as 'web' | 'ios' | 'android',
  select: <T,>(spec: { web?: T; ios?: T; android?: T; default?: T }): T | undefined =>
    spec.web ?? spec.default ?? spec.ios ?? spec.android,
};

export const View = forwardRef<HTMLDivElement, any>(
  ({ style, children, onLayout: _onLayout, ...rest }, ref) => {
    const baseStyle: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box',
      position: 'relative',
      minWidth: 0,
      ...flattenStyle(style),
    };
    return (
      <div ref={ref} style={baseStyle} {...rest}>
        {children}
      </div>
    );
  }
);
View.displayName = 'View';

export const Text = forwardRef<HTMLSpanElement, any>(
  ({ style, numberOfLines, children, onPress, ...rest }, ref) => {
    const flat = flattenStyle(style);
    const clampStyle: React.CSSProperties =
      numberOfLines === 1
        ? {
            overflowX: 'hidden',
            overflowY: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'block',
          }
        : numberOfLines && numberOfLines > 1
        ? {
            display: '-webkit-box',
            WebkitLineClamp: numberOfLines,
            WebkitBoxOrient: 'vertical',
            overflowX: 'hidden',
            overflowY: 'hidden',
          }
        : {};

    return (
      <span
        ref={ref}
        onClick={onPress}
        style={{
          display: 'inline',
          marginTop: 0,
          marginRight: 0,
          marginBottom: 0,
          marginLeft: 0,
          paddingTop: 0,
          paddingRight: 0,
          paddingBottom: 0,
          paddingLeft: 0,
          boxSizing: 'border-box',
          fontFamily:
            'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          whiteSpace: 'pre-wrap',
          ...flat,
          ...clampStyle,
          ...(onPress ? { cursor: 'pointer' } : {}),
        }}
        {...rest}
      >
        {children}
      </span>
    );
  }
);
Text.displayName = 'Text';

export const TouchableOpacity = forwardRef<HTMLButtonElement, any>(
  (
    {
      style,
      onPress,
      disabled,
      activeOpacity: _activeOpacity,
      hitSlop: _hitSlop,
      children,
      accessibilityLabel,
      ...rest
    },
    ref
  ) => {
    const flat = flattenStyle(style);
    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        aria-label={accessibilityLabel}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled && onPress) onPress(e);
        }}
        className="transition-opacity active:opacity-80 focus-visible:outline-2 focus-visible:outline-[#7654E8] focus-visible:outline-offset-1"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          textAlign: 'left',
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          borderRightWidth: 0,
          borderBottomWidth: 0,
          borderLeftWidth: 0,
          borderTopStyle: 'solid',
          borderRightStyle: 'solid',
          borderBottomStyle: 'solid',
          borderLeftStyle: 'solid',
          borderTopColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: 'transparent',
          borderLeftColor: 'transparent',
          paddingTop: 0,
          paddingRight: 0,
          paddingBottom: 0,
          paddingLeft: 0,
          marginTop: 0,
          marginRight: 0,
          marginBottom: 0,
          marginLeft: 0,
          boxSizing: 'border-box',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          fontFamily: 'inherit',
          ...flat,
        }}
        {...rest}
      >
        {children}
      </button>
    );
  }
);
TouchableOpacity.displayName = 'TouchableOpacity';

export const Pressable = TouchableOpacity;

export interface ScrollView {
  scrollToEnd: (opts?: { animated?: boolean }) => void;
  scrollTo: (opts?: { x?: number; y?: number; animated?: boolean }) => void;
}

export const ScrollView = forwardRef<ScrollView, any>(
  (
    {
      style,
      contentContainerStyle,
      horizontal,
      showsVerticalScrollIndicator = true,
      showsHorizontalScrollIndicator = true,
      children,
      ...rest
    },
    ref
  ) => {
    const innerRef = React.useRef<HTMLDivElement | null>(null);

    React.useImperativeHandle(ref, () => ({
      scrollToEnd: ({ animated = true }: { animated?: boolean } = {}) => {
        if (innerRef.current) {
          innerRef.current.scrollTo({
            top: innerRef.current.scrollHeight,
            left: innerRef.current.scrollWidth,
            behavior: animated ? 'smooth' : 'auto',
          });
        }
      },
      scrollTo: ({ x = 0, y = 0, animated = true }: { x?: number; y?: number; animated?: boolean } = {}) => {
        if (innerRef.current) {
          innerRef.current.scrollTo({
            top: y,
            left: x,
            behavior: animated ? 'smooth' : 'auto',
          });
        }
      },
    }));

    const hideScrollClass =
      (!horizontal && !showsVerticalScrollIndicator) ||
      (horizontal && !showsHorizontalScrollIndicator)
        ? 'cc-no-scrollbar'
        : '';

    return (
      <div
        ref={innerRef}
        className={hideScrollClass}
        style={{
          display: 'flex',
          flexDirection: horizontal ? 'row' : 'column',
          overflowX: horizontal ? 'auto' : 'hidden',
          overflowY: horizontal ? 'hidden' : 'auto',
          WebkitOverflowScrolling: 'touch',
          boxSizing: 'border-box',
          minHeight: 0,
          minWidth: 0,
          ...flattenStyle(style),
        }}
        {...rest}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: horizontal ? 'row' : 'column',
            boxSizing: 'border-box',
            flexShrink: 0,
            ...(horizontal ? { alignItems: 'center' } : { width: '100%' }),
            ...flattenStyle(contentContainerStyle),
          }}
        >
          {children}
        </div>
      </div>
    );
  }
);
ScrollView.displayName = 'ScrollView';

export const TextInput = forwardRef<HTMLInputElement & HTMLTextAreaElement, any>(
  (
    {
      style,
      value,
      onChangeText,
      placeholder,
      placeholderTextColor: _placeholderTextColor,
      multiline,
      numberOfLines = 4,
      keyboardType,
      secureTextEntry,
      onSubmitEditing,
      autoCapitalize: _autoCapitalize,
      editable = true,
      ...rest
    },
    ref
  ) => {
    const flat = flattenStyle(style);
    const commonStyle: React.CSSProperties = {
      boxSizing: 'border-box',
      outlineStyle: 'none',
      outlineWidth: 0,
      fontFamily:
        'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      width: '100%',
      ...flat,
    };

    if (multiline) {
      return (
        <textarea
          ref={ref as any}
          rows={numberOfLines}
          value={value}
          disabled={!editable}
          placeholder={placeholder}
          onChange={(e) => onChangeText?.(e.target.value)}
          className="focus:ring-2 focus:ring-[#7654E8]/30"
          style={commonStyle}
          {...rest}
        />
      );
    }

    const inputType = secureTextEntry
      ? 'password'
      : keyboardType === 'email-address'
      ? 'email'
      : keyboardType === 'numeric' || keyboardType === 'number-pad'
      ? 'text'
      : 'text';

    const inputMode =
      keyboardType === 'numeric' || keyboardType === 'number-pad'
        ? 'decimal'
        : undefined;

    return (
      <input
        ref={ref as any}
        type={inputType}
        inputMode={inputMode}
        value={value}
        disabled={!editable}
        placeholder={placeholder}
        onChange={(e) => onChangeText?.(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onSubmitEditing) {
            onSubmitEditing();
          }
        }}
        className="focus:ring-2 focus:ring-[#7654E8]/30"
        style={commonStyle}
        {...rest}
      />
    );
  }
);
TextInput.displayName = 'TextInput';

export const Modal: React.FC<{
  visible?: boolean;
  transparent?: boolean;
  animationType?: 'none' | 'slide' | 'fade';
  onRequestClose?: () => void;
  children?: React.ReactNode;
}> = ({ visible, onRequestClose, children }) => {
  useEffect(() => {
    if (!visible) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onRequestClose?.();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [visible, onRequestClose]);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onRequestClose?.();
        }
      }}
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {children}
    </div>
  );
};

export const KeyboardAvoidingView: React.FC<any> = ({ style, children, behavior: _b, ...rest }) => (
  <View style={style} {...rest}>
    {children}
  </View>
);

// Non-blocking Alert shim (never calls window.alert per iframe rules)
type AlertButton = { text?: string; onPress?: () => void; style?: string };
let alertListener: ((payload: { title: string; message?: string; buttons?: AlertButton[] }) => void) | null = null;

export const registerAlertListener = (
  cb: ((payload: { title: string; message?: string; buttons?: AlertButton[] }) => void) | null
) => {
  alertListener = cb;
};

export const Alert = {
  alert: (title: string, message?: string, buttons?: AlertButton[]) => {
    if (alertListener) {
      alertListener({ title, message, buttons });
    }
  },
};
