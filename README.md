# SentientX - AI Agent Workflow Automation Platform (https://www.mechsai.com)

[![Live Demo](https://img.shields.io/badge/Live%20Demo-sentientx.mechsai.com-blue?style=for-the-badge&logo=vercel)](https://sentientx.mechsai.com)
[![Backend Code](https://img.shields.io/badge/Backend%20Code-agentfactory-green?style=for-the-badge&logo=github)](https://github.com/cerebro96/agentfactory)

SentientX is a modern AI Workflow Automation Platform that allows users to create, manage, and execute automated workflows with a visual, drag-and-drop interface.

## Architecture & Integration

The platform is built as a client-first application using **[adk-web](https://github.com/google/adk-web.git)**. It connects directly to the **[Backend Service](https://github.com/cerebro96/agentfactory)** for high-performance AI agent orchestration and workflow execution.

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
- **Client Library**: [adk-web](https://github.com/google/adk-web.git)
- **Styling**: Tailwind CSS, shadcn/ui components
- **State Management**: Zustand, SWR for data fetching
- **Database**: Supabase
- **Authentication**: Supabase Auth

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn
- Access to Supabase account

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/cerebro96/sentientx.git
   cd sentientx
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn
   ```

3. Setup your environment variables by copying `.env.local.example` to `.env.local` and providing your Supabase credentials.

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

All database migrations are managed via the standard migration flow.

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

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Third-Party Dependencies

This project makes use of the following third-party libraries:

- [Next.js](https://nextjs.org/)
- [React](https://reactjs.org/)
- [adk-web](https://github.com/google/adk-web.git)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Supabase](https://supabase.io/)
- [SWR](https://swr.vercel.app/)
- [Zustand](https://github.com/pmndrs/zustand)
