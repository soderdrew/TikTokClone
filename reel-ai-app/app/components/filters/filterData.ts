export interface FilterCategory {
  id: string;
  title: string;
  icon: string;
  items: string[];
}

export interface Filters {
  dietaryFlags: string[];
  cookingTime: string[];
  cuisine: string[];
  difficulty: string[];
}

export const filterCategories: FilterCategory[] = [
  {
    id: 'dietaryFlags',
    title: 'Dietary',
    icon: 'leaf-outline',
    items: [
      'Vegetarian',
      'Vegan',
      'Gluten-Free',
      'Dairy-Free',
      'Keto',
      'Low-Carb',
      'Paleo',
    ],
  },
  {
    id: 'cookingTime',
    title: 'Cook Time',
    icon: 'time-outline',
    items: [
      'Under 15 mins',
      '15-30 mins',
      '30-60 mins',
      'Over 60 mins',
    ],
  },
  {
    id: 'cuisine',
    title: 'Cuisine',
    icon: 'restaurant-outline',
    items: [
      'Italian',
      'Chinese',
      'Mexican',
      'Indian',
      'Japanese',
      'Thai',
      'Mediterranean',
      'American',
      'French',
    ],
  },
  {
    id: 'difficulty',
    title: 'Difficulty',
    icon: 'speedometer-outline',
    items: [
      'Easy',
      'Medium',
      'Hard',
    ],
  },
]; 