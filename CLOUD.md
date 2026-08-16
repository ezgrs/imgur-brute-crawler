# Cloud

## Google Cloud

### Setup

1. Check if you have the [Google Cloud SDK](https://docs.cloud.google.com/sdk/docs/install-sdk) installed:

```shell
gcloud --version
```
```text
Google Cloud SDK 565.0.0
beta 2026.04.10
bq 2.1.31
core 2026.04.10
gcloud-crc32c 1.0.0
gsutil 5.3
```

2. Log in into your Google Cloud account:

```shell
gcloud auth login
```

This command will first open your browser to the sign-in page where you complete authentication.

Then it'll show your current list of projects: choose which one you would like to use its Storage.

> Running this will allow **you** to run `gcloud` commands from your terminal, finding your credentials automatically.

3. Create your Application Default Credentials (ADC) file:

```shell
gcloud auth application-default login
```

> Running this will allow **your SDK library** to run the SDK code, finding your credentials automatically.

4. If your project is not already set for some reason, you can do so by running:

```shell
gcloud config set project PROJECT_ID
```

### Cloud Run service

This section walks through setting up and deploying a function on Google Cloud Run so the crawler can be 
executed on a schedule using Google Cloud Scheduler.

Instead of running the crawler in a continuous loop on a dedicated server, this approach treats each run as
a short-lived, stateless job. Cloud Scheduler triggers the function at regular intervals, and Cloud Run spins
up just enough compute to handle that execution before scaling back down.

1. Create a service account to manage the Cloud Run service:

```shell
gcloud iam service-accounts create crawler
```
```text
Created service account [crawler].
```

Add the following roles:

- `storage.admin` (gives full control over Cloud Storage buckets)

For instance,

```shell
gcloud projects add-iam-policy-binding PROJECT_ID
  --member="serviceAccount:crawler@PROJECT_ID.iam.gserviceaccount.com"
  --role="roles/storage.admin"
```
```text
Updated IAM policy for project [PROJECT_ID].
```

2. Deploy the API to Google Cloud Run:

```shell
gcloud run deploy CLOUD_FUNCTION_NAME
  --source .
  --region us-east1
  --allow-unauthenticated
  --service-account=crawler@PROJECT_ID.iam.gserviceaccount.com
```

This will deploy a FastAPI application with two endpoints:

- `POST /imgur/{imgur_id}`, which returns _200 OK_ if the provided image ID exists in Imgur otherwise _404 Not Found_.
  It also saves the Imgur image to Google Cloud Storage if the former.
- `POST /imgur/random`, which generates a random Imgur ID and acts like calling the previous endpoint.

#### Deploying automatically via GitHub

Considering you have a GitHub repository `https://github.com/YOUR_GITHUB_USER/YOUR_REPO`,
you can set up a service account to deploy the Cloud Run service whenever you do a push.

Check out the workflow file at _.github/workflows/cloud-run-deploy.yml_.

1. Enable the IAM Service Account Credentials API:

```shell
gcloud services enable iamcredentials.googleapis.com
```
```text
Operation "operations/XXXX.X9-9999999999999-XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX" finished successfully.
```

2. Create a Workload Identity pool:

```shell
gcloud iam workload-identity-pools create github-pool
  --location=global
  --display-name="GitHub Pool"
```
```text
Created workload identity pool [github-pool].
```

3. Create a GitHub OIDC provider:

```shell
gcloud iam workload-identity-pools providers create-oidc github-provider 
  --location=global 
  --workload-identity-pool=github-pool
  --display-name="GitHub Provider"
  --issuer-uri="https://token.actions.githubusercontent.com"
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository"
  --attribute-condition="assertion.repository=='YOUR_GITHUB_USER/YOUR_REPO'"
```
```text
Created workload identity pool provider [github-provider].
```

4. Query the provider resource name:

```shell
gcloud iam workload-identity-pools providers describe github-provider
  --location=global
  --workload-identity-pool=github-pool
  --format="value(name)"
```
```text
projects/9999999999999/locations/global/workloadIdentityPools/github-pool/providers/github-provider
```

The 13-digit string will be refered as the `PROJECT_NUMBER`. 

5. Create a service account to execute the deploy:

```shell
gcloud iam service-accounts create github-deployer
```
```text
Created service account [github-deployer].
```

Add the following roles (as explained in the previous section):

- `run.admin` (gives full control over Cloud Run services)
- `iam.serviceAccountUser` (allows GitHub to use a service account when deploying)
- `artifactregistry.writer` (allows pushing build artifacts)
- `cloudbuild.builds.editor` (allows Cloud Build to run builds)
- `storage.objectAdmin` (gives full control over objects inside Cloud Storage buckets)
- `storage.bucketViewer` (allows reading Cloud Storage bucket metadata)

Also link the service account to the GitHub provider:

```shell
gcloud iam service-accounts add-iam-policy-binding
  github-deployer@PROJECT_ID.iam.gserviceaccount.com
  --role="roles/iam.serviceAccountTokenCreator"
  --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/attribute.repository/YOUR_GITHUB_USER/YOUR_REPO"
```
```text
Updated IAM policy for serviceAccount [github-deployer@PROJECT_ID.iam.gserviceaccount.com].
```

#### Integrating with Secret Manager

A .env file for `os.environ` must be uploaded to Cloud Run server to make the code run correctly. This section will integrate
with Secret Manager so that the Cloud Run has no access to the secret variables.

1. Enable the IAM Service Account Credentials API:

```shell
gcloud services enable secretmanager.googleapis.com
```
```text
Operation "operations/XXXX.X9-9999999999999-XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX" finished successfully.
```

2. Save all the sensitive variables:

```shell
echo|set /p="SECRET_VALUE" > secret.txt
gcloud secrets create SECRET_KEY --replication-policy="automatic" --data-file=secret.txt
```
```text
Created version [1] of the secret [SECRET_KEY].
```

To update it later:

```shell
echo|set /p="NEW_SECRET_VALUE" > secret.txt
gcloud secrets versions add SECRET_KEY --data-file=secret.txt
```
```text
Created version [2] of the secret [SECRET_KEY].
```

3. Grant the Cloud Run service account manager acess to the variables (as defined below, `crawler`):

```shell
gcloud secrets add-iam-policy-binding SECRET_KEY
    --member="serviceAccount:crawler@PROJECT_ID.iam.gserviceaccount.com"
    --role="roles/secretmanager.secretAccessor"
```
```text
Updated IAM policy for secret [SECRET_KEY].
```

When the `gcloud run deploy` command is now executed, the `--set-env-vars` and `--set-secrets` parameters
need to be passed. No code change is required, since it'll be automatically injected into `os.environ`:

```shell
gcloud run deploy CLOUD_FUNCTION_NAME
  --source .
  --region us-east1
  --allow-unauthenticated
  --service-account=crawler@PROJECT_ID.iam.gserviceaccount.com
  --set-env-vars EMAIL_HOST=smtp.gmail.com,EMAIL_PORT=587,...
  --set-secrets EMAIL_USERNAME=EMAIL_USERNAME:latest,EMAIL_PASSWORD=EMAIL_PASSWORD:latest
```

#### Enabling authentication

Right now, if the Cloud Run function is called by anyone in the internet, that person will be able to access
it because of the `--allow-unauthenticated` parameter. To revoke it, it's possible to restrict access to a dedicated
service account.

1. Create a service account to run the scheduler:

```shell
gcloud iam service-accounts create cron-scheduler
```
```text
Created service account [cron-scheduler].
```

2. Grant it permission to run that specific Cloud Run function:

```shell
gcloud run services add-iam-policy-binding CLOUD_FUNCTION_NAME
  --region us-east1
  --member="serviceAccount:cron-scheduler@PROJECT_ID.iam.gserviceaccount.com"
  --role="roles/run.invoker"
```
```text
Updated IAM policy for service [CLOUD_FUNCTION_NAME].
```

3. Query the Cloud Run canonical URL:

```shell
gcloud run services describe CLOUD_FUNCTION_NAME
  --region us-east1
  --format="value(status.url)"
```

The output text will be refered as the `CLOUD_FUNCTION_URL`. 

4. Create a Cloud Scheduler job:

```shell
gcloud scheduler jobs create http croncrawl
  --location us-east1
  --schedule="* * * * *"
  --http-method=POST
  --uri="CLOUD_FUNCTION_URL/imgur/random"
  --oidc-service-account-email="cron-scheduler@PROJECT_ID.iam.gserviceaccount.com"
  --oidc-token-audience="CLOUD_FUNCTION_URL"
  --headers="User-Agent=Google-Cloud-Scheduler"
  --time-zone="XXXXX/XXXXX"
```

5. Remove the public access:

```shell
gcloud run services get-iam-policy CLOUD_FUNCTION_NAME --region us-east1
```
```text
bindings:
- members:
  - allUsers
  - serviceAccount:cron-scheduler@PROJECT_ID.iam.gserviceaccount.com
  role: roles/run.invoker
```

```shell
gcloud run services remove-iam-policy-binding CLOUD_FUNCTION_NAME
  --region us-east1
  --member="allUsers"
  --role="roles/run.invoker"
```
```text
Updated IAM policy for service [CLOUD_FUNCTION_NAME].
bindings:
- members:
  - serviceAccount:cron-scheduler@PROJECT_ID.iam.gserviceaccount.com
  role: roles/run.invoker
```

When the next `gcloud run deploy` runs, the `--allow-unauthenticated` flag now must be omitted.