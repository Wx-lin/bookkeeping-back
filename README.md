# Project Name

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Prerequisites (前置条件)

Before you begin, ensure you have met the following requirements:
(在开始之前，请确保满足以下条件：)

*   **Node.js**: version >= 18 (Recommended: v20 LTS)
*   **pnpm**: Package manager (install via `npm i -g pnpm`)
*   **Docker & Docker Compose**: For running the database locally.

## Project Setup (项目设置)

1.  **Clone the repository (拉取代码)**
    ```bash
    git clone <repository_url>
    cd project-name
    ```

2.  **Install dependencies (安装依赖)**
    ```bash
    pnpm install
    ```

3.  **Environment Configuration (环境配置)**
    Copy the example environment file to create your local `.env` file:
    (复制示例配置文件以创建本地 `.env` 文件：)
    ```bash
    cp env.example .env
    ```
    *Note: The default `env.example` contains credentials matching the `docker-compose.yml` setup. Adjust `OPENAI_API_KEY` if you need AI features.*

4.  **Database Setup (数据库设置)**
    Start the PostgreSQL database using Docker:
    (启动数据库容器：)
    ```bash
    docker-compose up -d
    ```

    Run database migrations to create tables:
    (运行数据库迁移以创建表结构：)
    ```bash
    npx prisma migrate dev
    ```

## Compile and run (运行项目)

```bash
# development mode (开发模式)
pnpm run start:dev

# production mode (生产模式)
pnpm run start:prod
```

The application will generally be available at `http://localhost:3000`.

## Testing (测试)

```bash
# unit tests
pnpm run test

# e2e tests
pnpm run test:e2e
```

## Data Persistence (数据持久化)

Data is stored in a Docker volume named `postgres_data`. To reset the database completely:
(数据存储在名为 `postgres_data` 的 Docker 卷中。如果需要彻底重置数据库：)

```bash
docker-compose down -v
docker-compose up -d
npx prisma migrate dev
```
