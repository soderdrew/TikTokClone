import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface FilterModalProps {
  isVisible: boolean;
  onClose: () => void;
  onApply: (selectedItems: string[]) => void;
  title: string;
  items: string[];
  selectedItems: string[];
}

export default function FilterModal({
  isVisible,
  onClose,
  onApply,
  title,
  items,
  selectedItems,
}: FilterModalProps) {
  const [localSelectedItems, setLocalSelectedItems] = React.useState<string[]>([]);

  React.useEffect(() => {
    setLocalSelectedItems(selectedItems);
  }, [selectedItems]);

  const toggleItem = (item: string) => {
    setLocalSelectedItems((prev) =>
      prev.includes(item)
        ? prev.filter((i) => i !== item)
        : [...prev, item]
    );
  };

  const handleApply = () => {
    onApply(localSelectedItems);
    onClose();
  };

  const handleClear = () => {
    setLocalSelectedItems([]);
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.itemsContainer}>
            {items.map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.itemButton,
                  localSelectedItems.includes(item) && styles.selectedItem,
                ]}
                onPress={() => toggleItem(item)}
              >
                <Text
                  style={[
                    styles.itemText,
                    localSelectedItems.includes(item) && styles.selectedItemText,
                  ]}
                >
                  {item}
                </Text>
                {localSelectedItems.includes(item) && (
                  <Ionicons name="checkmark" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
            <Text style={styles.applyButtonText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: height * 0.6,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  closeButton: {
    padding: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  clearButton: {
    padding: 5,
  },
  clearText: {
    color: '#ff4444',
    fontSize: 16,
  },
  itemsContainer: {
    flex: 1,
  },
  itemButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#333',
  },
  selectedItem: {
    backgroundColor: '#ff4444',
  },
  itemText: {
    fontSize: 16,
    color: '#fff',
  },
  selectedItemText: {
    color: '#fff',
  },
  applyButton: {
    backgroundColor: '#ff4444',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 