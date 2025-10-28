build container 

ssh -L 5173:localhost:5173 oshiro.tplinkdns.com

```sh
docker build -t  asia-northeast1-docker.pkg.dev/fujino-cloud/containers/svelte-app:latest .
docker push asia-northeast1-docker.pkg.dev/fujino-cloud/containers/svelte-app:latest
gcloud --project=fujino-cloud run deploy  fujino-cloud --image=asia-northeast1-docker.pkg.dev/fujino-cloud/containers/svelte-app:latest --region=asia-northeast1

```