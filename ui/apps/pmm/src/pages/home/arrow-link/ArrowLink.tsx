import { FC, PropsWithChildren } from 'react';
import { Link } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Link as RouterLink } from 'react-router-dom';
import { useConsoleTokens } from 'theme';

export const ArrowLink: FC<PropsWithChildren<{ to: string }>> = ({
  to,
  children,
}) => {
  const t = useConsoleTokens();

  return (
    <Link
      component={RouterLink}
      to={to}
      underline="none"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        minHeight: 44,
        color: t.accent,
        fontWeight: 500,
        fontSize: 14,
        whiteSpace: 'nowrap',
        '&:hover': { color: t.accentHover },
        '&:hover svg': { transform: 'translateX(2px)' },
      }}
    >
      {children}
      <ArrowForwardIcon
        sx={{ fontSize: 16, transition: 'transform 120ms ease' }}
      />
    </Link>
  );
};
