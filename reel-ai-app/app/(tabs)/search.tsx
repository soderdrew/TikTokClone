import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  ScrollView, 
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const CATEGORY_WIDTH = width * 0.4;

interface Recipe {
  id: string;
  title: string;
  category: string;
  time: string;
}

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('');

  const categories = [
    { id: '1', name: 'Quick & Easy', icon: 'timer-outline' },
    { id: '2', name: 'Breakfast', icon: 'sunny-outline' },
    { id: '3', name: 'Lunch', icon: 'restaurant-outline' },
    { id: '4', name: 'Dinner', icon: 'moon-outline' },
    { id: '5', name: 'Desserts', icon: 'ice-cream-outline' },
    { id: '6', name: 'Healthy', icon: 'leaf-outline' },
  ];

  const dummyRecipes: Recipe[] = [
    { id: '1', title: 'Quick Pasta', category: 'Quick & Easy', time: '15 min' },
    { id: '2', title: 'Pancakes', category: 'Breakfast', time: '20 min' },
    { id: '3', title: 'Chicken Salad', category: 'Healthy', time: '25 min' },
  ];

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search recipes..."
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Categories */}
      <Text style={styles.sectionTitle}>Categories</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryCard,
              selectedCategory === category.name && styles.selectedCategory
            ]}
            onPress={() => setSelectedCategory(category.name)}
          >
            <Ionicons name={category.icon as any} size={24} color="white" />
            <Text style={styles.categoryText}>{category.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Popular Recipes */}
      <Text style={styles.sectionTitle}>Popular Recipes</Text>
      <FlatList
        data={dummyRecipes}
        numColumns={2}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.recipeCard}>
            <View style={styles.recipePlaceholder}>
              <Ionicons name="restaurant" size={24} color="white" />
            </View>
            <Text style={styles.recipeTitle}>{item.title}</Text>
            <View style={styles.recipeInfo}>
              <Text style={styles.recipeCategory}>{item.category}</Text>
              <Text style={styles.recipeTime}>{item.time}</Text>
            </View>
          </TouchableOpacity>
        )}
        keyExtractor={item => item.id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 50,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    margin: 15,
    paddingHorizontal: 15,
    borderRadius: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: 'white',
    padding: 12,
    fontSize: 16,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 15,
    marginTop: 20,
    marginBottom: 10,
  },
  categoriesContainer: {
    paddingLeft: 15,
  },
  categoryCard: {
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 12,
    marginRight: 10,
    width: CATEGORY_WIDTH,
    alignItems: 'center',
  },
  selectedCategory: {
    backgroundColor: '#007AFF',
  },
  categoryText: {
    color: 'white',
    marginTop: 8,
    fontSize: 14,
  },
  recipeCard: {
    flex: 1,
    margin: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
  },
  recipePlaceholder: {
    height: 150,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipeTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    padding: 10,
  },
  recipeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    paddingTop: 0,
  },
  recipeCategory: {
    color: '#666',
    fontSize: 12,
  },
  recipeTime: {
    color: '#666',
    fontSize: 12,
  },
}); 