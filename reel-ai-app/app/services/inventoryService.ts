import { databases } from './appwrite';

const databaseId = 'reel-ai-main';
const collectionId = 'inventory_items';

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