import { useEffect, useState } from 'react';
import { CircularProgress, IconButton } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { getPresignedUrl, getS3Config } from '../../services/evidenceService';
import type { EvidenceFile } from '../../types/testCase';

interface EvidenceOpenLinkProps {
  evidence: EvidenceFile;
}

export const EvidenceOpenLink = ({ evidence }: EvidenceOpenLinkProps) => {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setResolvedUrl(null);

    const resolve = async () => {
      try {
        const isS3 = Boolean(getS3Config());
        const url = isS3 ? await getPresignedUrl(evidence.path) : evidence.url;
        if (!cancelled) setResolvedUrl(url);
      } catch {
        if (!cancelled) setResolvedUrl(evidence.url);
      }
    };

    resolve();
    return () => { cancelled = true; };
  }, [evidence.path, evidence.url]);

  return (
    <IconButton
      size="small"
      component="a"
      href={resolvedUrl ?? undefined}
      target="_blank"
      rel="noopener noreferrer"
      disabled={!resolvedUrl}
      sx={{ color: '#fff', p: 0.4 }}
    >
      {resolvedUrl ? <OpenInNewIcon sx={{ fontSize: 16 }} /> : <CircularProgress size={14} sx={{ color: '#fff' }} />}
    </IconButton>
  );
};
