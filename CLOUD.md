# Cloud

## Google Cloud

1. If you already have a service account, skip to step 3.

2. Create a service account to upload the images to the specified bucket:

```shell
gcloud iam service-accounts create SERVICE_ACCOUNT_NAME
```

3. If your service account already has storage permissions, skip to step 5.

4. Give the service account permission to upload images to the bucket:

```shell
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:SERVICE_ACCOUNT_NAME@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.admin"
```

5. Deploy the API to Google Cloud Run:

```shell
gcloud run deploy CLOUD_FUNCTION_NAME \
  --source . \
  --region us-east1 \
  --allow-unauthenticated \
  --service-account=SERVICE_ACCOUNT_NAME@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

This will deploy a FastAPI application with a single endpoint, `POST /imgur`, which receives
a `imgur_id` in its body and saves it to Google Cloud Storage if it exists. It always returns
_200 OK_.


## Google Cloud on Deploy

Considering you have a GitHub repository `https://github.com/YOUR_GITHUB_USER/YOUR_REPO`, you can set up a service account to deploy the Cloud Run service whenever you do a push.

Check out the workflow file at.

1. Enable the IAM Service Account Credentials API:

```shell
gcloud services enable iamcredentials.googleapis.com --project PROJECT_ID
```
```langnone
Operation "operations/XXXX.X9-9999999999999-XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX" finished successfully.
```

2. Create a Workload Identity pool:

```shell
gcloud iam workload-identity-pools create github-pool
  --project=PROJECT_ID
  --location=global
  --display-name="GitHub Pool"
```
```langnone
Created workload identity pool [github-pool].
```

3. Create a GitHub OIDC provider:

```shell
gcloud iam workload-identity-pools providers create-oidc github-provider 
  --project=PROJECT_ID
  --location=global 
  --workload-identity-pool=github-pool
  --display-name="GitHub Provider"
  --issuer-uri="https://token.actions.githubusercontent.com"
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository"
  --attribute-condition="assertion.repository=='YOUR_GITHUB_USER/YOUR_REPO'"
```
```langnone
Created workload identity pool provider [github-provider].
```

4. Query the provider resource name:

```shell
gcloud iam workload-identity-pools providers describe github-provider
  --project=PROJECT_ID
  --location=global
  --workload-identity-pool=github-pool
  --format="value(name)"
```
```langnone
projects/9999999999999/locations/global/workloadIdentityPools/github-pool/providers/github-provider
```

The 13-digit string will be refered as the `PROJECT_NUMBER`. 

5. Create a service account to execute the deploy:

```shell
gcloud iam service-accounts create github-deployer
```
```langnone
Created service account [github-deployer].
```

Add the following roles:

- `run.admin` (gives full control over Cloud Run services)
- `iam.serviceAccountUser` (allows GitHub to use a service account when deploying)
- `artifactregistry.writer` (allows pushing build artifacts)
- `cloudbuild.builds.editor` (allows Cloud Build to run builds)
- `storage.objectAdmin` (gives full control over objects inside Cloud Storage buckets)
- `storage.bucketViewer` (allows reading Cloud Storage bucket metadata)

For instance,

```shell
gcloud projects add-iam-policy-binding PROJECT_ID
  --member="serviceAccount:github-deployer@PROJECT_ID.iam.gserviceaccount.com"
  --role="roles/ROLE_NAME"
```
```langnone
Updated IAM policy for project [PROJECT_ID].
```

Also link the service account to the GitHub provider:

```shell
gcloud iam service-accounts add-iam-policy-binding
  github-deployer@PROJECT_ID.iam.gserviceaccount.com
  --project=PROJECT_ID
  --role="roles/iam.serviceAccountTokenCreator"
  --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/attribute.repository/YOUR_GITHUB_USER/YOUR_REPO"
```
```langnone
Updated IAM policy for serviceAccount [github-deployer@PROJECT_ID.iam.gserviceaccount.com].
```

