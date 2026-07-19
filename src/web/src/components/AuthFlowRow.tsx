import type { AuthFlow } from '../api';
import styles from './AuthFlowRow.module.css';

const FLOW_LABELS: Record<AuthFlow['flowType'], string> = {
  authorization_code: 'Auth Code',
  authorization_code_pkce: 'Auth Code + PKCE',
  client_credentials: 'Client Credentials',
  device_code: 'Device Code',
};

interface AuthFlowRowProps {
  flow: AuthFlow;
  appName?: string;
}

export function AuthFlowRow({ flow, appName }: AuthFlowRowProps) {
  return (
    <div className={styles.row} data-testid="auth-flow-row">
      <div className={styles.domain}>
        <span className={styles.domainText}>{flow.domain}</span>
        {appName && <span className={styles.appName}>{appName}</span>}
      </div>
      <span className={styles.flowType}>{FLOW_LABELS[flow.flowType]}</span>
      <div className={styles.redirect}>
        <span className={styles.label}>Post-login</span>
        <code className={styles.uri}>{flow.postLoginRedirectUri}</code>
      </div>
      {flow.idpHint && <span className={styles.hint}>via {flow.idpHint}</span>}
    </div>
  );
}
