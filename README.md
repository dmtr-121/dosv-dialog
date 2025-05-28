# Medical Dialogue Application

A comprehensive medical dialogue application built with React, TypeScript, and Vite. This application provides real-time speech transcription capabilities for medical conversations, enabling healthcare professionals to practice and analyze patient-doctor interactions.

## Features

### 🎯 Core Functionality
- **Real-time Speech Transcription**: Advanced speech-to-text capabilities using Deepgram SDK
- **Medical Dialogue Practice**: Interactive practice sessions for medical conversations
- **Dialogue Player**: Playback and analysis of recorded medical conversations
- **Multi-language Support**: Language settings for international healthcare environments
- **Socket.io Integration**: Real-time communication for collaborative features

### 🏥 Medical-Specific Features
- **Specialized Medical Transcription Logic**: Custom logic for handling medical terminology and conversation flow
- **Patient-Doctor Interaction Simulation**: Practice scenarios for healthcare professionals
- **Conversation Analysis**: Review and analyze dialogue patterns and effectiveness

### 🛠 Technical Features
- **Modern React Architecture**: Built with React 18 and TypeScript for type safety
- **Responsive Design**: Mobile-first design using Tailwind CSS
- **Real-time Updates**: WebSocket integration for live transcription
- **String Similarity Matching**: Advanced text comparison for medical terminology
- **Modular Component Structure**: Maintainable and scalable codebase

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Speech Recognition**: Deepgram SDK
- **Real-time Communication**: Socket.io Client
- **Routing**: React Router DOM
- **Icons**: Lucide React
- **Text Analysis**: String Similarity
- **Build Tool**: Vite
- **Linting**: ESLint with TypeScript support

## Project Structure

```
src/
├── components/          # Reusable UI components
├── context/            # React context providers
├── data/               # Static data and configurations
├── hooks/              # Custom React hooks
├── pages/              # Main application pages
│   ├── DialoguePlayer.tsx    # Dialogue playback interface
│   ├── DialogueStartPage.tsx # Starting page for dialogues
│   ├── Dialogues.tsx         # Dialogue management
│   ├── Practice.tsx          # Practice session interface
│   └── NotFound.tsx          # 404 error page
├── router/             # Application routing
├── services/           # API and external service integrations
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## Prerequisites

- Node.js (version 18 or higher)
- npm or yarn package manager
- Modern web browser with microphone access

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/medical-dialogue-app.git
   cd medical-dialogue-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory and add your configuration:
   ```env
   VITE_DEEPGRAM_API_KEY=your_deepgram_api_key
   VITE_SOCKET_URL=your_socket_server_url
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173` to view the application.

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm run preview` - Preview the production build locally
- `npm run lint` - Run ESLint for code quality checks
- `npm run knip` - Analyze unused files and dependencies

## Usage

### Starting a Medical Dialogue Session

1. Navigate to the **Dialogue Start Page**
2. Configure your language settings using the settings modal
3. Grant microphone permissions when prompted
4. Begin speaking to start real-time transcription
5. Practice medical conversations with live feedback

### Reviewing Dialogues

1. Access the **Dialogues** page to view recorded sessions
2. Use the **Dialogue Player** to replay and analyze conversations
3. Review transcription accuracy and medical terminology usage

### Practice Mode

1. Enter **Practice Mode** for guided medical conversation scenarios
2. Follow prompts and practice common medical dialogue patterns
3. Receive real-time feedback on speech clarity and medical terminology

## Configuration

### Transcription Logic

The application includes sophisticated transcription logic specifically designed for medical conversations. See `TranscriptionLogic.md` for detailed information about the transcription flow and logic.

### Language Settings

The application supports multiple languages for international healthcare environments. Language preferences can be configured through the settings modal.

## Deployment

### Production Build

```bash
npm run build
```

The built files will be in the `dist/` directory, ready for deployment to any static hosting service.

### Netlify Deployment

This project includes Netlify configuration (`netlify.toml`). Deploy directly to Netlify by connecting your repository.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Code Quality

This project maintains high code quality standards:

- **TypeScript**: Full type safety throughout the application
- **ESLint**: Automated code linting with React and TypeScript rules
- **Knip**: Unused code detection and cleanup
- **Modular Architecture**: Components are limited to 300 lines for maintainability

## License

This project is private and proprietary. All rights reserved.

## Support

For support and questions about medical dialogue features or technical implementation, please create an issue in the repository.

---

**Note**: This application requires microphone access for speech transcription features. Please ensure your browser supports and allows microphone access for the best experience. 