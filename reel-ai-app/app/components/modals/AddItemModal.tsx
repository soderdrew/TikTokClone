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
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FOOD_ICONS, getFoodIcon, FoodIconType } from '../../constants/foodIcons';
import { createInventoryItem } from '../../services/inventoryService';
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
    name: string;
    quantity: number;
    unit: string;
    icon?: string;
  }) => void;
}

export default function AddItemModal({ visible, onClose, onAdd }: Props) {
  const [transcribedItems, setTranscribedItems] = useState<Array<{
    name: string;
    quantity: number;
    unit: string;
    icon?: string;
    accepted?: boolean;
  }>>([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showAcceptAllButton, setShowAcceptAllButton] = useState(false);

  // Use useRef to persist the AudioService instance
  const audioService = React.useRef(new AudioService()).current;

  useEffect(() => {
    if (visible) {
      setTranscribedItems([]);
      setCurrentItemIndex(0);
      setShowAcceptAllButton(false);
    }
  }, [visible]);

  useEffect(() => {
    if (transcribedItems.length > 0) {
      // Auto-match icons for all items
      const itemsWithIcons = transcribedItems.map(item => ({
        ...item,
        icon: getFoodIcon(item.name),
      }));
      setTranscribedItems(itemsWithIcons);
      setShowAcceptAllButton(true);
    }
  }, [transcribedItems.length]);

  const handleAdd = async (item: typeof transcribedItems[0]) => {
    if (!item.name || !item.quantity || !item.unit) return;

    try {
      await createInventoryItem({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        icon: item.icon,
      });
      
      // Mark item as accepted
      const updatedItems = transcribedItems.map((i, index) => 
        index === currentItemIndex ? { ...i, accepted: true } : i
      );
      setTranscribedItems(updatedItems);

      // Move to next unaccepted item if available
      const nextUnacceptedIndex = updatedItems.findIndex((item, index) => 
        index > currentItemIndex && !item.accepted
      );
      if (nextUnacceptedIndex !== -1) {
        setCurrentItemIndex(nextUnacceptedIndex);
      }

      // Check if all items are accepted
      if (updatedItems.every(item => item.accepted)) {
      onClose();
      }
    } catch (error) {
      console.error('Error adding item:', error);
      Alert.alert('Error', 'Failed to add item to inventory');
    }
  };

  const handleAcceptAll = async () => {
    try {
      for (const item of transcribedItems) {
        if (!item.accepted) {
          await createInventoryItem({
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            icon: item.icon,
          });
        }
      }
      onClose();
    } catch (error) {
      console.error('Error adding items:', error);
      Alert.alert('Error', 'Failed to add some items to inventory');
    }
  };

  const stopRecording = async () => {
    let audioUri: string | null = null;
    try {
      if (!isRecording) {
        console.log('Not recording, ignoring stop request');
        return;
      }

      console.log('Stopping recording...');
      setIsRecording(false);
      audioUri = await audioService.stopRecording();
      
      if (audioUri) {
        setIsTranscribing(true);
        console.log('Transcribing audio...');
        try {
          const result = await audioService.transcribeAudio(audioUri);
          if (result.items && result.items.length > 0) {
            setTranscribedItems(result.items);
            setCurrentItemIndex(0);
          } else {
            console.log('No items transcribed');
            Alert.alert(
              'No Items Found',
              'No items were detected in the recording. Please try again and speak clearly.'
            );
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

  const renderCurrentItem = () => {
    if (transcribedItems.length === 0) return null;
    
    const item = transcribedItems[currentItemIndex];
    if (!item) return null;

    return (
      <View style={styles.itemContainer}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemCount}>
            Item {currentItemIndex + 1} of {transcribedItems.length}
          </Text>
          {showAcceptAllButton && (
            <TouchableOpacity
              style={styles.acceptAllButton}
              onPress={handleAcceptAll}
            >
              <Text style={styles.acceptAllText}>Accept All</Text>
            </TouchableOpacity>
          )}
      </View>

        <View style={styles.itemContent}>
          <Image
            source={item.icon ? FOOD_ICONS[item.icon as FoodIconType] : FOOD_ICONS.default}
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

        <View style={styles.itemActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => {
              const nextIndex = currentItemIndex + 1;
              if (nextIndex < transcribedItems.length) {
                setCurrentItemIndex(nextIndex);
              } else {
                onClose();
              }
            }}
          >
            <Text style={styles.actionButtonText}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => handleAdd(item)}
          >
            <Text style={styles.actionButtonText}>Accept</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Add Items</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          {transcribedItems.length === 0 ? (
            <View style={styles.recordingContainer}>
              <Text style={styles.instructions}>
                Press and hold the microphone button to record your items
              </Text>
                    <TouchableOpacity 
                onPress={handleRecordPress}
                style={[styles.micButton, isRecording && styles.micButtonRecording]}
                disabled={isTranscribing}
              >
                {isTranscribing ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Ionicons 
                    name={isRecording ? "radio" : "mic"}
                    size={24}
                    color="white" 
                  />
                )}
                </TouchableOpacity>
              </View>
          ) : (
            renderCurrentItem()
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  recordingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  instructions: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  micButton: {
    backgroundColor: '#007AFF',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micButtonRecording: {
    backgroundColor: '#FF3B30',
  },
  itemContainer: {
    padding: 15,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  itemCount: {
    fontSize: 16,
    color: '#666',
  },
  acceptAllButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
  },
  acceptAllText: {
    color: 'white',
    fontWeight: '600',
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  itemIcon: {
    width: 50,
    height: 50,
    marginRight: 15,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 5,
  },
  itemQuantity: {
    fontSize: 16,
    color: '#666',
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  acceptButton: {
    backgroundColor: '#34C759',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
}); 