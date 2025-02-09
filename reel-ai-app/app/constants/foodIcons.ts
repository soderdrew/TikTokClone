// Food icon mapping for inventory items
export const FOOD_ICONS = {
  // Dairy & Eggs
  milk: require('../../assets/icons/food/milk_carton.png'),
  eggs: require('../../assets/icons/food/egg.png'),
  cheese: require('../../assets/icons/food/cheese.png'),
  bleu_cheese: require('../../assets/icons/food/bleu_cheese.png'),
  yogurt: require('../../assets/icons/food/juice_white.png'),

  // Fruits & Vegetables
  apple: require('../../assets/icons/food/apple.png'),
  banana: require('../../assets/icons/food/banana.png'),
  carrot: require('../../assets/icons/food/carrot.png'),
  lettuce: require('../../assets/icons/food/lettuce.png'),
  potato: require('../../assets/icons/food/potato.png'),
  pumpkin: require('../../assets/icons/food/pumpkin.png'),
  eggplant: require('../../assets/icons/food/eggplant.png'),
  strawberry: require('../../assets/icons/food/strawberry.png'),
  orange: require('../../assets/icons/food/orange.png'),
  grapes: require('../../assets/icons/food/grapes.png'),
  watermelon: require('../../assets/icons/food/watermelon.png'),
  cherry: require('../../assets/icons/food/cherry.png'),
  blueberry: require('../../assets/icons/food/blueberry.png'),
  corn: require('../../assets/icons/food/corn.png'),
  cauliflower: require('../../assets/icons/food/cauliflower.png'),
  garlic: require('../../assets/icons/food/garlic.png'),
  pepper: require('../../assets/icons/food/pepper_red.png'),

  // Bread & Bakery
  bread: require('../../assets/icons/food/bread_loaf.png'),
  bread_slice: require('../../assets/icons/food/bread_slice.png'),
  baguette: require('../../assets/icons/food/baguette.png'),
  cake: require('../../assets/icons/food/cake.png'),
  muffin: require('../../assets/icons/food/muffin.png'),
  donut: require('../../assets/icons/food/donut.png'),

  // Meat & Protein
  meat: require('../../assets/icons/food/meat_1.png'),
  drumstick: require('../../assets/icons/food/drumstick.png'),
  pork: require('../../assets/icons/food/pork_chop.png'),
  burger: require('../../assets/icons/food/hamburger.png'),
  hotdog: require('../../assets/icons/food/hotdog.png'),

  // Prepared Foods
  pizza: require('../../assets/icons/food/pizza_full.png'),
  pizza_slice: require('../../assets/icons/food/pizza_slice.png'),
  sandwich: require('../../assets/icons/food/sandwich.png'),
  salad: require('../../assets/icons/food/salad.png'),
  sushi: require('../../assets/icons/food/sushi.png'),
  soup: require('../../assets/icons/food/soup.png'),

  // Beverages
  coffee: require('../../assets/icons/food/coffee.png'),
  juice: require('../../assets/icons/food/juice_box.png'),
  soda: require('../../assets/icons/food/soda.png'),
  wine: require('../../assets/icons/food/wine_glass.png'),

  // Condiments & Sauces
  honey: require('../../assets/icons/food/honey_jar.png'),
  jam: require('../../assets/icons/food/jam_jar.png'),
  hot_sauce: require('../../assets/icons/food/hot_sauce.png'),

  // Snacks & Desserts
  chocolate: require('../../assets/icons/food/chocolate_bar.png'),
  icecream: require('../../assets/icons/food/icecream_dripping.png'),
  candy: require('../../assets/icons/food/candy.png'),
  lollipop: require('../../assets/icons/food/lollipop.png'),

  // Rice & Grains
  rice: require('../../assets/icons/food/rice.png'),

  // Default icon for unknown items
  default: require('../../assets/icons/food/cutting_board.png'),
} as const;

export type FoodIconType = keyof typeof FOOD_ICONS;

// Helper function to get icon for an item
export function getFoodIcon(itemName: string): any {
  const normalizedName = itemName.toLowerCase().trim();
  const iconKey = Object.keys(FOOD_ICONS).find(key => 
    normalizedName.includes(key)
  ) as FoodIconType;
  
  return FOOD_ICONS[iconKey] || FOOD_ICONS.default;
} 