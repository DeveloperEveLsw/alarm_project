import { localDatabase, type CategoryNative } from './db/localDatabase';
import type { Category } from '../types/category.types';

const CATEGORY_COLORS = ['#3B82F6', '#10B981', '#F97316', '#EC4899', '#8B5CF6', '#F59E0B', '#6366F1', '#14B8A6'];
let colorCursor = 0;

const nextColor = (): string => {
  const color = CATEGORY_COLORS[colorCursor % CATEGORY_COLORS.length];
  colorCursor += 1;
  return color;
};

const mapNative = (row: CategoryNative): Category => ({
  id: Number(row.id),
  name: row.name,
  color: row.color,
});

const getCategories = async (): Promise<Category[]> => {
  const rows = await localDatabase.fetchCategories();
  return rows.map(mapNative);
};

const createCategory = async (name: string, color?: string): Promise<Category> => {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('카테고리 이름을 입력해 주세요.');
  }
  const resolvedColor = color ?? nextColor();
  const created = await localDatabase.createCategory(trimmed, resolvedColor);
  return mapNative(created);
};

export const categoryService = {
  getCategories,
  createCategory,
};
