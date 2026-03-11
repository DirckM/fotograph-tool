"use client";

import { useState, useCallback } from "react";

interface UploadResult {
  path: string;
  publicUrl: string;
}

export function useFileUpload() {
  const [uploading, setUploading] = useState(false);

  const upload = useCallback(async (file: File): Promise<UploadResult> => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Upload failed");
      }

      return await res.json();
    } finally {
      setUploading(false);
    }
  }, []);

  return { upload, uploading };
}

export function useImagePreview() {
  const [preview, setPreview] = useState<string | null>(null);

  const createPreview = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    setPreview(url);
    return url;
  }, []);

  const clearPreview = useCallback(() => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
  }, [preview]);

  return { preview, createPreview, clearPreview };
}
