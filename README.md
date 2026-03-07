# Bailey's Baby Shower Trivia

A fun, interactive baby shower trivia game built with Next.js, React, and TypeScript. Host a game on a TV/tablet and let players join with their phones to answer questions and compete for the top spot on the leaderboard.

## Features

- **Real-time multiplayer gameplay** - Players join using a simple 5-character code
- **Host screen** - Designed for TV/tablet display to manage the game flow
- **Player avatars** - Choose from cute baby-themed emojis
- **Live leaderboard** - Track scores and rankings in real-time
- **Confetti celebrations** - Animated celebrations for winners
- **Responsive design** - Works on mobile, tablet, and desktop devices

## Tech Stack

- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Canvas Confetti** - Celebration animations

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/dawsja/baby-shower-game.git
cd baby-shower-game
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## How to Play

### For Hosts:
1. Click "Create Game (Host Screen)" to start a new game
2. Share the 5-character join code with players
3. Use the host screen to manage game flow, display questions, and show results
4. The host screen is designed for larger displays (TV/tablet) and does not submit answers

### For Players:
1. Enter your name and choose an avatar
2. Enter the 5-character join code provided by the host
3. Answer questions as quickly as possible to earn more points
4. Watch the leaderboard to see how you rank against other players

## Game Flow

1. **Lobby Phase** - Players join and get ready
2. **Question Phase** - Host displays questions, players submit answers
3. **Scoring Phase** - Points are awarded based on speed and accuracy
4. **Leaderboard** - Updated rankings are displayed
5. **Celebration** - Confetti for the winner!

## Project Structure

```
baby-shower-game/
├── app/                    # Next.js app router pages
│   ├── api/               # API routes
│   ├── game/              # Player game interface
│   ├── host/              # Host management interface
│   └── layout.tsx         # Root layout
├── components/            # Reusable React components
│   ├── confetti-burst.tsx
│   ├── join-form.tsx
│   ├── leaderboard-panel.tsx
│   ├── lobby-panel.tsx
│   ├── question-panel.tsx
│   └── scoreboard.tsx
├── lib/                   # Utility functions
├── public/               # Static assets
└── styles/               # Global styles
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private and not licensed for public use.

## Support

For questions or issues, please contact the project maintainer.
