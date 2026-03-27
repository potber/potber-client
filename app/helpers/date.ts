import { helper } from '@ember/component/helper';
import { formatDateTime } from 'potber-client/utils/date';

export function formatDate([date]: [string | Date | null | undefined]) {
  return formatDateTime(date);
}

export default helper(formatDate);
