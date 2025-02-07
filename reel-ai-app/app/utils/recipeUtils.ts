type Unit = {
    value: number;
    unit: string;
};

type ConversionRule = {
    to: string;
    factor: number;
    offset?: number;
};

// Common cooking measurements
const metricToImperial: Record<string, ConversionRule> = {
    // Volume
    'ml': { to: 'fl oz', factor: 0.033814 },
    'l': { to: 'cups', factor: 4.22675 },
    // Weight
    'g': { to: 'oz', factor: 0.035274 },
    'kg': { to: 'lb', factor: 2.20462 },
    // Length
    'cm': { to: 'inch', factor: 0.393701 },
    // Temperature
    'c': { to: 'f', factor: 1.8, offset: 32 },
};

const imperialToMetric: Record<string, ConversionRule> = {
    // Volume
    'fl oz': { to: 'ml', factor: 29.5735 },
    'cups': { to: 'ml', factor: 236.588 },
    'tbsp': { to: 'ml', factor: 14.7868 },
    'tsp': { to: 'ml', factor: 4.92892 },
    // Weight
    'oz': { to: 'g', factor: 28.3495 },
    'lb': { to: 'g', factor: 453.592 },
    // Length
    'inch': { to: 'cm', factor: 2.54 },
    // Temperature
    'f': { to: 'c', factor: 0.555556, offset: -32 },
};

// Extract number and unit from string like "2 cups" or "2cups"
export const parseQuantity = (str: string): Unit | null => {
    const match = str.toLowerCase().match(/^([\d./]+)\s*([a-zA-Z]+)$/);
    if (!match) return null;

    const value = eval(match[1]); // Safely evaluate fractions like "1/2"
    const unit = match[2];
    return { value, unit };
};

// Convert between metric and imperial units
export const convertUnit = (value: number, fromUnit: string, toSystem: 'metric' | 'imperial'): Unit | null => {
    fromUnit = fromUnit.toLowerCase();
    
    if (toSystem === 'imperial' && fromUnit in metricToImperial) {
        const conversion = metricToImperial[fromUnit];
        const newValue = value * conversion.factor + (conversion.offset || 0);
        return { value: Number(newValue.toFixed(2)), unit: conversion.to };
    }
    
    if (toSystem === 'metric' && fromUnit in imperialToMetric) {
        const conversion = imperialToMetric[fromUnit];
        const newValue = (value - (conversion.offset || 0)) * conversion.factor;
        return { value: Number(newValue.toFixed(2)), unit: conversion.to };
    }
    
    return null;
};

// Scale ingredient quantity by a factor
export const scaleQuantity = (quantity: string, scaleFactor: number): string => {
    const regex = /(\d+(?:[./]\d+)?)\s*([a-zA-Z]+)?/g;
    return quantity.replace(regex, (match, num, unit) => {
        const scaled = eval(num) * scaleFactor;
        const roundedValue = Number(scaled.toFixed(2));
        return unit ? `${roundedValue} ${unit}` : `${roundedValue}`;
    });
};

// Format scaled quantity nicely
export const formatQuantity = (value: number, unit?: string): string => {
    // Convert decimal to fraction for common cooking measurements
    const fraction = decimalToFraction(value);
    return unit ? `${fraction} ${unit}` : fraction;
};

// Convert decimal to fraction (e.g., 0.5 to "1/2")
export const decimalToFraction = (decimal: number): string => {
    if (decimal % 1 === 0) return decimal.toString();
    
    const tolerance = 1.0E-6;
    let h1 = 1;
    let h2 = 0;
    let k1 = 0;
    let k2 = 1;
    let b = decimal;
    
    do {
        const a = Math.floor(b);
        const aux = h1;
        h1 = a * h1 + h2;
        h2 = aux;
        const kaux = k1;
        k1 = a * k1 + k2;
        k2 = kaux;
        b = 1 / (b - a);
    } while (Math.abs(decimal - h1 / k1) > decimal * tolerance);

    // Simplify the fraction
    const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
    const divisor = gcd(h1, k1);
    
    return k1 === 1 ? h1.toString() : `${h1 / divisor}/${k1 / divisor}`;
};

// Parse ingredient string to extract quantity and ingredient
export const parseIngredient = (ingredient: string): { quantity: string; ingredient: string; unit: string } => {
    const match = ingredient.match(/^([\d./]+)\s*([a-zA-Z]+)?\s*(.+)$/);
    if (!match) return { quantity: '', unit: '', ingredient };

    return {
        quantity: match[1],
        unit: match[2] || '',
        ingredient: match[3].trim()
    };
};

// Scale recipe for new serving size
export const scaleRecipe = (
    ingredients: string[],
    originalServings: number,
    newServings: number,
    system: 'metric' | 'imperial' = 'imperial'
): string[] => {
    const scaleFactor = newServings / originalServings;
    
    return ingredients.map(ingredient => {
        const parsed = parseIngredient(ingredient);
        if (!parsed.quantity) return ingredient;

        const scaledQuantity = scaleQuantity(parsed.quantity, scaleFactor);
        if (!parsed.unit) return `${scaledQuantity} ${parsed.ingredient}`;

        const converted = parsed.unit && convertUnit(Number(scaledQuantity), parsed.unit, system);
        if (converted) {
            return `${formatQuantity(converted.value, converted.unit)} ${parsed.ingredient}`;
        }

        return `${scaledQuantity} ${parsed.unit} ${parsed.ingredient}`;
    });
}; 