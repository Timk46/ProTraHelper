# Production Docker Setup Plan (Revised Sed Approach)

## Goal

Configure `docker-compose.yml` and associated Dockerfiles (`Docker/nest`, `Docker/angular`) to build and run the NestJS backend and Angular frontend for production, handling environment variables securely and resolving shared DTO paths correctly using `sed` for tsconfig modifications.

## Assumptions

*   An external Nginx reverse proxy is already configured or will be configured separately to route traffic based on subdomains (e.g., `api-aud.goals...` -> NestJS container, `aud.goals...` -> Angular container) to the Docker containers.
*   A production PostgreSQL database is running and accessible from the Docker network.
*   Production environment files (`.env`, `.env.auth.prod`) containing necessary secrets and URLs will be created and stored securely in the project root (`c:/git/hefl`). The `.env` file will be used by Docker Compose for build arguments and runtime environment, while `.env.auth.prod` will supplement the runtime environment with secrets.
*   This plan focuses on the production Docker setup and will **not** interfere with the existing local development workflow (using `localhost`).

## Plan Steps

1.  **Prepare Environment Files:**
    *   Create/Update `.env` in `c:/git/hefl` with non-sensitive production configurations (NODE_ENV, WEBSITE_URL, SERVER_URL, FILE_PATH, JUDGE0_URL, LANGCHAIN vars, etc.). **Crucially, ensure `FILE_PATH=/usr/src/files`**.
        ```dotenv
        # Example c:/git/hefl/.env
        NODE_ENV=production
        WEBSITE_URL=https://aud.goals.eti.uni-siegen.de
        SERVER_URL=https://api-aud.goals.eti.uni-siegen.de
        FILE_PATH=/usr/src/files # Correct path for container volume
        JUDGE0_URL=https://judge0.kodakai.de
        LANGCHAIN_CALLBACKS_BACKGROUND=true
        LANGCHAIN_TRACING_V2=true
        LANGCHAIN_ENDPOINT="https://api.smith.langchain.com"
        LANGCHAIN_PROJECT="GOALS_production_AUD_WiSe2324"
        ```
    *   Create/Update `.env.auth.prod` in `c:/git/hefl` with sensitive secrets (DATABASE_URL, OPENAI_API_KEY, CRYPTO_KEY, LANGCHAIN_API_KEY, etc.). Ensure comments use `#`.
        ```dotenv
        # Example c:/git/hefl/.env.auth.prod
        # Contains sensitive secrets
        DATABASE_URL="postgresql://root:YOUR_PROD_DB_PASSWORD@goals_production_db:5432/production_aud_wise2425"
        OPENAI_API_KEY="sk-..."
        CRYPTO_KEY="vOLH..."
        LANGCHAIN_API_KEY="lsv2_..."
        ```
    *   **Action:** Add/Ensure `.env` and `.env.auth.prod` are in `.gitignore`.

2.  **Modify `server_nestjs/tsconfig.json` (During Docker build):**
    *   Update `Docker/nest` to use `sed` to change `../shared/dtos/*` paths to `./shared/dtos/*` *before* `npm install`.

3.  **Modify `client_angular/tsconfig.json` (During Docker build):**
    *   Update `Docker/angular` to use `sed` to change `../shared/dtos/*` paths to `./shared/dtos/*` *before* `npm install`.

4.  **Modify `client_angular/src/environments/environment.ts` (During Docker build):**
    *   The `Docker/angular` file will use `sed` to replace development values with production values passed via build arguments (`WEBSITE_URL`, `SERVER_URL`) and set `production: true` *before* `ng build`.
        ```typescript
        // Base client_angular/src/environments/environment.ts (placeholders added for clarity)
        export const environment = {
          server: 'http://localhost:3000', // Will be replaced by SERVER_URL
          websiteUrl: 'http://localhost:4200', // Will be replaced by WEBSITE_URL
          max_html_body_size: 5000000,
          websocketUrl: 'http://localhost:3001', // Consider if this needs replacement too
          production: false, // Will be set to true
        };
        ```

5.  **Update `Docker/nest` Dockerfile:**
    *   Ensure the `sed` command `RUN sed -i 's#"\.\./shared/dtos/\*"#"./shared/dtos/\*"#g' tsconfig.json` is present before `npm i`.
    *   Ensure the build command is the default `RUN npm run build`.

6.  **Update `Docker/angular` Dockerfile:**
    *   Ensure `ARG WEBSITE_URL` and `ARG SERVER_URL` are present.
    *   Ensure the `sed` command `RUN sed -i 's#"\.\./shared/dtos/\*"#"./shared/dtos/\*"#g' tsconfig.json` is present before `npm i`.
    *   Ensure `sed` commands are present to replace URLs and set `production: true` in `src/environments/environment.ts` *before* `ng build`.

7.  **Update `docker-compose.yml`:**
    *   Ensure `env_file` for `hefl_aud_server` service lists `.env` and `.env.auth.prod`.
    *   Ensure `build.args` for `hefl_aud_client` service passes `WEBSITE_URL: ${WEBSITE_URL}` and `SERVER_URL: ${SERVER_URL}` (these are substituted from the host's `.env` file by Docker Compose).
    *   Ensure direct `ports` mapping is removed (assuming external proxy connects to the network directly).

## Architecture Diagram

```mermaid
graph LR
    subgraph Host Machine
        A[docker-compose up -d] --> B(Docker Daemon);
        C[.env] --> A;
        D[.env.auth.prod] --> A;
        E[Source Code: server_nestjs] --> B;
        F[Source Code: client_angular] --> B;
        G[Source Code: shared] --> B;
        H[Dockerfile: Docker/nest] --> B;
        I[Dockerfile: Docker/angular] --> B;
        # Removed J[Docker/tsconfig.docker.json]
    end

    subgraph Docker Network (nginx-network)
        subgraph Build Process (NestJS)
            H -- uses --> E;
            H -- uses --> G;
            K(Modify tsconfig.json w/ sed) --> L(npm install & build); # Changed
        end
        subgraph Build Process (Angular)
            I -- uses --> F;
            I -- uses --> G;
            M(ARG WEBSITE_URL, SERVER_URL);
            N(Modify tsconfig.json w/ sed) --> O(Modify environment.ts w/ sed);
            O --> P(npm install & ng build);
        end

        B -- builds --> Q[Image: hefl_aud_server];
        B -- builds --> R[Image: hefl_aud_client];

        subgraph Running Containers
            S[Container: hefl_aud_server];
            T[Container: hefl_aud_client (Nginx)];
            U[Volume: ./files -> /usr/src/files];
            V[External Nginx Proxy];

            Q -- runs as --> S;
            R -- runs as --> T;
            C -- env_file --> S;
            D -- env_file --> S;
            U -- mounted --> S;

            V -- routes api-aud... --> S;
            V -- routes aud... --> T;

            S -- connects to --> W((Database));
            S -- uses --> U;
        end
    end

    style Host Machine fill:#f9f,stroke:#333,stroke-width:2px
    style Build Process (NestJS) fill:#ccf,stroke:#333,stroke-width:1px
    style Build Process (Angular) fill:#ccf,stroke:#333,stroke-width:1px
    style Running Containers fill:#cfc,stroke:#333,stroke-width:1px
```

## Next Steps

*   Create/Update the `.env` and `.env.auth.prod` files in `c:/git/hefl` with the correct production values (ensure `FILE_PATH=/usr/src/files` in `.env`).
*   Add/Ensure these files are in `.gitignore`.
*   Switch to "Code" mode to implement the changes in `Docker/nest`, `Docker/angular`, and `docker-compose.yml`. (Delete `Docker/tsconfig.docker.json` if it exists).