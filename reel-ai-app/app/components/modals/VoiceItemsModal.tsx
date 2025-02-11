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
}

export default function VoiceItemsModal({ visible, onClose, onAddItems }: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
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
              icon: getFoodIcon(item.name),
            }));
            setTranscribedItems(prev => [...prev, ...newItems]);
          } else if (text && text.trim()) {
            // Fallback to simple item if no structured items
            const newItem: TranscribedItem = {
              name: text.trim(),
              quantity: 1,
              unit: 'pcs',
              icon: getFoodIcon(text.trim()),
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

  const handleRemoveItem = (itemToRemove: TranscribedItem) => {
    setTranscribedItems(prev => prev.filter(item => item !== itemToRemove));
  };

  const handleAddAll = async () => {
    try {
      // Create a copy of the items without any temporary fields
      const cleanItems = transcribedItems.map(({ $id, ...item }) => item);
      
      // Add all items to the database
      for (const item of cleanItems) {
        await createInventoryItem(item);
      }
      
      // Notify parent component with the clean items
      onAddItems(cleanItems);
      onClose();
    } catch (error) {
      console.error('Error adding items:', error);
      Alert.alert('Error', 'Failed to add items to inventory');
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
            <Text style={styles.title}>Add Items by Voice</Text>
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
                      style={styles.removeButton}
                      onPress={() => handleRemoveItem(item)}
                    >
                      <Ionicons name="trash-outline" size={24} color="#ff4444" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity
                style={styles.addAllButton}
                onPress={handleAddAll}
              >
                <Text style={styles.addAllButtonText}>
                  Add All Items ({transcribedItems.length})
                </Text>
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
  addAllButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'SpaceMono',
  },
}); 