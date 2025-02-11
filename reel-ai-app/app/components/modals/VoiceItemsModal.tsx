import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FOOD_ICONS, getFoodIcon, FoodIconType } from '../../constants/foodIcons';
import { AudioService } from '../../services/audioService';
import { createInventoryItem } from '../../services/inventoryService';
import EditItemModal from './EditItemModal';

const { width } = Dimensions.get('window');

interface TranscribedItem {
  name: string;
  quantity: number;
  unit: string;
  icon?: string;
  $id?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onAddItems: (items: TranscribedItem[]) => void;
  onBack: () => void;
}

export default function VoiceItemsModal({ visible, onClose, onAddItems, onBack }: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingItems, setDeletingItems] = useState<Set<string>>(new Set());
  const [transcribedItems, setTranscribedItems] = useState<TranscribedItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<TranscribedItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Use useRef to persist the AudioService instance
  const audioService = React.useRef(new AudioService()).current;

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
  React.useEffect(() => {
    let mounted = true;
    return () => {
      mounted = false;
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
            const newItems = items.map(item => ({
              ...item,
              // Make icon mapping case-insensitive
              icon: getFoodIcon(item.name.toLowerCase()),
            }));
            setTranscribedItems(prev => [...prev, ...newItems]);
          } else if (text && text.trim()) {
            // Fallback to simple item if no structured items
            const newItem: TranscribedItem = {
              name: text.trim(),
              quantity: 1,
              unit: 'pcs',
              // Make icon mapping case-insensitive
              icon: getFoodIcon(text.trim().toLowerCase()),
            };
            setTranscribedItems(prev => [...prev, newItem]);
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

  const handleEditItem = (editedItem: {
    name: string;
    quantity: number;
    unit: string;
    icon?: string;
  }) => {
    setTranscribedItems(prev => 
      prev.map(item => 
        item === selectedItem ? {
          ...editedItem,
          // Preserve the icon if it wasn't changed in the edit
          icon: editedItem.icon || item.icon
        } : item
      )
    );
    setSelectedItem(null);
    setShowEditModal(false);
  };

  const handleRemoveItem = async (itemToRemove: TranscribedItem) => {
    // Create a unique identifier for the item
    const itemKey = itemToRemove.$id || `temp-${Date.now()}`;
    try {
      setDeletingItems(prev => new Set(prev).add(itemKey));
      // Add a small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 300));
      setTranscribedItems(prev => prev.filter(item => item !== itemToRemove));
    } catch (error) {
      console.error('Error removing item:', error);
      Alert.alert('Error', 'Failed to remove item');
    } finally {
      setDeletingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemKey);
        return newSet;
      });
    }
  };

  const handleAddAll = async () => {
    try {
      setIsSaving(true);
      // Create a copy of the items without any temporary fields, but preserve icon names
      const cleanItems = transcribedItems.map(({ $id, ...item }) => ({
        ...item,
        // Ensure we're using the icon name (FoodIconType) rather than the icon object
        // Make icon mapping case-insensitive
        icon: item.icon || getFoodIcon(item.name.toLowerCase())
      }));
      
      // Array to store items with their database IDs
      const savedItems: TranscribedItem[] = [];
      
      // Add all items to the database and collect their IDs
      for (const item of cleanItems) {
        const savedDoc = await createInventoryItem(item);
        // Convert the Appwrite document back to our TranscribedItem type
        const savedItem: TranscribedItem = {
          $id: savedDoc.$id,
          name: savedDoc.name,
          quantity: savedDoc.quantity,
          unit: savedDoc.unit,
          // Make icon mapping case-insensitive
          icon: savedDoc.icon || getFoodIcon(savedDoc.name.toLowerCase()) // Fallback to icon mapping if needed
        };
        savedItems.push(savedItem);
      }
      
      // Notify parent component with the items that include database IDs
      onAddItems(savedItems);
      onClose();
    } catch (error) {
      console.error('Error adding items:', error);
      Alert.alert('Error', 'Failed to add items to inventory');
    } finally {
      setIsSaving(false);
    }
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
              <Text style={styles.title}>Add Items by Voice</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>

          <View style={styles.recordingContainer}>
            <TouchableOpacity
              onPress={handleRecordPress}
              style={[
                styles.recordButton,
                isRecording && styles.recordButtonRecording
              ]}
              disabled={isTranscribing}
            >
              {isTranscribing ? (
                <ActivityIndicator color="white" size="large" />
              ) : (
                <Ionicons
                  name={isRecording ? "radio" : "mic"}
                  size={48}
                  color="white"
                />
              )}
            </TouchableOpacity>
            <Text style={styles.recordingText}>
              {isRecording ? 'Recording...' : 'Tap to Record'}
            </Text>
          </View>

          {transcribedItems.length > 0 && (
            <>
              <ScrollView style={styles.itemsContainer}>
                {transcribedItems.map((item, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.itemCard}
                    onPress={() => {
                      setSelectedItem(item);
                      setShowEditModal(true);
                    }}
                  >
                    <View style={styles.itemContent}>
                      <Image
                        source={FOOD_ICONS[item.icon as FoodIconType] || FOOD_ICONS.default}
                        style={styles.itemIcon}
                        resizeMode="contain"
                      />
                      <View style={styles.itemDetails}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={styles.itemQuantity}>
                          {item.quantity} {item.unit}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.removeButton,
                        deletingItems.has(item.$id || `temp-${Date.now()}`) && styles.removeButtonDisabled
                      ]}
                      onPress={() => handleRemoveItem(item)}
                      disabled={deletingItems.has(item.$id || `temp-${Date.now()}`)}
                    >
                      {deletingItems.has(item.$id || `temp-${Date.now()}`) ? (
                        <ActivityIndicator size="small" color="#ff4444" />
                      ) : (
                        <Ionicons name="trash-outline" size={24} color="#ff4444" />
                      )}
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity
                style={[
                  styles.addAllButton,
                  isSaving && styles.addAllButtonDisabled
                ]}
                onPress={handleAddAll}
                disabled={isSaving}
              >
                {isSaving ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color="white" size="small" />
                    <Text style={styles.addAllButtonText}>
                      Saving Items...
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.addAllButtonText}>
                    Add All Items ({transcribedItems.length})
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {selectedItem && (
        <EditItemModal
          visible={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedItem(null);
          }}
          onSave={handleEditItem}
          onDelete={() => handleRemoveItem(selectedItem)}
          item={{
            $id: `temp-${Date.now()}`,
            name: selectedItem.name,
            quantity: selectedItem.quantity,
            unit: selectedItem.unit,
            icon: selectedItem.icon
          }}
          skipDatabaseUpdate={true}
        />
      )}
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
  recordingContainer: {
    alignItems: 'center',
    padding: 40,
    gap: 16,
  },
  recordButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#4a9eff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#2d7cd1',
  },
  recordButtonRecording: {
    backgroundColor: '#ff4444',
    borderColor: '#cc3333',
  },
  recordingText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'SpaceMono',
  },
  itemsContainer: {
    flex: 1,
    padding: 16,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#444',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemIcon: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'SpaceMono',
    marginBottom: 4,
  },
  itemQuantity: {
    color: '#999',
    fontSize: 14,
    fontFamily: 'SpaceMono',
  },
  removeButton: {
    padding: 8,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonDisabled: {
    opacity: 0.5,
  },
  addAllButton: {
    backgroundColor: '#4a9eff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#2d7cd1',
  },
  addAllButtonDisabled: {
    backgroundColor: '#333',
    borderColor: '#444',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addAllButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'SpaceMono',
  },
  backButton: {
    padding: 8,
  },
}); 