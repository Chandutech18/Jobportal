# Job Portal Frontend

## Run locally

From the repo root:

```powershell
npm start
```

That command starts the React app from `mini/` and binds it to `0.0.0.0`, so it can be opened from other devices on your local network.

## URLs to use

- Frontend on this computer: `http://localhost:3000`
- Frontend from phone or another device: `http://<your-computer-ip>:3000`
- Backend from this computer: `http://localhost:5000`
- Backend from phone or another device: `http://<your-computer-ip>:5000`

Example:

- App: `http://10.21.186.190:3000`
- API: `http://10.21.186.190:5000`

## Deploy to Vercel

The Vercel app at `https://jobportal-gules-mu.vercel.app/` is only the React frontend. It cannot call `http://10.21.186.190:5000` because that is a private local-network address.

Deploy the Express backend in `server/` to a public Node host such as Railway, Render, Fly.io, or a separate Vercel serverless setup. In Railway, open the backend service, go to **Settings -> Domains**, and copy the generated public URL. It should look similar to `https://jobportal-production.up.railway.app`.

Add these environment variables in the **Vercel project settings for the frontend**, not in Railway:

```text
REACT_APP_API_URL=https://jobportal-production.up.railway.app
REACT_APP_SOCKET_URL=https://jobportal-production.up.railway.app
```

Replace the example domain with your actual Railway domain, then redeploy the frontend. Do not set `REACT_APP_API_URL` to `localhost`, `127.0.0.1`, a `10.x.x.x` / `192.168.x.x` private IP, or an example placeholder in production.

## Mobile testing

If you see:

`Cannot reach the server at http://<ip>:5000`

check these first:

1. Open the React app using your computer IP on port `3000`, not just `localhost`.
2. Make sure the backend is running and reachable on port `5000`.
3. Make sure Windows allows inbound connections on ports `3000` and `5000`.
4. Keep frontend and backend on the same computer IP when testing over Wi-Fi.

## Notes

- The frontend auto-derives the API base from the browser hostname, so opening `http://<your-ip>:3000` should target `http://<your-ip>:5000`.
- The backend already listens on `0.0.0.0`, which is required for LAN/mobile access.
- On Vercel, the frontend uses `REACT_APP_API_URL` instead of deriving port `5000` from the browser hostname.
