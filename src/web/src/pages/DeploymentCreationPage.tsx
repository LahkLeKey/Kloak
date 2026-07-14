import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import styles from './DeploymentCreationPage.module.css';

type Step = 1 | 2 | 3;

interface FormData {
  name: string;
  customerId: string;
  cloudProvider: string;
  accountId: string;
  projectId: string;
  environment: string;
}

export function DeploymentCreationPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>({
    name: '',
    customerId: '',
    cloudProvider: 'aws',
    accountId: '',
    projectId: '',
    environment: 'staging',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.currentTarget;
    setForm(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleNext = () => {
    setError(null);
    if (step === 1) {
      if (!form.name.trim()) {
        setError('Deployment name is required');
        return;
      }
      if (!form.customerId.trim()) {
        setError('Customer ID is required');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!form.accountId.trim()) {
        setError('Account ID is required');
        return;
      }
      if (!form.projectId.trim()) {
        setError('Project ID is required');
        return;
      }
      setStep(3);
    }
  };

  const handleBack = () => {
    setError(null);
    if (step > 1) {
      setStep((step - 1) as Step);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await api.createDeployment({
        customerId: form.customerId,
        name: form.name,
        target: {
          cloudProvider: form.cloudProvider,
          accountId: form.accountId,
          projectId: form.projectId,
          environment: form.environment,
        },
      });

      navigate(`/deployments/${response.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create deployment');
      setLoading(false);
    }
  };

  return (
    <div data-testid="deployment-creation-page" className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Create new deployment</h1>
          <p className={styles.subtitle}>Set up a new Keycloak instance</p>
        </div>

        <div className={styles.progressBar}>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${(step / 3) * 100}%` }} />
          </div>
          <p className={styles.progressText}>Step {step} of 3</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <>
              <div className={styles.stepHeader}>
                <h2>Basic Information</h2>
                <p>Tell us about your deployment</p>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="name">Deployment Name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g., acme-corp-prod"
                  disabled={loading}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="customerId">Customer ID</label>
                <input
                  id="customerId"
                  name="customerId"
                  type="text"
                  value={form.customerId}
                  onChange={handleChange}
                  placeholder="e.g., cust_123456"
                  disabled={loading}
                />
              </div>
            </>
          )}

          {/* Step 2: Cloud Provider Settings */}
          {step === 2 && (
            <>
              <div className={styles.stepHeader}>
                <h2>Cloud Provider Settings</h2>
                <p>Configure infrastructure details</p>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="cloudProvider">Cloud Provider</label>
                <select
                  id="cloudProvider"
                  name="cloudProvider"
                  value={form.cloudProvider}
                  onChange={handleChange}
                  disabled={loading}
                >
                  <option value="aws">AWS</option>
                  <option value="gcp">Google Cloud</option>
                  <option value="azure">Microsoft Azure</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="accountId">Account ID</label>
                <input
                  id="accountId"
                  name="accountId"
                  type="text"
                  value={form.accountId}
                  onChange={handleChange}
                  placeholder="e.g., 123456789012"
                  disabled={loading}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="projectId">Project ID</label>
                <input
                  id="projectId"
                  name="projectId"
                  type="text"
                  value={form.projectId}
                  onChange={handleChange}
                  placeholder="e.g., my-keycloak-project"
                  disabled={loading}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="environment">Environment</label>
                <select
                  id="environment"
                  name="environment"
                  value={form.environment}
                  onChange={handleChange}
                  disabled={loading}
                >
                  <option value="staging">Staging</option>
                  <option value="production">Production</option>
                  <option value="development">Development</option>
                </select>
              </div>
            </>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <>
              <div className={styles.stepHeader}>
                <h2>Review Deployment</h2>
                <p>Verify the configuration before creating</p>
              </div>

              <div className={styles.reviewBox}>
                <div className={styles.reviewSection}>
                  <h3>Basic Information</h3>
                  <div className={styles.reviewRow}>
                    <span className={styles.label}>Deployment Name:</span>
                    <span className={styles.value}>{form.name}</span>
                  </div>
                  <div className={styles.reviewRow}>
                    <span className={styles.label}>Customer ID:</span>
                    <span className={styles.value}>{form.customerId}</span>
                  </div>
                </div>

                <div className={styles.reviewSection}>
                  <h3>Cloud Provider</h3>
                  <div className={styles.reviewRow}>
                    <span className={styles.label}>Provider:</span>
                    <span className={styles.value}>{form.cloudProvider.toUpperCase()}</span>
                  </div>
                  <div className={styles.reviewRow}>
                    <span className={styles.label}>Account ID:</span>
                    <span className={styles.value}>{form.accountId}</span>
                  </div>
                  <div className={styles.reviewRow}>
                    <span className={styles.label}>Project ID:</span>
                    <span className={styles.value}>{form.projectId}</span>
                  </div>
                  <div className={styles.reviewRow}>
                    <span className={styles.label}>Environment:</span>
                    <span className={styles.value}>
                      {form.environment.charAt(0).toUpperCase() + form.environment.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.actions}>
            <button
              type="button"
              onClick={handleBack}
              disabled={step === 1 || loading}
              className={styles.secondaryBtn}
            >
              Back
            </button>

            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={loading}
                className={styles.primaryBtn}
              >
                Next
              </button>
            ) : (
              <button type="submit" disabled={loading} className={styles.primaryBtn}>
                {loading ? 'Creating…' : 'Create Deployment'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
