# SentientX

SentientX is a modern AI Workflow Automation Platform that allows users to create, manage, and execute automated workflows with a visual, drag-and-drop interface.

<!-- ![SentientX](https://user-images.githubusercontent.com/your-username/sentientx/assets/screenshot.png) -->

## Features

- **Visual Workflow Builder**: Drag-and-drop interface to create complex workflows
- **Real-time Execution Monitoring**: Track workflow executions with detailed status and logs
- **Custom Node Types**: Extensible architecture with various node categories
- **User Authentication**: Secure login and profile management
- **Theme Support**: Multiple theme options (Light, Dark, System, Red, Rose)
- **Responsive Design**: Full mobile and desktop support

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **State Management**: Zustand, SWR for data fetching
- **Database**: Supabase
- **Authentication**: Supabase Auth

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn
- Access to company Supabase account

### Installation

1. Clone the repository from the company's private repository:
   ```bash
   git clone [INTERNAL_REPOSITORY_URL]
   cd sentientx
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn
   ```

3. Request the `.env.local` file from your team lead containing the Supabase credentials.

4. Start the development server:
```bash
npm run dev
# or
yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Database Setup

The application requires several tables in the Supabase database:

1. `workflows` - Stores workflow definitions
2. `executions` - Stores workflow execution history
3. User authentication tables (created automatically by Supabase)

All database migrations are managed by the DevOps team. Contact them if you need any changes to the database schema.

## Usage

### Creating a Workflow

1. Navigate to the Workflows page
2. Click "Create Workflow"
3. Give your workflow a name and description
4. Use the visual editor to add and connect nodes
5. Save your workflow

### Monitoring Executions

1. Navigate to the Executions page
2. View the status of all workflow executions
3. Filter by status, search by name, or sort by any column
4. Enable auto-refresh to see real-time updates (refreshes every 5 seconds)

### User Settings

1. Access your profile settings from the user menu
2. Update your name and password
3. Customize application theme

## Development Guidelines

This is a private commercial project. Please follow these guidelines:

1. All code changes must go through the internal review process
2. Maintain code style and conventions established in the codebase
3. Document new features and API changes
4. Add appropriate test coverage for new functionality
5. Contact your team lead for access to additional resources or documentation

## Proprietary Notice

© 2025 SentientX. All rights reserved.

This software is proprietary and confidential. Unauthorized copying, transfer, or use of this software in source or binary forms via any medium is strictly prohibited without express written permission.

## Third-Party Dependencies

This project makes use of the following third-party libraries:

- [Next.js](https://nextjs.org/)
- [React](https://reactjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Supabase](https://supabase.io/)
- [SWR](https://swr.vercel.app/)
- [Zustand](https://github.com/pmndrs/zustand)
