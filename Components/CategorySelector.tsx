import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import type { Category } from '../types/category.types';

type Props = {
  categories: Category[];
  value: number | null;
  onChange: (categoryId: number | null) => void;
  onCreateCategory: (name: string) => Promise<Category>;
  label?: string;
  placeholder?: string;
};

const CategorySelector: React.FC<Props> = ({
  categories,
  value,
  onChange,
  onCreateCategory,
  label = '카테고리',
  placeholder = '카테고리를 선택하세요',
}) => {
  const [isVisible, setVisible] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const selectedCategory = useMemo(() => categories.find(category => category.id === value), [categories, value]);

  const handleSelect = useCallback(
    (categoryId: number | null) => {
      onChange(categoryId);
      setVisible(false);
    },
    [onChange],
  );

  const handleCreateCategory = useCallback(async () => {
    const name = newCategoryName.trim();
    if (!name) {
      return;
    }
    setIsCreating(true);
    try {
      const created = await onCreateCategory(name);
      setNewCategoryName('');
      onChange(created.id);
      setVisible(false);
    } catch (error) {
      console.error('Failed to create category', error);
      Alert.alert('카테고리 추가 실패', '카테고리를 추가하는 중 오류가 발생했습니다.');
    } finally {
      setIsCreating(false);
    }
  }, [newCategoryName, onChange, onCreateCategory]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.selector} onPress={() => setVisible(true)}>
        {selectedCategory ? (
          <View style={styles.selectionContent}>
            <View style={[styles.colorDot, { backgroundColor: selectedCategory.color }]} />
            <Text style={styles.selectionText}>{selectedCategory.name}</Text>
          </View>
        ) : (
          <Text style={styles.placeholder}>{placeholder}</Text>
        )}
      </TouchableOpacity>
      <Modal visible={isVisible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>카테고리 선택</Text>
            <ScrollView style={styles.modalList}>
              <TouchableOpacity style={styles.modalRow} onPress={() => handleSelect(null)}>
                <Text style={styles.modalRowText}>카테고리 없음</Text>
              </TouchableOpacity>
              {categories.map(category => (
                <TouchableOpacity key={category.id} style={styles.modalRow} onPress={() => handleSelect(category.id)}>
                  <View style={styles.selectionContent}>
                    <View style={[styles.colorDot, { backgroundColor: category.color }]} />
                    <Text style={styles.modalRowText}>{category.name}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.newCategoryContainer}>
              <TextInput
                style={styles.newCategoryInput}
                placeholder="새 카테고리 이름"
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                editable={!isCreating}
              />
              <TouchableOpacity
                style={[styles.createButton, !newCategoryName.trim() || isCreating ? styles.createButtonDisabled : null]}
                onPress={handleCreateCategory}
                disabled={!newCategoryName.trim() || isCreating}
              >
                {isCreating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.createButtonText}>추가</Text>}
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={() => setVisible(false)}>
              <Text style={styles.closeButtonText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  selector: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  selectionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  selectionText: {
    fontSize: 15,
    color: '#111827',
  },
  placeholder: {
    fontSize: 15,
    color: '#9ca3af',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#111827',
  },
  modalList: {
    maxHeight: 260,
  },
  modalRow: {
    paddingVertical: 10,
  },
  modalRowText: {
    fontSize: 15,
    color: '#111827',
  },
  newCategoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 12,
  },
  newCategoryInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  createButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#2563eb',
    fontWeight: '600',
    fontSize: 15,
  },
});

export default CategorySelector;
