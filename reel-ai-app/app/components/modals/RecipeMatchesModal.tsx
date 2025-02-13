import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface RecipeMatch {
  title: string;
  id: string;
  matchPercentage: number;
  missingIngredients: string[];
}

interface Props {
  visible: boolean;
  onClose: () => void;
  matches: RecipeMatch[];
  isLoading: boolean;
}

export default function RecipeMatchesModal({ visible, onClose, matches, isLoading }: Props) {
  const handleRecipePress = (match: RecipeMatch) => {
    // Navigate to the recipe video using the ID
    router.push({
      pathname: `/(video)/${match.id}`,
      params: { autoPlay: 'true' }
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.container}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity 
          style={styles.content}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Recipe Matches</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#999" />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Finding matches...</Text>
            </View>
          ) : matches.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="restaurant-outline" size={48} color="#666" />
              <Text style={styles.emptyText}>No matching recipes found</Text>
              <Text style={styles.emptySubtext}>Try adding more ingredients to your pantry</Text>
            </View>
          ) : (
            <ScrollView style={styles.matchesList}>
              {matches.map((match, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.matchItem}
                  onPress={() => handleRecipePress(match)}
                >
                  <View style={styles.matchHeader}>
                    <Text style={styles.matchTitle}>{match.title}</Text>
                    <View style={[
                      styles.percentageBadge,
                      { backgroundColor: match.matchPercentage >= 80 ? '#4CAF50' : '#FFA726' }
                    ]}>
                      <Text style={styles.percentageText}>{match.matchPercentage}% Match</Text>
                    </View>
                  </View>
                  
                  {match.missingIngredients.length > 0 && (
                    <View style={styles.missingContainer}>
                      <Text style={styles.missingLabel}>Missing ingredients:</Text>
                      <Text style={styles.missingText}>
                        {match.missingIngredients.join(', ')}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    padding: 20,
    borderWidth: 3,
    borderColor: '#333',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    color: 'white',
    fontFamily: 'SpaceMono',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#999',
    fontSize: 16,
    fontFamily: 'SpaceMono',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'SpaceMono',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    fontFamily: 'SpaceMono',
    marginTop: 8,
    textAlign: 'center',
  },
  matchesList: {
    maxHeight: '80%',
  },
  matchItem: {
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#444',
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  matchTitle: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'SpaceMono',
    flex: 1,
    marginRight: 12,
  },
  percentageBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  percentageText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  missingContainer: {
    marginTop: 8,
  },
  missingLabel: {
    color: '#999',
    fontSize: 12,
    fontFamily: 'SpaceMono',
    marginBottom: 4,
  },
  missingText: {
    color: '#FFA726',
    fontSize: 14,
    fontFamily: 'SpaceMono',
  },
}); 