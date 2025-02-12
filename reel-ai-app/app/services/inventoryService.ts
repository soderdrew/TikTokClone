import { databases } from './appwrite';
import { Client, Functions } from 'react-native-appwrite';
import Constants from 'expo-constants';

const databaseId = 'reel-ai-main';
const collectionId = 'inventory_items';

// Initialize Appwrite Client and Functions
const client = new Client()
    .setEndpoint(Constants.expoConfig?.extra?.APPWRITE_ENDPOINT as string)
    .setProject(Constants.expoConfig?.extra?.APPWRITE_PROJECT_ID as string);

const functions = new Functions(client);

// Unit conversion ratios (to base unit)
type UnitConversions = {
    VOLUME: { [key: string]: number };
    WEIGHT: { [key: string]: number };
};

const UNIT_CONVERSIONS: UnitConversions = {
    VOLUME: {
        // Convert everything to milliliters (mL) as base unit
        'ml': 1,
        'l': 1000,
        'liter': 1000,
        'liters': 1000,
        'cup': 236.588,
        'cups': 236.588,
        'tbsp': 14.787,
        'tsp': 4.929,
        'gal': 3785.41,
        'gallon': 3785.41,
        'gallons': 3785.41
    },
    WEIGHT: {
        // Convert everything to grams (g) as base unit
        'g': 1,
        'gram': 1,
        'grams': 1,
        'kg': 1000,
        'oz': 28.3495,
        'lbs': 453.592,
        'pound': 453.592,
        'pounds': 453.592
    }
};

// Helper function to get unit type
const getUnitType = (unit: string): 'VOLUME' | 'WEIGHT' | 'COUNT' | null => {
    unit = unit.toLowerCase();
    const volumeUnits = new Set(['ml', 'l', 'cups', 'tbsp', 'tsp', 'gal', 'gallons', 'gallon', 'cup', 'liter', 'liters']);
    const weightUnits = new Set(['g', 'kg', 'oz', 'lbs', 'pound', 'pounds', 'gram', 'grams']);
    const countUnits = new Set(['pcs', 'pack', 'box', 'can', 'bottle', 'piece', 'pieces', 'slice', 'slices', 'unit', 'units', 'grain', 'grains']);

    if (volumeUnits.has(unit)) return 'VOLUME';
    if (weightUnits.has(unit)) return 'WEIGHT';
    if (countUnits.has(unit)) return 'COUNT';
    return null;
};

// Helper function to convert quantity between units
export const convertQuantity = (quantity: number, fromUnit: string, toUnit: string): number => {
    fromUnit = fromUnit.toLowerCase();
    toUnit = toUnit.toLowerCase();

    // If units are the same, no conversion needed
    if (fromUnit === toUnit) return quantity;

    const unitType = getUnitType(fromUnit);
    if (!unitType || unitType === 'COUNT') return quantity;

    const conversions = UNIT_CONVERSIONS[unitType];
    if (!conversions[fromUnit] || !conversions[toUnit]) return quantity;

    // Convert to base unit, then to target unit
    const baseValue = quantity * conversions[fromUnit];
    return baseValue / conversions[toUnit];
};

// Helper function to normalize item names for comparison
const normalizeItemName = (name: string): string => {
    return name.toLowerCase().trim();
};

// Helper function to check if units are convertible
export const areUnitsConvertible = (unit1: string, unit2: string): boolean => {
    const volumeUnits = new Set(['ml', 'l', 'cups', 'tbsp', 'tsp', 'gal', 'gallons', 'gallon', 'cup', 'liter', 'liters']);
    const weightUnits = new Set(['g', 'kg', 'oz', 'lbs', 'pound', 'pounds', 'gram', 'grams']);
    const countUnits = new Set(['pcs', 'pack', 'box', 'can', 'bottle', 'piece', 'pieces', 'slice', 'slices', 'unit', 'units']);

    unit1 = unit1.toLowerCase();
    unit2 = unit2.toLowerCase();

    if (unit1 === unit2) return true;
    if (volumeUnits.has(unit1) && volumeUnits.has(unit2)) return true;
    if (weightUnits.has(unit1) && weightUnits.has(unit2)) return true;
    if (countUnits.has(unit1) && countUnits.has(unit2)) return true;

    return false;
};

// Function to combine similar items
export const combineInventoryItems = (existingItems: any[], newItems: any[]): { 
    itemsToAdd: any[],
    itemsToUpdate: any[]
} => {
    const itemsToAdd: any[] = [];
    const itemsToUpdate: any[] = [];
    const processedItems = new Set<string>();

    // Process each new item
    for (const newItem of newItems) {
        const normalizedNewName = normalizeItemName(newItem.name);
        let found = false;

        // Check against existing items
        for (const existingItem of existingItems) {
            const normalizedExistingName = normalizeItemName(existingItem.name);
            
            if (normalizedNewName === normalizedExistingName && 
                areUnitsConvertible(newItem.unit, existingItem.unit)) {
                // Found a match, convert units if necessary and combine
                const convertedQuantity = convertQuantity(newItem.quantity, newItem.unit, existingItem.unit);
                itemsToUpdate.push({
                    ...existingItem,
                    quantity: existingItem.quantity + convertedQuantity
                });
                found = true;
                processedItems.add(normalizedNewName);
                break;
            }
        }

        // If no match found, add as new item
        if (!found) {
            itemsToAdd.push(newItem);
        }
    }

    return {
        itemsToAdd,
        itemsToUpdate
    };
};

// AI-powered item combination function
export const combineInventoryItemsWithAI = async (existingItems: any[], newItems: any[]): Promise<{ 
    itemsToAdd: any[],
    itemsToUpdate: any[]
}> => {
    try {
        // Use programmatic combination
        const combinedResults = combineInventoryItems(existingItems, newItems);
        
        // Clean the results
        const cleanItemsToAdd = combinedResults.itemsToAdd.map(item => {
            const { $id, $createdAt, $updatedAt, $permissions, $collectionId, $databaseId, ...rest } = item;
            return rest;
        });

        const cleanItemsToUpdate = combinedResults.itemsToUpdate.map(item => {
            const { $createdAt, $updatedAt, $permissions, $collectionId, $databaseId, ...rest } = item;
            return rest;
        });

        return {
            itemsToAdd: cleanItemsToAdd,
            itemsToUpdate: cleanItemsToUpdate
        };
    } catch (error) {
        console.error('Error combining items:', error);
        throw error;
    }
};

// Create a new inventory item
export const createInventoryItem = async (item: any) => {
    try {
        const response = await databases.createDocument(databaseId, collectionId, 'unique()', item);
        console.log('Item created:', response);
        return response;
    } catch (error) {
        console.error('Error creating item:', error);
        throw error;
    }
};

// Fetch all inventory items
export const getInventoryItems = async () => {
    try {
        const response = await databases.listDocuments(databaseId, collectionId);
        return response.documents;
    } catch (error) {
        console.error('Error fetching items:', error);
        throw error;
    }
};

// Update an inventory item
export const updateInventoryItem = async (documentId: string, updatedData: any) => {
    try {
        const response = await databases.updateDocument(databaseId, collectionId, documentId, updatedData);
        console.log('Item updated:', response);
        return response;
    } catch (error) {
        console.error('Error updating item:', error);
        throw error;
    }
};
 
// Delete an inventory item
export const deleteInventoryItem = async (documentId: string) => {
    try {
        const response = await databases.deleteDocument(databaseId, collectionId, documentId);
        console.log('Item deleted:', response);
        return response;
    } catch (error) {
        console.error('Error deleting item:', error);
        throw error;
    }
};

// Additional CRUD operations can be added here 