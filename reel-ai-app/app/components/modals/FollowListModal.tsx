import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    FlatList,
    Image,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DatabaseService } from '../../services/appwrite';
import { router } from 'expo-router';
import { Models } from 'react-native-appwrite';

interface User {
    userId: string;
    name: string;
    avatarUrl?: string;
}

interface FollowListModalProps {
    visible: boolean;
    onClose: () => void;
    userId: string;
    type: 'followers' | 'following';
}

interface FollowDocument extends Models.Document {
    followerId: string;
    followedId: string;
    createdAt: string;
}

export default function FollowListModal({ visible, onClose, userId, type }: FollowListModalProps) {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (visible) {
            loadUsers();
        }
    }, [visible, userId, type]);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const response = type === 'followers' 
                ? await DatabaseService.getFollowers(userId)
                : await DatabaseService.getFollowing(userId);
            
            // Get profile details for each user
            const userDetails = await Promise.all(
                (response as FollowDocument[]).map(async (follow) => {
                    const userId = type === 'followers' ? follow.followerId : follow.followedId;
                    const profile = await DatabaseService.getProfile(userId);
                    return {
                        userId,
                        name: profile.name,
                        avatarUrl: profile.avatarUrl
                    };
                })
            );
            
            setUsers(userDetails);
        } catch (error) {
            console.error('Error loading users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUserPress = (userId: string) => {
        onClose();
        router.push(`/profile/${userId}`);
    };

    const renderUser = ({ item }: { item: User }) => (
        <TouchableOpacity 
            style={styles.userItem}
            onPress={() => handleUserPress(item.userId)}
        >
            {item.avatarUrl ? (
                <Image
                    source={{ uri: item.avatarUrl }}
                    style={styles.avatar}
                />
            ) : (
                <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>
                        {item.name[0]}
                    </Text>
                </View>
            )}
            <Text style={styles.username}>{item.name}</Text>
        </TouchableOpacity>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <Text style={styles.title}>
                            {type === 'followers' ? 'Followers' : 'Following'}
                        </Text>
                        <TouchableOpacity 
                            style={styles.closeButton}
                            onPress={onClose}
                        >
                            <Ionicons name="close" size={24} color="white" />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#ff4444" />
                        </View>
                    ) : (
                        <FlatList
                            data={users}
                            renderItem={renderUser}
                            keyExtractor={item => item.userId}
                            contentContainerStyle={styles.listContent}
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <Text style={styles.emptyText}>
                                        {type === 'followers' 
                                            ? 'No followers yet'
                                            : 'Not following anyone yet'
                                        }
                                    </Text>
                                </View>
                            }
                        />
                    )}
                </View>
            </View>
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
        backgroundColor: '#1a1a1a',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '80%',
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: 5,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        flexGrow: 1,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 15,
    },
    avatarPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    avatarText: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
    },
    username: {
        color: 'white',
        fontSize: 16,
        fontWeight: '500',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 50,
    },
    emptyText: {
        color: '#666',
        fontSize: 16,
    },
}); 