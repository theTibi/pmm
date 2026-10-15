import { FC } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Link,
  List,
  ListItem,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { formatDistanceStrict } from 'date-fns';
import { AttentionItem, HomeSource } from 'types/home.types';
import { Messages } from '../HomePage.messages';
import {
  ALERTING_LIST_URL,
  ATTENTION_LINKS,
  MAX_ATTENTION_ROWS,
} from '../HomePage.constants';
import { CHIP_COLORS } from '../HomePage.styles';

export interface NeedsAttentionProps {
  items: AttentionItem[];
  failed: HomeSource[];
  now: Date;
}

export const NeedsAttention: FC<NeedsAttentionProps> = ({
  items,
  failed,
  now,
}) => {
  const visible = items.slice(0, MAX_ATTENTION_ROWS);
  const hidden = items.length - visible.length;

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h5" component="h2">
          {Messages.needsAttention}
        </Typography>
        {failed.length > 0 && (
          <Alert severity="warning" sx={{ mt: 1.5 }}>
            {Messages.sourcesFailed(failed)}
          </Alert>
        )}
        {items.length === 0 ? (
          <Typography sx={{ mt: 1.5 }} color="text.secondary">
            {Messages.nothingNeedsAttention}
          </Typography>
        ) : (
          <List disablePadding>
            {visible.map((item, i) => (
              <ListItem
                key={item.id}
                divider={i < visible.length - 1}
                disableGutters
                sx={{ gap: 2, flexWrap: 'wrap', alignItems: 'center' }}
              >
                <Chip
                  size="small"
                  variant="outlined"
                  color={CHIP_COLORS[item.severity]}
                  label={Messages.severity[item.severity]}
                  sx={{ minWidth: 80 }}
                />
                <Box sx={{ flex: '1 1 320px', minWidth: 0 }}>
                  <Typography fontWeight={500}>
                    {Messages.attentionTitle(item)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {Messages.attentionDetail(item)}
                  </Typography>
                </Box>
                {item.since && (
                  <Typography variant="body2" color="text.secondary">
                    {Messages.since(
                      formatDistanceStrict(new Date(item.since), now)
                    )}
                  </Typography>
                )}
                <Link component={RouterLink} to={ATTENTION_LINKS[item.kind]}>
                  {Messages.open}
                </Link>
              </ListItem>
            ))}
          </List>
        )}
        {hidden > 0 && (
          <Link component={RouterLink} to={ALERTING_LIST_URL}>
            {Messages.moreInAlerting(hidden)}
          </Link>
        )}
      </CardContent>
    </Card>
  );
};
