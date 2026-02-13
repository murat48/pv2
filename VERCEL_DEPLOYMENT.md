# Vercel Deployment Guide

## Ön Gereksinimler
```bash
npm install -g vercel
```

## Deploy Adımları

### 1. Vercel'e Giriş Yap
```bash
vercel login
```

### 2. Proje Dizinine Git
```bash
cd /home/muratkeskin/stacksx402/projectv2
```

### 3. Vercel Proje Başlat (İlk kez)
```bash
vercel
```
- Project name: `stacksx402-projectv2` (veya istediğin isim)
- Proje lokasyonunu seç
- Deploy konfigürasyonu tamamla

### 4. Environment Variables Ekle
Dashboard'dan (https://vercel.com) proje ayarlarına git:
1. **Settings** > **Environment Variables**
2. Aşağıdaki değişkenleri ekle:

```
NETWORK=testnet
SERVER_ADDRESS=ST27JS9DDS6986ZCC50AM3JRANZRCBSH7ZXM87RK3
WALLET_STANDARD=ST27JS9DDS6986ZCC50AM3JRANZRCBSH7ZXM87RK3
WALLET_ADVANCED=ST27JS9DDS6986ZCC50AM3JRANZRCBSH7ZXM87RK3
WALLET_PREMIUM=ST27JS9DDS6986ZCC50AM3JRANZRCBSH7ZXM87RK3
WALLET_ENTERPRISE=ST27JS9DDS6986ZCC50AM3JRANZRCBSH7ZXM87RK3
FACILITATOR_URL=https://facilitator.stacksx402.com
SERVICE_NAME=x402 Vision AI AutoPay
SERVICE_IMAGE=https://pv2-six.vercel.app/vision-logo.png
BASE_URL=https://pv2-six.vercel.app
GEMINI_API_KEY=<your_actual_key>
```

### 5. Deploy Et (Sonraki Deploymentler)
```bash
vercel deploy
# Production'a deploy etmek için
vercel deploy --prod
```

## Doğrulama

Deploy tamamlandıktan sonra test et:

```bash
# Register endpoint
curl https://your-domain.vercel.app/vision/register

# Health check
curl https://your-domain.vercel.app/health

# Analyze endpoint
curl -X POST https://your-domain.vercel.app/vision/analyze \
  -H "Content-Type: application/json" \
  -d '{"question":"Test","imageBase64":""}'
```

## Sorun Giderme

Logs kontrol et:
```bash
vercel logs
```

Build hata kontrol et:
```bash
vercel build
```

## Git Push ile Otomatik Deploy

Vercel team dashboard'undan GitHub entegrasyonu kur:
1. https://vercel.com > Project Settings > Git Integration
2. GitHub repo'yu bağla
3. Main/master branch'e push ettiğinde otomatik deploy olur
