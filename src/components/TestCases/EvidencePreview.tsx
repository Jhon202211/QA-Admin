import { useEffect, useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import BrokenImageIcon from '@mui/icons-material/BrokenImage';
import { getPresignedUrl, getS3Config } from '../../services/evidenceService';
import type { EvidenceFile } from '../../types/testCase';

interface EvidencePreviewProps {
  evidence: EvidenceFile;
  height?: number;
  onClick?: () => void;
}

export const EvidencePreview = ({ evidence, height = 90, onClick }: EvidencePreviewProps) => {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError(false);
    setResolvedUrl(null);

    const resolve = async () => {
      try {
        const isS3 = Boolean(getS3Config());
        const url = isS3 ? await getPresignedUrl(evidence.path) : evidence.url;
        if (!cancelled) setResolvedUrl(url);
      } catch {
        if (!cancelled) setError(true);
      }
    };

    resolve();
    return () => { cancelled = true; };
  }, [evidence.path, evidence.url]);

  if (error) {
    return (
      <Box
        sx={{
          width: '100%',
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'action.hover',
        }}
      >
        <BrokenImageIcon sx={{ color: 'text.disabled', fontSize: 32 }} />
      </Box>
    );
  }

  if (!resolvedUrl) {
    return (
      <Box
        sx={{
          width: '100%',
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'action.hover',
        }}
      >
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Box
      component="a"
      href={resolvedUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      sx={{ display: 'block', cursor: 'zoom-in' }}
    >
      <Box
        component="img"
        src={resolvedUrl}
        alt={evidence.name}
        sx={{ width: '100%', height, objectFit: 'cover', display: 'block' }}
      />
    </Box>
  );
};
