# DiveMaster — Production Server Setup & Local PostgreSQL Deployment Guide

This guide walks you step-by-step through deploying the **DiveMaster Progress App** on a Linux server (Ubuntu 22.04 / 24.04 LTS or Debian) with a local PostgreSQL 16 database, process management via PM2, and an Nginx reverse proxy with HTTPS (SSL).

---

## Step 1: Server Prerequisites & Node.js 20 Setup

1. **Update System Packages & Enable 2GB Swap (Prevents OOM Build Kills)**:
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install -y curl git build-essential

   # Create 2GB Swap space to prevent out-of-memory errors during next build
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```

2. **Install Node.js 20 LTS**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs
   ```

3. **Install pnpm@9 & PM2 globally**:
   ```bash
   sudo npm install -g pnpm@9 pm2
   ```

4. **Verify versions**:
   ```bash
   node -v   # Should output v20.x.x
   pnpm -v   # Should output 8.x or 9.x
   pm2 -v
   ```

---

## Step 2: Install & Configure Local PostgreSQL 16

1. **Install PostgreSQL & Contrib modules**:
   ```bash
   sudo apt install -y postgresql postgresql-contrib
   sudo systemctl enable --now postgresql
   ```

2. **Create Database & Dedicated Production User**:
   Open the PostgreSQL interactive shell:
   ```bash
   sudo -u postgres psql
   ```

   Run the following SQL commands (replace `'YourStrongPasswordHere'` with a secure password):
   ```sql
   CREATE DATABASE divemaster_prod;
   CREATE USER divemaster_user WITH ENCRYPTED PASSWORD 'YourStrongPasswordHere';
   GRANT ALL PRIVILEGES ON DATABASE divemaster_prod TO divemaster_user;
   ALTER DATABASE divemaster_prod OWNER TO divemaster_user;
   \q
   ```

3. **Verify PostgreSQL Local Access**:
   ```bash
   psql -U divemaster_user -d divemaster_prod -h 127.0.0.1 -W
   # Type your password and enter '\q' to exit upon successful connection.
   ```

---

## Step 3: Clone Codebase & Install Dependencies

1. **Clone the GitHub Repository**:
   ```bash
   sudo mkdir -p /var/www
   sudo chown -R $USER:$USER /var/www
   git clone https://github.com/avitalguy1/divemaster.git /var/www/divemaster
   cd /var/www/divemaster
   ```

2. **Install Dependencies**:
   ```bash
   pnpm install --frozen-lockfile
   ```

---

## Step 4: Configure Production Environment Variables (`.env.local`)

Create the `.env.local` file inside `/var/www/divemaster/`:
```bash
nano .env.local
```

Paste the following configuration (replace password and JWT secret with your secure keys):

```ini
# Node Environment & Server Port
NODE_ENV=production
PORT=3000

# Local Postgres Database Connection String
DATABASE_URL=postgres://divemaster_user:YourStrongPasswordHere@127.0.0.1:5432/divemaster_prod

# Session Security JWT Key (Min 32 random characters)
# Generate a new random secret with: openssl rand -base64 32
JWT_SECRET=c8f82a9b3d1e4f7a2c5e8b0d3f6a9c2e4b7d0a3f6c9e2a5b8d1e4f7a2c5e8b0d

# Public App Base URL
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

Save and exit (`Ctrl + O`, `Enter`, `Ctrl + X`).

---

## Step 5: Initialize Database Schema & Catalog Seed

1. **Push Drizzle ORM Database Schema**:
   ```bash
   pnpm drizzle-kit push
   ```

2. **Seed PADI Catalog & Admin Account**:
   ```bash
   pnpm db:seed
   ```

---

## Step 6: Build the Production Bundle

Compile the Next.js App Router application:
```bash
pnpm build
```

---

## Step 7: Configure Process Management with PM2

1. **Start the Next.js Production Server**:
   ```bash
   pm2 start pnpm --name "divemaster" -- start
   ```

2. **Configure PM2 Boot Startup**:
   ```bash
   pm2 save
   pm2 startup
   ```
   *Follow the command output provided by PM2 to paste the `sudo systemctl env ...` command so PM2 auto-reboots your app if the server restarts.*

3. **Check Application Status**:
   ```bash
   pm2 status
   pm2 logs divemaster --lines 20
   ```

---

## Step 8: Configure Nginx & Free SSL Certificate (HTTPS)

1. **Install Nginx & Certbot**:
   ```bash
   sudo apt install -y nginx certbot python3-certbot-nginx
   ```

2. **Create Nginx Site Configuration**:
   ```bash
   sudo nano /etc/nginx/sites-available/divemaster
   ```

   Paste the following configuration (replace `yourdomain.com` with your actual domain or server IP):

   ```nginx
   server {
       listen 80;
       server_name yourdomain.com www.yourdomain.com;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
           client_max_body_size 10M;
       }
   }
   ```

3. **Enable Site & Test Nginx Config**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/divemaster /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

4. **Obtain & Install SSL Certificate (Certbot)**:
   ```bash
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```
   Certbot will automatically configure HTTPS redirect and SSL certificates for your domain!

---

## Maintenance Commands & Useful Shortcuts

- **View Live Logs**: `pm2 logs divemaster`
- **Restart Application**: `pm2 restart divemaster`
- **Update Application to Latest Git Commit**:
  ```bash
  cd /var/www/divemaster
  git pull origin master
  pnpm install
  pnpm build
  pm2 restart divemaster
  ```
- **Database Backup (Automated Nightly Backup)**:
  ```bash
  pg_dump -U divemaster_user -d divemaster_prod -h 127.0.0.1 > /var/backups/divemaster_$(date +%F).sql
  ```

---
*Setup Complete! Your DiveMaster Production App is live at `https://yourdomain.com`!*
