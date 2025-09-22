import React, { useEffect, useState } from 'react';
import { ColorValue, StyleProp, TextStyle, TouchableOpacity, ViewStyle } from 'react-native';
import { Text } from 'react-native';

type IconToggleButtonProps = {
  IconComponent: React.ComponentType<{
    name: string;
    size?: number;
    color?: number | ColorValue;
  }>;
  iconName: string;
  onToggleIconName?: string;
  iconSize?: number;
  iconColor?: string;
  onToggle: (isChecked: boolean) => void;
  boxStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  title?: string;
  isToggled?: boolean;
};

const IconToggleButton = ({
  boxStyle,
  textStyle,
  IconComponent,
  title,
  iconName,
  iconSize,
  iconColor,
  onToggle,
  onToggleIconName,
  isToggled,
}: IconToggleButtonProps) => {
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

  const iconToRender = isChecked
    ? onToggleIconName ?? iconName
    : iconName;

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={handlePress}
      style={[boxStyle, { flexDirection: 'row', alignItems: 'center' }]}
    >
      {title ? <Text style={textStyle}>{title}</Text> : null}
      <IconComponent name={iconToRender} size={iconSize} color={iconColor} />
    </TouchableOpacity>
  );
};

export default IconToggleButton;
