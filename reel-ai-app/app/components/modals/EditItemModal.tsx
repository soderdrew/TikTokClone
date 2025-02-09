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
import { updateInventoryItem } from '../../services/inventoryService';

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
  onSave: (item: {
    name: string;
    quantity: number;
    unit: string;
    customIcon?: string;
    icon?: string;
  }) => void;
  onDelete: (id: string) => void;
  item: {
    $id: string;
    name: string;
    quantity: number;
    unit: string;
    icon?: string;
  };
}

export default function EditItemModal({ visible, onClose, onSave, onDelete, item }: Props) {
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantity.toString());
  const [unit, setUnit] = useState(item.unit);
  const [showIconSelector, setShowIconSelector] = useState(false);
  const [showUnitSelector, setShowUnitSelector] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState<FoodIconType | null>(item.icon as FoodIconType || null);
  const [autoMatchedIcon, setAutoMatchedIcon] = useState<any>(null);
  const [customUnit, setCustomUnit] = useState('');
  const [showCustomUnitInput, setShowCustomUnitInput] = useState(false);

  // Reset state when modal opens with new item
  useEffect(() => {
    if (visible) {
      setName(item.name);
      setQuantity(item.quantity.toString());
      setUnit(item.unit);
      setSelectedIcon(item.icon as FoodIconType || null);
      setCustomUnit('');
      setShowCustomUnitInput(false);
      const matchedIcon = getFoodIcon(item.name);
      setAutoMatchedIcon(matchedIcon === FOOD_ICONS.default ? null : matchedIcon);
      console.log('EditItemModal opened with item:', item);
    }
  }, [visible, item]);

  const handleSave = async () => {
    if (!name || !quantity || !unit) return;

    const updatedItem = {
      $id: item.$id,
      name,
      quantity: parseInt(quantity),
      unit,
      icon: selectedIcon || autoMatchedIcon || undefined,
    };

    try {
      console.log('Saving item:', updatedItem);
      console.log('Updating item with ID:', item.$id);
      await updateInventoryItem(item.$id, updatedItem);
      onSave(updatedItem);
      onClose();
    } catch (error) {
      console.error('Error updating item:', error);
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
            <Text style={styles.title}>Edit Item</Text>
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
                    {(autoMatchedIcon || selectedIcon) && (
                      <Image
                        source={selectedIcon ? FOOD_ICONS[selectedIcon] : autoMatchedIcon}
                        style={styles.autoIcon}
                        resizeMode="contain"
                        fadeDuration={0}
                      />
                    )}
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

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => {
                      onDelete(item.$id);
                      onClose();
                    }}
                  >
                    <Text style={styles.deleteButtonText}>Delete Item</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[
                      styles.saveButton,
                      (!name || !quantity || !unit) && styles.saveButtonDisabled
                    ]}
                    onPress={handleSave}
                    disabled={!name || !quantity || !unit}
                  >
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </TouchableOpacity>
                </View>
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
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#d12d2d',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ff4444',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'SpaceMono',
    textAlign: 'center',
  },
  saveButton: {
    flex: 2,
    backgroundColor: '#4a9eff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#2d7cd1',
  },
  saveButtonDisabled: {
    backgroundColor: '#333',
    borderColor: '#444',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'SpaceMono',
    textAlign: 'center',
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