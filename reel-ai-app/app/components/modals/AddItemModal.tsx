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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FOOD_ICONS, getFoodIcon, FoodIconType } from '../../constants/foodIcons';
import { createInventoryItem } from '../../services/inventoryService';

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
    name: string;
    quantity: number;
    unit: string;
    icon?: string;
  }) => void;
}

export default function AddItemModal({ visible, onClose, onAdd }: Props) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [showIconSelector, setShowIconSelector] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState<FoodIconType | null>(null);
  const [autoMatchedIcon, setAutoMatchedIcon] = useState<any>(null);
  const [customUnit, setCustomUnit] = useState('');
  const [showCustomUnitInput, setShowCustomUnitInput] = useState(false);

  useEffect(() => {
    if (visible) {
      setName('');
      setQuantity('');
      setUnit('');
      setSelectedIcon(null);
      setCustomUnit('');
      setShowCustomUnitInput(false);
      setAutoMatchedIcon(null);
    }
  }, [visible]);

  useEffect(() => {
    if (name) {
      const matchedIcon = getFoodIcon(name);
      setAutoMatchedIcon(matchedIcon === FOOD_ICONS.default ? null : matchedIcon);
    }
  }, [name]);

  const handleAdd = async () => {
    if (!name || !quantity || !unit) return;

    const item = {
      name,
      quantity: parseInt(quantity),
      unit,
      icon: selectedIcon || undefined,
    };

    try {
      await createInventoryItem(item);
      onAdd(item);
      onClose();
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const handleQuantityChange = (change: number) => {
    const currentQty = parseInt(quantity) || 0;
    const newQty = Math.max(0, currentQty + change);
    setQuantity(newQty.toString());
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
                    unit === unitOption && styles.selectedUnitOption
                  ]}
                  onPress={() => setUnit(unitOption)}
                >
                  <Text style={[
                    styles.unitOptionText,
                    unit === unitOption && styles.selectedUnitOptionText
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
            onPress={() => setShowCustomUnitInput(!showCustomUnitInput)}
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
            <Text style={styles.title}>Add New Item</Text>
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
                  <Text style={styles.label}>Item Name</Text>
                  <View style={styles.nameInputContainer}>
                    <TextInput
                      style={[styles.input, styles.nameInput]}
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
                </View>

                {/* Quantity Controls */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Quantity</Text>
                  <View style={styles.quantityContainer}>
                    <TouchableOpacity 
                      style={styles.quantityButton}
                      onPress={() => handleQuantityChange(-1)}
                    >
                      <Ionicons name="remove" size={24} color="white" />
                    </TouchableOpacity>
                    
                    <TextInput
                      style={[styles.input, styles.quantityInput]}
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
                </View>

                {/* Unit Selector */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Unit</Text>
                  {renderUnitSelector()}
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
}); 