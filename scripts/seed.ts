import 'dotenv/config';
import { db } from '../src/db/db.js';
import { matches, commentary } from '../src/db/schema.js';

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // Seed matches (one live, one upcoming, one finished)
    const now = new Date();
    
    await db.insert(matches).values([
      {
        sport: 'football',
        homeTeam: 'Manchester United',
        awayTeam: 'Liverpool',
        homeScore: 2,
        awayScore: 1,
        status: 'live',
        startTime: new Date(now.getTime() - 70 * 60 * 1000), // 70 min ago
        endTime: new Date(now.getTime() + 20 * 60 * 1000),   // 20 min from now
      },
      {
        sport: 'football',
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        homeScore: 0,
        awayScore: 0,
        status: 'scheduled',
        startTime: new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2 hours from now
        endTime: new Date(now.getTime() + 4 * 60 * 60 * 1000),
      },
      {
        sport: 'football',
        homeTeam: 'Real Madrid',
        awayTeam: 'Barcelona',
        homeScore: 3,
        awayScore: 2,
        status: 'finished',
        startTime: new Date(now.getTime() - 48 * 60 * 60 * 1000), // 2 days ago
        endTime: new Date(now.getTime() - 46 * 60 * 60 * 1000),
      },
    ]);
    console.log('✅ Matches seeded');

    // Seed commentary for live match (match_id will be 1)
    await db.insert(commentary).values([
      {
        matchId: 1,
        minute: 12,
        sequence: 1,
        period: 1,
        eventType: 'yellow_card',
        team: 'home',
        actor: 'Casemiro',
        message: 'Yellow card for Casemiro after a late tackle',
        metadata: { reason: 'late_tackle' },
      },
      {
        matchId: 1,
        minute: 34,
        sequence: 1,
        period: 1,
        eventType: 'substitution',
        team: 'away',
        actor: 'Darwin Nunez',
        message: 'Substitution: Darwin Nunez replaced by Diogo Jota',
        metadata: { playerOff: 'Darwin Nunez', playerOn: 'Diogo Jota' },
      },
      {
        matchId: 1,
        minute: 45,
        sequence: 1,
        period: 1,
        eventType: 'goal',
        team: 'away',
        actor: 'Mohamed Salah',
        message: 'GOAL! Salah equalizes for Liverpool with a brilliant finish!',
        metadata: { assist: 'Alexander-Arnold' },
      },
      {
        matchId: 1,
        minute: 67,
        sequence: 1,
        period: 2,
        eventType: 'goal',
        team: 'home',
        actor: 'Marcus Rashford',
        message: 'GOAL! Rashford puts United ahead with a powerful strike!',
        metadata: { assist: 'Bruno Fernandes', varReviewed: false },
      },
    ]);
    console.log('✅ Commentary seeded');

    console.log('🎉 Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
