import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, TextInput, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import InventoryGrid from '../components/inventory/InventoryGrid';
import AddItemModal from '../components/modals/AddItemModal';
import EditItemModal from '../components/modals/EditItemModal';
import VoiceItemsModal from '../components/modals/VoiceItemsModal';
import { getInventoryItems, deleteInventoryItem, updateInventoryItem, createInventoryItem } from '../services/inventoryService';

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

// Unit conversion groups
type UnitGroup = 'VOLUME' | 'WEIGHT' | 'COUNT';
type UnitMap = Record<UnitGroup, string[]>;

// Define types for unit conversions
interface ConversionMap {
  [key: string]: number;
}

interface UnitConversions {
  VOLUME: ConversionMap;
  WEIGHT: ConversionMap;
}

const CONVERTIBLE_UNITS: UnitMap = {
  VOLUME: ['ml', 'L', 'cups', 'tbsp', 'tsp', 'gal', 'gallons', 'gallon'],
  WEIGHT: ['g', 'kg', 'oz', 'lbs', 'pound', 'pounds'],
  COUNT: ['pcs', 'pack', 'box', 'can', 'bottle', 'piece', 'pieces'],
};

// Unit conversion ratios (to base unit)
const UNIT_CONVERSIONS: UnitConversions = {
  VOLUME: {
    // Convert everything to milliliters (mL) as base unit
    'ml': 1,
    'l': 1000,
    'cups': 236.588,
    'tbsp': 14.787,
    'tsp': 4.929,
    'gal': 3785.41,
    'gallons': 3785.41,
    'gallon': 3785.41
  },
  WEIGHT: {
    // Convert everything to grams (g) as base unit
    'g': 1,
    'kg': 1000,
    'oz': 28.3495,
    'lbs': 453.592,
    'pound': 453.592,
    'pounds': 453.592
  }
};

// Helper function to check if units are in the same conversion group
const areUnitsConvertible = (unit1: string, unit2: string): boolean => {
  const normalizedUnit1 = unit1.toLowerCase();
  const normalizedUnit2 = unit2.toLowerCase();
  
  // Check if units are exactly the same
  if (normalizedUnit1 === normalizedUnit2) return true;
  
  // Check if units are in the same conversion group
  return Object.values(CONVERTIBLE_UNITS).some(group => 
    group.includes(normalizedUnit1) && group.includes(normalizedUnit2)
  );
};

// Helper function to clean item data for database updates
const cleanItemForUpdate = (item: any) => {
  const { $id, $createdAt, $updatedAt, $permissions, $collectionId, $databaseId, ...cleanItem } = item;
  return cleanItem;
};

// Helper function to convert quantity between units
const convertQuantity = (quantity: number, fromUnit: string, toUnit: string): number => {
  // Normalize units to lowercase
  const from = fromUnit.toLowerCase();
  const to = toUnit.toLowerCase();
  
  // If units are the same, no conversion needed
  if (from === to) return quantity;
  
  // Find which group these units belong to
  let conversionGroup: keyof UnitConversions | null = null;
  for (const [group, units] of Object.entries(CONVERTIBLE_UNITS)) {
    if (units.includes(from) && units.includes(to)) {
      if (group === 'VOLUME' || group === 'WEIGHT') {
        conversionGroup = group;
      }
      break;
    }
  }
  
  // If no conversion group found or units are COUNT type, return original quantity
  if (!conversionGroup) return quantity;
  
  const conversions = UNIT_CONVERSIONS[conversionGroup];
  if (!(from in conversions) || !(to in conversions)) return quantity;
  
  // Convert to base unit, then to target unit
  const baseValue = quantity * conversions[from];
  return baseValue / conversions[to];
};

// Helper function to format quantity for display
const formatQuantity = (quantity: number): string => {
  // Always round to 2 decimal places, then remove unnecessary trailing zeros
  const roundedQuantity = Number(quantity.toFixed(2));
  return roundedQuantity % 1 === 0 
    ? roundedQuantity.toFixed(0) 
    : roundedQuantity.toString().replace(/\.?0+$/, '');
};

export default function PantryScreen() {
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showInputTypeModal, setShowInputTypeModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [kitchenItems, setKitchenItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

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

  const findMatchingItem = (newItem: any) => {
    return kitchenItems.findIndex(existing => 
      // Normalize names by converting to lowercase and trimming
      existing.name.toLowerCase().trim() === newItem.name.toLowerCase().trim() &&
      areUnitsConvertible(existing.unit, newItem.unit)
    );
  };

  const handleAddItems = async (items: any[]) => {
    try {
      // Process each item sequentially
      for (const item of items) {
        const existingItemIndex = findMatchingItem(item);

        if (existingItemIndex !== -1) {
          const existingItem = kitchenItems[existingItemIndex];
          
          // If units are different, ask user to confirm combination
          if (existingItem.unit.toLowerCase() !== item.unit.toLowerCase()) {
            // Calculate converted quantity for display
            const convertedQuantity = convertQuantity(
              item.quantity,
              item.unit,
              existingItem.unit
            );
            
            // Show alert and wait for user response
            await new Promise((resolve) => {
              Alert.alert(
                "Different Units",
                `There's already ${existingItem.name} with ${formatQuantity(existingItem.quantity)} ${existingItem.unit}. ` +
                `Adding ${formatQuantity(item.quantity)} ${item.unit} (≈ ${formatQuantity(convertedQuantity)} ${existingItem.unit}). ` +
                `Would you like to keep this as a separate entry?`,
                [
                  {
                    text: "Keep Separate",
                    style: "cancel",
                    onPress: () => {
                      setKitchenItems(prev => [...prev, item]);
                      resolve(null);
                    }
                  },
                  {
                    text: "Convert & Combine",
                    style: "default",
                    onPress: async () => {
                      const updatedItem = {
                        ...existingItem,
                        quantity: existingItem.quantity + convertedQuantity
                      };
                      await updateInventoryItem(existingItem.$id, cleanItemForUpdate(updatedItem));
                      setKitchenItems(prev => 
                        prev.map((prevItem, index) => 
                          index === existingItemIndex ? updatedItem : prevItem
                        )
                      );
                      resolve(null);
                    }
                  }
                ]
              );
            });
          } else {
            // Same units, combine directly
            const updatedItem = {
              ...existingItem,
              quantity: existingItem.quantity + item.quantity
            };
            await updateInventoryItem(existingItem.$id, cleanItemForUpdate(updatedItem));
            setKitchenItems(prev => 
              prev.map((prevItem, index) => 
                index === existingItemIndex ? updatedItem : prevItem
              )
            );
          }
        } else {
          // Add as new item
          setKitchenItems(prev => [...prev, item]);
        }
      }
    } catch (error) {
      console.error('Error processing items:', error);
      Alert.alert('Error', 'Failed to add some items. Please try again.');
    }
  };

  const handleAddItem = async (item: any, isUpdate: boolean = false) => {
    try {
      if (isUpdate) {
        // For updates, just update the state with the new item
        setKitchenItems(prev => 
          prev.map(existing => 
            existing.$id === item.$id ? item : existing
          )
        );
      } else {
        // For new items, check for duplicates and handle combining
        const existingItemIndex = findMatchingItem(item);
        
        if (existingItemIndex !== -1) {
          const existingItem = kitchenItems[existingItemIndex];
          
          // If units are different, ask user to confirm combination
          if (existingItem.unit.toLowerCase() !== item.unit.toLowerCase()) {
            // Calculate converted quantity for display
            const convertedQuantity = convertQuantity(
              item.quantity,
              item.unit,
              existingItem.unit
            );
            
            // Show alert and wait for user response
            await new Promise((resolve) => {
              Alert.alert(
                "Different Units",
                `There's already ${existingItem.name} with ${formatQuantity(existingItem.quantity)} ${existingItem.unit}. ` +
                `Adding ${formatQuantity(item.quantity)} ${item.unit} (≈ ${formatQuantity(convertedQuantity)} ${existingItem.unit}). ` +
                `Would you like to keep this as a separate entry?`,
                [
                  {
                    text: "Keep Separate",
                    style: "cancel",
                    onPress: () => {
                      setKitchenItems(prev => [...prev, item]);
                      resolve(null);
                    }
                  },
                  {
                    text: "Convert & Combine",
                    style: "default",
                    onPress: async () => {
                      const updatedItem = {
                        ...existingItem,
                        quantity: existingItem.quantity + convertedQuantity
                      };
                      await updateInventoryItem(existingItem.$id, cleanItemForUpdate(updatedItem));
                      setKitchenItems(prev => 
                        prev.map((prevItem, index) => 
                          index === existingItemIndex ? updatedItem : prevItem
                        )
                      );
                      resolve(null);
                    }
                  }
                ]
              );
            });
          } else {
            // Same units, combine directly
            const updatedItem = {
              ...existingItem,
              quantity: existingItem.quantity + item.quantity
            };
            await updateInventoryItem(existingItem.$id, cleanItemForUpdate(updatedItem));
            setKitchenItems(prev => 
              prev.map((prevItem, index) => 
                index === existingItemIndex ? updatedItem : prevItem
              )
            );
          }
        } else {
          // Add as new item
          setKitchenItems(prev => [...prev, item]);
        }
      }
    } catch (error) {
      console.error('Error adding item:', error);
      Alert.alert('Error', 'Failed to add item. Please try again.');
    }
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

  // Filter items based on search query
  const filteredItems = kitchenItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleBackToInputType = () => {
    setShowAddModal(false);
    setShowVoiceModal(false);
    setShowInputTypeModal(true);
  };

  const renderInputTypeModal = () => (
    <Modal
      visible={showInputTypeModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowInputTypeModal(false)}
    >
      <TouchableOpacity 
        style={styles.inputTypeModalContainer}
        activeOpacity={1}
        onPress={() => setShowInputTypeModal(false)}
      >
        <TouchableOpacity 
          style={styles.inputTypeContent}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={styles.inputTypeTitle}>Add Items</Text>
          
          <TouchableOpacity 
            style={styles.inputTypeOption}
            onPress={() => {
              setShowInputTypeModal(false);
              setShowAddModal(true);
            }}
          >
            <Ionicons name="create-outline" size={32} color="white" />
            <Text style={styles.inputTypeText}>Manual Entry</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.inputTypeOption}
            onPress={() => {
              setShowInputTypeModal(false);
              setShowVoiceModal(true);
            }}
          >
            <Ionicons name="mic-outline" size={32} color="white" />
            <Text style={styles.inputTypeText}>Voice Input</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => setShowInputTypeModal(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Kitchen Ingredients</Text>
          <Text style={styles.pixelSubtitle}>Your Available Items</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search ingredients..."
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery !== '' && (
          <TouchableOpacity 
            onPress={() => setSearchQuery('')}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.contentContainer}>
        {filteredItems.length === 0 ? (
          <Text style={styles.emptyMessage}>
            {searchQuery ? 'No matching ingredients found' : 'No ingredients available. Add some items!'}
          </Text>
        ) : (
          <InventoryGrid 
            items={filteredItems}
            onItemPress={handleItemPress}
          />
        )}

        <TouchableOpacity 
          style={styles.floatingAddButton}
          onPress={() => setShowInputTypeModal(true)}
        >
          <Ionicons name="add" size={32} color="white" />
        </TouchableOpacity>

        {renderInputTypeModal()}

        <AddItemModal
          visible={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddItem}
          onBack={handleBackToInputType}
        />

        <VoiceItemsModal
          visible={showVoiceModal}
          onClose={() => setShowVoiceModal(false)}
          onAddItems={handleAddItems}
          onBack={handleBackToInputType}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: '#444',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: 'white',
    fontFamily: 'SpaceMono',
    fontSize: 14,
    paddingVertical: 12,
  },
  clearButton: {
    padding: 4,
  },
  inputTypeModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  inputTypeContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    borderWidth: 3,
    borderColor: '#333',
    gap: 16,
  },
  inputTypeTitle: {
    fontSize: 24,
    color: 'white',
    fontFamily: 'SpaceMono',
    textAlign: 'center',
    marginBottom: 8,
  },
  inputTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    padding: 16,
    borderRadius: 12,
    gap: 16,
    borderWidth: 2,
    borderColor: '#444',
  },
  inputTypeText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'SpaceMono',
  },
  cancelButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#999',
    fontSize: 16,
    fontFamily: 'SpaceMono',
  },
}); 