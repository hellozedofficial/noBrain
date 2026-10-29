# 🚀 VPS Deployment Guide — ai.saleonic.com

This guide covers deploying the **noBrain** Next.js app on a Ubuntu VPS and serving it at `ai.saleonic.com`.

---

## 📋 Prerequisites

- Ubuntu VPS with SSH access (`ubuntu@meet`)
- Domain `ai.saleonic.com` DNS A record → VPS IP
- Node.js ≥ 18 & npm 10.8.2 installed on VPS
- MySQL running on VPS
- Git installed on VPS

---

## 1. Server Setup (One-time)

### Install Node.js 20 (if not already)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v && npm -v
```

### Install PM2 (process manager)

```bash
sudo npm install -g pm2
```

### Install Nginx

```bash
sudo apt update
sudo apt install -y nginx
```

---

## 2. MySQL Database Setup

```bash
sudo apt install -y mysql-server
sudo mysql_secure_installation

# Create database and user
sudo mysql -u root -p
```

```sql
CREATE DATABASE openrouter_ai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'nobrain'@'localhost' IDENTIFIED BY 'YOUR_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON openrouter_ai.* TO 'nobrain'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## 3. Clone & Configure the Project

```bash
cd /var/www
sudo git clone git@github.com:hellozedofficial/noBrain.git
sudo chown -R ubuntu:ubuntu /var/www/noBrain
cd /var/www/noBrain
```

### Create `.env.local`

```bash
cp .env.example .env.local
nano .env.local
```

Fill in all values:

```env
# Database
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=nobrain
MYSQL_PASSWORD=YOUR_STRONG_PASSWORD
MYSQL_DATABASE=openrouter_ai

# Auth
NEXTAUTH_SECRET=GENERATE_WITH: openssl rand -base64 32
NEXTAUTH_URL=https://ai.saleonic.com

# AWS Bedrock
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
AWS_BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0

# EPS Payment Gateway
PLATFORM_EPS_USERNAME=your-eps-username
PLATFORM_EPS_PASSWORD=your-eps-password
PLATFORM_EPS_HASH_KEY=your-hash-key
PLATFORM_EPS_MERCHANT_ID=your-merchant-id
PLATFORM_EPS_STORE_ID=your-store-id
PLATFORM_EPS_DEVICE_TYPE_ID=1
PLATFORM_EPS_SANDBOX=false
PLATFORM_EPS_ENABLED=true

# Platform Pricing (BDT)
PLATFORM_INPUT_PER_MILLION_PRICE=10
PLATFORM_OUTPUT_PER_MILLION_PRICE=15
PLATFORM_MINIMUM_RECHARGE_AMOUNT=500
PLATFORM_PREPAID_ONLY=true
```

> 💡 Generate a secure secret: `openssl rand -base64 32`

---

## 4. Install Dependencies & Build

```bash
cd /var/www/noBrain
npm install
npm run build
```

### Initialize Database (if applicable)

```bash
npm run init:wallet
```

---

## 5. Run with PM2

```bash
pm2 start npm --name "nobrain" -- start
pm2 save
pm2 startup
# Run the command that pm2 prints out (with sudo)
```

Verify it's running:

```bash
pm2 status
pm2 logs nobrain
```

The app will run on **port 3000** by default.

---

## 6. Nginx Reverse Proxy Configuration

```bash
sudo nano /etc/nginx/sites-available/ai.saleonic.com
```

Paste the following:

```nginx
server {
    listen 80;
    server_name ai.saleonic.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and test:

```bash
sudo ln -s /etc/nginx/sites-available/ai.saleonic.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 7. SSL with Let's Encrypt (HTTPS)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d ai.saleonic.com
```

Certbot will auto-configure HTTPS. Auto-renewal is enabled by default.

Verify renewal:

```bash
sudo certbot renew --dry-run
```

---

## 8. Updating the App (Future Deploys)

```bash
cd /var/www/noBrain
git pull origin main
npm install
npm run build
pm2 restart nobrain
```

---

## 9. Useful Commands

| Command | Description |
|---|---|
| `pm2 status` | Check app status |
| `pm2 logs nobrain` | View live logs |
| `pm2 restart nobrain` | Restart app |
| `pm2 stop nobrain` | Stop app |
| `sudo systemctl status nginx` | Check Nginx |
| `sudo systemctl restart nginx` | Restart Nginx |
| `sudo mysql -u nobrain -p openrouter_ai` | Connect to DB |

---

## 🔒 Security Checklist

- [ ] Strong MySQL password set
- [ ] `.env.local` not committed to git (it's in `.gitignore`)
- [ ] Firewall configured: `sudo ufw allow 22,80,443/tcp && sudo ufw enable`
- [ ] `EPS_SANDBOX=false` for production
- [ ] `NEXTAUTH_URL` set to `https://ai.saleonic.com`
- [ ] SSL certificate installed and auto-renewing

---

## 🌐 DNS Configuration

Point your domain to the VPS:

| Type | Name | Value |
|---|---|---|
| A | `ai.saleonic.com` | `YOUR_VPS_IP` |

DNS propagation may take up to 24–48 hours.

---

**Done!** Visit `https://ai.saleonic.com` 🎉
