import React, {useState} from 'react'
import {StyleProp, ViewStyle,TextStyle ,TouchableOpacity, Text, ColorValue} from 'react-native'

type IconButtonProps = {
  onToggle: (isChecked:boolean) => void;
  boxStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  color: ColorValue;
  onToggleColor: ColorValue;
  onToggleBackgroundColor: ColorValue;
  title?: string;
};

const IconToggleButton = ({boxStyle, textStyle, title, onToggle, color, onToggleColor='#FFF', onToggleBackgroundColor}:IconButtonProps) => {

  const [isChecked, setIsChecked] = useState(false);
  
    return (
  <TouchableOpacity
    activeOpacity={1}
    onPress={()=>{
      setIsChecked(!isChecked)
      onToggle(isChecked)
    }}
    style={[{justifyContent:'center',alignContent:'center', alignItems:'center'},boxStyle,isChecked ? {backgroundColor:onToggleBackgroundColor} : {}]}>
    <Text style={[textStyle,{color:isChecked ? onToggleColor : color}]}>{title}</Text>
  </TouchableOpacity>
  )
}

export default IconToggleButton