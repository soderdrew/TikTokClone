import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FOOD_ICONS, getFoodIcon, FoodIconType } from '../../constants/foodIcons';
import { createInventoryItem, getInventoryItems, updateInventoryItem } from '../../services/inventoryService';
import { AudioService } from '../../services/audioService';

// Common units for food items
const UNITS = {
  VOLUME: ['ml', 'L', 'cups', 'tbsp', 'tsp'],
  WEIGHT: ['g', 'kg', 'oz', 'lbs'],
  COUNT: ['pcs', 'pack', 'box', 'can', 'bottle'],
  OTHER: ['bunch', 'slice', 'loaf', 'dozen'],
} as const;

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdd: (item: {
    $id?: string;
    name: string;
    quantity: number;
    unit: string;
    icon?: string;
  }, isUpdate?: boolean) => void;
  onBack: () => void;
}

// Add type definition for inventory items
interface InventoryItem {
  $id: string;
  name: string;
  quantity: number;
  unit: string;
  icon?: string;
}

// Helper function to clean item for update
const cleanItemForUpdate = (item: InventoryItem) => {
  const { name, quantity, unit, icon } = item;
  return { name, quantity, unit, icon };
};

export default function AddItemModal({ visible, onClose, onAdd, onBack }: Props) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [showIconSelector, setShowIconSelector] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState<FoodIconType | null>(null);
  const [autoMatchedIcon, setAutoMatchedIcon] = useState<any>(null);
  const [customUnit, setCustomUnit] = useState('');
  const [showCustomUnitInput, setShowCustomUnitInput] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  // Use useRef to persist the AudioService instance
  const audioService = React.useRef(new AudioService()).current;

  useEffect(() => {
    if (visible) {
      setName('');
      setQuantity('');
      setUnit('');
      setSelectedIcon(null);
      setCustomUnit('');
      setShowCustomUnitInput(false);
      setAutoMatchedIcon(null);
      setHasAttemptedSubmit(false);
    }
  }, [visible]);

  useEffect(() => {
    if (name) {
      const matchedIcon = getFoodIcon(name);
      setAutoMatchedIcon(matchedIcon === FOOD_ICONS.default ? null : matchedIcon);
    }
  }, [name]);

  const handleAdd = async () => {
    setHasAttemptedSubmit(true);
    if (!name || !quantity || !unit) return;

    const item = {
      name,
      quantity: parseFloat(quantity),
      unit,
      icon: (selectedIcon || autoMatchedIcon) ? 
        (selectedIcon || getFoodIcon(name.toLowerCase())) : 
        undefined,
    };

    try {
      // Get all inventory items to check for duplicates
      const allItems = await getInventoryItems();
      
      // Find existing item with same name and convertible units
      const existingItem = allItems.find(existing => 
        existing.name.toLowerCase().trim() === item.name.toLowerCase().trim()
      ) as InventoryItem | undefined;

      if (existingItem) {
        // Create a message for the alert
        const message = existingItem.unit.toLowerCase() !== item.unit.toLowerCase()
          ? `There's already ${existingItem.name} with ${existingItem.quantity} ${existingItem.unit}. Would you like to keep this as a separate entry or combine them?`
          : `There's already ${existingItem.name} with ${existingItem.quantity} ${existingItem.unit}. Would you like to combine with your new quantity of ${item.quantity} ${item.unit}?`;

        // Show alert and wait for user choice
        new Promise((resolve) => {
          Alert.alert(
            existingItem.unit.toLowerCase() !== item.unit.toLowerCase() ? "Different Units" : "Combine Items",
            message,
            [
              {
                text: "Keep Separate",
                style: "cancel",
                onPress: async () => {
                  try {
                    const newItemDoc = await createInventoryItem(item);
                    onAdd({ ...item, $id: newItemDoc.$id });
                    onClose();
                    resolve(null);
                  } catch (error) {
                    console.error('Error creating separate item:', error);
                    Alert.alert('Error', 'Failed to add item. Please try again.');
                    resolve(null);
                  }
                }
              },
              {
                text: "Combine",
                style: "default",
                onPress: async () => {
                  try {
                    const updatedItem: InventoryItem = {
                      ...existingItem,
                      quantity: existingItem.quantity + item.quantity
                    };
                    await updateInventoryItem(existingItem.$id, cleanItemForUpdate(updatedItem));
                    // Call onAdd with isUpdate=true to refresh the UI
                    onAdd(updatedItem, true);
                    onClose();
                    resolve(null);
                  } catch (error) {
                    console.error('Error updating combined item:', error);
                    Alert.alert('Error', 'Failed to combine items. Please try again.');
                    resolve(null);
                  }
                }
              }
            ]
          );
        });
      } else {
        // No existing item found, create new one
        const newItemDoc = await createInventoryItem(item);
        onAdd({ ...item, $id: newItemDoc.$id });
        onClose();
      }
    } catch (error) {
      console.error('Error adding item:', error);
      Alert.alert('Error', 'Failed to add item. Please try again.');
    }
  };

  const handleQuantityChange = (change: number) => {
    const currentQty = parseFloat(quantity) || 0;
    const newQty = Math.max(0, Number((currentQty + change).toFixed(1)));
    setQuantity(newQty.toString());
  };

  const startRecording = async () => {
    try {
      if (isRecording) {
        console.log('Already recording, ignoring start request');
        return;
      }
      console.log('Starting recording...');
      setIsRecording(true);
      const success = await audioService.startRecording();
      if (!success) {
        setIsRecording(false);
      }
    } catch (error) {
      console.error('Failed to start recording:', error);
      setIsRecording(false);
    }
  };

  // Add cleanup effect
  useEffect(() => {
    let mounted = true;
    return () => {
      mounted = false;
      // Only cleanup if we're still recording when unmounting
      if (isRecording) {
        audioService.stopRecording().catch(console.error);
      }
    };
  }, []);

  const stopRecording = async () => {
    let audioUri: string | null = null;
    try {
      if (!isRecording) {
        console.log('Not recording, ignoring stop request');
        return;
      }

      console.log('Stopping recording...');
      setIsRecording(false); // Set this first to prevent double-stops
      audioUri = await audioService.stopRecording();
      
      if (audioUri) {
        setIsTranscribing(true);
        console.log('Transcribing audio...');
        try {
          const { text, items } = await audioService.transcribeAudio(audioUri);
          if (items && items.length > 0) {
            // Use the first item from the structured response
            const firstItem = items[0];
            setName(firstItem.name);
            setQuantity(firstItem.quantity.toString());
            setUnit(firstItem.unit);
          } else if (text) {
            // Fallback to using raw text if no structured items
            setName(text);
          } else {
            console.log('No transcription received');
          }
        } catch (transcriptionError) {
          console.error('Transcription failed:', transcriptionError);
          Alert.alert(
            'Transcription Failed',
            'Failed to transcribe the audio. Please try again.'
          );
        }
      }
    } catch (error) {
      console.error('Failed to process recording:', error);
      Alert.alert(
        'Recording Failed',
        'Failed to process the recording. Please try again.'
      );
    } finally {
      setIsRecording(false);
      setIsTranscribing(false);
    }
  };

  const handleRecordPress = async () => {
    try {
      if (isRecording) {
        await stopRecording();
      } else {
        await startRecording();
      }
    } catch (error) {
      console.error('Error handling record press:', error);
      setIsRecording(false);
      setIsTranscribing(false);
      Alert.alert(
        'Recording Error',
        'An error occurred while recording. Please try again.'
      );
    }
  };

  const renderIconSelector = () => {
    const iconEntries = Object.entries(FOOD_ICONS).filter(([key]) => key !== 'default') as [FoodIconType, any][];

    return (
      <View style={styles.iconSelectorContainer}>
        <Text style={styles.label}>Choose an Icon</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.iconGrid}
        >
          {iconEntries.map(([key, icon]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.iconOption,
                selectedIcon === key && styles.selectedIconOption
              ]}
              onPress={() => setSelectedIcon(key)}
            >
              <Image
                source={icon}
                style={styles.iconPreview}
                resizeMode="contain"
                fadeDuration={0}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderUnitSelector = () => {
    return (
      <View style={styles.unitSelectorContainer}>
        {Object.entries(UNITS).map(([category, units]) => (
          <View key={category} style={styles.unitCategory}>
            <Text style={styles.unitCategoryTitle}>{category}</Text>
            <View style={styles.unitGrid}>
              {units.map((unitOption) => (
                <TouchableOpacity
                  key={unitOption}
                  style={[
                    styles.unitOption,
                    unit === unitOption && !showCustomUnitInput && styles.selectedUnitOption
                  ]}
                  onPress={() => {
                    setUnit(unitOption);
                    setCustomUnit('');
                    setShowCustomUnitInput(false);
                  }}
                >
                  <Text style={[
                    styles.unitOptionText,
                    unit === unitOption && !showCustomUnitInput && styles.selectedUnitOptionText
                  ]}>
                    {unitOption}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.customUnitContainer}>
          <TouchableOpacity
            style={[
              styles.customUnitButton,
              showCustomUnitInput && styles.selectedUnitOption
            ]}
            onPress={() => {
              setShowCustomUnitInput(!showCustomUnitInput);
              setUnit(''); // Clear any selected predefined unit
              if (!showCustomUnitInput) {
                setCustomUnit('');
              }
            }}
          >
            <Text style={[
              styles.unitOptionText,
              showCustomUnitInput && styles.selectedUnitOptionText
            ]}>
              Custom Unit
            </Text>
          </TouchableOpacity>

          {showCustomUnitInput && (
            <View style={styles.customUnitInputContainer}>
              <TextInput
                style={[styles.input, styles.customUnitInput]}
                value={customUnit}
                onChangeText={(text) => {
                  setCustomUnit(text);
                  setUnit(text);
                }}
                placeholder="Enter custom unit"
                placeholderTextColor="#666"
              />
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={onBack} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <Text style={styles.title}>Add New Item</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingView}
          >
            <ScrollView 
              style={styles.scrollContainer}
              contentContainerStyle={styles.scrollContentContainer}
            >
              <View style={styles.form}>
                {/* Name Input */}
                <View style={styles.inputContainer}>
                  <View style={styles.labelContainer}>
                    <Text style={styles.label}>Item Name</Text>
                    <Text style={styles.requiredAsterisk}>*</Text>
                  </View>
                  <View style={styles.nameInputContainer}>
                    <TextInput
                      style={[
                        styles.input, 
                        styles.nameInput,
                        hasAttemptedSubmit && !name && styles.inputError
                      ]}
                      value={name}
                      onChangeText={setName}
                      placeholder="Enter item name"
                      placeholderTextColor="#666"
                    />
                    <Image
                      source={selectedIcon ? FOOD_ICONS[selectedIcon] : (autoMatchedIcon || FOOD_ICONS.default)}
                      style={styles.autoIcon}
                      resizeMode="contain"
                      fadeDuration={0}
                    />
                  </View>
                  {hasAttemptedSubmit && !name && <Text style={styles.validationText}>Name is required</Text>}
                </View>

                {/* Quantity Controls */}
                <View style={styles.inputContainer}>
                  <View style={styles.labelContainer}>
                    <Text style={styles.label}>Quantity</Text>
                    <Text style={styles.requiredAsterisk}>*</Text>
                  </View>
                  <View style={styles.quantityContainer}>
                    <TouchableOpacity 
                      style={styles.quantityButton}
                      onPress={() => handleQuantityChange(-1)}
                    >
                      <Ionicons name="remove" size={24} color="white" />
                    </TouchableOpacity>
                    
                    <TextInput
                      style={[
                        styles.input, 
                        styles.quantityInput,
                        hasAttemptedSubmit && !quantity && styles.inputError
                      ]}
                      value={quantity}
                      onChangeText={setQuantity}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="#666"
                    />

                    <TouchableOpacity 
                      style={styles.quantityButton}
                      onPress={() => handleQuantityChange(1)}
                    >
                      <Ionicons name="add" size={24} color="white" />
                    </TouchableOpacity>
                  </View>
                  {hasAttemptedSubmit && !quantity && <Text style={styles.validationText}>Quantity is required</Text>}
                </View>

                {/* Unit Selector */}
                <View style={styles.inputContainer}>
                  <View style={styles.labelContainer}>
                    <Text style={styles.label}>Unit</Text>
                    <Text style={styles.requiredAsterisk}>*</Text>
                  </View>
                  {renderUnitSelector()}
                  {hasAttemptedSubmit && !unit && <Text style={styles.validationText}>Unit is required</Text>}
                </View>

                {/* Icon Selector */}
                <TouchableOpacity
                  style={styles.iconSelectorButton}
                  onPress={() => setShowIconSelector(!showIconSelector)}
                >
                  <View style={styles.iconSelectorContent}>
                    <Image
                      source={selectedIcon ? FOOD_ICONS[selectedIcon] : (autoMatchedIcon || FOOD_ICONS.default)}
                      style={styles.iconSelectorPreview}
                      resizeMode="contain"
                      fadeDuration={0}
                    />
                    <Text style={styles.iconSelectorButtonText}>
                      {showIconSelector ? 'Hide Icon Selector' : 'Change Icon'}
                    </Text>
                  </View>
                  <Ionicons 
                    name={showIconSelector ? 'chevron-up' : 'chevron-down'} 
                    size={20} 
                    color="white" 
                  />
                </TouchableOpacity>

                {showIconSelector && renderIconSelector()}

                {/* Add Button */}
                <TouchableOpacity 
                  style={[
                    styles.addButton,
                    (!name || !quantity || !unit) && styles.addButtonDisabled
                  ]}
                  onPress={handleAdd}
                  disabled={!name || !quantity || !unit}
                >
                  <Text style={styles.addButtonText}>Add Item</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  content: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    marginTop: 60,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 3,
    borderColor: '#333',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 24,
    color: 'white',
    fontFamily: 'SpaceMono',
  },
  closeButton: {
    padding: 8,
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    gap: 8,
  },
  nameInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameInput: {
    flex: 1,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityInput: {
    flex: 1,
    textAlign: 'center',
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#4a9eff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#2d7cd1',
  },
  autoIcon: {
    width: 28,
    height: 28,
    marginLeft: 4,
  },
  label: {
    color: '#999',
    fontSize: 14,
    fontFamily: 'SpaceMono',
    flexDirection: 'row',
    alignItems: 'center',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  requiredAsterisk: {
    color: '#ff4444',
    fontSize: 14,
    fontFamily: 'SpaceMono',
  },
  validationText: {
    color: '#ff4444',
    fontSize: 12,
    fontFamily: 'SpaceMono',
    marginTop: 4,
  },
  input: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 12,
    color: 'white',
    fontFamily: 'SpaceMono',
    borderWidth: 2,
    borderColor: '#444',
  },
  inputError: {
    borderColor: '#ff4444',
  },
  iconSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 12,
    borderWidth: 2,
    borderColor: '#444',
  },
  iconSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconSelectorPreview: {
    width: 24,
    height: 24,
  },
  iconSelectorButtonText: {
    color: 'white',
    fontFamily: 'SpaceMono',
    fontSize: 14,
  },
  iconSelectorContainer: {
    gap: 8,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 8,
    paddingVertical: 8,
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#333',
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#444',
  },
  selectedIconOption: {
    borderColor: '#4a9eff',
    backgroundColor: '#2d7cd1',
  },
  iconPreview: {
    width: 32,
    height: 32,
  },
  addButton: {
    backgroundColor: '#4a9eff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 3,
    borderColor: '#2d7cd1',
  },
  addButtonDisabled: {
    backgroundColor: '#333',
    borderColor: '#444',
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'SpaceMono',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 20,
    paddingTop: 12,
  },
  unitSelectorContainer: {
    gap: 16,
  },
  unitCategory: {
    gap: 8,
  },
  unitCategoryTitle: {
    color: '#999',
    fontSize: 12,
    fontFamily: 'SpaceMono',
    textTransform: 'uppercase',
  },
  unitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  unitOption: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 8,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: '#444',
    minWidth: 60,
  },
  selectedUnitOption: {
    borderColor: '#4a9eff',
    backgroundColor: '#2d7cd1',
  },
  unitOptionText: {
    color: 'white',
    fontFamily: 'SpaceMono',
    fontSize: 12,
    textAlign: 'center',
  },
  selectedUnitOptionText: {
    color: 'white',
  },
  customUnitContainer: {
    gap: 8,
    marginTop: 8,
  },
  customUnitButton: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 8,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: '#444',
    alignSelf: 'flex-start',
  },
  customUnitInputContainer: {
    width: '100%',
  },
  customUnitInput: {
    width: '100%',
  },
  backButton: {
    padding: 8,
  },
}); 