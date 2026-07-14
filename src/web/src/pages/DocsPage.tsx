import { Link } from 'react-router-dom';
import styles from './DocsPage.module.css';

export function DocsPage() {
  return (
    <div className={styles.docsContainer}>
      <div className={styles.breadcrumb}>
        <Link to="/">Deployments</Link>
        <span>/</span>
        <span>Docs</span>
      </div>

      <article className={styles.article}>
        <div className={styles.hero}>
          <h1 className={styles.title}>Kloak Documentation</h1>
          <p className={styles.subtitle}>
            Centralized authentication and identity management for OAuth / SSO deployments
          </p>
        </div>

        {/* Overview Section */}
        <section className={styles.section}>
          <h2>What is Kloak?</h2>
          <p>
            Kloak is a centralized authentication platform that eliminates the complexity of
            managing OAuth 2.0 and SSO (Single Sign-On) across multiple applications. Instead of
            each application implementing their own authentication logic, Kloak handles identity
            verification and token management at scale.
          </p>
          <p>
            By deploying Kloak, you create a single source of truth for authentication. Applications
            delegate their auth concerns to Kloak and receive standardized OAuth credentials — no
            separate OAuth provider setup required.
          </p>
        </section>

        {/* Problems Solved */}
        <section className={styles.section}>
          <h2>Problems Kloak Solves</h2>
          <div className={styles.problemGrid}>
            <div className={styles.problemCard}>
              <h3>🔐 Auth Complexity</h3>
              <p>
                Applications no longer need to implement OAuth 2.0 flows, token management, or
                identity verification. Kloak handles it all.
              </p>
            </div>
            <div className={styles.problemCard}>
              <h3>🌍 Multi-Domain Management</h3>
              <p>
                Spin up new authentication domains instantly. Each domain serves as an isolated
                OAuth provider for its applications.
              </p>
            </div>
            <div className={styles.problemCard}>
              <h3>📋 Standardized Credentials</h3>
              <p>
                All applications receive consistent OAuth client credentials, scopes, and redirect
                URIs through a unified interface.
              </p>
            </div>
            <div className={styles.problemCard}>
              <h3>🔄 No Provider Lock-in</h3>
              <p>
                Applications remain provider-agnostic. Swap identity providers without changing app
                code — Kloak abstracts the details.
              </p>
            </div>
          </div>
        </section>

        {/* Getting Started */}
        <section className={styles.section}>
          <h2>Getting Started</h2>
          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNumber}>1</div>
              <div>
                <h3>Create a Deployment</h3>
                <p>
                  Navigate to the{' '}
                  <Link to="/" className={styles.inlineLink}>
                    Deployments
                  </Link>{' '}
                  page to create a new Kloak deployment. Each deployment represents an isolated
                  authentication domain that serves your applications.
                </p>
                <ul className={styles.substeps}>
                  <li>Provide a deployment name (e.g., "production", "staging")</li>
                  <li>Specify your customer/organization ID</li>
                  <li>Choose your cloud provider and region</li>
                </ul>
              </div>
            </div>

            <div className={styles.step}>
              <div className={styles.stepNumber}>2</div>
              <div>
                <h3>Register External Applications</h3>
                <p>
                  Within a deployment, register each application that needs authentication. For each
                  app, Kloak provisions:
                </p>
                <ul className={styles.substeps}>
                  <li>A unique OAuth Client ID and Client Secret</li>
                  <li>Configured redirect URIs for your app's callback endpoints</li>
                  <li>Allowed origins for CORS and origin validation</li>
                  <li>OAuth scopes (openid, profile, email, etc.)</li>
                </ul>
              </div>
            </div>

            <div className={styles.step}>
              <div className={styles.stepNumber}>3</div>
              <div>
                <h3>Configure Auth Flows</h3>
                <p>Map domains to applications using auth flows. Each auth flow defines:</p>
                <ul className={styles.substeps}>
                  <li>
                    <strong>Domain:</strong> The user-facing domain (e.g., portal.acme.com)
                  </li>
                  <li>
                    <strong>Flow Type:</strong> OAuth flow variant (Auth Code, Auth Code + PKCE,
                    Client Credentials, Device Code)
                  </li>
                  <li>
                    <strong>Post-Login Redirect:</strong> Where users land after successful
                    authentication
                  </li>
                </ul>
              </div>
            </div>

            <div className={styles.step}>
              <div className={styles.stepNumber}>4</div>
              <div>
                <h3>Applications Use Kloak Credentials</h3>
                <p>
                  Your applications receive the OAuth credentials and use them to authenticate users
                  via the Kloak OAuth endpoints:
                </p>
                <ul className={styles.substeps}>
                  <li>Users initiate login via your app</li>
                  <li>Your app redirects to Kloak's authorization endpoint</li>
                  <li>Users authenticate with Kloak's identity provider</li>
                  <li>Kloak returns an authorization code to your app's redirect URI</li>
                  <li>Your app exchanges the code for an ID token and access token</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Key Concepts */}
        <section className={styles.section}>
          <h2>Key Concepts</h2>
          <div className={styles.conceptGrid}>
            <div className={styles.concept}>
              <h3>Deployment</h3>
              <p>
                An isolated Kloak instance that serves as the OAuth provider for a group of related
                applications. Deployments are deployed to specific cloud providers and environments.
              </p>
            </div>
            <div className={styles.concept}>
              <h3>External Application</h3>
              <p>
                An application registered within a deployment. Each external app receives unique
                OAuth credentials and can authenticate its users through Kloak.
              </p>
            </div>
            <div className={styles.concept}>
              <h3>Auth Flow</h3>
              <p>
                A mapping between a domain and an external application. Auth flows define how users
                authenticate and which OAuth flow variant is used.
              </p>
            </div>
            <div className={styles.concept}>
              <h3>OAuth Client ID & Secret</h3>
              <p>
                Unique credentials provisioned by Kloak for each external app. Applications use
                these credentials to authenticate with Kloak's OAuth endpoints.
              </p>
            </div>
            <div className={styles.concept}>
              <h3>OAuth Flow Types</h3>
              <p>
                <strong>Auth Code:</strong> Traditional OAuth 2.0 flow for web apps.
                <br />
                <strong>Auth Code + PKCE:</strong> Recommended for mobile and SPAs.
                <br />
                <strong>Client Credentials:</strong> For service-to-service authentication.
                <br />
                <strong>Device Code:</strong> For devices with limited input (e.g., TVs).
              </p>
            </div>
            <div className={styles.concept}>
              <h3>Application Status</h3>
              <p>
                <strong>Pending:</strong> Newly registered, awaiting activation.
                <br />
                <strong>Active:</strong> Fully provisioned and accepting authentication requests.
                <br />
                <strong>Suspended:</strong> Temporarily disabled.
                <br />
                <strong>Revoked:</strong> Permanently disabled.
              </p>
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className={styles.section}>
          <h2>Common Use Cases</h2>
          <div className={styles.useCaseList}>
            <div className={styles.useCase}>
              <h3>Multi-Tenant SaaS</h3>
              <p>
                Provision separate Kloak deployments per customer. Each customer's applications
                authenticate through their isolated deployment with their own users and policies.
              </p>
            </div>
            <div className={styles.useCase}>
              <h3>Enterprise SSO</h3>
              <p>
                Deploy Kloak as the enterprise authentication backbone. All internal applications
                delegate to Kloak, which can be integrated with existing identity providers (Active
                Directory, SAML, etc.).
              </p>
            </div>
            <div className={styles.useCase}>
              <h3>API Ecosystem</h3>
              <p>
                Use Kloak's Client Credentials flow to provide service-to-service authentication for
                your API ecosystem. Each service gets unique credentials with scoped permissions.
              </p>
            </div>
            <div className={styles.useCase}>
              <h3>Partner Integrations</h3>
              <p>
                Spin up dedicated Kloak deployments for partner applications. Partners receive OAuth
                credentials and authenticate through your infrastructure without exposing internal
                details.
              </p>
            </div>
          </div>
        </section>

        {/* Next Steps */}
        <section className={styles.section}>
          <h2>Next Steps</h2>
          <div className={styles.nextSteps}>
            <div className={styles.nextStepItem}>
              <strong>Create Your First Deployment</strong>
              <p>
                Head to the{' '}
                <Link to="/" className={styles.inlineLink}>
                  Deployments dashboard
                </Link>{' '}
                and create a new deployment to get started.
              </p>
            </div>
            <div className={styles.nextStepItem}>
              <strong>Register an Application</strong>
              <p>
                Open your deployment and register an external application. Configure your app's
                OAuth redirect URIs and allowed origins.
              </p>
            </div>
            <div className={styles.nextStepItem}>
              <strong>Set Up Auth Flows</strong>
              <p>
                Create auth flows to map your application domains to the registered applications and
                configure the OAuth flow type.
              </p>
            </div>
            <div className={styles.nextStepItem}>
              <strong>Integrate with Your App</strong>
              <p>
                Use the provisioned OAuth credentials in your application's authentication library
                (e.g., OpenID Connect clients, OAuth 2.0 SDKs).
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className={styles.section}>
          <h2>Frequently Asked Questions</h2>
          <div className={styles.faqList}>
            <div className={styles.faqItem}>
              <h3>Do I need to change my application code to use Kloak?</h3>
              <p>
                Minimal changes needed. Your app continues using standard OAuth 2.0 / OIDC
                libraries. Simply configure those libraries to use Kloak's OAuth endpoints instead
                of a public provider.
              </p>
            </div>
            <div className={styles.faqItem}>
              <h3>Can I use Kloak with existing identity providers?</h3>
              <p>
                Yes. Kloak integrates with external identity providers. Configure Kloak to delegate
                authentication to your existing SAML, OIDC, or Active Directory infrastructure.
              </p>
            </div>
            <div className={styles.faqItem}>
              <h3>How do I manage users and permissions?</h3>
              <p>
                User management depends on your configured identity provider. Kloak abstracts these
                details — applications never see the underlying provider implementation.
              </p>
            </div>
            <div className={styles.faqItem}>
              <h3>Is Kloak suitable for production?</h3>
              <p>
                Kloak is designed for production deployments across cloud environments. Each
                deployment runs in an isolated container with managed infrastructure.
              </p>
            </div>
            <div className={styles.faqItem}>
              <h3>Can I suspend or revoke applications?</h3>
              <p>
                Yes. Use the app status controls to temporarily suspend an application or
                permanently revoke it. Suspended apps cannot authenticate new users.
              </p>
            </div>
          </div>
        </section>
      </article>
    </div>
  );
}
