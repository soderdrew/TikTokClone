import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions, Image } from 'react-native';
import { getFoodIcon, FOOD_ICONS, FoodIconType } from '../../constants/foodIcons';
// import { formatQuantity } from '../../(tabs)/pantry';

const { width } = Dimensions.get('window');
const GRID_SPACING = 16;
const NUM_COLUMNS = 3;
const ITEM_SIZE = (width - 40 - (GRID_SPACING * (NUM_COLUMNS - 1))) / NUM_COLUMNS;

interface InventoryItem {
  $id: string;
  name: string;
  quantity: number;
  unit: string;
  icon?: string;
}

interface Props {
  items: InventoryItem[];
  onItemPress: (item: InventoryItem) => void;
}

const formatQuantity = (quantity: number): string => {
  // Always round to 2 decimal places, then remove unnecessary trailing zeros
  const roundedQuantity = Number(quantity.toFixed(2));
  return roundedQuantity % 1 === 0 
    ? roundedQuantity.toFixed(0) 
    : roundedQuantity.toString().replace(/\.?0+$/, '');
};

export default function InventoryGrid({ items, onItemPress }: Props) {
  const renderItem = ({ item }: { item: InventoryItem }) => (
    <TouchableOpacity 
      style={styles.itemContainer}
      onPress={() => onItemPress(item)}
    >
      <View style={styles.pixelBox}>
        <View style={styles.contentContainer}>
          <Image 
            source={FOOD_ICONS[item.icon as FoodIconType] || getFoodIcon(item.name.toLowerCase())}
            style={styles.itemIcon}
            resizeMode="contain"
            fadeDuration={0}
          />
          <Text 
            style={styles.itemName} 
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {item.name}
          </Text>
          <Text 
            style={styles.itemQuantity}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {formatQuantity(item.quantity)} {item.unit}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.$id}
        numColumns={NUM_COLUMNS}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.gridContent}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No items yet!</Text>
            <Text style={styles.emptySubtext}>Tap + to add items</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gridContent: {
    paddingBottom: 80, // Space for floating button
  },
  row: {
    justifyContent: 'flex-start',
    gap: GRID_SPACING,
    marginBottom: GRID_SPACING,
  },
  itemContainer: {
    width: ITEM_SIZE,
    aspectRatio: 1,
  },
  pixelBox: {
    flex: 1,
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 12,
    borderWidth: 3,
    borderColor: '#444',
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  itemIcon: {
    width: 40,
    height: 40,
    marginBottom: 4,
  },
  itemName: {
    color: 'white',
    fontSize: 11,
    fontFamily: 'SpaceMono',
    textAlign: 'center',
    marginTop: 2,
    paddingHorizontal: 4,
    lineHeight: 14,
  },
  itemQuantity: {
    color: '#999',
    fontSize: 10,
    fontFamily: 'SpaceMono',
    marginTop: 2,
    maxWidth: '100%',
    paddingHorizontal: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'SpaceMono',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    fontFamily: 'SpaceMono',
  },
}); 