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
import { DatabaseService } from '../../services/appwrite';

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

export const SummaryHeader = ({ type, onRefresh, videoId }: SummaryHeaderProps) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    loadSummary();
  }, [type]);

  const loadSummary = async () => {
    try {
      setIsLoading(true);
      const response = await summaryService.getSummary(videoId);
      if (response) {
        setSummary(type === 'comments' ? response.commentsSummary : response.reviewsSummary);
      }
    } catch (error) {
      console.error('Error loading summary:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!summary && !isLoading) return null;

  return (
    <View style={styles.summaryContainer}>
      <TouchableOpacity 
        style={styles.summaryHeader}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <View style={styles.summaryTitleContainer}>
          <Ionicons name="analytics-outline" size={20} color="#ff4444" />
          <Text style={styles.summaryTitle}>AI Analysis</Text>
        </View>
        <View style={styles.summaryHeaderRight}>
          <TouchableOpacity onPress={loadSummary} style={styles.refreshButton}>
            <Ionicons name="refresh" size={18} color="#666" />
          </TouchableOpacity>
          <Ionicons 
            name={isExpanded ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="#666" 
          />
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.summaryContent}>
          {isLoading ? (
            <ActivityIndicator size="small" color="#4a9eff" />
          ) : (
            <Text style={styles.summaryText}>{summary}</Text>
          )}
        </View>
      )}
    </View>
  );
};

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
      <View style={styles.modalContainer}>
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
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
  // summaryText: {
  //   fontSize: 16,
  //   lineHeight: 24,
  //   color: '#333',
  // },
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
    color: '#666',
    marginLeft: 8,
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#ff4444',
    marginBottom: 8,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    padding: 8,
    borderRadius: 4,
  },
  retryText: {
    color: '#fff',
    marginLeft: 4,
  },
  headerContainer: {
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    margin: 16,
    marginBottom: 8,
  },
  summaryContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#333',
    overflow: 'hidden',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  summaryTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryTitle: {
    color: '#ff4444',
    fontSize: 16,
    fontFamily: 'SpaceMono',
  },
  summaryContent: {
    padding: 12,
  },
  summaryText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'SpaceMono',
    lineHeight: 20,
  },
  refreshButton: {
    padding: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#E91E63',
  },
  tabText: {
    color: '#666',
    fontSize: 16,
  },
  activeTabText: {
    color: '#E91E63',
  }
}); 