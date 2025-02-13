import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    Animated,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scaleRecipe } from '../../utils/recipeUtils';
import { getInventoryItems } from '../../services/inventoryService';
import { convertQuantity, areUnitsConvertible } from '../../services/inventoryService';
import { DatabaseService, functions } from '../../services/appwrite';

interface RecipeModalProps {
    visible: boolean;
    onClose: () => void;
    recipe: {
        $id?: string;
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
        nutritionFacts?: string;
    };
}

interface NutritionFacts {
    calories: string;
    totalFat: string;
    saturatedFat: string;
    cholesterol: string;
    sodium: string;
    carbohydrates: string;
    fiber: string;
    sugar: string;
    protein: string;
    servingSize: string;
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
            .map(item => item.trim()); // Trim whitespace
    }

    // If it's already an array, clean and format
    return ingredients
        .map(item => item.trim().replace(/^["']|["']$/g, ''));
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

interface IngredientStatus {
    status: 'sufficient' | 'insufficient' | 'missing';
    tooltip?: string;
}

const IngredientQuantity = ({ 
    ingredient, 
    isScaled, 
    scalingRatio = 1, 
    availabilityStatus 
}: { 
    ingredient: string; 
    isScaled: boolean;
    scalingRatio?: number;
    availabilityStatus?: { status: 'sufficient' | 'insufficient' | 'missing'; tooltip?: string };
}) => {
    const [showTooltip, setShowTooltip] = useState(false);

    // Match only the numeric part at the start
    const match = ingredient.match(/^(\d+(?:\/\d+)?(?:\s*\d+\/\d+)?)\s*(.*)/);
    
    if (!match) {
        return (
            <TouchableOpacity 
                onPress={() => availabilityStatus?.tooltip && setShowTooltip(!showTooltip)}
                style={styles.ingredientContainer}
            >
                <Text style={[
                    styles.listText,
                    availabilityStatus?.status === 'sufficient' && styles.sufficientIngredient,
                    availabilityStatus?.status === 'insufficient' && styles.insufficientIngredient
                ]}>{ingredient}</Text>
                {showTooltip && availabilityStatus?.tooltip && (
                    <View style={styles.tooltip}>
                        <Text style={styles.tooltipText}>{availabilityStatus.tooltip}</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    }

    const [_, quantity, remainingText] = match;
    const displayQuantity = isScaled ? scaleQuantity(quantity, scalingRatio) : quantity;

    return (
        <TouchableOpacity 
            onPress={() => availabilityStatus?.tooltip && setShowTooltip(!showTooltip)}
            style={styles.ingredientContainer}
        >
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
                <Text style={[
                    styles.listText,
                    availabilityStatus?.status === 'sufficient' && styles.sufficientIngredient,
                    availabilityStatus?.status === 'insufficient' && styles.insufficientIngredient
                ]}>{remainingText.trim()}</Text>
            </View>
            {showTooltip && availabilityStatus?.tooltip && (
                <View style={styles.tooltip}>
                    <Text style={styles.tooltipText}>{availabilityStatus.tooltip}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
};

// Helper function to scale nutrition values
const scaleNutritionValue = (value: string, scale: number): string => {
    // Extract number and unit
    const match = value.match(/^([\d.]+)\s*(.*)$/);
    if (!match) return value;

    const [_, number, unit] = match;
    const scaledNumber = (parseFloat(number) * scale).toFixed(1);
    return `${scaledNumber}${unit ? ` ${unit}` : ''}`;
};

const scaleNutritionFacts = (facts: NutritionFacts, scale: number): NutritionFacts => {
    return {
        ...facts,
        calories: scaleNutritionValue(facts.calories, scale),
        totalFat: scaleNutritionValue(facts.totalFat, scale),
        saturatedFat: scaleNutritionValue(facts.saturatedFat, scale),
        cholesterol: scaleNutritionValue(facts.cholesterol, scale),
        sodium: scaleNutritionValue(facts.sodium, scale),
        carbohydrates: scaleNutritionValue(facts.carbohydrates, scale),
        fiber: scaleNutritionValue(facts.fiber, scale),
        sugar: scaleNutritionValue(facts.sugar, scale),
        protein: scaleNutritionValue(facts.protein, scale),
        servingSize: facts.servingSize // Keep original serving size reference
    };
};

export default function RecipeModal({ visible, onClose, recipe }: RecipeModalProps) {
    const [multiplier, setMultiplier] = useState(1);
    const [kitchenInventory, setKitchenInventory] = useState<any[]>([]);
    const [ingredientStatus, setIngredientStatus] = useState<{[key: string]: IngredientStatus}>({});
    const [showNutrition, setShowNutrition] = useState(false);
    const [baseNutritionFacts, setBaseNutritionFacts] = useState<NutritionFacts | null>(null);
    const [isLoadingNutrition, setIsLoadingNutrition] = useState(false);
    const scalingRatio = multiplier;

    // Get the scaled nutrition facts
    const scaledNutritionFacts = useMemo(() => {
        if (!baseNutritionFacts) return null;
        return multiplier === 1 ? baseNutritionFacts : scaleNutritionFacts(baseNutritionFacts, multiplier);
    }, [baseNutritionFacts, multiplier]);

    useEffect(() => {
        if (visible) {
            fetchKitchenInventory();
        }
    }, [visible]);

    // Add a separate effect to recheck availability when multiplier changes
    useEffect(() => {
        if (kitchenInventory.length > 0) {
            checkIngredientsAvailability(kitchenInventory);
        }
    }, [multiplier]);

    const fetchKitchenInventory = async () => {
        try {
            const items = await getInventoryItems();
            setKitchenInventory(items);
            checkIngredientsAvailability(items);
        } catch (error) {
            console.error('Error fetching kitchen inventory:', error);
        }
    };

    const fetchNutritionFacts = async () => {
        // If we already have nutrition facts or no recipe ID, return
        if (!recipe.$id || (recipe.nutritionFacts && JSON.parse(recipe.nutritionFacts))) {
            if (recipe.nutritionFacts) {
                setBaseNutritionFacts(JSON.parse(recipe.nutritionFacts));
            }
            return;
        }
        
        setIsLoadingNutrition(true);
        try {
            const execution = await functions.createExecution(
                'generateNutritionFacts',
                JSON.stringify({ videoId: recipe.$id })
            );

            if (execution.status === 'completed' && execution.responseBody) {
                const response = JSON.parse(execution.responseBody);
                if (response.success && response.nutritionFacts) {
                    setBaseNutritionFacts(response.nutritionFacts);
                }
            }
        } catch (error) {
            console.error('Error fetching nutrition facts:', error);
        } finally {
            setIsLoadingNutrition(false);
        }
    };

    const parseIngredient = (ingredient: string) => {
        // Remove any leading bullet points or dashes
        const cleanIngredient = ingredient.replace(/^[-•]\s*/, '');
        
        // Match quantity, unit, and item name
        const match = cleanIngredient.match(/^(\d+(?:\/\d+)?(?:\s*\d+\/\d+)?)\s*([a-zA-Z]+)?\s*(.*)/);
        
        if (!match) {
            // If no match, treat the whole thing as the item name
            return {
                quantity: 1,
                unit: 'units',
                itemName: cleanIngredient.toLowerCase().trim()
            };
        }
        
        const [_, quantity, unit, itemName] = match;
        return {
            quantity: quantity ? parseFloat(eval(quantity.replace(' ', '+') || '1')) : 1, // Default to 1 if no quantity
            unit: unit?.toLowerCase() || 'units',
            itemName: itemName.toLowerCase().trim()
        };
    };

    // Helper function to get both singular and plural forms of a word
    const getWordForms = (word: string): string[] => {
        const lower = word.toLowerCase();
        if (lower.endsWith('ies')) {
            // berries -> berry
            return [lower, lower.slice(0, -3) + 'y'];
        } else if (lower.endsWith('es')) {
            // tomatoes -> tomato
            return [lower, lower.slice(0, -2)];
        } else if (lower.endsWith('s')) {
            // eggs -> egg
            return [lower, lower.slice(0, -1)];
        } else {
            // egg -> eggs
            return [lower, lower + 's'];
        }
    };

    // Helper function to check if words match (including all plural forms)
    const wordsMatch = (recipeWord: string, availableWord: string) => {
        // Special case for eggs
        const recipeWordLower = recipeWord.toLowerCase();
        const availableWordLower = availableWord.toLowerCase();
        if ((recipeWordLower === 'egg' && availableWordLower === 'eggs') ||
            (recipeWordLower === 'eggs' && availableWordLower === 'egg')) {
            return true;
        }

        const recipeForms = getWordForms(recipeWord);
        const availableForms = getWordForms(availableWord);
        return recipeForms.some(r => availableForms.includes(r));
    };

    const checkIngredientsAvailability = (inventory: any[]) => {
        const newStatus: {[key: string]: IngredientStatus} = {};
        
        const formattedIngredients = formatIngredients(recipe.ingredients);
        formattedIngredients.forEach(ingredient => {
            const parsed = parseIngredient(ingredient);
            if (!parsed) {
                newStatus[ingredient] = { 
                    status: 'missing',
                    tooltip: 'Ingredient not found in your kitchen inventory'
                };
                return;
            }

            // More strict matching: Split both names into words and check for exact word matches
            const ingredientWords = parsed.itemName.split(/\s+/)
                .filter((word: string) => word.length > 2);

            const matchingItem = inventory.find(item => {
                const itemWords = item.name.toLowerCase().split(/\s+/);
                return ingredientWords.some((recipeWord: string) => 
                    itemWords.some((availableWord: string) => 
                        wordsMatch(recipeWord, availableWord)
                    )
                );
            });

            if (!matchingItem) {
                newStatus[ingredient] = { 
                    status: 'missing',
                    tooltip: 'Ingredient not found in your kitchen inventory'
                };
                return;
            }

            const scaledQuantity = parsed.quantity * multiplier;

            if (areUnitsConvertible(parsed.unit, matchingItem.unit)) {
                const convertedScaledQuantity = convertQuantity(scaledQuantity, parsed.unit, matchingItem.unit);
                const isSufficient = matchingItem.quantity >= convertedScaledQuantity;
                
                if (isSufficient) {
                    newStatus[ingredient] = { 
                        status: 'sufficient',
                        tooltip: `You have this ingredient. You have ${matchingItem.quantity} ${matchingItem.unit} (Recipe needs ${scaledQuantity} ${parsed.unit})`
                    };
                } else {
                    const needed = convertedScaledQuantity - matchingItem.quantity;
                    newStatus[ingredient] = { 
                        status: 'insufficient',
                        tooltip: `You have ${matchingItem.quantity} ${matchingItem.unit}. Need ${needed.toFixed(1)} ${matchingItem.unit} more (Recipe needs ${scaledQuantity} ${parsed.unit})`
                    };
                }
            } else {
                // Even for non-convertible units, show what we have
                newStatus[ingredient] = { 
                    status: 'sufficient',
                    tooltip: `You have this ingredient. You have ${matchingItem.quantity} ${matchingItem.unit} (Recipe needs ${scaledQuantity} ${parsed.unit})`
                };
            }
        });

        setIngredientStatus(newStatus);
    };

    const updateMultiplier = (newMultiplier: number) => {
        if (newMultiplier < 0.5 || newMultiplier > 10) return;
        setMultiplier(newMultiplier);
        // Immediately recheck ingredients when multiplier changes
        if (kitchenInventory.length > 0) {
            checkIngredientsAvailability(kitchenInventory);
        }
    };

    const ServingAdjuster = () => (
        <View style={styles.servingAdjuster}>
            <TouchableOpacity 
                onPress={() => updateMultiplier(multiplier - 0.5)}
                style={[styles.servingButton, multiplier <= 0.5 && styles.servingButtonDisabled]}
                disabled={multiplier <= 0.5}
            >
                <Ionicons name="remove" size={20} color={multiplier <= 0.5 ? '#ccc' : '#666'} />
            </TouchableOpacity>
            <View style={styles.servingInfo}>
                <View style={styles.servingContent}>
                    <Ionicons name="calculator-outline" size={20} color="#666" />
                    <Text style={styles.servingText}>{multiplier}x</Text>
                    <Text style={styles.servingSubtext}>({Math.round(recipe.servingSize! * multiplier)} servings)</Text>
                </View>
            </View>
            <TouchableOpacity 
                onPress={() => updateMultiplier(multiplier + 0.5)}
                style={[styles.servingButton, multiplier >= 10 && styles.servingButtonDisabled]}
                disabled={multiplier >= 10}
            >
                <Ionicons name="add" size={20} color={multiplier >= 10 ? '#ccc' : '#666'} />
            </TouchableOpacity>
        </View>
    );

    const formattedIngredients = formatIngredients(recipe.ingredients);
    const formattedInstructions = formatInstructions(recipe.instructions);
    const formattedTips = formatTips(recipe.tips);
    
    const NutritionFactsView = () => {
        if (isLoadingNutrition) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#666" />
                    <Text style={styles.loadingText}>Generating nutrition facts...</Text>
                </View>
            );
        }

        if (!scaledNutritionFacts) {
            return (
                <View style={styles.noDataContainer}>
                    <Text style={styles.noDataText}>No nutrition information available</Text>
                </View>
            );
        }

        return (
            <ScrollView style={styles.nutritionContainer}>
                <View style={styles.nutritionHeader}>
                    <Text style={styles.nutritionTitle}>Nutrition Facts</Text>
                    <Text style={styles.servingSizeText}>
                        Serving Size: {scaledNutritionFacts.servingSize}
                        {multiplier !== 1 && ' (Adjusted)'}
                    </Text>
                </View>
                
                <View style={styles.nutritionDivider} />
                
                <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionLabel}>Calories</Text>
                    <Text style={styles.nutritionValue}>{scaledNutritionFacts.calories}</Text>
                </View>
                
                <View style={styles.nutritionDivider} />
                
                <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionLabel}>Total Fat</Text>
                    <Text style={styles.nutritionValue}>{scaledNutritionFacts.totalFat}</Text>
                </View>
                
                <View style={[styles.nutritionItem, styles.subItem]}>
                    <Text style={styles.nutritionLabel}>Saturated Fat</Text>
                    <Text style={styles.nutritionValue}>{scaledNutritionFacts.saturatedFat}</Text>
                </View>
                
                <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionLabel}>Cholesterol</Text>
                    <Text style={styles.nutritionValue}>{scaledNutritionFacts.cholesterol}</Text>
                </View>
                
                <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionLabel}>Sodium</Text>
                    <Text style={styles.nutritionValue}>{scaledNutritionFacts.sodium}</Text>
                </View>
                
                <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionLabel}>Total Carbohydrates</Text>
                    <Text style={styles.nutritionValue}>{scaledNutritionFacts.carbohydrates}</Text>
                </View>
                
                <View style={[styles.nutritionItem, styles.subItem]}>
                    <Text style={styles.nutritionLabel}>Dietary Fiber</Text>
                    <Text style={styles.nutritionValue}>{scaledNutritionFacts.fiber}</Text>
                </View>
                
                <View style={[styles.nutritionItem, styles.subItem]}>
                    <Text style={styles.nutritionLabel}>Sugars</Text>
                    <Text style={styles.nutritionValue}>{scaledNutritionFacts.sugar}</Text>
                </View>
                
                <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionLabel}>Protein</Text>
                    <Text style={styles.nutritionValue}>{scaledNutritionFacts.protein}</Text>
                </View>

                {multiplier !== 1 && (
                    <Text style={styles.scalingNote}>
                        * Values adjusted for {multiplier}x recipe scaling
                    </Text>
                )}
            </ScrollView>
        );
    };

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
                        {showNutrition && (
                            <TouchableOpacity 
                                onPress={() => setShowNutrition(false)} 
                                style={styles.backButton}
                            >
                                <Ionicons name="arrow-back" size={24} color="#666" />
                            </TouchableOpacity>
                        )}
                        <Text style={[styles.title, showNutrition && styles.titleWithBack]}>
                            {recipe.title}
                        </Text>
                        <View style={styles.headerButtons}>
                            {!showNutrition && recipe.$id && (
                                <TouchableOpacity 
                                    onPress={() => {
                                        setShowNutrition(true);
                                        fetchNutritionFacts();
                                    }} 
                                    style={styles.nutritionButton}
                                >
                                    <Ionicons name="nutrition" size={24} color="#666" />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <Ionicons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {showNutrition ? (
                        <NutritionFactsView />
                    ) : (
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
                                    <View style={styles.list}>
                                        {formattedIngredients.map((ingredient, index) => (
                                            <IngredientQuantity
                                                key={index}
                                                ingredient={ingredient}
                                                isScaled={multiplier !== 1}
                                                scalingRatio={scalingRatio}
                                                availabilityStatus={ingredientStatus[ingredient]}
                                            />
                                        ))}
                                    </View>
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
        justifyContent: 'space-between',
        paddingVertical: 15,
        marginHorizontal: 20,
        marginTop: 10,
        backgroundColor: '#f8f8f8',
        borderRadius: 10,
        paddingHorizontal: 15,
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
        flex: 1,
        alignItems: 'center',
        minWidth: 140,
    },
    servingContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        justifyContent: 'center',
    },
    servingText: {
        fontSize: 18,
        color: '#666',
        fontWeight: '600',
        minWidth: 45,
        textAlign: 'center',
    },
    servingSubtext: {
        fontSize: 14,
        color: '#999',
        marginLeft: 4,
        minWidth: 90,
    },
    ingredientContainer: {
        marginBottom: 12,
    },
    ingredientRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    quantityBox: {
        backgroundColor: '#f0f0f0',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        minWidth: 50,
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
    tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 8,
        borderRadius: 6,
        marginTop: 4,
        marginLeft: 66,
    },
    tooltipText: {
        color: 'white',
        fontSize: 12,
    },
    sufficientIngredient: {
        color: '#4CAF50', // Light green
    },
    insufficientIngredient: {
        color: '#FF9800', // Orange
    },
    list: {
        padding: 20,
    },
    headerButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    backButton: {
        padding: 5,
        marginRight: 10,
    },
    nutritionButton: {
        padding: 5,
    },
    titleWithBack: {
        marginLeft: 0,
    },
    nutritionContainer: {
        flex: 1,
        padding: 20,
    },
    nutritionHeader: {
        marginBottom: 20,
    },
    nutritionTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    servingSizeText: {
        fontSize: 16,
        color: '#666',
    },
    nutritionDivider: {
        height: 1,
        backgroundColor: '#ddd',
        marginVertical: 10,
    },
    nutritionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    subItem: {
        paddingLeft: 20,
    },
    nutritionLabel: {
        fontSize: 16,
        color: '#444',
    },
    nutritionValue: {
        fontSize: 16,
        fontWeight: '500',
        color: '#222',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    },
    noDataContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    noDataText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
    scalingNote: {
        fontSize: 12,
        color: '#999',
        marginTop: 10,
        textAlign: 'center',
    },
}); 