export PROJECT_ID=submissionmlgc-detry

# login dulu
gcloud auth login

# set project id
gcloud config set project $PROJECT_ID

# buat database Firestore ke nama (default)
gcloud firestore databases create --region=asia-southeast2

# buat Cloud Storage dengan nama bucket $PROJECT_ID
gsutil mb -l asia-southeast2 gs://$PROJECT_ID/

# upload file-file model ke Cloud Storage
gsutil cp ./group1-shard1of4.bin gs://$PROJECT_ID/
gsutil cp ./group1-shard2of4.bin gs://$PROJECT_ID/
gsutil cp ./group1-shard3of4.bin gs://$PROJECT_ID/
gsutil cp ./group1-shard4of4.bin gs://$PROJECT_ID/
gsutil cp ./model.json gs://$PROJECT_ID/

# buat Service Account
gcloud iam service-accounts create cancer-prediction-server \
  --description="Service account for cancer prediction server" \
  --display-name="Cancer Prediction Server"

# set role Firebase Admin ke Service Account
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:cancer-prediction-server@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/firebase.admin"

# taruh key dari Service Account ke serviceaccountkey.json
gcloud iam service-accounts keys create ./serviceaccountkey.json \
  --iam-account=cancer-prediction-server@$PROJECT_ID.iam.gserviceaccount.com
cat ./serviceaccountkey.json
chmod 600 ./serviceaccountkey.json

# build project-nya pake Cloud Build
gcloud builds submit --region=asia-east1 --tag gcr.io/$PROJECT_ID/cancer-prediction:v1.0 .

# Deploy ke Cloud Run
gcloud run deploy cancer-prediction \
  --image gcr.io/$PROJECT_ID/cancer-prediction:v1.0 \
  --region asia-southeast2 \
  --set-env-vars NODE_ENV=production,MODEL_URL=https://storage.googleapis.com/$PROJECT_ID/model.json,FIRESTORE_DATABASE_ID="(default)" \
  --allow-unauthenticated