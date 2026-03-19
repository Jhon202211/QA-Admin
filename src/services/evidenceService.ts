import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase/config';
import type { EvidenceFile } from '../types/testCase';

export const MAX_EVIDENCE_SIZE = 200 * 1024 * 1024; // 200 MB
export const ALLOWED_EVIDENCE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'video/mp4'];
export const ALLOWED_EVIDENCE_EXTENSIONS = '.jpg,.jpeg,.png,.mp4';

export const validateEvidence = (file: File): string | null => {
  if (!ALLOWED_EVIDENCE_TYPES.includes(file.type)) {
    return 'Formato no permitido. Solo se aceptan JPG, JPEG, PNG y MP4.';
  }
  if (file.size > MAX_EVIDENCE_SIZE) {
    return `El archivo "${file.name}" supera el límite de 200 MB.`;
  }
  return null;
};

export const uploadEvidence = (
  file: File,
  testCaseId: string,
  stepId: string,
  onProgress: (percent: number) => void
): Promise<EvidenceFile> => {
  return new Promise((resolve, reject) => {
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `evidence/${testCaseId}/${stepId}/${timestamp}_${safeName}`;
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress(percent);
      },
      (error) => reject(error),
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        resolve({ url, path, name: file.name, mimeType: file.type });
      }
    );
  });
};

export const deleteEvidence = async (path: string): Promise<void> => {
  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
};
