You are a **senior TypeScript/Node.js architect**.  
The following CLI project currently exists as a monolithic structure and must be modularised according to **clean architecture**, **maintainability**, and **single-responsibility** principles.

Your objective is to produce a **comprehensive modular architecture plan** without altering any business logic.  
Only restructure and refactor the codebase layout and file responsibilities.

**Tasks:**

1.  **Full Project Scan**
    *   Analyse the **entire project root**, including all existing files, subdirectories, and configuration scripts.
    *   Verify that each file’s purpose, naming, and location are consistent with clean modular design.
    *   Identify any misplaced logic, duplicated functionality, or cross-domain coupling and propose the correct modular relocation.
2.  **Domain Identification**
    *   Separate the code into clear domains:
        *   commands
        *   utils
        *   config
        *   api client
        *   constants
        *   cli bootstrap
3.  **Command Modularisation**
    *   Move each command (e.g. chat, models, code) into its own sub-module under /src/commands/.
    *   Each command module must export a clear interface such as registerChatCommand(program) or handleChatCommand(args).
4.  **Dynamic Command Loader**
    *   Implement /src/cli/registerCommands.js to **dynamically register** all available commands with **Commander**.
    *   Keep /src/index.js minimal — limited to:
        *   loading environment variables
        *   creating the Commander instance
        *   registering commands
        *   parsing CLI input
5.  **Utility Extraction**
    *   Extract stream handling, file operations, API-key validation, and model filtering into reusable modules under /src/utils/.
    *   Create a shared handleError() utility to ensure **consistent async/await error handling** and uniform console output.
6.  **Configuration & Constants**
    *   Ensure constants remain in /src/constants.js and are imported selectively.
    *   All configuration and path resolution must be **relative-safe** using path.resolve() and environment-based overrides.
7.  **Coding Standards**
    *   Maintain **pure ES module syntax** (import / export).
    *   Follow Node.js best practices for modular boundaries, naming, and imports.
    *   Enforce a consistent, production-ready directory structure.
8.  **Testing Structure**
    *   Create a complete /tests folder that **mirrors the /src structure**, with both **unit and integration** test coverage.
    *   Required test subfolders:
        *   /tests/api
        *   /tests/cli
        *   /tests/commands
        *   /tests/utils
        *   /tests/integration
9.  **Consistency Audit**
    *   Confirm that every file and directory in the project root aligns with the modular plan (no redundant or orphaned files).
    *   Highlight any inconsistencies in naming, structure, or import/export patterns.

**Output Requirements:**

Provide a **proposed project folder structure**, including all relevant filenames and concise one-line summaries of what each file or folder is responsible for.  
Do **not** include any rewritten code.

The output must clearly demonstrate:

*   Properly modularised and scalable CLI architecture.
*   Clear separation of command logic, utilities, configuration, and API layers.
*   Dedicated mirrored test directories for every domain.
*   Full consistency and structural integrity across the entire project root.
*   Clean, production-grade Node.js ESM design suitable for long-term maintainability.