import React, {useState} from 'react'
import {StyleProp, ViewStyle, TouchableOpacity, Text, ColorValue} from 'react-native'

type IconButtonProps = {
  IconComponent: React.ComponentType<{
    name: string;
    size?: number;
    color?: number | ColorValue;
  }>;
  iconName: string;
  onToggleIconName?: string;
  iconSize?: number;
  iconColor?: string;
  onToggle: (isChecked:boolean) => void;
  boxStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<ViewStyle>;
  title?: string
};

const IconToggleButton = ({boxStyle, textStyle, IconComponent, title, iconName, iconSize, iconColor, onToggle, onToggleIconName}:IconButtonProps) => {
  const [isChecked, setIsChecked] = useState(false);
  
    return (
  <TouchableOpacity
    activeOpacity={1}
    onPress={()=>{
      setIsChecked(!isChecked)
      onToggle(!isChecked)
    }}
    style={[boxStyle,{flexDirection: 'row'}]}>
    <Text style={textStyle}>{title}</Text>
    <IconComponent name={isChecked ? (onToggleIconName ? onToggleIconName : iconName) : iconName} size={iconSize} color={iconColor} />
  </TouchableOpacity>
  )
}

export default IconToggleButton