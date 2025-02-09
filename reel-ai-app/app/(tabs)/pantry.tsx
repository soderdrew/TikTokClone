import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import InventoryGrid from '../components/inventory/InventoryGrid';
import AddItemModal from '../components/modals/AddItemModal';
import EditItemModal from '../components/modals/EditItemModal';
import { getInventoryItems, deleteInventoryItem } from '../services/inventoryService';

const { width } = Dimensions.get('window');

// Temporary mock data
const mockKitchenItems = [
  { id: '1', name: 'Milk', quantity: 2, unit: 'L' },
  { id: '2', name: 'Eggs', quantity: 12, unit: 'pcs' },
  { id: '3', name: 'Cheese', quantity: 500, unit: 'g' },
  { id: '4', name: 'Rice', quantity: 2, unit: 'kg' },
  { id: '5', name: 'Pasta', quantity: 3, unit: 'packs' },
  { id: '6', name: 'Flour', quantity: 1, unit: 'kg' },
  { id: '7', name: 'Sugar', quantity: 500, unit: 'g' },
  { id: '8', name: 'Bread', quantity: 2, unit: 'loaves' },
  { id: '9', name: 'Tomato Sauce Chef Boyardeez Nuts', quantity: 3, unit: 'cans' },
];

export default function PantryScreen() {
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [kitchenItems, setKitchenItems] = useState<any[]>([]);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const items = await getInventoryItems();
        console.log('Fetched items:', items);
        setKitchenItems(items);
      } catch (error) {
        console.error('Error fetching items:', error);
      }
    };
    fetchItems();
  }, []);

  const handleItemPress = (item: any) => {
    console.log('Selected item:', item);
    setSelectedItem(item);
    setShowEditModal(true);
  };

  const handleAddItem = (item: any) => {
    setKitchenItems((prevItems) => [...prevItems, item]);
  };

  const handleEditItem = (editedItem: any) => {
    setKitchenItems((prevItems) =>
      prevItems.map((item) =>
        item.$id === editedItem.$id ? { ...item, ...editedItem } : item
      )
    );
    console.log('Editing item:', editedItem);
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      console.log('Attempting to delete item with ID:', itemId);
      await deleteInventoryItem(itemId);
      setKitchenItems((prevItems) => prevItems.filter(item => item.$id !== itemId));
      console.log('Deleted item:', itemId);
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Kitchen Ingredients</Text>
          <Text style={styles.pixelSubtitle}>Your Available Items</Text>
        </View>
      </View>

      <View style={styles.contentContainer}>
        {kitchenItems.length === 0 ? (
          <Text style={styles.emptyMessage}>No ingredients available. Add some items!</Text>
        ) : (
          <InventoryGrid 
            items={kitchenItems}
            onItemPress={handleItemPress}
          />
        )}

        <TouchableOpacity 
          style={styles.floatingAddButton}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={32} color="white" />
        </TouchableOpacity>

        <AddItemModal
          visible={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddItem}
        />

        {selectedItem && (
          <EditItemModal
            visible={showEditModal}
            onClose={() => {
              setShowEditModal(false);
              setSelectedItem(null);
            }}
            onSave={handleEditItem}
            onDelete={handleDeleteItem}
            item={selectedItem}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 20,
  },
  header: {
    marginTop: 60,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  headerTextContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    color: 'white',
    fontFamily: 'SpaceMono',
    marginBottom: 8,
    textAlign: 'center',
  },
  pixelSubtitle: {
    fontSize: 16,
    color: '#4a9eff',
    fontFamily: 'SpaceMono',
    textAlign: 'center',
  },
  contentContainer: {
    flex: 1,
    position: 'relative',
  },
  floatingAddButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#4a9eff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#2d7cd1',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  emptyMessage: {
    color: '#999',
    fontSize: 16,
    fontFamily: 'SpaceMono',
    textAlign: 'center',
    marginTop: 20,
  },
}); 