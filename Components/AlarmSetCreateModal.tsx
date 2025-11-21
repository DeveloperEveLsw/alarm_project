import React, { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

type Props = {
  visible: boolean;
  defaultLabel: string;
  onSubmit: (label: string) => Promise<void> | void;
  onCancel: () => void;
  isSaving?: boolean;
};

const AlarmSetCreateModal: React.FC<Props> = ({ visible, defaultLabel, onSubmit, onCancel, isSaving = false }) => {
  const [label, setLabel] = useState(defaultLabel);

  useEffect(() => {
    if (visible) {
      setLabel(defaultLabel);
    }
  }, [defaultLabel, visible]);

  const handleConfirm = async () => {
    const trimmed = label.trim();
    if (!trimmed) {
      Alert.alert('알람 세트 이름', '세트 이름을 입력해 주세요.');
      return;
    }
    await onSubmit(trimmed);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>알람 세트 만들기</Text>
          <Text style={styles.helper}>선택한 알람을 묶어서 세트로 저장합니다.</Text>
          <TextInput
            style={styles.input}
            value={label}
            onChangeText={setLabel}
            editable={!isSaving}
            placeholder="세트 이름"
            autoFocus
          />
          <View style={styles.actions}>
            <Pressable style={[styles.actionButton, styles.cancelButton]} onPress={onCancel} disabled={isSaving}>
              <Text style={[styles.actionLabel, styles.cancelLabel]}>취소</Text>
            </Pressable>
            <Pressable
              style={[styles.actionButton, styles.confirmButton, (isSaving || label.trim().length === 0) && styles.disabledButton]}
              onPress={handleConfirm}
              disabled={isSaving || label.trim().length === 0}
            >
              <Text style={styles.confirmLabel}>{isSaving ? '저장 중...' : '저장'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#00000055',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    borderRadius: 20,
    backgroundColor: '#fff',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  helper: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
  },
  input: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
  actions: {
    marginTop: 24,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  cancelButton: {
    backgroundColor: '#e5e7eb',
  },
  confirmButton: {
    backgroundColor: '#2563eb',
    marginLeft: 12,
  },
  disabledButton: {
    opacity: 0.6,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  cancelLabel: {
    color: '#1f2937',
  },
  confirmLabel: {
    color: '#fff',
  },
});

export default AlarmSetCreateModal;
