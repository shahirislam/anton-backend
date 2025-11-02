require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');
const Category = require('../models/Category');
const Competition = require('../models/Competition');
const Ticket = require('../models/Ticket');
const Winner = require('../models/Winner');
const Notification = require('../models/Notification');
const PointsHistory = require('../models/PointsHistory');
const bcrypt = require('bcrypt');

const seedAll = async () => {
  try {
    // Connect to database
    await connectDB();

    console.log('🌱 Starting comprehensive seed process...\n');

    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Category.deleteMany({});
    await Competition.deleteMany({});
    await Ticket.deleteMany({});
    await Winner.deleteMany({});
    await Notification.deleteMany({});
    await PointsHistory.deleteMany({});
    console.log('✅ Existing data cleared\n');

    // 1. Create Users
    console.log('👥 Creating users...');
    const hashedUserPassword = await bcrypt.hash('password123', 10);
    const hashedAdminPassword = await bcrypt.hash('admin123', 10);

    // Calculate user points: 
    // Initial: 50000
    // Spent: 5000 + 5000 + 5000 + 4500 + 9600 = 29100
    // Earned: 5000 + 5000 + 5000 + 4500 + 9600 = 29100
    // Final: 50000 - 29100 + 29100 = 50000
    
    const testUser = new User({
      name: 'John Doe',
      email: 'user@test.com',
      password: hashedUserPassword,
      verified: true,
      role: 'user',
      total_points: 50000, // $500 worth of points
      total_earned: 79100, // 50000 initial + 29100 from purchases
      total_spent: 29100, // Total spent on tickets
    });
    await testUser.save();
    console.log('✅ Test user created');

    const testAdmin = new User({
      name: 'Admin User',
      email: 'admin@test.com',
      password: hashedAdminPassword,
      verified: true,
      role: 'admin',
      total_points: 100000,
      total_earned: 100000,
      total_spent: 0,
    });
    await testAdmin.save();
    console.log('✅ Test admin created\n');

    // 2. Create Categories
    console.log('🏷️  Creating categories...');
    const categories = [
      {
        name: 'Cars',
        image_url: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800',
      },
      {
        name: 'Vans',
        image_url: 'https://images.unsplash.com/photo-1500292011096-5b5c76d53205?w=800',
      },
      {
        name: 'Cash Prizes',
        image_url: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800',
      },
      {
        name: 'Luxury Vehicles',
        image_url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800',
      },
    ];

    const createdCategories = [];
    for (const catData of categories) {
      const category = new Category(catData);
      await category.save();
      createdCategories.push(category);
      console.log(`✅ Category created: ${category.name}`);
    }
    console.log('');

    // 3. Create Competitions
    console.log('🏁 Creating competitions...');
    const now = new Date();
    const competitionsData = [
      {
        title: 'Win a Brand New BMW 3 Series',
        short_description: 'Enter now to win this stunning BMW 3 Series worth £35,000!',
        long_description: 'This amazing competition gives you the chance to win a brand new BMW 3 Series. The car comes with full manufacturer warranty and includes all standard features. Perfect for the automotive enthusiast!',
        image_url: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800',
        category_id: createdCategories[0]._id,
        draw_time: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        cash_alternative: 35000,
        ticket_price: 10, // $10 per ticket
        max_tickets: 5000,
        max_per_person: 50,
        tickets_sold: 1250,
        status: 'active',
      },
      {
        title: 'Mercedes-Benz Sprinter Van Giveaway',
        short_description: 'Win a professional Mercedes-Benz Sprinter van - perfect for your business!',
        long_description: 'Enter our exciting competition to win a Mercedes-Benz Sprinter van. This versatile vehicle is perfect for businesses, tradespeople, or anyone who needs reliable transport with plenty of space.',
        image_url: 'https://images.unsplash.com/photo-1500292011096-5b5c76d53205?w=800',
        category_id: createdCategories[1]._id,
        draw_time: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        cash_alternative: 28000,
        ticket_price: 5, // $5 per ticket
        max_tickets: 10000,
        max_per_person: 100,
        tickets_sold: 3420,
        status: 'active',
      },
      {
        title: '£50,000 Cash Prize Draw',
        short_description: 'Win £50,000 in cash - life-changing money!',
        long_description: 'This is your chance to win £50,000 in cash! No catches, no strings attached. Use the money however you want - pay off debts, buy your dream car, or simply enjoy life.',
        image_url: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800',
        category_id: createdCategories[2]._id,
        draw_time: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000), // 21 days from now
        cash_alternative: 50000,
        ticket_price: 2.50, // $2.50 per ticket
        max_tickets: 30000,
        max_per_person: 200,
        tickets_sold: 15230,
        status: 'active',
      },
      {
        title: 'Audi Q7 Premium SUV',
        short_description: 'Win a luxurious Audi Q7 - comfort meets performance!',
        long_description: 'Experience luxury with this premium Audi Q7 SUV. Featuring cutting-edge technology, premium materials, and outstanding performance. Perfect for families who demand the best.',
        image_url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800',
        category_id: createdCategories[3]._id,
        draw_time: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
        cash_alternative: 45000,
        ticket_price: 15, // $15 per ticket
        max_tickets: 4000,
        max_per_person: 30,
        tickets_sold: 890,
        status: 'active',
      },
      {
        title: 'Ford Transit Custom Van',
        short_description: 'Professional Ford Transit Custom - versatile and reliable!',
        long_description: 'Win this professional Ford Transit Custom van. Ideal for tradespeople, delivery services, or anyone who needs a reliable commercial vehicle with excellent payload capacity.',
        image_url: 'https://images.unsplash.com/photo-1500292011096-5b5c76d53205?w=800',
        category_id: createdCategories[1]._id,
        draw_time: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        cash_alternative: 22000,
        ticket_price: 8, // $8 per ticket
        max_tickets: 6000,
        max_per_person: 75,
        tickets_sold: 0,
        status: 'upcoming',
      },
      {
        title: 'Tesla Model 3 Electric',
        short_description: 'Win an eco-friendly Tesla Model 3!',
        long_description: 'Join the electric revolution! Win this stunning Tesla Model 3 - the future of driving. Zero emissions, incredible performance, and cutting-edge technology.',
        image_url: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800',
        category_id: createdCategories[0]._id,
        draw_time: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        cash_alternative: 38000,
        ticket_price: 12, // $12 per ticket
        max_tickets: 4500,
        max_per_person: 40,
        tickets_sold: 4500,
        status: 'completed',
      },
    ];

    const createdCompetitions = [];
    for (const compData of competitionsData) {
      const competition = new Competition(compData);
      await competition.save();
      createdCompetitions.push(competition);
      console.log(`✅ Competition created: ${competition.title} (${competition.status})`);
    }
    console.log('');

    // 4. Create Tickets for test user
    console.log('🎟️  Creating tickets for test user...');
    const ticketPrices = [
      { comp: createdCompetitions[0], qty: 5, price: 10 }, // BMW - 5 tickets @ $10
      { comp: createdCompetitions[1], qty: 10, price: 5 }, // Sprinter - 10 tickets @ $5
      { comp: createdCompetitions[2], qty: 20, price: 2.50 }, // Cash - 20 tickets @ $2.50
      { comp: createdCompetitions[3], qty: 3, price: 15 }, // Audi Q7 - 3 tickets @ $15
      { comp: createdCompetitions[5], qty: 8, price: 12 }, // Tesla (completed) - 8 tickets @ $12
    ];

    const generateTicketNumber = () => {
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      return `TMG-${timestamp}-${random}`;
    };

    let ticketNumber = 1;
    for (const ticketData of ticketPrices) {
      for (let i = 0; i < ticketData.qty; i++) {
        let ticketNum = generateTicketNumber();
        // Ensure uniqueness
        while (await Ticket.findOne({ ticket_number: ticketNum })) {
          ticketNum = generateTicketNumber();
        }

        const ticket = new Ticket({
          ticket_number: ticketNum,
          user_id: testUser._id,
          competition_id: ticketData.comp._id,
          price: ticketData.price,
          purchase_date: new Date(now.getTime() - (ticketNumber * 60 * 60 * 1000)), // Spread out purchases
          status: ticketData.comp.status === 'completed' ? 'active' : 'active',
        });
        await ticket.save();
        ticketNumber++;
      }
      console.log(`✅ Created ${ticketData.qty} tickets for: ${ticketData.comp.title}`);
    }
    console.log('');

    // 5. Create Winner (for completed competition)
    console.log('🏆 Creating winner for completed competition...');
    const completedCompetition = createdCompetitions[5]; // Tesla
    const winnerTicket = await Ticket.findOne({
      competition_id: completedCompetition._id,
      user_id: testUser._id,
    });

    if (winnerTicket) {
      const winner = new Winner({
        competition_id: completedCompetition._id,
        user_id: testUser._id,
        ticket_number: winnerTicket.ticket_number,
        prize_value: completedCompetition.cash_alternative,
        draw_video_url: 'https://example.com/draw-video-tesla-model3.mp4',
        draw_date: new Date(completedCompetition.draw_time),
      });
      await winner.save();

      // Update ticket status
      winnerTicket.status = 'won';
      await winnerTicket.save();

      console.log(`✅ Winner created: ${testUser.name} won ${completedCompetition.title}`);
    }
    console.log('');

    // 6. Create Notifications
    console.log('📣 Creating notifications...');
    const notifications = [
      {
        title: 'Welcome to TMG Competitions!',
        message: 'Thank you for joining TMG Competitions. Start exploring our amazing competitions and win fantastic prizes!',
        type: 'system_update',
        is_read: false,
        user_id: testUser._id,
      },
      {
        title: 'New Competition Available',
        message: 'Check out our new BMW 3 Series competition - only £10 per ticket!',
        type: 'new_competition',
        is_read: false,
        user_id: testUser._id,
      },
      {
        title: 'Congratulations! You\'re a Winner!',
        message: 'Amazing news! You have won the Tesla Model 3 Electric competition. Check your results for more details.',
        type: 'winner',
        is_read: true,
        user_id: testUser._id,
      },
      {
        title: 'System Maintenance',
        message: 'We will be performing scheduled maintenance on Sunday, 3 AM - 5 AM GMT. The platform will be temporarily unavailable.',
        type: 'system_update',
        is_read: false,
        user_id: null, // Broadcast notification
      },
    ];

    for (const notifData of notifications) {
      const notification = new Notification(notifData);
      await notification.save();
      console.log(`✅ Notification created: ${notification.title}`);
    }
    console.log('');

    // 7. Create Points History
    console.log('💰 Creating points history...');
    
    // Calculate actual points for each purchase
    // BMW: 5 tickets @ $10 each = $50 = 5000 points spent, 5000 points earned
    // Sprinter: 10 tickets @ $5 each = $50 = 5000 points spent, 5000 points earned
    // Cash: 20 tickets @ $2.50 each = $50 = 5000 points spent, 5000 points earned
    // Audi: 3 tickets @ $15 each = $45 = 4500 points spent, 4500 points earned
    // Tesla: 8 tickets @ $12 each = $96 = 9600 points spent, 9600 points earned
    
    const pointsHistory = [
      {
        user_id: testUser._id,
        type: 'earned',
        amount: 50000,
        description: 'Initial account bonus',
        created_at: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      },
      {
        user_id: testUser._id,
        type: 'spent',
        amount: 5000, // 5 tickets * $10 * 100 = 5000 points
        description: `Purchased 5 ticket(s) for ${createdCompetitions[0].title}`,
        created_at: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000),
      },
      {
        user_id: testUser._id,
        type: 'earned',
        amount: 5000,
        description: `Earned 5000 points for purchasing 5 ticket(s) ($50.00 spent)`,
        created_at: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000),
      },
      {
        user_id: testUser._id,
        type: 'spent',
        amount: 5000, // 10 tickets * $5 * 100 = 5000 points
        description: `Purchased 10 ticket(s) for ${createdCompetitions[1].title}`,
        created_at: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      },
      {
        user_id: testUser._id,
        type: 'earned',
        amount: 5000,
        description: `Earned 5000 points for purchasing 10 ticket(s) ($50.00 spent)`,
        created_at: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      },
      {
        user_id: testUser._id,
        type: 'spent',
        amount: 5000, // 20 tickets * $2.50 * 100 = 5000 points
        description: `Purchased 20 ticket(s) for ${createdCompetitions[2].title}`,
        created_at: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
      },
      {
        user_id: testUser._id,
        type: 'earned',
        amount: 5000,
        description: `Earned 5000 points for purchasing 20 ticket(s) ($50.00 spent)`,
        created_at: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
      },
      {
        user_id: testUser._id,
        type: 'spent',
        amount: 4500, // 3 tickets * $15 * 100 = 4500 points
        description: `Purchased 3 ticket(s) for ${createdCompetitions[3].title}`,
        created_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      },
      {
        user_id: testUser._id,
        type: 'earned',
        amount: 4500,
        description: `Earned 4500 points for purchasing 3 ticket(s) ($45.00 spent)`,
        created_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      },
      {
        user_id: testUser._id,
        type: 'spent',
        amount: 9600, // 8 tickets * $12 * 100 = 9600 points
        description: `Purchased 8 ticket(s) for ${createdCompetitions[5].title}`,
        created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        user_id: testUser._id,
        type: 'earned',
        amount: 9600,
        description: `Earned 9600 points for purchasing 8 ticket(s) ($96.00 spent)`,
        created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      },
    ];

    for (const historyData of pointsHistory) {
      const history = new PointsHistory(historyData);
      await history.save();
    }
    console.log(`✅ Created ${pointsHistory.length} points history records`);
    console.log('');

    // Summary
    console.log('════════════════════════════════════════════════════════');
    console.log('✨ SEED PROCESS COMPLETED SUCCESSFULLY! ✨');
    console.log('════════════════════════════════════════════════════════\n');

    console.log('📊 Database Summary:');
    console.log(`   👥 Users: ${await User.countDocuments()}`);
    console.log(`   🏷️  Categories: ${await Category.countDocuments()}`);
    console.log(`   🏁 Competitions: ${await Competition.countDocuments()}`);
    console.log(`   🎟️  Tickets: ${await Ticket.countDocuments()}`);
    console.log(`   🏆 Winners: ${await Winner.countDocuments()}`);
    console.log(`   📣 Notifications: ${await Notification.countDocuments()}`);
    console.log(`   💰 Points History: ${await PointsHistory.countDocuments()}\n`);

    console.log('🔑 Test Account Credentials:');
    console.log('════════════════════════════════════════');
    console.log('👤 User Account:');
    console.log(`   Email: user@test.com`);
    console.log(`   Password: password123`);
    console.log(`   Points: ${testUser.total_points} ($${(testUser.total_points / 100).toFixed(2)})`);
    console.log(`   Tickets: ${ticketPrices.reduce((sum, t) => sum + t.qty, 0)} tickets`);
    console.log('════════════════════════════════════════');
    console.log('👨‍💼 Admin Account:');
    console.log(`   Email: admin@test.com`);
    console.log(`   Password: admin123`);
    console.log(`   Points: ${testAdmin.total_points} ($${(testAdmin.total_points / 100).toFixed(2)})`);
    console.log('════════════════════════════════════════\n');

    console.log('🎯 What You Can Test:');
    console.log('   ✅ Login with test accounts');
    console.log('   ✅ Browse competitions (active, upcoming, completed)');
    console.log('   ✅ View user tickets');
    console.log('   ✅ Check notifications');
    console.log('   ✅ View points history');
    console.log('   ✅ View winner results');
    console.log('   ✅ Admin dashboard and management');
    console.log('   ✅ Purchase tickets (and earn points)');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed process failed:', error);
    process.exit(1);
  }
};

// Run seed
seedAll();
