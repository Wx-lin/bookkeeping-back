# 智能记账系统 API 测试指南

## 1. 用户认证

### 注册 (Sign Up)
**POST** `/auth/signup`
```bash
curl --location 'http://localhost:3000/auth/signup' \
--header 'Content-Type: application/json' \
--data '{
    "email": "user@example.com",
    "password": "password123",
    "name": "Demo User"
}'
```

### 登录 (Login)
**POST** `/auth/login`
> **注意**: 请复制响应中的 `token`，在后续所有请求的 Header 中添加 `token: <TOKEN>`
```bash
curl --location 'http://localhost:3000/auth/login' \
--header 'Content-Type: application/json' \
--data '{
    "email": "user@example.com",
    "password": "password123"
}'
```

---

## 2. 基础设置

### 创建账户 (Create Account)
**POST** `/accounts`
```bash
curl --location 'http://localhost:3000/accounts' \
--header 'Content-Type: application/json' \
--header 'token: <YOUR_ACCESS_TOKEN>' \
--data '{
    "name": "招商银行",
    "type": "Bank Card",
    "balance": 10000.00
}'
```

### 获取账户列表 (List Accounts)
**GET** `/accounts`
```bash
curl --location 'http://localhost:3000/accounts' \
--header 'token: <YOUR_ACCESS_TOKEN>'
```

### 创建分类 (Create Category)
**POST** `/categories`
```bash
curl --location 'http://localhost:3000/categories' \
--header 'Content-Type: application/json' \
--header 'token: <YOUR_ACCESS_TOKEN>' \
--data '{
    "name": "餐饮",
    "type": "EXPENSE",
    "icon": "🍔"
}'
```

---

## 3. 记账功能

### 手动记账 (Manual Transaction)
**POST** `/transactions`
```bash
curl --location 'http://localhost:3000/transactions' \
--header 'Content-Type: application/json' \
--header 'token: <YOUR_ACCESS_TOKEN>' \
--data '{
    "amount": 50,
    "type": "EXPENSE",
    "accountId": 1,
    "categoryId": 1,
    "description": "超市购物",
    "date": "2023-12-01T10:00:00Z"
}'
```

### AI 智能记账 (AI Chat)
**POST** `/ai/chat`
> 需配置 OpenAI Key。AI 会自动分析文本中的金额、账户和分类。
```bash
curl --location 'http://localhost:3000/ai/chat' \
--header 'Content-Type: application/json' \
--header 'token: <YOUR_ACCESS_TOKEN>' \
--data '{
    "text": "刚用招商银行卡付了房租3000元"
}'
```

---

## 4. 统计报表

### 总资产概览 (Assets Overview)
**GET** `/stats/assets`
```bash
curl --location 'http://localhost:3000/stats/assets' \
--header 'token: <YOUR_ACCESS_TOKEN>'
```

### 收支趋势 (Trend)
**GET** `/stats/trend`
```bash
curl --location 'http://localhost:3000/stats/trend?startDate=2023-01-01&endDate=2023-12-31' \
--header 'token: <YOUR_ACCESS_TOKEN>'
```

### 分类统计 (Category Stats)
**GET** `/stats/category`
```bash
curl --location 'http://localhost:3000/stats/category?startDate=2023-01-01&endDate=2023-12-31' \
--header 'token: <YOUR_ACCESS_TOKEN>'
```

