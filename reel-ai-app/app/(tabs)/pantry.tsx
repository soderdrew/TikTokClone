import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import InventoryGrid from '../components/inventory/InventoryGrid';
import AddItemModal from '../components/modals/AddItemModal';

const { width } = Dimensions.get('window');

// Temporary mock data
const mockFridgeItems = [
  { id: '1', name: 'Milk', quantity: 2, unit: 'L', icon: 'water' },
  { id: '2', name: 'Eggs', quantity: 12, unit: 'pcs', icon: 'egg' },
  { id: '3', name: 'Cheese', quantity: 500, unit: 'g', icon: 'square' },
];

const mockPantryItems = [
  { id: '1', name: 'Rice', quantity: 2, unit: 'kg', icon: 'cube' },
  { id: '2', name: 'Pasta', quantity: 3, unit: 'packs', icon: 'square' },
  { id: '3', name: 'Flour', quantity: 1, unit: 'kg', icon: 'cube' },
];

export default function PantryScreen() {
  const router = useRouter();
  const [selectedStorage, setSelectedStorage] = useState<'fridge' | 'pantry' | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const handleItemPress = (item: any) => {
    // TODO: Show item details/edit modal
    console.log('Item pressed:', item);
  };

  const handleAddItem = (item: any) => {
    // TODO: Add item to database
    console.log('Adding item:', item);
  };

  return (
    <View style={styles.container}>
      {selectedStorage ? (
        <>
          {/* Inventory View */}
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => setSelectedStorage(null)}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.title}>
              {selectedStorage === 'fridge' ? 'Fridge' : 'Pantry'}
            </Text>
            <TouchableOpacity 
              onPress={() => setShowAddModal(true)}
              style={styles.addButton}
            >
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>

          <InventoryGrid 
            items={selectedStorage === 'fridge' ? mockFridgeItems : mockPantryItems}
            onItemPress={handleItemPress}
          />

          <AddItemModal
            visible={showAddModal}
            onClose={() => setShowAddModal(false)}
            onAdd={handleAddItem}
            location={selectedStorage}
          />
        </>
      ) : (
        <>
          {/* Storage Selection View */}
          <View style={styles.header}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>Storage Inventory</Text>
              <Text style={styles.pixelSubtitle}>Choose Your Storage</Text>
            </View>
          </View>

          <View style={styles.storageContainer}>
            <TouchableOpacity 
              style={styles.storageOption}
              onPress={() => setSelectedStorage('fridge')}
            >
              <LinearGradient
                colors={['#4a9eff', '#2d7cd1']}
                style={styles.gradientBox}
              >
                <Ionicons name="snow-outline" size={48} color="white" />
                <Text style={styles.storageText}>Fridge</Text>
                <View style={styles.pixelStars}>
                  <Text style={styles.starText}>★ ★ ★</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.storageOption}
              onPress={() => setSelectedStorage('pantry')}
            >
              <LinearGradient
                colors={['#ff4444', '#d12d2d']}
                style={styles.gradientBox}
              >
                <Ionicons name="file-tray" size={48} color="white" />
                <Text style={styles.storageText}>Pantry</Text>
                <View style={styles.pixelStars}>
                  <Text style={styles.starText}>★ ★ ★</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.pixelButton}>
              <Text style={styles.buttonText}>Add Items</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.pixelButton, styles.recipeButton]}>
              <Text style={styles.buttonText}>Find Recipes</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
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
    marginBottom: 40,
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  headerTextContainer: {
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
  },
  addButton: {
    padding: 8,
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
  storageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  storageOption: {
    width: (width - 60) / 2,
    aspectRatio: 0.8,
  },
  gradientBox: {
    flex: 1,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#333',
  },
  storageText: {
    color: 'white',
    fontSize: 20,
    fontFamily: 'SpaceMono',
    marginTop: 16,
  },
  pixelStars: {
    marginTop: 8,
  },
  starText: {
    color: '#FFD700',
    fontSize: 24,
    fontFamily: 'SpaceMono',
  },
  actionButtons: {
    gap: 16,
  },
  pixelButton: {
    backgroundColor: '#4a9eff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#2d7cd1',
  },
  recipeButton: {
    backgroundColor: '#ff4444',
    borderColor: '#d12d2d',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'SpaceMono',
  },
}); 