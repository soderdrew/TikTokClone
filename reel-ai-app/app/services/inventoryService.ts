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

// Helper function to normalize item names for comparison
const normalizeItemName = (name: string): string => {
    return name.toLowerCase().trim();
};

// Helper function to check if units are convertible
const areUnitsConvertible = (unit1: string, unit2: string): boolean => {
    const volumeUnits = new Set(['ml', 'l', 'cups', 'tbsp', 'tsp', 'gal', 'gallons', 'gallon']);
    const weightUnits = new Set(['g', 'kg', 'oz', 'lbs', 'pound', 'pounds']);
    const countUnits = new Set(['pcs', 'pack', 'box', 'can', 'bottle', 'piece', 'pieces', 'slice', 'slices']);

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
                // Found a match, combine quantities if units are the same
                if (newItem.unit.toLowerCase() === existingItem.unit.toLowerCase()) {
                    itemsToUpdate.push({
                        ...existingItem,
                        quantity: existingItem.quantity + newItem.quantity
                    });
                } else {
                    // For now, keep them separate if units are different
                    itemsToAdd.push(newItem);
                }
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
        // Prepare payload for AI processing
        const payload = {
            existingItems,
            newItems
        };

        // Call Appwrite Function for AI-powered item combination
        const response = await functions.createExecution(
            'combine_inventory_items', 
            JSON.stringify(payload),
            false, 
            'application/json'
        );

        // Parse the result
        const result = JSON.parse(response.responseBody);

        return {
            itemsToAdd: result.itemsToAdd || [],
            itemsToUpdate: result.itemsToUpdate || []
        };
    } catch (error) {
        console.error('Error combining items with AI:', error);
        
        // Fallback to programmatic combination if AI fails
        return combineInventoryItems(existingItems, newItems);
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