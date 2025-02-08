import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const GRID_SPACING = 12;
const NUM_COLUMNS = 4;
const ITEM_SIZE = (width - 40 - (GRID_SPACING * (NUM_COLUMNS - 1))) / NUM_COLUMNS;

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  icon: string;
}

interface Props {
  items: InventoryItem[];
  onItemPress: (item: InventoryItem) => void;
}

export default function InventoryGrid({ items, onItemPress }: Props) {
  const renderItem = ({ item }: { item: InventoryItem }) => (
    <TouchableOpacity 
      style={styles.itemContainer}
      onPress={() => onItemPress(item)}
    >
      <View style={styles.pixelBox}>
        <Ionicons name={item.icon as any} size={24} color="#fff" />
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemQuantity}>{item.quantity} {item.unit}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={NUM_COLUMNS}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
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
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#444',
  },
  itemName: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'SpaceMono',
    textAlign: 'center',
    marginTop: 4,
  },
  itemQuantity: {
    color: '#999',
    fontSize: 10,
    fontFamily: 'SpaceMono',
    marginTop: 2,
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