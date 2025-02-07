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
  ActivityIndicator,
  Image,
  Animated,
  Alert,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DatabaseService, AuthService } from '../services/appwrite';
import { Models } from 'react-native-appwrite';
import { router } from 'expo-router';
import { debounce } from 'lodash';

const { width } = Dimensions.get('window');
const CATEGORY_WIDTH = width * 0.4;

interface Recipe extends Models.Document {
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  cuisine: string;
  difficulty: string;
  cookingTime: number;
  likesCount: number;
  commentsCount: number;
  userId: string;
}

interface SearchHistoryItem extends Models.Document {
  userId: string;
  query: string;
  createdAt: string;
  updatedAt: string;
}

export default function ExploreScreen() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('');
  const [recipes, setRecipes] = React.useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchHistory, setSearchHistory] = React.useState<SearchHistoryItem[]>([]);
  const [showSearchHistory, setShowSearchHistory] = React.useState(false);
  const [userId, setUserId] = React.useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [hasMoreHistory, setHasMoreMore] = React.useState(true);
  const [hasMoreRecipes, setHasMoreRecipes] = React.useState(true);
  const lastHistoryId = React.useRef<string | null>(null);
  const lastRecipeId = React.useRef<string | null>(null);

  const searchOpacity = React.useRef(new Animated.Value(0)).current;

  const categories = [
    { id: '1', name: 'Quick & Easy', icon: 'timer-outline', cuisine: 'quick' },
    { id: '2', name: 'Italian', icon: 'pizza-outline', cuisine: 'italian' },
    { id: '3', name: 'Chinese', icon: 'restaurant-outline', cuisine: 'chinese' },
    { id: '4', name: 'Mexican', icon: 'flame-outline', cuisine: 'mexican' },
    { id: '5', name: 'Desserts', icon: 'ice-cream-outline', cuisine: 'dessert' },
    { id: '6', name: 'Healthy', icon: 'leaf-outline', cuisine: 'healthy' },
  ];

  React.useEffect(() => {
    loadUserAndData();
  }, []);

  React.useEffect(() => {
    loadRecipes();
  }, [selectedCategory]);

  const loadUserAndData = async () => {
    try {
      const user = await AuthService.getCurrentUser();
      if (user) {
        setUserId(user.$id);
        loadSearchHistory(user.$id);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadSearchHistory = async (uid: string, loadMore: boolean = false) => {
    try {
      if (loadMore && !hasMoreHistory) return;
      
      setIsLoadingMore(loadMore);
      const history = await DatabaseService.getSearchHistory(uid, 10, loadMore ? lastHistoryId.current : null);
      
      if (history.documents.length < 10) {
        setHasMoreMore(false);
      }
      
      if (history.documents.length > 0) {
        lastHistoryId.current = history.documents[history.documents.length - 1].$id;
      }

      const historyItems = history.documents as SearchHistoryItem[];
      setSearchHistory(prev => 
        loadMore ? [...prev, ...historyItems] : historyItems
      );
    } catch (error) {
      console.error('Error loading search history:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMoreHistory && userId) {
      loadSearchHistory(userId, true);
    }
  };

  const loadRecipes = async (loadMore: boolean = false) => {
    try {
      if (!loadMore) {
        setIsLoading(true);
        lastRecipeId.current = null;
      } else {
        if (!hasMoreRecipes || isLoadingMore) return;
        setIsLoadingMore(true);
      }

      let recipesData;
      if (selectedCategory) {
        const category = categories.find(c => c.name === selectedCategory);
        recipesData = await DatabaseService.getRecipesByCuisine(
          category?.cuisine || '',
          10,
          loadMore ? lastRecipeId.current : null
        );
      } else {
        recipesData = await DatabaseService.getAllRecipes(
          10,
          loadMore ? lastRecipeId.current : null
        );
      }

      if (recipesData.documents.length < 10) {
        setHasMoreRecipes(false);
      } else {
        setHasMoreRecipes(true);
      }

      if (recipesData.documents.length > 0) {
        lastRecipeId.current = recipesData.documents[recipesData.documents.length - 1].$id;
      }

      setRecipes(prev => 
        loadMore ? [...prev, ...recipesData.documents] : recipesData.documents
      );
    } catch (error) {
      console.error('Error loading recipes:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleLoadMoreRecipes = () => {
    if (!isLoadingMore && hasMoreRecipes) {
      loadRecipes(true);
    }
  };

  const debouncedAddToHistory = React.useCallback(
    debounce(async (query: string, uid: string) => {
      if (query.trim() && uid) {
        try {
          await DatabaseService.addSearchQuery(uid, query);
          loadSearchHistory(uid);
        } catch (error) {
          console.error('Error adding to search history:', error);
        }
      }
    }, 1000),
    []
  );

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (text.trim()) {
      setShowSearchHistory(false);
      if (userId) {
        debouncedAddToHistory(text, userId);
      }
    } else {
      setShowSearchHistory(true);
    }
  };

  const handleSearchFocus = () => {
    setShowSearchHistory(true);
    Animated.timing(searchOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleHistoryItemPress = async (query: string) => {
    console.log('handleHistoryItemPress called with query:', query);
    setSearchQuery(query);
    console.log('searchQuery set to:', query);
    setShowSearchHistory(false);
    setSelectedCategory('');
    Keyboard.dismiss();

    // Update the timestamp of the clicked item to move it to top
    if (userId) {
      try {
        await DatabaseService.addSearchQuery(userId, query);
        loadSearchHistory(userId);
      } catch (error) {
        console.error('Error updating search history item:', error);
      }
    }
  };

  const handleClearHistory = async () => {
    if (!userId) return;
    
    Alert.alert(
      'Clear Search History',
      'Are you sure you want to clear your search history?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await DatabaseService.clearSearchHistory(userId);
              setSearchHistory([]);
            } catch (error) {
              console.error('Error clearing search history:', error);
            }
          },
        },
      ]
    );
  };

  const handleDeleteHistoryItem = async (queryId: string) => {
    try {
      await DatabaseService.deleteSearchQuery(queryId);
      if (userId) {
        loadSearchHistory(userId);
      }
    } catch (error) {
      console.error('Error deleting search query:', error);
    }
  };

  const filteredRecipes = recipes.filter(recipe => 
    recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    recipe.cuisine.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const navigateToRecipe = (recipeId: string) => {
    router.push(`/(video)/${recipeId}`);
  };

  const dismissKeyboardAndSearch = () => {
    Keyboard.dismiss();
    setShowSearchHistory(false);
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.mainContainer}>
        <View style={styles.searchContainer}>
          {showSearchHistory || searchQuery || selectedCategory ? (
            <TouchableOpacity 
              onPress={() => {
                setShowSearchHistory(false);
                setSearchQuery('');
                setSelectedCategory('');
                Keyboard.dismiss();
              }}
              style={styles.searchIcon}
            >
              <Ionicons name="arrow-back" size={24} color="#666" />
            </TouchableOpacity>
          ) : (
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          )}
          <TextInput
            style={styles.searchInput}
            placeholder="Search recipes..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={handleSearchChange}
            onFocus={handleSearchFocus}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => handleSearchChange('')}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          ) : null}
        </View>

        {showSearchHistory && searchHistory.length > 0 ? (
          <>
            {/* Backdrop */}
            <TouchableWithoutFeedback onPress={() => {
              setShowSearchHistory(false);
              setSearchQuery('');
              Keyboard.dismiss();
            }}>
              <View style={styles.backdrop} />
            </TouchableWithoutFeedback>

            {/* Search History Container */}
            <Animated.View 
              style={[
                styles.searchHistoryContainer,
                { opacity: searchOpacity }
              ]}
              pointerEvents="box-none"
            >
              <View style={styles.searchHistoryHeader}>
                <Text style={styles.searchHistoryTitle}>Recent Searches</Text>
                <TouchableOpacity onPress={handleClearHistory}>
                  <Text style={styles.clearHistoryText}>Clear All</Text>
                </TouchableOpacity>
              </View>
              <ScrollView 
                style={styles.searchHistoryScroll}
                showsVerticalScrollIndicator={true}
              >
                {searchHistory.map((item) => {
                  console.log('Rendering search history item:', item.query);
                  return (
                    <TouchableOpacity
                      key={item.$id}
                      style={styles.searchHistoryItem}
                      activeOpacity={0.7}
                      onPress={() => {
                        console.log('Search history item pressed:', item.query);
                        handleHistoryItemPress(item.query);
                      }}
                    >
                      <View style={styles.searchHistoryItemContent}>
                        <Ionicons name="time-outline" size={20} color="#666" />
                        <Text style={styles.searchHistoryItemText}>{item.query}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={(e) => {
                          console.log('Delete button pressed');
                          handleDeleteHistoryItem(item.$id);
                        }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="close" size={20} color="#666" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })}
                {isLoadingMore && (
                  <ActivityIndicator 
                    style={styles.loadingMore} 
                    size="small" 
                    color="#007AFF" 
                  />
                )}
              </ScrollView>
            </Animated.View>
          </>
        ) : (
          <View style={styles.contentContainer}>
            {/* Categories */}
            {!searchQuery && (
              <>
                <Text style={styles.sectionTitle}>Categories</Text>
                <View style={styles.categoriesWrapper}>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.categoriesContainer}
                    contentContainerStyle={styles.categoriesContent}
                  >
                    {categories.map((category) => (
                      <TouchableOpacity
                        key={category.id}
                        style={[
                          styles.categoryCard,
                          selectedCategory === category.name && styles.selectedCategory
                        ]}
                        onPress={() => {
                          setSelectedCategory(
                            selectedCategory === category.name ? '' : category.name
                          );
                          setHasMoreRecipes(true);
                          lastRecipeId.current = null;
                        }}
                      >
                        <Ionicons name={category.icon as any} size={24} color="white" />
                        <Text style={styles.categoryText}>{category.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </>
            )}

            {/* Recipes Grid */}
            <Text style={styles.sectionTitle}>
              {searchQuery ? 'Search Results' : selectedCategory ? `${selectedCategory} Recipes` : 'Popular Recipes'}
            </Text>
            {isLoading && !recipes.length ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
              </View>
            ) : filteredRecipes.length === 0 ? (
              <View style={styles.noResultsContainer}>
                <Ionicons name="search-outline" size={50} color="#666" />
                <Text style={styles.noResultsText}>No recipes found</Text>
                <Text style={styles.noResultsSubtext}>
                  Try adjusting your search or explore other categories
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredRecipes}
                numColumns={2}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.recipeCard}
                    onPress={() => navigateToRecipe(item.$id)}
                  >
                    <View style={styles.recipePlaceholder}>
                      {item.thumbnailUrl ? (
                        <Image 
                          source={{ uri: item.thumbnailUrl }} 
                          style={styles.recipeImage}
                        />
                      ) : (
                        <Ionicons name="restaurant" size={24} color="white" />
                      )}
                    </View>
                    <Text style={styles.recipeTitle}>{item.title}</Text>
                    <View style={styles.recipeInfo}>
                      <Text style={styles.recipeCategory}>{item.cuisine}</Text>
                      <Text style={styles.recipeTime}>{item.cookingTime} min</Text>
                    </View>
                  </TouchableOpacity>
                )}
                keyExtractor={item => item.$id}
                contentContainerStyle={styles.recipeGrid}
                onEndReached={handleLoadMoreRecipes}
                onEndReachedThreshold={0.5}
                ListFooterComponent={() => (
                  isLoadingMore ? (
                    <View style={styles.loadingMore}>
                      <ActivityIndicator size="small" color="#007AFF" />
                    </View>
                  ) : null
                )}
              />
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 50,
  },
  mainContainer: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    marginTop: 15,
    marginHorizontal: 15,
    paddingHorizontal: 15,
    borderRadius: 10,
    height: 50,
  },
  searchIcon: {
    marginRight: 10,
    padding: 4,
    width: 28,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    height: '100%',
  },
  searchHistoryContainer: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 15,
    marginTop: 8,
    marginBottom: 15,
    borderRadius: 10,
    padding: 15,
    flex: 1,
  },
  searchHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  searchHistoryTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  clearHistoryText: {
    color: '#007AFF',
    fontSize: 14,
  },
  searchHistoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  searchHistoryItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  searchHistoryItemText: {
    color: '#666',
    fontSize: 14,
    marginLeft: 10,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 15,
    marginTop: 5,
    marginBottom: 8,
  },
  categoriesWrapper: {
    height: 100,
    marginBottom: 15,
  },
  categoriesContainer: {
    paddingLeft: 15,
  },
  categoriesContent: {
    paddingRight: 15,
  },
  categoryCard: {
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 12,
    marginRight: 10,
    width: CATEGORY_WIDTH,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCategory: {
    backgroundColor: '#007AFF',
  },
  categoryText: {
    color: 'white',
    marginTop: 8,
    fontSize: 14,
  },
  recipeGrid: {
    padding: 8,
    paddingBottom: 270,
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
  recipeImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchHistoryScroll: {
    flex: 1,
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 65, // Below search bar
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    marginTop: 8,
  },
  noResultsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingTop: 50,
  },
  noResultsText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 15,
    textAlign: 'center',
  },
  noResultsSubtext: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
