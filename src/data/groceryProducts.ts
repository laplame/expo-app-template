/** 20 productos más solicitados para despensa (mock). */
export interface GroceryProduct {
  id: string;
  name: string;
  nameEs: string;
  unit?: string;
  unitEs?: string;
}

export const TOP_20_GROCERY_PRODUCTS: GroceryProduct[] = [
  { id: '1', name: 'Rice', nameEs: 'Arroz', unit: 'kg', unitEs: 'kg' },
  { id: '2', name: 'Vegetable oil', nameEs: 'Aceite vegetal', unit: '1L', unitEs: '1L' },
  { id: '3', name: 'Beans', nameEs: 'Frijol', unit: 'kg', unitEs: 'kg' },
  { id: '4', name: 'Milk', nameEs: 'Leche', unit: '1L', unitEs: '1L' },
  { id: '5', name: 'Eggs', nameEs: 'Huevos', unit: 'dozen', unitEs: 'docena' },
  { id: '6', name: 'Bread', nameEs: 'Pan', unit: 'loaf', unitEs: 'pieza' },
  { id: '7', name: 'Flour', nameEs: 'Harina', unit: 'kg', unitEs: 'kg' },
  { id: '8', name: 'Sugar', nameEs: 'Azúcar', unit: 'kg', unitEs: 'kg' },
  { id: '9', name: 'Salt', nameEs: 'Sal', unit: 'kg', unitEs: 'kg' },
  { id: '10', name: 'Pasta', nameEs: 'Pasta', unit: '500g', unitEs: '500g' },
  { id: '11', name: 'Canned tuna', nameEs: 'Atún en lata', unit: 'can', unitEs: 'lata' },
  { id: '12', name: 'Ham', nameEs: 'Jamón', unit: '200g', unitEs: '200g' },
  { id: '13', name: 'Cheese', nameEs: 'Queso', unit: '200g', unitEs: '200g' },
  { id: '14', name: 'Chicken breast', nameEs: 'Pechuga de pollo', unit: 'kg', unitEs: 'kg' },
  { id: '15', name: 'Toilet paper', nameEs: 'Papel higiénico', unit: 'roll', unitEs: 'rollo' },
  { id: '16', name: 'Soap', nameEs: 'Jabón', unit: 'bar', unitEs: 'barra' },
  { id: '17', name: 'Laundry detergent', nameEs: 'Detergente', unit: '1kg', unitEs: '1kg' },
  { id: '18', name: 'Coffee', nameEs: 'Café', unit: '500g', unitEs: '500g' },
  { id: '19', name: 'Tomato sauce', nameEs: 'Salsa de tomate', unit: '400g', unitEs: '400g' },
  { id: '20', name: 'Bottled water', nameEs: 'Agua embotellada', unit: '6-pack', unitEs: 'paquete 6' },
];
