import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { reviewService, Review } from '../../services/reviewService';
import { SummaryHeader } from './SummaryModal';

interface ReviewsModalProps {
  videoId: string;
  isVisible: boolean;
  onClose: () => void;
}

export default function ReviewsModal({ videoId, isVisible, onClose }: ReviewsModalProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const response = await reviewService.getVideoReviews(videoId);
      setReviews(response);
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isVisible) {
      loadReviews();
    }
  }, [isVisible]);

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <View style={styles.header}>
            <Text style={styles.title}>Reviews</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <SummaryHeader 
            type="reviews"
            onRefresh={loadReviews}
            videoId={videoId}
          />

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#E91E63" />
            </View>
          ) : (
            <ScrollView style={styles.reviewsList}>
              {reviews.map((review) => (
                <View key={review.$id} style={styles.reviewItem}>
                  <Text style={styles.reviewText}>{review.content}</Text>
                  <View style={styles.reviewMeta}>
                    <Text style={styles.rating}>Rating: {review.rating}/5</Text>
                    <Text style={styles.reviewDate}>
                      {new Date(review.$createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
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
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  reviewsList: {
    flex: 1,
  },
  reviewItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  reviewText: {
    fontSize: 16,
    marginBottom: 8,
  },
  reviewMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rating: {
    fontSize: 14,
    color: '#666',
  },
  reviewDate: {
    fontSize: 12,
    color: '#999',
  },
}); 