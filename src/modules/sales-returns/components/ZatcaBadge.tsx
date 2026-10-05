import { Pill } from '@/ui/Pill';
import { t } from '@/i18n';
import { zatcaState } from '../logic';

/** ZATCA badge using the legacy counters (a fresh doc has compliance_passed=false but no failures). */
export function ZatcaBadge({ zatca }: { zatca?: Record<string, any> }) {
  switch (zatcaState(zatca)) {
    case 'reported': return <Pill tone="good" icon="shield">{t('Reported')}</Pill>;
    case 'compliance_failed': return <Pill tone="crit" icon="xc">{t('Compliance failed')}</Pill>;
    case 'reporting_failed': return <Pill tone="crit" icon="xc">{t('Reporting failed')}</Pill>;
    default: return <Pill tone="neutral" icon="clock">{t('Not reported')}</Pill>;
  }
}
