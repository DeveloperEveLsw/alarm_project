import React, { useEffect, useState } from 'react';
import {
  ColorValue,
  StyleProp,
  Text,
  TextStyle,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';

type TextToggleButtonProps = {
  onToggle: (isChecked: boolean) => void;
  boxStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  color: ColorValue;
  onToggleColor: ColorValue;
  onToggleBackgroundColor: ColorValue;
  title?: string;
  isToggled?: boolean;
};

const TextToggleButton = ({
  boxStyle,
  textStyle,
  title,
  onToggle,
  color,
  onToggleColor = '#FFF',
  onToggleBackgroundColor,
  isToggled,
}: TextToggleButtonProps) => {
  const [isChecked, setIsChecked] = useState<boolean>(Boolean(isToggled));

  useEffect(() => {
    if (typeof isToggled === 'boolean') {
      setIsChecked(isToggled);
    }
  }, [isToggled]);

  const handlePress = () => {
    const nextValue = !isChecked;
    if (typeof isToggled !== 'boolean') {
      setIsChecked(nextValue);
    }
    onToggle(nextValue);
  };

  const baseContainerStyle: ViewStyle = {
    justifyContent: 'center',
    alignContent: 'center',
    alignItems: 'center',
  };

  const containerStyle: StyleProp<ViewStyle> = [
    baseContainerStyle,
    boxStyle,
    isChecked ? { backgroundColor: onToggleBackgroundColor } : null,
  ];

  const computedTextStyle: StyleProp<TextStyle> = [
    textStyle,
    { color: isChecked ? onToggleColor : color },
  ];

  return (
    <TouchableOpacity activeOpacity={1} onPress={handlePress} style={containerStyle}>
      <Text style={computedTextStyle}>{title}</Text>
    </TouchableOpacity>
  );
};

export default TextToggleButton;
