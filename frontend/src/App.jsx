import { useState } from 'react';
import Nav from './components/Nav';
import Hero from './components/Hero';
import ValueProps from './components/ValueProps';
import HowItWorks from './components/HowItWorks';
import LiveDemo from './components/LiveDemo';
import Dashboard from './components/Dashboard';
import ReflexionLessons from './components/ReflexionLessons';
import Footer from './components/Footer';
import { colors, fonts } from './theme';

export default function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  return (
    <div style={{ width: '100%', overflowX: 'hidden', color: colors.ink, fontFamily: fonts.body }}>
      <Nav />
      <Hero />
      <ValueProps />
      <HowItWorks />
      <LiveDemo onCallCompleted={() => setRefreshTrigger((n) => n + 1)} />
      <Dashboard refreshTrigger={refreshTrigger} />
      <ReflexionLessons refreshTrigger={refreshTrigger} />
      <Footer />
    </div>
  );
}
