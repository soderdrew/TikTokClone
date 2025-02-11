import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { summaryService, VideoSummary } from '../../services/summaryService';

interface SummaryModalProps {
  videoId: string;
  isVisible: boolean;
  onClose: () => void;
}

interface SummaryHeaderProps {
  type: 'comments' | 'reviews';
  onRefresh: () => void;
  videoId: string;
}

export function SummaryHeader({ type, onRefresh, videoId }: SummaryHeaderProps) {
  const [summary, setSummary] = useState<VideoSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      let existingSummary = await summaryService.getSummary(videoId);
      
      if (!existingSummary) {
        existingSummary = await summaryService.generateSummaries(videoId);
      }
      
      setSummary(existingSummary);
    } catch (err) {
      setError('Failed to load summary');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, [videoId]);

  if (loading) {
    return (
      <View style={styles.headerContainer}>
        <ActivityIndicator size="small" color="#E91E63" />
        <Text style={styles.loadingText}>Analyzing {type}...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.headerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
          <Ionicons name="refresh" size={16} color="#fff" />
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!summary) return null;

  return (
    <View style={styles.headerContainer}>
      <View style={styles.summaryHeader}>
        <Ionicons name="analytics" size={20} color="#E91E63" />
        <Text style={styles.summaryTitle}>AI Analysis</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={16} color="#666" />
        </TouchableOpacity>
      </View>
      <Text style={styles.summaryText}>
        {type === 'comments' ? summary.commentsSummary : summary.reviewsSummary}
      </Text>
    </View>
  );
}

export default function SummaryModal({ videoId, isVisible, onClose }: SummaryModalProps) {
  const [summary, setSummary] = useState<VideoSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      // Try to get existing summary
      let existingSummary = await summaryService.getSummary(videoId);
      
      // If no summary exists, generate new one
      if (!existingSummary) {
        existingSummary = await summaryService.generateSummaries(videoId);
      }
      
      setSummary(existingSummary);
    } catch (err) {
      setError('Failed to load summaries');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isVisible) {
      loadSummary();
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
            <Text style={styles.title}>AI Insights</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#E91E63" />
              <Text style={styles.loadingText}>Analyzing feedback...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadSummary}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : summary ? (
            <ScrollView style={styles.content}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Comments Analysis</Text>
                <Text style={styles.summaryText}>{summary.commentsSummary}</Text>
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Reviews Analysis</Text>
                <Text style={styles.summaryText}>{summary.reviewsSummary}</Text>
              </View>
            </ScrollView>
          ) : null}
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
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#E91E63',
  },
  summaryText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 15,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#D32F2F',
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#E91E63',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: {
    color: 'white',
    fontSize: 16,
  },
  headerContainer: {
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    margin: 16,
    marginBottom: 8,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E91E63',
    marginLeft: 8,
    flex: 1,
  },
  refreshButton: {
    padding: 4,
  },
}); 