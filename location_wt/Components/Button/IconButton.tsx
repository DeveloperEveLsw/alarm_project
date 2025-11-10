import React from 'react'
import {StyleProp, ViewStyle, TouchableOpacity, Text, ColorValue} from 'react-native'
import FontAwesome from 'react-native-vector-icons/FontAwesome';

type IconButtonProps = {
  IconComponent: React.ComponentType<{
    name: string;
    size?: number;
    color?: number | ColorValue;
  }>;
  iconName: string;
  iconSize?: number;
  iconColor?: string;
  onPress: () => void;
  boxStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<ViewStyle>;
  title?: string
};

const IconButton = ({boxStyle, textStyle, IconComponent, title, iconName, iconSize, iconColor, onPress}:IconButtonProps) => {
  return (
  <TouchableOpacity activeOpacity={1} onPress={onPress} style={boxStyle}>
    <Text style={textStyle}>{title}</Text>
    <IconComponent name={iconName} size={iconSize} color={iconColor} />
  </TouchableOpacity>
  )
}

export default IconButton