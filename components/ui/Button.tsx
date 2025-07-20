import { Colors } from '@/constants/Colors';
import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, TouchableOpacity, ViewStyle } from 'react-native';

type ButtonProps = {
  containerStyle?: StyleProp<ViewStyle>;
  disabled?: boolean;
  label: string;
  onPress: () => void;
  textStyle?: StyleProp<TextStyle>;
};

export const Button = ({ containerStyle, disabled, label, onPress, textStyle }: ButtonProps) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.button, 
        disabled && styles.inActiveButton,
        containerStyle
      ]}
      disabled={disabled}
    >
      <Text style={[
        styles.text, 
        disabled && styles.inActiveText,
        textStyle
      ]}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: Colors.active,
    borderColor: Colors.active,
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    width: '40%'
  },
  text: {
    color: Colors.activeText,
    fontSize: 16,
    fontWeight: 'bold'
  },
  inActiveButton: {
    backgroundColor: Colors.inactive,
    borderColor: Colors.inactive,
  },
  inActiveText: {
    color: Colors.inactiveText,
  }
})