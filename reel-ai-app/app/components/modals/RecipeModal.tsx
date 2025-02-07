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
import { scaleRecipe } from '../../utils/recipeUtils';

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
        dietaryFlags?: string[];
        allergens?: string[];
        servingSize?: number;
    };
}

const { width } = Dimensions.get('window');

const formatIngredients = (ingredients?: string[]): string[] => {
    if (!ingredients || ingredients.length === 0) return [];

    // If ingredients contain a single string that resembles an array
    if (ingredients.length === 1) {
        const rawString = ingredients[0];
        
        // Split by quotes first to handle the JSON-like format
        const matches = rawString.match(/"([^"]*)"/g) || [];
        
        return matches
            .map(item => item.replace(/^"|"$/g, '')) // Remove surrounding quotes
            .map(item => item.trim()) // Trim whitespace
            .map(item => `- ${item}`) // Add bullet points
            .filter(item => item.length > 2); // Remove empty items
    }

    // If it's already an array, clean and format
    return ingredients
        .map(item => item.trim().replace(/^["']|["']$/g, ''))
        .map(item => `- ${item}`);
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

const getDietaryIcon = (flag: string) => {
    switch (flag.toLowerCase()) {
        case 'vegetarian':
            return '🥬';
        case 'vegan':
            return '🌱';
        case 'gluten-free':
            return '🌾';
        case 'dairy-free':
            return '🥛';
        case 'keto':
            return '🥑';
        case 'paleo':
            return '🍖';
        default:
            return '✓';
    }
};

const getAllergenIcon = (allergen: string) => {
    switch (allergen.toLowerCase()) {
        case 'nuts':
            return '🥜';
        case 'dairy':
            return '🧀';
        case 'eggs':
            return '🥚';
        case 'soy':
            return '🫘';
        case 'wheat':
            return '🌾';
        case 'fish':
            return '🐟';
        case 'shellfish':
            return '🦐';
        default:
            return '⚠️';
    }
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

const scaleQuantity = (quantity: string, ratio: number): string => {
    // Handle fractions like "1/2" or mixed numbers like "1 1/2"
    const parts = quantity.trim().split(' ');
    
    if (parts.length === 2) {
        // Handle mixed numbers like "1 1/2"
        const whole = parseFloat(parts[0]);
        const fraction = parts[1].split('/');
        const fractional = parseFloat(fraction[0]) / parseFloat(fraction[1]);
        const total = (whole + fractional) * ratio;
        return total.toFixed(1);
    } else if (quantity.includes('/')) {
        // Handle simple fractions like "1/2"
        const fraction = quantity.split('/');
        const total = (parseFloat(fraction[0]) / parseFloat(fraction[1])) * ratio;
        return total.toFixed(1);
    }
    
    // Handle simple numbers
    return (parseFloat(quantity) * ratio).toFixed(1);
};

const IngredientQuantity = ({ ingredient, isScaled, scalingRatio = 1 }: { 
    ingredient: string; 
    isScaled: boolean;
    scalingRatio?: number;
}) => {
    // Match only the numeric part at the start
    const match = ingredient.match(/^(\d+(?:\/\d+)?(?:\s*\d+\/\d+)?)\s*(.*)/);
    
    if (!match) {
        return <Text style={styles.listText}>{ingredient}</Text>;
    }

    const [_, quantity, remainingText] = match;
    const displayQuantity = isScaled ? scaleQuantity(quantity, scalingRatio) : quantity;

    return (
        <View style={styles.ingredientRow}>
            <View style={[
                styles.quantityBox,
                isScaled && styles.quantityBoxScaled
            ]}>
                <Text style={[
                    styles.quantityText,
                    isScaled && styles.quantityTextScaled
                ]}>
                    {displayQuantity}
                </Text>
            </View>
            {remainingText && <Text style={styles.listText}>{remainingText.trim()}</Text>}
        </View>
    );
};

export default function RecipeModal({ visible, onClose, recipe }: RecipeModalProps) {
    const [servings, setServings] = useState(recipe.servingSize || 4);
    const scalingRatio = recipe.servingSize ? servings / recipe.servingSize : 1;
    
    const updateServings = (newServings: number) => {
        if (newServings < 1 || newServings > 100) return;
        setServings(newServings);
    };

    const ServingAdjuster = () => (
        <View style={styles.servingAdjuster}>
            <TouchableOpacity 
                onPress={() => updateServings(servings - 1)}
                style={[styles.servingButton, servings <= 1 && styles.servingButtonDisabled]}
                disabled={servings <= 1}
            >
                <Ionicons name="remove" size={20} color={servings <= 1 ? '#ccc' : '#666'} />
            </TouchableOpacity>
            <View style={styles.servingInfo}>
                <Ionicons name="people-outline" size={20} color="#666" />
                <Text style={styles.servingText}>Serves {servings}</Text>
            </View>
            <TouchableOpacity 
                onPress={() => updateServings(servings + 1)}
                style={[styles.servingButton, servings >= 100 && styles.servingButtonDisabled]}
                disabled={servings >= 100}
            >
                <Ionicons name="add" size={20} color={servings >= 100 ? '#ccc' : '#666'} />
            </TouchableOpacity>
        </View>
    );

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

                        {/* Serving Size Adjuster */}
                        {recipe.servingSize && <ServingAdjuster />}

                        {/* Dietary Information */}
                        {((recipe.dietaryFlags?.length ?? 0) > 0 || (recipe.allergens?.length ?? 0) > 0) && (
                            <CollapsibleSection title="Dietary Information">
                                {recipe.dietaryFlags && recipe.dietaryFlags.length > 0 && (
                                    <View style={styles.dietarySection}>
                                        <Text style={styles.dietaryTitle}>Dietary:</Text>
                                        <View style={styles.dietaryFlags}>
                                            {recipe.dietaryFlags.map((flag, index) => (
                                                <View key={index} style={styles.dietaryFlag}>
                                                    <Text style={styles.flagIcon}>{getDietaryIcon(flag.replace(/['"]+/g, ''))}</Text>
                                                    <Text style={styles.flagText}>{flag.replace(/['"]+/g, '')}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                )}
                                
                                {recipe.allergens && recipe.allergens.length > 0 && (
                                    <View style={styles.allergenSection}>
                                        <Text style={styles.allergenTitle}>Contains:</Text>
                                        <View style={styles.allergenFlags}>
                                            {recipe.allergens.map((allergen, index) => (
                                                <View key={index} style={styles.allergenFlag}>
                                                    <Text style={styles.allergenIcon}>{getAllergenIcon(allergen.replace(/['"]+/g, ''))}</Text>
                                                    <Text style={styles.allergenText}>{allergen.replace(/['"]+/g, '')}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                )}
                            </CollapsibleSection>
                        )}

                        {/* Description */}
                        <CollapsibleSection title="Description">
                            <Text style={styles.description}>{recipe.description}</Text>
                        </CollapsibleSection>

                        {/* Ingredients with scaled quantities */}
                        {formattedIngredients.length > 0 && (
                            <CollapsibleSection title="Ingredients">
                                {formattedIngredients.map((ingredient, index) => (
                                    <View key={index} style={styles.listItem}>
                                        <Text style={styles.bullet}>•</Text>
                                        <View style={styles.ingredientContainer}>
                                            <IngredientQuantity 
                                                ingredient={ingredient.replace(/^-\s*/, '')} 
                                                isScaled={servings !== recipe.servingSize}
                                                scalingRatio={scalingRatio}
                                            />
                                        </View>
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
        marginBottom: 16,
        paddingRight: 10,
        alignItems: 'flex-start',
        paddingLeft: 20,
    },
    bullet: {
        width: 20,
        fontSize: 16,
        color: '#666',
        marginRight: 8,
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
        fontSize: 15,
        lineHeight: 22,
        color: '#444',
        paddingVertical: 4,
    },
    dietarySection: {
        marginTop: 10,
        paddingHorizontal: 20,
    },
    allergenSection: {
        marginTop: 15,
        paddingHorizontal: 20,
        paddingBottom: 10,
    },
    dietaryTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        color: '#444',
    },
    allergenTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        color: '#ff6b6b',
    },
    dietaryFlags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    allergenFlags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    dietaryFlag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e8f5e9',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    allergenFlag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffe5e5',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    flagIcon: {
        fontSize: 16,
    },
    allergenIcon: {
        fontSize: 16,
    },
    flagText: {
        fontSize: 14,
        color: '#2e7d32',
        fontWeight: '500',
    },
    allergenText: {
        fontSize: 14,
        color: '#d32f2f',
        fontWeight: '500',
    },
    servingAdjuster: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        marginHorizontal: 20,
        marginTop: 10,
        backgroundColor: '#f8f8f8',
        borderRadius: 10,
        gap: 15,
    },
    servingButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    servingButtonDisabled: {
        backgroundColor: '#f5f5f5',
        borderColor: '#eee',
    },
    servingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        minWidth: 100,
        justifyContent: 'center',
    },
    servingText: {
        fontSize: 16,
        color: '#666',
        fontWeight: '500',
    },
    ingredientContainer: {
        flex: 1,
    },
    ingredientRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    quantityBox: {
        backgroundColor: '#f0f0f0',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        minWidth: 70,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    quantityBoxScaled: {
        backgroundColor: '#e3f2fd',
        borderColor: '#90caf9',
    },
    quantityText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#424242',
    },
    quantityTextScaled: {
        color: '#1976d2',
    },
    originalContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        marginLeft: 8,
    },
    originalLabel: {
        fontSize: 12,
        color: '#999',
        fontStyle: 'italic',
        marginRight: 4,
    },
}); 