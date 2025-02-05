import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    Image,
    ActivityIndicator,
    Alert,
    Platform,
    KeyboardAvoidingView,
    TouchableWithoutFeedback,
    Keyboard,
    Dimensions,
    ActionSheetIOS
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { DatabaseService } from '../../services/appwrite';

interface EditProfileModalProps {
    visible: boolean;
    onClose: () => void;
    currentProfile: {
        userId: string;
        name: string;
        bio: string;
        avatarUrl: string;
    };
    onProfileUpdate: () => void;
}

interface CropModalProps {
    visible: boolean;
    imageUri: string;
    onClose: () => void;
    onCrop: (croppedUri: string) => void;
}

function CropModal({ visible, imageUri, onClose, onCrop }: CropModalProps) {
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

    const handleCrop = async () => {
        try {
            const cropWidth = Math.min(imageSize.width, imageSize.height);
            const cropHeight = cropWidth;

            const manipulatedImage = await ImageManipulator.manipulateAsync(
                imageUri,
                [
                    {
                        crop: {
                            originX: offset.x,
                            originY: offset.y,
                            width: cropWidth,
                            height: cropHeight
                        }
                    }
                ],
                { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
            );

            onCrop(manipulatedImage.uri);
        } catch (error) {
            console.error('Error cropping image:', error);
            Alert.alert('Error', 'Failed to crop image. Please try again.');
        }
    };

    return (
        <Modal visible={visible} transparent={false} animationType="slide">
            <View style={styles.cropModalContainer}>
                <View style={styles.cropHeader}>
                    <TouchableOpacity onPress={onClose}>
                        <Text style={styles.cropHeaderText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleCrop}>
                        <Text style={[styles.cropHeaderText, styles.cropDoneText]}>Done</Text>
                    </TouchableOpacity>
                </View>
                
                <View style={styles.cropContainer}>
                    <Image
                        source={{ uri: imageUri }}
                        style={styles.cropImage}
                        onLoad={(e) => {
                            const { width, height } = e.nativeEvent.source;
                            setImageSize({ width, height });
                        }}
                        resizeMode="contain"
                    />
                    <View style={styles.cropOverlay}>
                        <View style={styles.cropFrame} />
                    </View>
                </View>
            </View>
        </Modal>
    );
}

export default function EditProfileModal({
    visible,
    onClose,
    currentProfile,
    onProfileUpdate
}: EditProfileModalProps) {
    const [name, setName] = useState(currentProfile.name);
    const [bio, setBio] = useState(currentProfile.bio);
    const [avatarUrl, setAvatarUrl] = useState(currentProfile.avatarUrl);
    const [isLoading, setIsLoading] = useState(false);
    const [cropModalVisible, setCropModalVisible] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const handleImageSelection = async () => {
        try {
            // Request permissions
            if (Platform.OS !== 'web') {
                const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (permissionResult.status !== 'granted') {
                    Alert.alert(
                        'Permission Required', 
                        'Please grant photo library access to change your profile picture.'
                    );
                    return;
                }
            }

            // Launch image picker
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 1
            });

            if (!result.canceled) {
                setIsLoading(true);
                try {
                    const uploadedUrl = await DatabaseService.uploadProfilePicture(result.assets[0].uri);
                    setAvatarUrl(uploadedUrl);
                } catch (error) {
                    console.error('Error uploading profile picture:', error);
                    Alert.alert('Error', 'Failed to upload profile picture. Please try again.');
                } finally {
                    setIsLoading(false);
                }
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Failed to pick image. Please try again.');
        }
    };

    const handleCrop = async (croppedUri: string) => {
        setIsLoading(true);
        try {
            const uploadedUrl = await DatabaseService.uploadProfilePicture(croppedUri);
            setAvatarUrl(uploadedUrl);
        } catch (error) {
            console.error('Error uploading profile picture:', error);
            Alert.alert('Error', 'Failed to upload profile picture. Please try again.');
        } finally {
            setIsLoading(false);
            setCropModalVisible(false);
            setSelectedImage(null);
        }
    };

    const showImageOptions = () => {
        handleImageSelection();
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            await DatabaseService.updateProfile(currentProfile.userId, {
                name,
                bio,
                avatarUrl
            });
            onProfileUpdate();
            onClose();
        } catch (error) {
            console.error('Error updating profile:', error);
            Alert.alert('Error', 'Failed to update profile. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <Modal
                visible={visible}
                animationType="slide"
                transparent={false}
                onRequestClose={onClose}
                statusBarTranslucent={true}
            >
                <View style={styles.safeArea}>
                    <KeyboardAvoidingView 
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={styles.modalContainer}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                    >
                        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                            <View style={styles.overlay}>
                                <View style={styles.modalContent}>
                                    <View style={styles.header}>
                                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                            <Ionicons name="chevron-back" size={28} color="#fff" />
                                        </TouchableOpacity>
                                        <Text style={styles.title}>Edit Profile</Text>
                                        <TouchableOpacity 
                                            style={styles.saveButton}
                                            onPress={handleSave}
                                            disabled={isLoading}
                                        >
                                            {isLoading ? (
                                                <ActivityIndicator color="#fff" size="small" />
                                            ) : (
                                                <Text style={styles.saveButtonText}>Save</Text>
                                            )}
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.content}>
                                        {/* Profile Picture */}
                                        <TouchableOpacity onPress={showImageOptions} style={styles.avatarContainer}>
                                            {isLoading ? (
                                                <ActivityIndicator size="large" color="#ff4444" />
                                            ) : (
                                                <>
                                                    <Image
                                                        source={{ uri: avatarUrl || 'https://via.placeholder.com/150' }}
                                                        style={styles.avatar}
                                                    />
                                                    <View style={styles.editIconContainer}>
                                                        <Ionicons name="camera" size={20} color="#fff" />
                                                    </View>
                                                </>
                                            )}
                                        </TouchableOpacity>

                                        {/* Name Input */}
                                        <View style={styles.inputContainer}>
                                            <Text style={styles.label}>Name</Text>
                                            <TextInput
                                                style={styles.input}
                                                value={name}
                                                onChangeText={setName}
                                                placeholder="Enter your name"
                                                placeholderTextColor="#666"
                                                returnKeyType="done"
                                                onSubmitEditing={Keyboard.dismiss}
                                            />
                                        </View>

                                        {/* Bio Input */}
                                        <View style={styles.inputContainer}>
                                            <Text style={styles.label}>Bio</Text>
                                            <TextInput
                                                style={[styles.input, styles.bioInput]}
                                                value={bio}
                                                onChangeText={setBio}
                                                placeholder="Write something about yourself"
                                                placeholderTextColor="#666"
                                                multiline
                                                numberOfLines={3}
                                                returnKeyType="done"
                                                blurOnSubmit={true}
                                                onSubmitEditing={Keyboard.dismiss}
                                            />
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            {selectedImage && (
                <CropModal
                    visible={cropModalVisible}
                    imageUri={selectedImage}
                    onClose={() => {
                        setCropModalVisible(false);
                        setSelectedImage(null);
                    }}
                    onCrop={handleCrop}
                />
            )}
        </>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#000',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    overlay: {
        flex: 1,
        backgroundColor: '#000',
    },
    modalContent: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 60 : 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    closeButton: {
        padding: 5,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    avatarContainer: {
        alignItems: 'center',
        marginVertical: 20,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
    },
    editIconContainer: {
        position: 'absolute',
        bottom: 0,
        right: '32%',
        backgroundColor: '#ff4444',
        borderRadius: 15,
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    inputContainer: {
        marginBottom: 24,
    },
    label: {
        color: '#fff',
        marginBottom: 8,
        fontSize: 16,
        fontWeight: '600',
    },
    input: {
        backgroundColor: '#1a1a1a',
        borderRadius: 10,
        padding: 12,
        color: '#fff',
        fontSize: 16,
    },
    bioInput: {
        height: 120,
        textAlignVertical: 'top',
        paddingTop: 12,
    },
    saveButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: '#ff4444',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    cropModalContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    cropHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 20,
    },
    cropHeaderText: {
        color: '#fff',
        fontSize: 17,
    },
    cropDoneText: {
        color: '#ff4444',
        fontWeight: '600',
    },
    cropContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cropImage: {
        width: '100%',
        height: '100%',
    },
    cropOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    cropFrame: {
        width: 300,
        height: 300,
        borderWidth: 2,
        borderColor: '#fff',
        backgroundColor: 'transparent',
    },
}); 