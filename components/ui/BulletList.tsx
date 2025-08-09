import { useTheme } from '@/hooks/useTheme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface BulletListProps {
  items: string[];
}

export const BulletList = ({ items }: BulletListProps) => {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    list: {
      marginTop: 8,
    },
    listItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    bullet: {
      color: colors.text,
      fontSize: 16,
      marginRight: 8,
      lineHeight: 22,
    },
    listText: {
      flex: 1,
      color: colors.text,
      fontSize: 16,
      lineHeight: 22,
    },
  });

  return (
    <View style={styles.list}>
      {items.map((item, index) => (
        <View key={index} style={styles.listItem}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.listText}>{item}</Text>
        </View>
      ))}
    </View>
  );
};
