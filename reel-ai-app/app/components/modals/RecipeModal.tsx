import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface RecipeModalProps {
    visible: boolean;
    onClose: () => void;
    recipe: {
        title: string;
        description: string;
        cuisine: string;
        difficulty: string;
        cookingTime: number;
        ingredients?: string[];
        instructions?: string[];
        tips?: string[];
    };
}

const { width } = Dimensions.get('window');

const formatIngredients = (ingredients?: string[]) => {
    if (!ingredients || ingredients.length === 0) return [];
    
    // If it's a single string (comma-separated), split it
    if (ingredients.length === 1) {
        // Match items that are wrapped in quotes and separated by commas
        const matches = ingredients[0].match(/"[^"]+"/g);
        if (matches) {
            return matches.map(item => 
                // Remove the quotes and trim any whitespace
                item.replace(/^"|"$/g, '').trim()
            );
        }
    }
    
    // If it's already an array, just strip quotes
    return ingredients.map(item => item.trim().replace(/^["']|["']$/g, ''));
};

const formatInstructions = (instructions?: string[]) => {
    if (!instructions || instructions.length === 0) return [];
    
    // If it's a single string (comma-separated), split it
    if (instructions.length === 1) {
        // Match items that are wrapped in quotes and separated by commas
        const matches = instructions[0].match(/"[^"]+"/g);
        if (matches) {
            return matches.map(item => 
                // Remove the quotes and trim any whitespace
                item.replace(/^"|"$/g, '').trim()
            );
        }
    }
    
    // If it's already an array, just strip quotes
    return instructions.map(item => item.trim().replace(/^["']|["']$/g, ''));
};

const formatTips = (tips?: string[]) => {
    if (!tips || tips.length === 0) return [];
    
    // If it's a single string (comma-separated), split it
    if (tips.length === 1) {
        // Match items that are wrapped in quotes and separated by commas
        const matches = tips[0].match(/"[^"]+"/g);
        if (matches) {
            return matches.map(item => 
                // Remove the quotes and trim any whitespace
                item.replace(/^"|"$/g, '').trim()
            );
        }
    }
    
    // If it's already an array, just strip quotes
    return tips.map(item => item.trim().replace(/^["']|["']$/g, ''));
};

interface SectionProps {
    title: string;
    children: React.ReactNode;
}

const CollapsibleSection = ({ title, children }: SectionProps) => {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <View style={styles.section}>
            <TouchableOpacity 
                style={styles.sectionHeader} 
                onPress={() => setIsExpanded(!isExpanded)}
            >
                <Text style={styles.sectionTitle}>{title}</Text>
                <Ionicons 
                    name={isExpanded ? "chevron-up" : "chevron-down"} 
                    size={24} 
                    color="#666" 
                />
            </TouchableOpacity>
            {isExpanded && children}
        </View>
    );
};

export default function RecipeModal({ visible, onClose, recipe }: RecipeModalProps) {
    const formattedIngredients = formatIngredients(recipe.ingredients);
    const formattedInstructions = formatInstructions(recipe.instructions);
    const formattedTips = formatTips(recipe.tips);
    
    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>{recipe.title}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scrollContent}>
                        {/* Recipe Info */}
                        <View style={styles.infoContainer}>
                            <View style={styles.infoItem}>
                                <Ionicons name="restaurant-outline" size={20} color="#666" />
                                <Text style={styles.infoText}>{recipe.cuisine}</Text>
                            </View>
                            <View style={styles.infoItem}>
                                <Ionicons name="timer-outline" size={20} color="#666" />
                                <Text style={styles.infoText}>{recipe.cookingTime} mins</Text>
                            </View>
                            <View style={styles.infoItem}>
                                <Ionicons name="speedometer-outline" size={20} color="#666" />
                                <Text style={styles.infoText}>{recipe.difficulty}</Text>
                            </View>
                        </View>

                        {/* Description */}
                        <CollapsibleSection title="Description">
                            <Text style={styles.description}>{recipe.description}</Text>
                        </CollapsibleSection>

                        {/* Ingredients */}
                        {formattedIngredients.length > 0 && (
                            <CollapsibleSection title="Ingredients">
                                {formattedIngredients.map((ingredient, index) => (
                                    <View key={index} style={styles.listItem}>
                                        <Text style={styles.bullet}>•</Text>
                                        <Text style={styles.listText}>{ingredient}</Text>
                                    </View>
                                ))}
                            </CollapsibleSection>
                        )}

                        {/* Instructions */}
                        {formattedInstructions.length > 0 && (
                            <CollapsibleSection title="Instructions">
                                {formattedInstructions.map((instruction, index) => (
                                    <View key={index} style={styles.listItem}>
                                        <Text style={styles.stepNumber}>{index + 1}.</Text>
                                        <Text style={styles.listText}>{instruction}</Text>
                                    </View>
                                ))}
                            </CollapsibleSection>
                        )}

                        {/* Cooking Tips */}
                        {formattedTips.length > 0 && (
                            <CollapsibleSection title="Cooking Tips">
                                {formattedTips.map((tip, index) => (
                                    <View key={index} style={styles.listItem}>
                                        <Text style={styles.bullet}>💡</Text>
                                        <Text style={styles.listText}>{tip}</Text>
                                    </View>
                                ))}
                            </CollapsibleSection>
                        )}
                    </ScrollView>
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
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '90%',
        width: '100%',
        paddingTop: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        flex: 1,
        marginRight: 40,
    },
    closeButton: {
        padding: 5,
    },
    scrollContent: {
        flex: 1,
    },
    infoContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 15,
        backgroundColor: '#f8f8f8',
        marginHorizontal: 20,
        marginTop: 20,
        borderRadius: 10,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    infoText: {
        fontSize: 14,
        color: '#666',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    section: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    description: {
        fontSize: 16,
        lineHeight: 24,
        color: '#444',
    },
    listItem: {
        flexDirection: 'row',
        marginBottom: 10,
        paddingRight: 10,
        alignItems: 'flex-start',
    },
    bullet: {
        width: 20,
        fontSize: 16,
        color: '#666',
        lineHeight: 24,
    },
    stepNumber: {
        width: 25,
        fontSize: 16,
        fontWeight: 'bold',
        color: '#666',
        lineHeight: 24,
    },
    listText: {
        flex: 1,
        fontSize: 16,
        lineHeight: 24,
        color: '#444',
    },
}); 