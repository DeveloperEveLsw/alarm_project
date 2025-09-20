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

  const containerStyle = [
    { justifyContent: 'center', alignContent: 'center', alignItems: 'center' },
    boxStyle,
    isChecked ? { backgroundColor: onToggleBackgroundColor } : {},
  ];

  const textStyles = [
    textStyle,
    { color: isChecked ? onToggleColor : color },
  ];

  return (
    <TouchableOpacity activeOpacity={1} onPress={handlePress} style={containerStyle}>
      <Text style={textStyles}>{title}</Text>
    </TouchableOpacity>
  );
};

export default TextToggleButton;
