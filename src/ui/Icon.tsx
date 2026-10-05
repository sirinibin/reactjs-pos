import { ICONS, type IconName } from './icons';

export type { IconName };

interface Props {
  name: IconName;
  size?: 'xs' | 's' | 'm';
  className?: string;
  /** Mirror horizontally in RTL (arrows, chevrons). */
  flip?: boolean;
  label?: string;
}

export function Icon({ name, size = 'm', className, flip, label }: Props) {
  const cls = ['i', size === 'm' ? '' : size, flip ? 'flip' : '', className || ''].filter(Boolean).join(' ');
  return (
    <svg
      className={cls}
      viewBox="0 0 24 24"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      dangerouslySetInnerHTML={{ __html: ICONS[name] }}
    />
  );
}
