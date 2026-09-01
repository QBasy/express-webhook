import styles from './MethodBadge.module.scss';

const METHOD_CLASS: Record<string, string> = {
  GET: 'methodGet',
  POST: 'methodPost',
  PUT: 'methodPut',
  PATCH: 'methodPatch',
  DELETE: 'methodDelete',
  OPTIONS: 'methodOptions',
  HEAD: 'methodHead',
};

export function MethodBadge({ method }: { method: string }) {
  const cls = METHOD_CLASS[method.toUpperCase()] ?? 'methodDefault';
  return <span className={`${styles.badge} ${styles[cls]}`}>{method}</span>;
}
