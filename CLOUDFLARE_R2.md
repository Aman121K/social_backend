# Cloudflare R2 – Image storage (posts & profile pictures)

Use Cloudflare R2 (S3-compatible) to store images that users upload for **posts** and **profile pictures**.

---

## 1. Create an R2 bucket

1. In [Cloudflare Dashboard](https://dash.cloudflare.com), go to **Storage & databases** (left sidebar under **Build**).
2. Open **R2**.
3. Click **Create bucket**.
4. Name it (e.g. `social-images`) and create.
5. Open the bucket → **Settings** → enable **Allow public access** if you want public image URLs.  
   - Copy the **Public bucket URL** (e.g. `https://pub-xxxx.r2.dev`) — you’ll use it as `R2_PUBLIC_URL` in `.env`.

---

## 2. Get R2 API keys (Access Key ID & Secret)

1. In the same **R2** section, click **Manage R2 API Tokens** (top right or under **Overview**).
2. Click **Create API token**.
3. Name it (e.g. `social-app-upload`).
4. Permissions: **Object Read & Write** (or **Admin Read & Write** if you prefer).
5. Optionally restrict to your bucket (e.g. `social-images`).
6. Create the token.
7. Copy and save:
   - **Access Key ID**
   - **Secret Access Key**  
   (Secret is shown only once.)

---

## 3. Get your Account ID

- In the Cloudflare dashboard, open any R2 or Workers page.  
- **Account ID** is in the right sidebar under **Account details**, or in the R2 URL:  
  `https://dash.cloudflare.com/<ACCOUNT_ID>/r2/...`

---

## 4. Backend `.env`

Add to `backend/.env` (values from steps 1–3):

```env
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=social-images
R2_PUBLIC_URL=https://pub-xxxx.r2.dev
```

- `R2_BUCKET_NAME`: the bucket name you created (e.g. `social-images`).
- `R2_PUBLIC_URL`: the bucket’s public URL from step 1 (or your custom domain).  
  Leave empty if you don’t need public URLs (upload will still work; returned URL format may differ).

Restart the backend after changing `.env`.

---

## 5. How the app uses R2

- **Upload API:** `POST /api/upload` (auth required).  
  Send the image as multipart form field **`image`**.  
  Optional query: `?folder=posts` or `?folder=profiles` (default: `uploads`).
- Response: `{ "url": "https://..." }` — use this URL when creating a post or updating profile picture.
- The app uploads the image first, then sends the returned URL to the post/profile APIs.

---

## 6. Summary: where to find what

| What you need       | Where to find it |
|---------------------|------------------|
| **Bucket name**     | R2 → your bucket name (e.g. `social-images`) |
| **Account ID**      | R2 or dashboard URL / Account details in sidebar |
| **Access Key ID**   | R2 → **Manage R2 API Tokens** → Create token → copy |
| **Secret Access Key** | Same token creation screen (copy once) |
| **Public URL**      | Bucket → Settings → Allow public access → Public bucket URL |

After this, image uploads from the app (posts and profile) will be stored in Cloudflare R2.
